import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import { Tag } from '../components/Tag';
import { RowActionButton } from '../components/RowActionButton';
import { IconArchive, IconDocument, IconEdit, IconPaperPlane, IconPlus, IconReceipt } from '../components/icons';
import {
  useAppData,
  Client,
  ClientContact,
  ClientContactRole,
  ClientType,
  Engagement,
  Note,
} from '../store/useAppData';
import { formatCurrency, formatDate } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { useIsMobile } from '../hooks/useIsMobile';
import { BRAND_NAME } from '../lib/branding';
import { openEmailComposer } from '../lib/email';

const roleLabels: Record<ClientContactRole, string> = {
  achat: 'Achat',
  facturation: 'Facturation',
  technique: 'Technique',
};

const contactRoleOptions: ClientContactRole[] = ['achat', 'facturation', 'technique'];

const emptyClientForm = {
  type: 'company' as ClientType,
  companyName: '',
  firstName: '',
  lastName: '',
  siret: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  status: 'Actif' as Client['status'],
  tags: '',
};

const emptyContactForm = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  roles: ['facturation'] as ClientContactRole[],
  isBillingDefault: false,
};

const parseCsvLine = (line: string, separator: string) => {
  const cells: string[] = [];
  let current = '';
  let insideQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === separator && !insideQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, ''));
};

type ImportMappingKey =
  | 'organisationName'
  | 'organisationSiret'
  | 'organisationEmail'
  | 'organisationPhone'
  | 'organisationAddress'
  | 'organisationCity'
  | 'organisationStatus'
  | 'contactFirstName'
  | 'contactLastName'
  | 'contactEmail'
  | 'contactMobile'
  | 'contactRoles'
  | 'contactBilling';

type ImportConfig = {
  fileName: string;
  separator: string;
  headers: string[];
  rows: string[][];
  mapping: Record<ImportMappingKey, string | null>;
};

const requiredMappings: ImportMappingKey[] = [
  'organisationName',
  'organisationSiret',
  'contactFirstName',
  'contactLastName',
  'contactEmail',
  'contactMobile',
  'contactRoles',
];

const mappingFields: { key: ImportMappingKey; label: string; required?: boolean }[] = [
  { key: 'organisationName', label: 'Nom organisation', required: true },
  { key: 'organisationSiret', label: 'SIRET', required: true },
  { key: 'organisationEmail', label: 'Email organisation' },
  { key: 'organisationPhone', label: 'Téléphone organisation' },
  { key: 'organisationAddress', label: 'Adresse' },
  { key: 'organisationCity', label: 'Ville' },
  { key: 'organisationStatus', label: 'Statut' },
  { key: 'contactFirstName', label: 'Prénom contact', required: true },
  { key: 'contactLastName', label: 'Nom contact', required: true },
  { key: 'contactEmail', label: 'Email contact', required: true },
  { key: 'contactMobile', label: 'Mobile contact', required: true },
  { key: 'contactRoles', label: 'Rôles contact', required: true },
  { key: 'contactBilling', label: 'Contact facturation (Oui/Non)' },
];

const autoMatchHeader = (headers: string[], candidates: string[]) => {
  const lowerHeaders = headers.map((header) => header.toLowerCase());
  for (const candidate of candidates) {
    const index = lowerHeaders.indexOf(candidate.toLowerCase());
    if (index >= 0) {
      return headers[index];
    }
  }
  return null;
};

const toggleRole = (roles: ClientContactRole[], role: ClientContactRole) =>
  roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role];

type UndoSnapshot = {
  client: Client;
  engagements: Engagement[];
  notes: Note[];
};
const ClientsPage = () => {
  const {
    clients,
    engagements,
    notes,
    addClient,
    updateClient,
    addClientContact,
    updateClientContact,
    archiveClientContact,
    restoreClientContact,
    setClientBillingContact,
    getClientRevenue,
    removeClient,
    restoreClient,
    setPendingEngagementSeed,
    activeCompanyId,
    hasPermission,
  } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [contactQuery, setContactQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | ClientContactRole>('all');
  const [billingFilter, setBillingFilter] = useState<'all' | 'with' | 'without'>('all');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [creationOpen, setCreationOpen] = useState(false);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [creationContactForm, setCreationContactForm] = useState(emptyContactForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [editClientForm, setEditClientForm] = useState(emptyClientForm);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactForm, setContactForm] = useState(emptyContactForm);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [importConfig, setImportConfig] = useState<ImportConfig | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const listSectionRef = useRef<HTMLDivElement | null>(null);
  const creationSectionRef = useRef<HTMLDivElement | null>(null);
  const detailSectionRef = useRef<HTMLDivElement | null>(null);
  const detailFocusRef = useRef<HTMLDivElement | null>(null);
  const undoPayloadRef = useRef<UndoSnapshot | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const clearUndo = () => {
    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    undoPayloadRef.current = null;
    setUndoAvailable(false);
  };

  const notify = (message: string) => {
    clearUndo();
    setFeedback(message);
  };

  const scrollToList = useCallback(() => {
    requestAnimationFrame(() => {
      listSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const sortedClients = useMemo(
    () =>
      [...clients].sort((a, b) =>
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      ),
    [clients]
  );

  const revenueByClient = useMemo(() => {
    const entries = new Map<string, number>();
    sortedClients.forEach((client) => {
      entries.set(client.id, getClientRevenue(client.id));
    });
    return entries;
  }, [sortedClients, getClientRevenue]);

  useEffect(() => {
    setSelectedClientIds((current) =>
      current.filter((id) => sortedClients.some((client) => client.id === id))
    );
  }, [sortedClients]);

  const contactUsage = useMemo(() => {
    const usage = new Map<string, number>();
    engagements.forEach((engagement) => {
      engagement.contactIds.forEach((contactId) => {
        usage.set(contactId, (usage.get(contactId) ?? 0) + 1);
      });
    });
    return usage;
  }, [engagements]);

  const filteredClients = useMemo(() => {
    return sortedClients.filter((client) => {
      const searchMatch =
        !searchTerm.trim() ||
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.siret.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) {
        return false;
      }
      const activeContacts = client.contacts.filter((contact) => contact.active);
      const contactMatch = contactQuery.trim()
        ? activeContacts.some((contact) => {
            const haystack = `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.mobile}`.toLowerCase();
            return haystack.includes(contactQuery.toLowerCase());
          })
        : true;
      if (!contactMatch) {
        return false;
      }
      const roleMatches =
        roleFilter === 'all'
          ? true
          : activeContacts.some((contact) => contact.roles.includes(roleFilter));
      if (!roleMatches) {
        return false;
      }
      if (billingFilter === 'with') {
        return activeContacts.some((contact) => contact.isBillingDefault);
      }
      if (billingFilter === 'without') {
        return activeContacts.every((contact) => !contact.isBillingDefault);
      }
      return true;
    });
  }, [sortedClients, searchTerm, contactQuery, roleFilter, billingFilter]);

  const allClientsSelected =
    filteredClients.length > 0 &&
    filteredClients.every((client) => selectedClientIds.includes(client.id));

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId]
    );
  };

  const toggleSelectAllClients = () => {
    if (allClientsSelected) {
      setSelectedClientIds((current) =>
        current.filter((id) => !filteredClients.some((client) => client.id === id))
      );
    } else {
      setSelectedClientIds((current) => [
        ...new Set([...current, ...filteredClients.map((client) => client.id)]),
      ]);
    }
  };

  const clearSelectedClients = () => setSelectedClientIds([]);

  const handleBulkSendClients = () => {
    const targets = clients.filter((client) => selectedClientIds.includes(client.id));
    if (!targets.length) {
      return;
    }
    targets.forEach((client) => handleMailto(client));
    setFeedback(`${targets.length} client(s) prêt(s) pour l’envoi d’un e-mail.`);
  };

  const handleBulkArchiveClients = () => {
    if (!selectedClientIds.length) {
      return;
    }
    const targets = clients.filter((client) => selectedClientIds.includes(client.id));
    if (!targets.length) {
      return;
    }
    clearUndo();
    targets.forEach((client) => {
      removeClient(client.id);
      if (selectedClientId === client.id) {
        setSelectedClientId(null);
    setIsEditingClient(false);
        setIsContactFormOpen(false);
      }
    });
    setSelectedClientIds([]);
    setFeedback(`${targets.length} client(s) archivés.`);
  };

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const billingContact = selectedClient
    ?.contacts.find((contact) => contact.active && contact.isBillingDefault) ?? null;

  const contactCount = useMemo(() => {
    return clients.reduce((acc, client) => acc + client.contacts.filter((contact) => contact.active).length, 0);
  }, [clients]);

  const clientCount = clients.length;
  const globalRevenue = useMemo(
    () => clients.reduce((acc, client) => acc + (revenueByClient.get(client.id) ?? 0), 0),
    [clients, revenueByClient]
  );

  useEffect(() => {
    if (!creationOpen || !creationSectionRef.current) {
      return;
    }
    creationSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      const target = creationSectionRef.current?.querySelector<HTMLElement>('input, select');
      target?.focus({ preventScroll: true });
    }, 180);
  }, [creationOpen]);

  useEffect(() => {
    if (!selectedClient || !detailSectionRef.current) {
      return;
    }
    setEditClientForm({
      type: selectedClient.type,
      companyName: selectedClient.companyName ?? '',
      firstName: selectedClient.firstName ?? '',
      lastName: selectedClient.lastName ?? '',
      siret: selectedClient.type === 'company' ? selectedClient.siret : '',
      email: selectedClient.email,
      phone: selectedClient.phone,
      address: selectedClient.address,
      city: selectedClient.city,
      status: selectedClient.status,
      tags: selectedClient.tags.join(', '),
    });
    detailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: isMobile ? 'start' : 'center' });
    window.setTimeout(() => {
      detailFocusRef.current?.focus({ preventScroll: true });
    }, 180);
  }, [selectedClient, isMobile]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clientId = params.get('clientId');
    if (!clientId) {
      return;
    }
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('clientId');
    navigate({ pathname: location.pathname, search: nextParams.toString() ? `?${nextParams}` : '' }, { replace: true });
    if (clients.some((client) => client.id === clientId)) {
      setSelectedClientId(clientId);
      setCreationOpen(false);
    }
  }, [clients, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!feedback || undoAvailable) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback, undoAvailable]);

  useEffect(() => {
    if (importFeedback) {
      const timeout = window.setTimeout(() => setImportFeedback(null), 4000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [importFeedback]);

  const closeDetail = () => {
    setSelectedClientId(null);
    setIsEditingClient(false);
    setIsContactFormOpen(false);
    setEditingContactId(null);
  };

  const handleSelectClientType = (type: ClientType) => {
    setClientForm((form) => {
      if (form.type === type) {
        return form;
      }
      const next = {
        ...form,
        type,
        companyName: type === 'company' ? '' : form.companyName,
        siret: type === 'company' ? '' : form.siret,
        firstName: type === 'individual' ? form.firstName : '',
        lastName: type === 'individual' ? form.lastName : '',
      };
      return type === 'company'
        ? { ...next, firstName: '', lastName: '' }
        : { ...next, companyName: '', siret: '' };
    });
  };

  const handleEditClientType = (type: ClientType) => {
    setEditClientForm((form) => {
      if (form.type === type) {
        return form;
      }
      return type === 'company'
        ? { ...form, type, companyName: '', siret: '', firstName: '', lastName: '' }
        : { ...form, type, companyName: '', siret: '', firstName: '', lastName: '' };
    });
  };

  useEffect(() => {
    if (clientForm.type !== 'individual') {
      return;
    }
    setCreationContactForm((form) => ({
      ...form,
      firstName: form.firstName || clientForm.firstName,
      lastName: form.lastName || clientForm.lastName,
    }));
  }, [clientForm.type, clientForm.firstName, clientForm.lastName]);
  const handleCreateClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (clientForm.type === 'company') {
      if (!clientForm.companyName.trim() || !clientForm.siret.trim()) {
        notify('Renseignez au minimum le nom de la société et le SIRET.');
        return;
      }
    } else {
      if (!clientForm.firstName.trim() || !clientForm.lastName.trim()) {
        notify('Indiquez au minimum le prénom et le nom du particulier.');
        return;
      }
    }
    if (
      !creationContactForm.firstName.trim() ||
      !creationContactForm.lastName.trim() ||
      !creationContactForm.email.trim() ||
      !creationContactForm.mobile.trim()
    ) {
      notify('Ajoutez un contact principal complet.');
      return;
    }
    setIsSubmitting(true);
    try {
      const displayName =
        clientForm.type === 'company'
          ? clientForm.companyName.trim()
          : `${clientForm.firstName.trim()} ${clientForm.lastName.trim()}`.trim();
      const created = addClient({
        type: clientForm.type,
        name: displayName,
        companyName: clientForm.type === 'company' ? clientForm.companyName.trim() : '',
        firstName: clientForm.type === 'individual' ? clientForm.firstName.trim() : '',
        lastName: clientForm.type === 'individual' ? clientForm.lastName.trim() : '',
        siret: clientForm.type === 'company' ? clientForm.siret.trim() : '',
        email: clientForm.email.trim(),
        phone: clientForm.phone.trim(),
        address: clientForm.address.trim(),
        city: clientForm.city.trim(),
        status: clientForm.status,
        tags: clientForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      const contact = addClientContact(created.id, {
        firstName: creationContactForm.firstName.trim(),
        lastName: creationContactForm.lastName.trim(),
        email: creationContactForm.email.trim(),
        mobile: creationContactForm.mobile.trim(),
        roles: creationContactForm.roles,
        isBillingDefault:
          creationContactForm.isBillingDefault || creationContactForm.roles.includes('facturation'),
      });
      if (contact?.isBillingDefault) {
        setClientBillingContact(created.id, contact.id);
      }
      notify(`Client « ${created.name} » ajouté.`);
      setCreationOpen(false);
      setClientForm(emptyClientForm);
      setCreationContactForm(emptyContactForm);
      setSelectedClientId(null);
      setSelectedClientIds([]);
      scrollToList();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClient) {
      return;
    }
    updateClient(selectedClient.id, {
      type: editClientForm.type,
      name:
        editClientForm.type === 'company'
          ? editClientForm.companyName.trim()
          : `${editClientForm.firstName.trim()} ${editClientForm.lastName.trim()}`.trim(),
      companyName: editClientForm.type === 'company' ? editClientForm.companyName.trim() : '',
      firstName: editClientForm.type === 'individual' ? editClientForm.firstName.trim() : '',
      lastName: editClientForm.type === 'individual' ? editClientForm.lastName.trim() : '',
      siret: editClientForm.type === 'company' ? editClientForm.siret.trim() : '',
      email: editClientForm.email.trim(),
      phone: editClientForm.phone.trim(),
      address: editClientForm.address.trim(),
      city: editClientForm.city.trim(),
      status: editClientForm.status,
      tags: editClientForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    notify('Client mis à jour.');
    setIsEditingClient(false);
  };

  const openContactForm = (contact?: ClientContact) => {
    if (contact) {
      setContactForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        mobile: contact.mobile,
        roles: [...contact.roles],
        isBillingDefault: contact.isBillingDefault,
      });
      setEditingContactId(contact.id);
    } else {
      setContactForm(emptyContactForm);
      setEditingContactId(null);
    }
    setIsContactFormOpen(true);
    window.setTimeout(() => {
      const focusable = detailSectionRef.current?.querySelector<HTMLInputElement>('input[name="contact-first-name"]');
      focusable?.focus({ preventScroll: true });
    }, 120);
  };

  const handleEditShortcut = (client: Client) => {
    setSelectedClientId(client.id);
    setCreationOpen(false);
    window.setTimeout(() => {
      setIsEditingClient(true);
    }, 80);
  };

  const handleAddContactShortcut = (client: Client) => {
    setSelectedClientId(client.id);
    setCreationOpen(false);
    window.setTimeout(() => {
      openContactForm();
    }, 80);
  };

  const closeContactForm = () => {
    setIsContactFormOpen(false);
    setEditingContactId(null);
    setContactForm(emptyContactForm);
  };

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedClient) {
      return;
    }
    if (
      !contactForm.firstName.trim() ||
      !contactForm.lastName.trim() ||
      !contactForm.email.trim() ||
      !contactForm.mobile.trim()
    ) {
      notify('Complétez les informations du contact.');
      return;
    }
    if (!contactForm.roles.length) {
      notify('Sélectionnez au moins un rôle.');
      return;
    }
    if (editingContactId) {
      updateClientContact(selectedClient.id, editingContactId, {
        firstName: contactForm.firstName,
        lastName: contactForm.lastName,
        email: contactForm.email,
        mobile: contactForm.mobile,
        roles: contactForm.roles,
        isBillingDefault: contactForm.isBillingDefault,
        active: true,
      });
      if (contactForm.isBillingDefault) {
        setClientBillingContact(selectedClient.id, editingContactId);
      }
      notify('Contact mis à jour.');
    } else {
      const created = addClientContact(selectedClient.id, {
        firstName: contactForm.firstName,
        lastName: contactForm.lastName,
        email: contactForm.email,
        mobile: contactForm.mobile,
        roles: contactForm.roles,
        isBillingDefault:
          contactForm.isBillingDefault || contactForm.roles.includes('facturation'),
      });
      if (created?.isBillingDefault) {
        setClientBillingContact(selectedClient.id, created.id);
      }
      notify('Contact ajouté.');
    }
    closeContactForm();
  };

  const handleArchiveContact = (clientId: string, contact: ClientContact) => {
    archiveClientContact(clientId, contact.id);
    notify(`Contact « ${contact.firstName} ${contact.lastName} » archivé.`);
  };

  const handleRestoreContact = (clientId: string, contact: ClientContact) => {
    restoreClientContact(clientId, contact.id);
    notify(`Contact « ${contact.firstName} ${contact.lastName} » réactivé.`);
  };

  const handleSetBillingContact = (clientId: string, contactId: string) => {
    setClientBillingContact(clientId, contactId);
    notify('Contact de facturation mis à jour.');
  };

  const handleExport = () => {
    if (!filteredClients.length) {
      setFeedback('Aucun client à exporter.');
      return;
    }

    const header = [
      'Organisation',
      'Type',
      'Nom entreprise',
      'Prénom',
      'Nom',
      'SIRET',
      'Email organisation',
      'Téléphone organisation',
      'Adresse',
      'Ville',
      'Statut',
      'Tags',
      'Contacts actifs',
      'Détails contacts',
      'Contact facturation',
      'Dernière prestation',
      'Chiffre d’affaires HT',
    ];

    const rows = filteredClients.map((client) => {
      const activeContacts = client.contacts.filter((contact) => contact.active);
      const billing = activeContacts.find((contact) => contact.isBillingDefault);
      const revenue = revenueByClient.get(client.id) ?? 0;
      const contactSummary = activeContacts
        .map((contact) => {
          const name = `${contact.firstName} ${contact.lastName}`.trim();
          const coordinates = [contact.email, contact.mobile].filter(Boolean).join(' / ');
          const roles = contact.roles.length ? `Rôles : ${contact.roles.join(', ')}` : '';
          const billingLabel = contact.isBillingDefault ? 'Contact facturation' : '';
          return [name || 'Contact', coordinates, roles, billingLabel].filter(Boolean).join(' – ');
        })
        .join(' | ');
      const billingLabel = billing
        ? [
            `${billing.firstName} ${billing.lastName}`.trim(),
            billing.email ? `<${billing.email}>` : null,
            billing.mobile ? `(${billing.mobile})` : null,
          ]
            .filter(Boolean)
            .join(' ')
        : '';
      return [
        client.name,
        client.type === 'company' ? 'Entreprise' : 'Particulier',
        client.companyName ?? '',
        client.firstName ?? '',
        client.lastName ?? '',
        client.siret,
        client.email,
        client.phone,
        client.address,
        client.city,
        client.status,
        client.tags.join(', '),
        activeContacts.length,
        contactSummary,
        billingLabel,
        client.lastService ? formatDate(client.lastService) : '',
        formatCurrency(revenue),
      ];
    });

    downloadCsv({ fileName: 'clients.csv', header, rows });
    setFeedback(`${rows.length} client(s) exporté(s).`);
  };
  const openImportConfigurator = async (file: File) => {
    const text = await file.text();
    const rawLines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (rawLines.length <= 1) {
      setImportFeedback('Le fichier ne contient pas de données exploitables.');
      return;
    }
    const headerLine = rawLines[0];
    const separator = headerLine.includes(';') ? ';' : ',';
    const headers = parseCsvLine(headerLine, separator);
    const rows = rawLines.slice(1).map((line) => parseCsvLine(line, separator));
    const mapping: Record<ImportMappingKey, string | null> = {
      organisationName: autoMatchHeader(headers, ['organisation', 'nom organisation', 'client', 'nom']),
      organisationSiret: autoMatchHeader(headers, ['siret', 'n° siret']),
      organisationEmail: autoMatchHeader(headers, ['email organisation', 'organisation email', 'email']),
      organisationPhone: autoMatchHeader(headers, ['telephone organisation', 'téléphone organisation', 'telephone']),
      organisationAddress: autoMatchHeader(headers, ['adresse organisation', 'adresse']),
      organisationCity: autoMatchHeader(headers, ['ville organisation', 'ville']),
      organisationStatus: autoMatchHeader(headers, ['statut organisation', 'statut']),
      contactFirstName: autoMatchHeader(headers, ['contact prenom', 'prenom', 'first name']),
      contactLastName: autoMatchHeader(headers, ['contact nom', 'nom', 'last name']),
      contactEmail: autoMatchHeader(headers, ['contact email', 'email contact']),
      contactMobile: autoMatchHeader(headers, ['contact mobile', 'mobile', 'telephone contact']),
      contactRoles: autoMatchHeader(headers, ['roles', 'contact roles', 'contact role']),
      contactBilling: autoMatchHeader(headers, ['contact facturation', 'billing default']),
    };
    setImportConfig({ fileName: file.name, separator, headers, rows, mapping });
    setImportFeedback(null);
  };

  const applyImport = () => {
    if (!importConfig) {
      return;
    }
    const missingRequired = requiredMappings.filter((key) => !importConfig.mapping[key]);
    if (missingRequired.length) {
      setImportFeedback('Mappez toutes les colonnes obligatoires.');
      return;
    }
    let createdOrganisations = 0;
    let createdContacts = 0;
    let updatedContacts = 0;
    let ignored = 0;

    importConfig.rows.forEach((cells) => {
      const getValue = (key: ImportMappingKey) => {
        const header = importConfig.mapping[key];
        if (!header) {
          return '';
        }
        const index = importConfig.headers.indexOf(header);
        return index >= 0 ? cells[index]?.trim() ?? '' : '';
      };
      const organisationName = getValue('organisationName');
      const organisationSiret = getValue('organisationSiret');
      const contactEmail = getValue('contactEmail');
      const contactMobile = getValue('contactMobile');
      const contactFirstName = getValue('contactFirstName');
      const contactLastName = getValue('contactLastName');
      const contactRolesInput = getValue('contactRoles');
      if (
        !organisationName ||
        !organisationSiret ||
        !contactEmail ||
        !contactMobile ||
        !contactFirstName ||
        !contactLastName ||
        !contactRolesInput
      ) {
        ignored += 1;
        return;
      }
      const roles = contactRolesInput
        .split(/[,;|]/)
        .map((role) => role.trim().toLowerCase())
        .filter((role): role is ClientContactRole => contactRoleOptions.includes(role as ClientContactRole));
      if (!roles.length) {
        ignored += 1;
        return;
      }
      const billingFlag = getValue('contactBilling').toLowerCase();
      const organisation = clients.find(
        (client) =>
          client.name.toLowerCase() === organisationName.toLowerCase() && client.siret.trim() === organisationSiret.trim()
      );
      const contactPayload = {
        firstName: contactFirstName,
        lastName: contactLastName,
        email: contactEmail,
        mobile: contactMobile,
        roles,
        isBillingDefault: billingFlag === 'oui' || billingFlag === 'yes' || roles.includes('facturation'),
      };
      if (organisation) {
        const existing = organisation.contacts.find(
          (contact) => contact.email.toLowerCase() === contactEmail.toLowerCase()
        );
        if (existing) {
          updateClientContact(organisation.id, existing.id, {
            ...contactPayload,
            active: true,
          });
          if (contactPayload.isBillingDefault) {
            setClientBillingContact(organisation.id, existing.id);
          }
          updatedContacts += 1;
        } else {
          const created = addClientContact(organisation.id, contactPayload);
          if (created?.isBillingDefault) {
            setClientBillingContact(organisation.id, created.id);
          }
          createdContacts += 1;
        }
      } else {
        const createdOrg = addClient({
          type: 'company',
          name: organisationName,
          companyName: organisationName,
          firstName: '',
          lastName: '',
          siret: organisationSiret,
          email: getValue('organisationEmail'),
          phone: getValue('organisationPhone'),
          address: getValue('organisationAddress'),
          city: getValue('organisationCity'),
          status: (getValue('organisationStatus') as Client['status']) || 'Actif',
          tags: [],
        });
        const createdContact = addClientContact(createdOrg.id, contactPayload);
        if (createdContact?.isBillingDefault) {
          setClientBillingContact(createdOrg.id, createdContact.id);
        }
        createdOrganisations += 1;
        createdContacts += 1;
      }
    });

    setImportFeedback(
      `Import terminé : ${createdOrganisations} clients créés, ${createdContacts} contacts créés, ${updatedContacts} mis à jour, ${ignored} ignorés.`
    );
    setImportConfig(null);
  };

  const cancelImport = () => {
    setImportConfig(null);
  };

  const handleMailto = (client: Client) => {
    const activeContacts = client.contacts.filter((item) => item.active);
    const contact = activeContacts.find((item) => item.isBillingDefault) ?? activeContacts[0] ?? null;
    const email = contact?.email || client.email;
    if (!email) {
      notify('Aucune adresse e-mail disponible pour ce client.');
      return;
    }
    const displayName = contact ? `${contact.firstName} ${contact.lastName}` : client.name;
    const subject = `${BRAND_NAME} – Contact client ${client.name}`;
    const body = `Bonjour ${displayName},\n\nJe reviens vers vous au sujet de [objet].\nN'hésitez pas à me répondre directement à ce mail.\n\nCordialement,\n${BRAND_NAME}`;
    openEmailComposer({ to: [email], subject, body });
    setFeedback('E-mail préparé dans Gmail.');
  };

  const handleEngagementShortcut = (client: Client, kind: 'service' | 'devis' | 'facture') => {
    const activeContacts = client.contacts.filter((item) => item.active);
    const preferred = activeContacts.find((item) => item.isBillingDefault) ?? activeContacts[0] ?? null;
    setPendingEngagementSeed({
      kind,
      clientId: client.id,
      companyId: activeCompanyId ?? null,
      contactIds: preferred ? [preferred.id] : [],
    });
    navigate('/service');
  };

  const handleDeleteClient = (client: Client) => {
    clearUndo();
    const snapshotClient: Client = {
      ...client,
      contacts: client.contacts.map((contact) => ({
        ...contact,
        roles: [...contact.roles],
      })),
    };
    const relatedEngagements = engagements
      .filter((engagement) => engagement.clientId === client.id)
      .map((engagement) => ({
        ...engagement,
        optionIds: [...engagement.optionIds],
        contactIds: [...engagement.contactIds],
        sendHistory: engagement.sendHistory.map((record) => ({
          ...record,
          contactIds: [...record.contactIds],
        })),
      }));
    const relatedNotes = notes
      .filter((note) => note.clientId === client.id)
      .map((note) => ({ ...note }));
    undoPayloadRef.current = {
      client: snapshotClient,
      engagements: relatedEngagements,
      notes: relatedNotes,
    };
    removeClient(client.id);
    if (selectedClientId === client.id) {
      setSelectedClientId(null);
      setIsEditingClient(false);
      setIsContactFormOpen(false);
    }
    setSelectedClientIds((current) => current.filter((id) => id !== client.id));
    if (creationOpen) {
      setCreationOpen(false);
    }
    setUndoAvailable(true);
    setFeedback(`Organisation « ${client.name} » supprimée. Annuler ?`);
    if (undoTimeoutRef.current) {
      window.clearTimeout(undoTimeoutRef.current);
    }
    undoTimeoutRef.current = window.setTimeout(() => {
      clearUndo();
      setFeedback(null);
    }, 5000);
  };

  const handleUndoDelete = () => {
    if (!undoPayloadRef.current) {
      return;
    }
    const snapshot = undoPayloadRef.current;
    clearUndo();
    const clientClone: Client = {
      ...snapshot.client,
      contacts: snapshot.client.contacts.map((contact) => ({
        ...contact,
        roles: [...contact.roles],
      })),
    };
    const engagementsClone = snapshot.engagements.map((engagement) => ({
      ...engagement,
      optionIds: [...engagement.optionIds],
      contactIds: [...engagement.contactIds],
      sendHistory: engagement.sendHistory.map((record) => ({
        ...record,
        contactIds: [...record.contactIds],
      })),
    }));
    const notesClone = snapshot.notes.map((note) => ({ ...note }));
    restoreClient({ client: clientClone, engagements: engagementsClone, notes: notesClone });
    setSelectedClientId(snapshot.client.id);
    notify(`Suppression annulée pour « ${snapshot.client.name} ».`);
  };

  const columns = [
    <div key="client-select" className="flex items-center gap-2">
      <input
        type="checkbox"
        className="table-checkbox h-4 w-4 rounded focus:ring-primary/40"
        aria-label="Sélectionner tous les clients"
        checked={allClientsSelected}
        onChange={toggleSelectAllClients}
      />
      <span>Organisation</span>
    </div>,
    'Coordonnées',
    'Contacts actifs',
    'Dernière prestation',
    'Chiffre d’affaires',
    'Actions',
  ];

  const rows = filteredClients.map((client) => {
    const activeContacts = client.contacts.filter((contact) => contact.active);
    const billing = activeContacts.find((contact) => contact.isBillingDefault);
    const fallbackContact = billing ?? activeContacts[0];
    const contactEmail = fallbackContact?.email || client.email || '—';
    const contactPhone = fallbackContact?.mobile || client.phone || '—';
    const lastDate = client.lastService ? formatDate(client.lastService) : '—';
    const revenue = revenueByClient.get(client.id) ?? 0;
    const isSelected = selectedClientIds.includes(client.id);

    return [
      <div key={`${client.id}-identity`} className="flex items-start gap-3">
        <input
          type="checkbox"
          className="table-checkbox mt-0.5 h-4 w-4 flex-shrink-0 rounded focus:ring-primary/40"
          checked={isSelected}
          onChange={() => toggleClientSelection(client.id)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Sélectionner ${client.name}`}
        />
        <div className="space-y-1 text-left text-[11px] text-slate-600">
          <p className="truncate text-sm font-semibold text-slate-900" title={client.name}>
            {client.name}
          </p>
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">SIRET {client.siret || '—'}</p>
          {client.tags.length > 0 && (
            <p className="truncate text-[10px] text-slate-400" title={client.tags.join(', ')}>
              {client.tags.join(' · ')}
            </p>
          )}
        </div>
      </div>,
      <div key={`${client.id}-details`} className="space-y-1 text-[11px] text-slate-600">
        <p className="truncate" title={client.city || '—'}>
          {client.city || '—'}
        </p>
        <p className="truncate" title={contactEmail}>
          {contactEmail}
        </p>
        <p className="truncate" title={contactPhone}>
          {contactPhone}
        </p>
      </div>,
      <div key={`${client.id}-contacts`} className="space-y-1 text-[11px] text-slate-600">
        <p>{activeContacts.length} contact(s) actif(s)</p>
        {billing && (
          <p className="truncate text-[10px] text-slate-500" title={`Facturation : ${billing.firstName} ${billing.lastName}`}>
            Facturation : {billing.firstName} {billing.lastName}
          </p>
        )}
      </div>,
      <span key={`${client.id}-last`} className="text-[11px] text-slate-600">{lastDate}</span>,
      <span key={`${client.id}-revenue`} className="text-[11px] font-semibold text-slate-800">
        {formatCurrency(revenue)}
      </span>,
      <div key={`${client.id}-actions`} className="flex items-center gap-1.5">
        {hasPermission('client.edit') && (
          <RowActionButton label="Modifier" onClick={() => handleEditShortcut(client)}>
            <IconEdit />
          </RowActionButton>
        )}
        {hasPermission('client.contact.add') && (
          <RowActionButton label="Ajouter un contact" onClick={() => handleAddContactShortcut(client)}>
            <IconPlus />
          </RowActionButton>
        )}
        {hasPermission('client.invoice') && (
          <RowActionButton label="Créer facture" onClick={() => handleEngagementShortcut(client, 'facture')}>
            <IconReceipt />
          </RowActionButton>
        )}
        {hasPermission('client.quote') && (
          <RowActionButton label="Créer devis" onClick={() => handleEngagementShortcut(client, 'devis')}>
            <IconDocument />
          </RowActionButton>
        )}
        {hasPermission('client.email') && (
          <RowActionButton label="Envoyer" onClick={() => handleMailto(client)}>
            <IconPaperPlane />
          </RowActionButton>
        )}
        {hasPermission('client.archive') && (
          <RowActionButton label="Archiver" tone="danger" onClick={() => handleDeleteClient(client)}>
            <IconArchive />
          </RowActionButton>
        )}
      </div>,
    ];
  });

  const clientRowClassName = (index: number) => {
    const client = filteredClients[index];
    if (!client) {
      return '';
    }
    const isSelected = selectedClientIds.includes(client.id);
    const isActive = selectedClientId === client.id;
    return clsx(
      'border-l-2 border-transparent',
      (isSelected || isActive) && 'border-primary/60 bg-primary/5'
    );
  };
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Card padding="sm" className="md:col-span-1">
          <div className="space-y-1 text-xs text-slate-600">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Clients</p>
            <p className="text-2xl font-semibold text-slate-900">{clientCount}</p>
            <p>Suivies dans {BRAND_NAME}</p>
          </div>
        </Card>
        <Card padding="sm" className="md:col-span-1">
          <div className="space-y-1 text-xs text-slate-600">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Contacts actifs</p>
            <p className="text-2xl font-semibold text-slate-900">{contactCount}</p>
            <p>Rattachés aux clients</p>
          </div>
        </Card>
        <Card padding="sm" className="md:col-span-1">
          <div className="space-y-1 text-xs text-slate-600">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Chiffre d’affaires</p>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(globalRevenue)}</p>
            <p>Pondéré par les prestations facturées</p>
          </div>
        </Card>
      </div>

      {feedback && (
        <div className="rounded-soft border border-primary/30 bg-primary/5 px-4 py-2 text-xs text-primary">
          <div className="flex items-center justify-between gap-3">
            <span>{feedback}</span>
            {undoAvailable && (
              <button
                type="button"
                onClick={handleUndoDelete}
                className="rounded-soft px-2 py-1 text-[11px] font-semibold text-primary underline-offset-2 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      )}
      {importFeedback && (
        <div className="rounded-soft border border-slate-300 bg-white px-4 py-2 text-xs text-slate-700">
          {importFeedback}
        </div>
      )}

      <div ref={listSectionRef}>
        <Card padding="sm" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              <span className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Recherche client</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Nom ou SIRET"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              <span className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Recherche contact</span>
              <input
                type="search"
                value={contactQuery}
                onChange={(event) => setContactQuery(event.target.value)}
                className="rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Nom, email, mobile"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              <span className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Filtrer par rôle</span>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as 'all' | ClientContactRole)}
                className="rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Tous</option>
                {contactRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-600">
              <span className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Contact facturation</span>
              <select
                value={billingFilter}
                onChange={(event) => setBillingFilter(event.target.value as 'all' | 'with' | 'without')}
                className="rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Tous</option>
                <option value="with">Avec contact défini</option>
                <option value="without">Sans contact défini</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasPermission('client.edit') && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setCreationOpen(true)}>
                Nouveau client
              </Button>
            )}
            {hasPermission('client.edit') && (
              <label className="inline-flex cursor-pointer items-center">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void openImportConfigurator(file);
                      event.target.value = '';
                    }
                  }}
                />
                <span className="inline-flex items-center rounded-soft border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900">
                  Importer CSV
                </span>
              </label>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={handleExport}>
              Exporter
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="table-checkbox h-4 w-4 rounded focus:ring-primary/40"
              checked={allClientsSelected}
              onChange={toggleSelectAllClients}
            />
            <span>Sélectionner tout</span>
          </div>
          {!!selectedClientIds.length && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">|</span>
              <span>{selectedClientIds.length} sélectionnés</span>
              {hasPermission('client.email') && (
                <Button variant="ghost" size="xs" onClick={handleBulkSendClients}>
                  Envoyer
                </Button>
              )}
              {hasPermission('client.archive') && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleBulkArchiveClients}
                  className="text-rose-600 hover:text-rose-700"
                >
                  Archiver
                </Button>
              )}
              <button
                type="button"
                onClick={clearSelectedClients}
                className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-slate-600"
              >
                Vider la sélection
              </button>
            </div>
          )}
        </div>

        <Table
          className="mt-3"
          columns={columns}
          rows={rows}
          tone="plain"
          density="compact"
          striped={false}
          bordered={false}
          dividers={false}
          onRowClick={(rowIndex) => {
            const client = filteredClients[rowIndex];
            if (client) {
              setSelectedClientId(client.id);
              setCreationOpen(false);
            }
          }}
          rowClassName={clientRowClassName}
        />
        </Card>
      </div>

      {creationOpen && (
        <div ref={creationSectionRef}>
          <Card padding="md" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Nouveau client</p>
                <p className="text-xs text-slate-500">
                  Sélectionnez le type et complétez les informations principales.
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreationOpen(false)}>
                Fermer
              </Button>
            </div>
            <form onSubmit={handleCreateClient} className="space-y-8 text-sm text-slate-700">
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-xs text-slate-500">Type de client</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectClientType('company')}
                      className={clsx(
                        'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition',
                        clientForm.type === 'company'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-300 text-slate-600 hover:border-slate-400'
                      )}
                    >
                      Société
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectClientType('individual')}
                      className={clsx(
                        'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition',
                        clientForm.type === 'individual'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-300 text-slate-600 hover:border-slate-400'
                      )}
                    >
                      Particulier
                    </button>
                  </div>
                </div>
                {clientForm.type === 'company' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Nom société *</span>
                      <input
                        type="text"
                        value={clientForm.companyName}
                        onChange={(event) =>
                          setClientForm((form) => ({ ...form, companyName: event.target.value }))
                        }
                        className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">SIRET *</span>
                      <input
                        type="text"
                        value={clientForm.siret}
                        onChange={(event) =>
                          setClientForm((form) => ({ ...form, siret: event.target.value }))
                        }
                        className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Prénom *</span>
                      <input
                        type="text"
                        value={clientForm.firstName}
                        onChange={(event) =>
                          setClientForm((form) => ({ ...form, firstName: event.target.value }))
                        }
                        className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Nom *</span>
                      <input
                        type="text"
                        value={clientForm.lastName}
                        onChange={(event) =>
                          setClientForm((form) => ({ ...form, lastName: event.target.value }))
                        }
                        className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Statut</span>
                    <select
                      value={clientForm.status}
                      onChange={(event) =>
                        setClientForm((form) => ({
                          ...form,
                          status: event.target.value as Client['status'],
                        }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="Actif">Actif</option>
                      <option value="Prospect">Prospect</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Email</span>
                    <input
                      type="email"
                      value={clientForm.email}
                      onChange={(event) =>
                        setClientForm((form) => ({ ...form, email: event.target.value }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Téléphone</span>
                    <input
                      type="tel"
                      value={clientForm.phone}
                      onChange={(event) =>
                        setClientForm((form) => ({ ...form, phone: event.target.value }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Ville</span>
                    <input
                      type="text"
                      value={clientForm.city}
                      onChange={(event) =>
                        setClientForm((form) => ({ ...form, city: event.target.value }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="md:col-span-2 space-y-1">
                    <span className="text-xs text-slate-500">
                      {clientForm.type === 'individual' ? 'Adresse (optionnelle)' : 'Adresse'}
                    </span>
                    <input
                      type="text"
                      value={clientForm.address}
                      onChange={(event) =>
                        setClientForm((form) => ({ ...form, address: event.target.value }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="md:col-span-2 space-y-1">
                    <span className="text-xs text-slate-500">Tags</span>
                    <input
                      type="text"
                      value={clientForm.tags}
                      onChange={(event) =>
                        setClientForm((form) => ({ ...form, tags: event.target.value }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Séparés par une virgule"
                    />
                  </label>
                </div>
              </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-900">Contact principal</p>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">Prénom *</span>
                  <input
                    type="text"
                    value={creationContactForm.firstName}
                    onChange={(event) =>
                      setCreationContactForm((form) => ({ ...form, firstName: event.target.value }))
                    }
                    className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">Nom *</span>
                  <input
                    type="text"
                    value={creationContactForm.lastName}
                    onChange={(event) =>
                      setCreationContactForm((form) => ({ ...form, lastName: event.target.value }))
                    }
                    className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">Mobile *</span>
                  <input
                    type="tel"
                    value={creationContactForm.mobile}
                    onChange={(event) =>
                      setCreationContactForm((form) => ({ ...form, mobile: event.target.value }))
                    }
                    className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="md:col-span-2 space-y-1">
                  <span className="text-xs text-slate-500">Email *</span>
                  <input
                    type="email"
                    value={creationContactForm.email}
                    onChange={(event) =>
                      setCreationContactForm((form) => ({ ...form, email: event.target.value }))
                    }
                    className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500">Rôles *</span>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    {contactRoleOptions.map((role) => {
                      const active = creationContactForm.roles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() =>
                            setCreationContactForm((form) => ({
                              ...form,
                              roles: toggleRole(form.roles, role),
                            }))
                          }
                          className={clsx(
                            'rounded-full border px-3 py-1 transition',
                            active
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-300 text-slate-600 hover:border-slate-400'
                          )}
                        >
                          {roleLabels[role]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={creationContactForm.isBillingDefault}
                    onChange={(event) =>
                      setCreationContactForm((form) => ({
                        ...form,
                        isBillingDefault: event.target.checked,
                      }))
                    }
                    className="table-checkbox h-4 w-4 rounded focus:ring-primary/40"
                  />
                  <span>Définir comme contact de facturation</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreationOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                Créer le client
              </Button>
            </div>
          </form>
          </Card>
        </div>
      )}

      {selectedClient && (
        <div ref={detailSectionRef}>
          <Card padding="md" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p ref={detailFocusRef} tabIndex={-1} className="text-sm font-semibold text-slate-900 focus:outline-none">
                  {selectedClient.name}
                </p>
                <p className="text-xs text-slate-500">
                  {selectedClient.type === 'company'
                    ? `SIRET ${selectedClient.siret || '—'}`
                    : 'Client particulier'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingClient((value) => !value)}>
                {isEditingClient ? 'Annuler' : 'Modifier'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={closeDetail}>
                Fermer
              </Button>
            </div>

          <div className="space-y-4">
            {isEditingClient ? (
              <form onSubmit={handleUpdateClient} className="space-y-6 text-sm text-slate-700">
                <div className="space-y-2">
                  <span className="text-xs text-slate-500">Type de client</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditClientType('company')}
                      className={clsx(
                        'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition',
                        editClientForm.type === 'company'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-300 text-slate-600 hover:border-slate-400'
                      )}
                    >
                      Société
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditClientType('individual')}
                      className={clsx(
                        'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition',
                        editClientForm.type === 'individual'
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-300 text-slate-600 hover:border-slate-400'
                      )}
                    >
                      Particulier
                    </button>
                  </div>
                </div>
                {editClientForm.type === 'company' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Nom société *</span>
                      <input
                        type="text"
                        value={editClientForm.companyName}
                        onChange={(event) =>
                          setEditClientForm((form) => ({ ...form, companyName: event.target.value }))
                        }
                        className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">SIRET</span>
                      <input
                        type="text"
                        value={editClientForm.siret}
                        onChange={(event) =>
                          setEditClientForm((form) => ({ ...form, siret: event.target.value }))
                        }
                        className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Prénom *</span>
                      <input
                        type="text"
                        value={editClientForm.firstName}
                        onChange={(event) =>
                          setEditClientForm((form) => ({ ...form, firstName: event.target.value }))
                        }
                        className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-500">Nom *</span>
                      <input
                        type="text"
                        value={editClientForm.lastName}
                        onChange={(event) =>
                          setEditClientForm((form) => ({ ...form, lastName: event.target.value }))
                        }
                        className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Statut</span>
                    <select
                      value={editClientForm.status}
                      onChange={(event) =>
                        setEditClientForm((form) => ({
                          ...form,
                          status: event.target.value as Client['status'],
                        }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="Actif">Actif</option>
                      <option value="Prospect">Prospect</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Email</span>
                    <input
                      type="email"
                      value={editClientForm.email}
                      onChange={(event) =>
                        setEditClientForm((form) => ({ ...form, email: event.target.value }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Téléphone</span>
                    <input
                      type="tel"
                      value={editClientForm.phone}
                      onChange={(event) =>
                        setEditClientForm((form) => ({ ...form, phone: event.target.value }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500">Ville</span>
                    <input
                      type="text"
                      value={editClientForm.city}
                      onChange={(event) =>
                        setEditClientForm((form) => ({ ...form, city: event.target.value }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="md:col-span-3 space-y-1">
                    <span className="text-xs text-slate-500">
                      {editClientForm.type === 'individual' ? 'Adresse (optionnelle)' : 'Adresse'}
                    </span>
                    <input
                      type="text"
                      value={editClientForm.address}
                      onChange={(event) =>
                        setEditClientForm((form) => ({ ...form, address: event.target.value }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                  <label className="md:col-span-3 space-y-1">
                    <span className="text-xs text-slate-500">Tags</span>
                    <input
                      type="text"
                      value={editClientForm.tags}
                      onChange={(event) =>
                        setEditClientForm((form) => ({ ...form, tags: event.target.value }))
                      }
                      className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Séparés par une virgule"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingClient(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm">
                    Enregistrer
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid gap-4 text-xs text-slate-600 md:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Contact facturation</p>
                  <p className="text-sm text-slate-900">
                    {billingContact ? `${billingContact.firstName} ${billingContact.lastName}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Coordonnées</p>
                  <p>{selectedClient.email || '—'}</p>
                  <p>{selectedClient.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Adresse</p>
                  <p>{selectedClient.address || '—'}</p>
                  <p>{selectedClient.city || '—'}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Contacts</p>
              {hasPermission('client.contact.add') && (
                <Button type="button" size="sm" variant="secondary" onClick={() => openContactForm()}>
                  Ajouter un contact
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {selectedClient.contacts.map((contact) => {
                const isUsed = (contactUsage.get(contact.id) ?? 0) > 0;
                return (
                  <div
                    key={contact.id}
                    className={clsx(
                      'rounded-soft border px-4 py-3 text-xs transition',
                      contact.active ? 'border-slate-200 bg-white' : 'border-dashed border-slate-300 bg-slate-50'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <p className="text-slate-600">{contact.email}</p>
                        <p className="text-slate-600">{contact.mobile}</p>
                        <div className="flex flex-wrap gap-2">
                          {contact.roles.map((role) => (
                            <Tag key={role}>{roleLabels[role]}</Tag>
                          ))}
                          {contact.isBillingDefault && <Tag>Facturation par défaut</Tag>}
                          {!contact.active && <Tag>Archivé</Tag>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="px-2"
                          onClick={() => openContactForm(contact)}
                        >
                          Modifier
                        </Button>
                        {contact.active ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="px-2"
                            onClick={() => handleArchiveContact(selectedClient.id, contact)}
                          >
                            Archiver
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="px-2"
                            onClick={() => handleRestoreContact(selectedClient.id, contact)}
                          >
                            Restaurer
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="px-2"
                          onClick={() => handleSetBillingContact(selectedClient.id, contact.id)}
                          disabled={!contact.active}
                        >
                          Définir facturation
                        </Button>
                        {isUsed && (
                          <p className="text-[10px] text-slate-500">Utilisé dans {contactUsage.get(contact.id)} document(s)</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isContactFormOpen && (
            <div className="space-y-4 rounded-soft border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  {editingContactId ? 'Modifier le contact' : 'Nouveau contact'}
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={closeContactForm}>
                  Fermer
                </Button>
              </div>
              <form onSubmit={handleContactSubmit} className="grid gap-4 md:grid-cols-3 text-sm text-slate-700">
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">Prénom *</span>
                  <input
                    type="text"
                    name="contact-first-name"
                    value={contactForm.firstName}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setContactForm((form) => ({ ...form, firstName: event.target.value }))
                    }
                    className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">Nom *</span>
                  <input
                    type="text"
                    value={contactForm.lastName}
                    onChange={(event) =>
                      setContactForm((form) => ({ ...form, lastName: event.target.value }))
                    }
                    className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-slate-500">Mobile *</span>
                  <input
                    type="tel"
                    value={contactForm.mobile}
                    onChange={(event) =>
                      setContactForm((form) => ({ ...form, mobile: event.target.value }))
                    }
                    className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="md:col-span-2 space-y-1">
                  <span className="text-xs text-slate-500">Email *</span>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(event) =>
                      setContactForm((form) => ({ ...form, email: event.target.value }))
                    }
                    className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <div className="space-y-1">
                  <span className="text-xs text-slate-500">Rôles *</span>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    {contactRoleOptions.map((role) => {
                      const active = contactForm.roles.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() =>
                            setContactForm((form) => ({
                              ...form,
                              roles: toggleRole(form.roles, role),
                            }))
                          }
                          className={clsx(
                            'rounded-full border px-3 py-1 transition',
                            active
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-slate-300 text-slate-600 hover:border-slate-400'
                          )}
                        >
                          {roleLabels[role]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={contactForm.isBillingDefault}
                    onChange={(event) =>
                      setContactForm((form) => ({
                        ...form,
                        isBillingDefault: event.target.checked,
                      }))
                    }
                    className="table-checkbox h-4 w-4 rounded focus:ring-primary/40"
                  />
                  <span>Définir comme contact de facturation</span>
                </label>
                <div className="md:col-span-3 flex items-center justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={closeContactForm}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm">
                    {editingContactId ? 'Enregistrer' : 'Ajouter le contact'}
                  </Button>
                </div>
              </form>
            </div>
          )}
          </Card>
        </div>
      )}

      {importConfig && (
        <Card padding="md" className="space-y-6 border border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Configuration de l’import</p>
              <p className="text-xs text-slate-500">{importConfig.fileName}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={cancelImport}>
              Annuler
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {mappingFields.map((field) => (
              <label key={field.key} className="space-y-1 text-xs text-slate-600">
                <span>
                  {field.label}
                  {field.required ? ' *' : ''}
                </span>
                <select
                  value={importConfig.mapping[field.key] ?? ''}
                  onChange={(event) =>
                    setImportConfig((config) =>
                      config
                        ? {
                            ...config,
                            mapping: {
                              ...config.mapping,
                              [field.key]: event.target.value || null,
                            },
                          }
                        : config
                    )
                  }
                  className="w-full rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Ignorer</option>
                  {importConfig.headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={cancelImport}>
              Fermer
            </Button>
            <Button type="button" size="sm" onClick={applyImport}>
              Importer
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ClientsPage;
