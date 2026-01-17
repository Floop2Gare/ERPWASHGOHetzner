import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Filter, Download, Mail, Phone, Edit2, Trash2, FileText, X, Search, Users, Flame, TrendingUp, Printer, Send, Plus, Calendar, Receipt, FileCheck, MessageSquare, CheckCircle2, Clock, XCircle, Euro, ArrowRightLeft, User, Upload } from 'lucide-react';
import clsx from 'clsx';

import { useAppData, type Client, type ClientContact, type ClientContactRole, type Engagement, type Note } from '../store/useAppData';
import { ClientService, CompanyService } from '../api';
import { formatCurrency, formatDate } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { BRAND_NAME } from '../lib/branding';
import { openEmailComposer } from '../lib/email';
import { normalisePhone } from '../lib/phone';
import { ClientPricingGridEditor } from '../components/ClientPricingGridEditor';
import {
  CRMFeedback,
  CRMBackendStatus,
  CRMBulkActions,
  CRMEmptyState,
  CRMModal,
  CRMModalHeader,
  CRMFormLabel,
  CRMFormInput,
  CRMFormSelect,
  CRMSubmitButton,
  CRMCancelButton,
  CRMErrorAlert,
} from '../components/crm';

type TableRowType = 'client_actif' | 'client_inactif';

type TableRowStatus = 'Actif' | 'Inactif';

type FilterState = {
  segment: '' | 'Entreprise' | 'Particulier';
  city: string;
  tag: string;
  status: '' | 'Actif' | 'Non actif' | 'À appeler' | 'À contacter';
};

type TableRow = {
  id: string;
  client: Client;
  contact: ClientContact | null;
  contactId: string | null;
  type: TableRowType;
  status: TableRowStatus;
  clientStatus: Client['status']; // Statut du client (Actif, Non actif, À appeler, À contacter)
  organization: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  nextActionDate: string | null;
  nextActionNote: string;
  revenue: number;
  segment: 'Entreprise' | 'Particulier';
  tags: string[];
  avatarLabel: string;
  contactCount: number;
};

const statusConfig: Record<TableRowStatus, { label: string; color: string }> = {
  Actif: {
    label: 'Actif',
    color: 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)]',
  },
  Inactif: {
    label: 'Inactif',
    color: 'bg-slate-200 text-slate-700 border border-slate-300 shadow-[0_1px_0_rgba(148,163,184,0.35)]',
  },
};

const segmentConfig: Record<'Entreprise' | 'Particulier', { label: string; color: string }> = {
  Entreprise: { label: 'Professionnel', color: 'bg-purple-200 text-purple-800' },
  Particulier: { label: 'Particulier', color: 'bg-blue-200 text-blue-800' },
};

const getInitials = (value: string) => {
  const parts = value
    .split(' ')
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (!parts.length) {
    return '??';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

const buildRow = (
  client: Client,
  revenue: number
): TableRow => {
  const activeContacts = client.contacts.filter((contact) => contact.active);
  const primaryContact =
    activeContacts.find((contact) => contact.isBillingDefault) ?? activeContacts[0] ?? null;
  const hasActiveContacts = activeContacts.length > 0;
  const type: TableRowType =
    hasActiveContacts && client.status === 'Actif'
      ? 'client_actif'
      : 'client_inactif';
  // Un client est actif s'il a des contacts actifs et que son statut est 'Actif'
  const status: TableRowStatus = hasActiveContacts && client.status === 'Actif' ? 'Actif' : 'Inactif';

  const email = primaryContact?.email || client.email || '';
  const phone = primaryContact?.mobile || client.phone || '';
  const organization = client.name;
  const contactName = primaryContact
    ? `${primaryContact.firstName} ${primaryContact.lastName}`.trim()
    : '';

  return {
    id: client.id,
    client,
    contact: primaryContact,
    contactId: primaryContact?.id ?? null,
    type,
    status,
    clientStatus: client.status || 'Actif', // Statut du client
    organization,
    contactName,
    email,
    phone,
    city: client.city ?? '',
    nextActionDate: client.nextActionDate || null,
    nextActionNote: client.nextActionNote || '',
    revenue,
    segment: client.type === 'company' ? 'Entreprise' : 'Particulier',
    tags: client.tags,
    avatarLabel: primaryContact
      ? getInitials(`${primaryContact.firstName} ${primaryContact.lastName}`)
      : getInitials(client.name),
    contactCount: activeContacts.length,
  };
};

const formatPhoneForDial = (phone: string) => phone.replace(/\s+/g, '');

type CreateClientFormState = {
  type: Client['type'];
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  siret: string;
  tags: string;
  status: Client['status'];
  nextActionDate: string;
  nextActionNote: string;
};

const CREATE_CLIENT_DEFAULTS: CreateClientFormState = {
  type: 'company',
  companyName: '',
  contactFirstName: '',
  contactLastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  siret: '',
  tags: '',
  status: 'Actif',
  nextActionDate: '',
  nextActionNote: '',
};

const ClientsPage = () => {
  const navigate = useNavigate();
  const {
    clients,
    getClientRevenue,
    removeClient,
    hasPermission,
    setPendingEngagementSeed,
    activeCompanyId,
    addClient,
    updateClient,
    getClientEngagements,
    notes,
    services,
    computeEngagementTotals,
    companies,
  } = useAppData();

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    segment: '',
    city: '',
    tag: '',
    status: '',
  });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [backendLoading, setBackendLoading] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [createClientForm, setCreateClientForm] = useState<CreateClientFormState>(() => ({
    ...CREATE_CLIENT_DEFAULTS,
  }));
  const [createClientError, setCreateClientError] = useState<string | null>(null);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editClientForm, setEditClientForm] = useState<CreateClientFormState>(() => ({
    ...CREATE_CLIENT_DEFAULTS,
  }));
  const [editClientError, setEditClientError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'devis' | 'factures' | 'notes' | 'pricing' | 'contacts'>('services');
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [createContactForm, setCreateContactForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    roles: ClientContactRole[];
    isBillingDefault: boolean;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    roles: [],
    isBillingDefault: false,
  });

  const handleSubmitContact = useCallback(() => {
    if (!editingClientId) return;
    const editingClient = clients.find((c) => c.id === editingClientId);
    if (!editingClient) return;

    const newContact: ClientContact = {
      id: editingContactId || `contact-${Date.now()}-${Math.random()}`,
      firstName: createContactForm.firstName.trim(),
      lastName: createContactForm.lastName.trim(),
      email: createContactForm.email.trim(),
      mobile: createContactForm.mobile.trim(),
      roles: createContactForm.roles,
      isBillingDefault: createContactForm.isBillingDefault,
      active: true,
    };

    let updatedContacts: ClientContact[];
    if (editingContactId) {
      // Édition
      updatedContacts = editingClient.contacts.map((c) =>
        c.id === editingContactId ? newContact : c
      );
      // Si on met à jour le contact facturation par défaut, retirer le flag des autres
      if (newContact.isBillingDefault) {
        updatedContacts = updatedContacts.map((c) =>
          c.id !== editingContactId && c.isBillingDefault ? { ...c, isBillingDefault: false } : c
        );
      }
    } else {
      // Création
      // Si c'est le contact facturation par défaut, retirer le flag des autres
      if (newContact.isBillingDefault) {
        updatedContacts = editingClient.contacts.map((c) => ({ ...c, isBillingDefault: false }));
      } else {
        updatedContacts = [...editingClient.contacts];
      }
      updatedContacts.push(newContact);
    }

    updateClient(editingClientId, {
      ...editingClient,
      contacts: updatedContacts,
    });

    setShowCreateContactModal(false);
    setEditingContactId(null);
    setCreateContactForm({
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      roles: [],
      isBillingDefault: false,
    });
    setFeedbackMessage(editingContactId ? 'Contact modifié avec succès.' : 'Contact ajouté avec succès.');
  }, [editingClientId, editingContactId, createContactForm, clients, updateClient]);

  const closeCreateContactModal = useCallback(() => {
    setShowCreateContactModal(false);
    setEditingContactId(null);
    setCreateContactForm({
      firstName: '',
      lastName: '',
      email: '',
      mobile: '',
      roles: [],
      isBillingDefault: false,
    });
  }, []);
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetCompanyId, setTransferTargetCompanyId] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [showImportTooltip, setShowImportTooltip] = useState(false);
  const importTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const tableData = useMemo<TableRow[]>(() => {
    return clients
      .map((client) => buildRow(client, getClientRevenue(client.id) ?? 0))
      .sort((a, b) => a.organization.localeCompare(b.organization, 'fr', { sensitivity: 'base' }));
  }, [clients, getClientRevenue]);

  // Fonction pour charger les clients depuis le backend
  const loadClientsFromBackend = useCallback(async () => {
    if (!activeCompanyId) {
      (useAppData as any).setState({ clients: [] });
      return;
    }
    
    try {
      setBackendLoading(true);
      setBackendError(null);
      const result = await ClientService.getClients();
      if (result.success && Array.isArray(result.data)) {
        // Mappage minimal → le backend renvoie déjà nos objets (JSONB)
        const mapped: Client[] = result.data.map((c: any) => ({
          id: c.id,
          type: c.type ?? 'company',
          name: c.name ?? '',
          companyName: c.type === 'company' ? (c.companyName ?? c.name ?? '') : null,
          firstName: c.type === 'individual' ? (c.firstName ?? null) : null,
          lastName: c.type === 'individual' ? (c.lastName ?? null) : null,
          siret: c.siret ?? '',
          email: c.email ?? '',
          phone: c.phone ?? '',
          address: c.address ?? '',
          city: c.city ?? '',
          status: c.status ?? 'Actif',
          tags: Array.isArray(c.tags) ? c.tags : [],
          lastService: c.lastService ?? null,
          contacts: Array.isArray(c.contacts) ? c.contacts : [],
        }));
        // Remplace les clients du store par la réponse backend
        (useAppData as any).setState({ clients: mapped });
      } else if (!result.success) {
        setBackendError(result.error || 'Erreur lors du chargement des clients.');
      }
    } catch (error: any) {
      setBackendError(error?.message || 'Erreur lors du chargement des clients.');
    } finally {
      setBackendLoading(false);
    }
  }, [activeCompanyId]);

  // Chargement initial et rechargement au changement d'entreprise
  useEffect(() => {
    loadClientsFromBackend();
  }, [loadClientsFromBackend]);

  useEffect(() => {
    setSelectedRows((current) => {
      const next = new Set<string>();
      tableData.forEach((row) => {
        if (current.has(row.id)) {
          next.add(row.id);
        }
      });
      return next;
    });
  }, [tableData]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const uniqueSegments = useMemo(() => {
    const segments = new Set<'Entreprise' | 'Particulier'>();
    tableData.forEach((row) => segments.add(row.segment));
    return Array.from(segments).sort();
  }, [tableData]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    tableData.forEach((row) => {
      if (row.city) {
        cities.add(row.city);
      }
    });
    return Array.from(cities).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [tableData]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    tableData.forEach((row) => row.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [tableData]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<Client['status']>();
    tableData.forEach((row) => {
      if (row.clientStatus) {
        statuses.add(row.clientStatus);
      }
    });
    return Array.from(statuses).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [tableData]);

  const filteredData = useMemo(() => {
    return tableData.filter((row) => {
      if (filters.segment && row.segment !== filters.segment) {
        return false;
      }
      if (filters.city && row.city !== filters.city) {
        return false;
      }
      if (filters.tag && !row.tags.includes(filters.tag)) {
        return false;
      }
      if (filters.status && row.clientStatus !== filters.status) {
        return false;
      }
      return true;
    });
  }, [filters, tableData]);

  const selectedData = useMemo(() => {
    return filteredData.filter((row) => selectedRows.has(row.id));
  }, [filteredData, selectedRows]);

  const activeFiltersCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

  const toggleRowSelection = (id: string) => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected = useMemo(
    () => filteredData.length > 0 && filteredData.every((row) => selectedRows.has(row.id)),
    [filteredData, selectedRows]
  );

  const handleToggleSelectAll = () => {
    if (allSelected) {
      // Désélectionner tous les éléments filtrés
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredData.forEach((row) => next.delete(row.id));
        return next;
      });
    } else {
      // Sélectionner tous les éléments filtrés
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredData.forEach((row) => next.add(row.id));
        return next;
      });
    }
  };

  const setFeedbackMessage = (message: string) => {
    setFeedback(message);
  };

  const sendEmail = (row: TableRow, silent = false) => {
    if (!row.email) {
      if (!silent) {
        setFeedbackMessage('Aucune adresse e-mail disponible pour ce client.');
      }
      return false;
    }
    const displayName = row.contactName || row.organization;
    const subject = `${BRAND_NAME} – Contact client ${row.organization}`;
    const body = `Bonjour ${displayName},\n\nJe reviens vers vous au sujet de [objet].\nN'hésitez pas à me répondre directement à ce mail.\n\nCordialement,\n${BRAND_NAME}`;
    openEmailComposer({ to: [row.email], subject, body });
    if (!silent) {
      setFeedbackMessage('E-mail préparé dans Gmail.');
    }
    return true;
  };

  const handleCall = (row: TableRow) => {
    if (!row.phone) {
      setFeedbackMessage('Aucun numéro de téléphone disponible.');
      return;
    }
    window.open(`tel:${formatPhoneForDial(row.phone)}`, '_self');
  };

  const handleCreateDocument = (row: TableRow, kind: 'devis' | 'facture') => {
    setPendingEngagementSeed({
      kind,
      clientId: row.id,
      companyId: activeCompanyId ?? null,
      contactIds: row.contactId ? [row.contactId] : [],
    });
    navigate('/workspace/crm/services');
  };

  const handleArchive = (row: TableRow) => {
    if (!hasPermission('client.archive')) {
      return;
    }
    const confirmed = window.confirm(
      `Archiver le client « ${row.organization} » ?`
    );
    if (!confirmed) {
      return;
    }
    removeClient(row.id);
    setSelectedRows((current) => {
      const next = new Set(current);
      next.delete(row.id);
      return next;
    });
    setFeedbackMessage(`Client « ${row.organization} » archivé.`);
  };

  const handleBulkArchive = () => {
    if (!hasPermission('client.archive') || !selectedData.length) {
      return;
    }
    const confirmed = window.confirm(
      `Archiver ${selectedData.length} client(s) sélectionné(s) ?`
    );
    if (!confirmed) {
      return;
    }
    selectedData.forEach((row) => removeClient(row.id));
    setSelectedRows(new Set());
    setFeedbackMessage(`${selectedData.length} client(s) archivé(s).`);
  };

  const handleBulkEmail = () => {
    if (!hasPermission('client.email')) {
      return;
    }
    if (!selectedData.length) {
      return;
    }
    let success = 0;
    selectedData.forEach((row) => {
      if (sendEmail(row, true)) {
        success += 1;
      }
    });
    if (success > 0) {
      setFeedbackMessage(`${success} e-mail(s) préparé(s) dans Gmail.`);
    } else {
      setFeedbackMessage('Aucun e-mail à préparer pour la sélection.');
    }
  };

  const openTransferModal = useCallback(async () => {
    const selectedCount = selectedRows.size;
    if (selectedCount === 0) {
      setFeedbackMessage('Veuillez sélectionner au moins un client à transférer.');
      return;
    }
    
    // Ouvrir la modale immédiatement
    setShowTransferModal(true);
    setTransferError(null);
    setTransferLoading(true);
    setTransferTargetCompanyId('');
    
    try {
      const result = await CompanyService.getAll();
      if (result.success && Array.isArray(result.data)) {
        const companiesList = result.data
          .filter((c: any) => c.id !== activeCompanyId) // Exclure l'entreprise actuelle
          .map((c: any) => ({ id: c.id, name: c.name || c.id }));
        setAvailableCompanies(companiesList);
        if (companiesList.length === 0) {
          setTransferError('Aucune autre entreprise disponible pour le transfert.');
        } else {
          setTransferTargetCompanyId(companiesList[0]?.id || '');
        }
      } else {
        setTransferError('Impossible de charger la liste des entreprises.');
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des entreprises:', error);
      setTransferError(error?.message || 'Erreur lors du chargement des entreprises.');
    } finally {
      setTransferLoading(false);
    }
  }, [selectedRows.size, activeCompanyId]);

  const handleBulkTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!selectedData.length || !transferTargetCompanyId) {
      setTransferError('Veuillez sélectionner une entreprise de destination.');
      return;
    }

    try {
      setTransferLoading(true);
      setTransferError(null);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const row of selectedData) {
        try {
          const result = await ClientService.transfer(row.id, transferTargetCompanyId);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        setFeedbackMessage(`${successCount} client(s) transféré(s) avec succès.`);
        setSelectedRows(new Set());
        setShowTransferModal(false);
        setTransferTargetCompanyId('');
        // Recharger les clients depuis le backend
        await loadClientsFromBackend();
      }
      
      if (errorCount > 0) {
        setTransferError(`${errorCount} client(s) n'ont pas pu être transféré(s).`);
      }
    } catch (error: any) {
      setTransferError(error?.message || 'Erreur lors du transfert des clients.');
    } finally {
      setTransferLoading(false);
    }
  };

  const closeTransferModal = useCallback(() => {
    setShowTransferModal(false);
    setTransferTargetCompanyId('');
    setTransferError(null);
  }, []);

  const handleBulkPrint = () => {
    if (!selectedData.length) {
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setFeedbackMessage('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les fenêtres pop-up.');
      return;
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Liste des clients - ${BRAND_NAME}</title>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            h1 {
              color: #1e40af;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #3b82f6;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .header-info {
              margin-bottom: 20px;
              padding: 10px;
              background-color: #eff6ff;
              border-left: 4px solid #3b82f6;
            }
            @media print {
              body {
                margin: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <h1>Liste des clients - ${BRAND_NAME}</h1>
          <div class="header-info">
            <p><strong>Date d'impression :</strong> ${new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Nombre de clients :</strong> ${selectedData.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Ville</th>
                <th>Chiffre d'affaires</th>
                <th>Dernière prestation</th>
              </tr>
            </thead>
            <tbody>
              ${selectedData.map((row) => `
                <tr>
                  <td>${row.organization}</td>
                  <td>${row.contactName || '—'}</td>
                  <td>${row.email || '—'}</td>
                  <td>${row.phone || '—'}</td>
                  <td>${row.city || '—'}</td>
                  <td>${formatCurrency(row.revenue)}</td>
                  <td>${row.nextActionDate ? formatDate(row.nextActionDate) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    setFeedbackMessage(`${selectedData.length} client(s) prêt(s) à imprimer.`);
  };

  const handleBulkDelete = () => {
    if (!hasPermission('client.archive') || !selectedData.length) {
      return;
    }
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer définitivement ${selectedData.length} client(s) sélectionné(s) ? Cette action est irréversible.`
    );
    if (!confirmed) {
      return;
    }
    selectedData.forEach((row) => removeClient(row.id));
    setSelectedRows(new Set());
    setFeedbackMessage(`${selectedData.length} client(s) supprimé(s).`);
  };

  const handleExport = () => {
    if (!filteredData.length) {
      setFeedbackMessage('Aucun client à exporter.');
      return;
    }
    const header = [
      'Organisation',
      'Type',
      'Contact principal',
      'Email',
      'Téléphone',
      'Ville',
      'Dernière prestation',
      'Note',
      'Chiffre d\'affaires HT',
      'Tags',
    ];
    const rows = filteredData.map((row) => [
      row.organization,
      row.segment,
      row.contactName || '—',
      row.email || '—',
      row.phone || '—',
      row.city || '—',
      row.nextActionDate ? formatDate(row.nextActionDate) : '—',
      row.nextActionNote,
      formatCurrency(row.revenue),
      row.tags.join(', '),
    ]);
    downloadCsv({ fileName: 'clients.csv', header, rows });
    setFeedbackMessage(`${rows.length} client(s) exporté(s).`);
  };

  const handleDownloadTemplate = () => {
    // Colonnes adaptées aux clients (différentes des leads)
    const header = [
      'Entreprise',
      'Particulier',
      'Prénom',
      'Nom',
      'Email',
      'Téléphone',
      'Adresse',
      'Ville',
      'SIRET',
      'Statut',
      'Tags',
    ];

    // Créer un fichier CSV avec les en-têtes et deux exemples
    const separator = ';';
    const headerLine = header.map((col) => {
      const escaped = col.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(separator);
    
    // Exemple 1 : Professionnel (entreprise)
    const examplePro = [
      'Exemple SARL',
      '', // Particulier vide
      'Jean',
      'Dupont',
      'jean.dupont@exemple.fr',
      '06 12 34 56 78',
      '123 Rue de la République',
      'Marseille',
      '12345678901234',
      'Actif',
      'VIP, Fidèle',
    ].map((val) => {
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(separator);
    
    // Exemple 2 : Particulier
    const examplePart = [
      '', // Entreprise vide
      'Marie Martin',
      'Marie',
      'Martin',
      'marie.martin@exemple.fr',
      '06 98 76 54 32',
      '45 Avenue des Fleurs',
      'Paris',
      '', // Pas de SIRET pour un particulier
      'Actif',
      'Récurrent',
    ].map((val) => {
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(separator);
    
    const content = '\ufeff' + headerLine + '\n' + examplePro + '\n' + examplePart + '\n'; // BOM pour Excel + en-tête + 2 exemples
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template-import-clients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setFeedbackMessage('Template téléchargé avec deux exemples (professionnel et particulier). Remplissez-le avec vos données et réimportez-le.');
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      if (lines.length <= 1) {
        setFeedbackMessage('Le fichier ne contient pas de données exploitables.');
        return;
      }
      const header = lines[0];
      const separator = header.includes(';') ? ';' : ',';
      const columns = header.split(separator).map((column) => column.trim().toLowerCase());
      const getValue = (cells: string[], key: string) => {
        const index = columns.findIndex((column) => column === key.toLowerCase());
        return index >= 0 ? cells[index]?.trim() ?? '' : '';
      };

      let importedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (const line of lines.slice(1)) {
        try {
          const cells = line.split(separator).map((cell) => cell.replace(/^"|"$/g, ''));
          const email = getValue(cells, 'email');
          const phone = getValue(cells, 'telephone') || getValue(cells, 'téléphone');
          
          // Ignorer les lignes vides ou d'exemple
          if (!email && !phone) {
            continue;
          }
          
          // Vérifier les doublons
          const normalizedEmail = email.toLowerCase();
          const normalizedPhone = normalisePhone(phone);
          if (
            clients.some(
              (client) => 
                (email && client.email && client.email.toLowerCase() === normalizedEmail) ||
                (phone && client.phone && normalisePhone(client.phone) === normalizedPhone) ||
                (email && client.contacts.some((contact) => contact.email.toLowerCase() === normalizedEmail)) ||
                (phone && client.contacts.some((contact) => normalisePhone(contact.mobile) === normalizedPhone))
            )
          ) {
            skippedCount++;
            continue;
          }

          // Récupérer les valeurs des colonnes spécifiques aux clients
          const company = getValue(cells, 'entreprise');
          const particulier = getValue(cells, 'particulier');
          const firstName = getValue(cells, 'prénom') || getValue(cells, 'prenom');
          const lastName = getValue(cells, 'nom');
          const address = getValue(cells, 'adresse');
          const city = getValue(cells, 'ville');
          const siret = getValue(cells, 'siret');
          const status = getValue(cells, 'statut') || 'Actif';
          const tagsStr = getValue(cells, 'tags');
          
          // Déterminer le type de client : si "Particulier" est rempli, c'est un particulier, sinon c'est une entreprise
          const isParticulier = particulier && particulier.trim() !== '';
          const clientType: 'company' | 'individual' = isParticulier ? 'individual' : 'company';
          
          // Construire le nom du client
          let clientName = '';
          if (isParticulier) {
            // Pour un particulier : utiliser "Particulier" ou prénom + nom
            clientName = particulier || [firstName, lastName].filter(Boolean).join(' ') || 'Client sans nom';
          } else {
            // Pour une entreprise : utiliser "Entreprise" ou prénom + nom
            clientName = company || [firstName, lastName].filter(Boolean).join(' ') || 'Client sans nom';
          }
          
          // Vérifier qu'on a au moins un nom
          if (!clientName || clientName === 'Client sans nom') {
            skippedCount++;
            continue;
          }

          // Parser les tags
          const tags = tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(Boolean) : [];

          // Créer le client
          const createdClient = addClient({
            type: clientType,
            name: clientName,
            companyName: isParticulier ? null : (company || null),
            firstName: isParticulier ? (firstName || particulier.split(' ')[0] || null) : (firstName || null),
            lastName: isParticulier ? (lastName || particulier.split(' ').slice(1).join(' ') || null) : (lastName || null),
            siret: siret || '',
            email: email || '',
            phone: phone || '',
            address: address || '',
            city: city || '',
            status: (status as Client['status']) || 'Actif',
            tags: tags,
            contacts: (email || phone) ? [{
              id: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              firstName: firstName || '',
              lastName: lastName || '',
              email: email || '',
              mobile: phone || '',
              roles: ['facturation'],
              isBillingDefault: true,
              active: true,
            }] : [],
          });

          importedCount++;
        } catch (error) {
          errors.push(`Ligne ${lines.indexOf(line) + 1}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }

      // Recharger les clients depuis le backend après l'import
      await loadClientsFromBackend();

      let message = `${importedCount} client(s) importé(s) avec succès.`;
      if (skippedCount > 0) {
        message += ` ${skippedCount} client(s) ignoré(s) (doublons ou données manquantes).`;
      }
      if (errors.length > 0) {
        message += ` ${errors.length} erreur(s) lors de l'import.`;
        console.error('Erreurs d\'import:', errors);
      }
      setFeedbackMessage(message);
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      setFeedbackMessage(`Erreur lors de l'import : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  // Nettoyer le timeout au démontage
  useEffect(() => {
    return () => {
      if (importTooltipTimeoutRef.current) {
        clearTimeout(importTooltipTimeoutRef.current);
      }
    };
  }, []);

  const openEditClientModal = useCallback((clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) {
      return;
    }

    const primaryContact = client.contacts.find((contact) => contact.active && contact.isBillingDefault) 
      ?? client.contacts.find((contact) => contact.active) 
      ?? null;

    setEditingClientId(clientId);
    setEditClientForm({
      type: client.type,
      companyName: client.companyName || client.name || '',
      contactFirstName: primaryContact?.firstName || client.firstName || '',
      contactLastName: primaryContact?.lastName || client.lastName || '',
      email: primaryContact?.email || client.email || '',
      phone: primaryContact?.mobile || client.phone || '',
      address: client.address || '',
      city: client.city || '',
      siret: client.siret || '',
      tags: client.tags.join(', '),
      status: client.status || 'Actif',
    });
    setEditClientError(null);
    setActiveTab('services');
    setNewNoteContent('');
    setShowEditClientModal(true);
  }, [clients]);

  const closeEditClientModal = useCallback(() => {
    setShowEditClientModal(false);
    setEditingClientId(null);
    setEditClientForm({ ...CREATE_CLIENT_DEFAULTS });
    setEditClientError(null);
    setActiveTab('services');
    setNewNoteContent('');
  }, []);

  const handleSubmitEditClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingClientId) {
      return;
    }

    const companyName = editClientForm.companyName.trim();
    const firstName = editClientForm.contactFirstName.trim();
    const lastName = editClientForm.contactLastName.trim();
    const email = editClientForm.email.trim();
    const phone = editClientForm.phone.trim();
    const address = editClientForm.address.trim();
    const city = editClientForm.city.trim();
    const siret = editClientForm.type === 'company' ? editClientForm.siret.trim() : '';
    const tags = editClientForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (editClientForm.type === 'company' && !companyName) {
      setEditClientError("Renseignez le nom de l'entreprise.");
      return;
    }

    if (editClientForm.type === 'individual' && !firstName && !lastName) {
      setEditClientError('Renseignez au moins un prénom ou un nom.');
      return;
    }

    const displayName =
      editClientForm.type === 'company'
        ? companyName || [firstName, lastName].filter(Boolean).join(' ') || 'Client sans nom'
        : [firstName, lastName].filter(Boolean).join(' ') || companyName || 'Client sans nom';

    const updated = updateClient(editingClientId, {
      type: editClientForm.type,
      name: displayName,
      companyName: editClientForm.type === 'company' ? companyName : null,
      firstName: editClientForm.type === 'individual' ? firstName : null,
      lastName: editClientForm.type === 'individual' ? lastName : null,
      siret,
      email,
      phone,
      address,
      city,
      status: editClientForm.status,
      tags,
    });

    if (updated) {
      setFeedbackMessage(`Client « ${updated.name} » mis à jour avec succès.`);
      closeEditClientModal();
    } else {
      setEditClientError('Une erreur est survenue lors de la mise à jour du client.');
    }
  };

  const resetCreateClientForm = useCallback(() => {
    setCreateClientForm({ ...CREATE_CLIENT_DEFAULTS });
    setCreateClientError(null);
  }, []);

  const openCreateClientModal = useCallback(() => {
    resetCreateClientForm();
    setShowCreateClientModal(true);
  }, [resetCreateClientForm]);

  const closeCreateClientModal = useCallback(() => {
    setShowCreateClientModal(false);
    resetCreateClientForm();
  }, [resetCreateClientForm]);

  const handleSubmitCreateClient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const companyName = createClientForm.companyName.trim();
    const firstName = createClientForm.contactFirstName.trim();
    const lastName = createClientForm.contactLastName.trim();
    const email = createClientForm.email.trim();
    const phone = createClientForm.phone.trim();
    const address = createClientForm.address.trim();
    const city = createClientForm.city.trim();
    const siret = createClientForm.type === 'company' ? createClientForm.siret.trim() : '';
    const tags = createClientForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (createClientForm.type === 'company' && !companyName) {
      setCreateClientError("Renseignez le nom de l'entreprise.");
      return;
    }

    if (createClientForm.type === 'individual' && !firstName && !lastName) {
      setCreateClientError('Renseignez au moins un prénom ou un nom.');
      return;
    }

    const displayName =
      createClientForm.type === 'company'
        ? companyName || [firstName, lastName].filter(Boolean).join(' ') || 'Client sans nom'
        : [firstName, lastName].filter(Boolean).join(' ') || companyName || 'Client sans nom';

    const hasContactDetails = Boolean(firstName || lastName || email || phone);

    const createdClient = addClient({
      type: createClientForm.type,
      name: displayName,
      companyName: createClientForm.type === 'company' ? companyName : null,
      firstName: firstName || null,
      lastName: lastName || null,
      siret,
      email,
      phone,
      address,
      city,
      status: createClientForm.status,
      tags,
      contacts: hasContactDetails
        ? [
            {
              id: `ct-temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              firstName: firstName || '',
              lastName: lastName || '',
              email,
              mobile: phone,
              roles: ['facturation'],
              isBillingDefault: true,
              active: true,
            },
          ]
        : [],
    });

    setFeedbackMessage(`Client « ${createdClient.name} » créé avec succès.`);
    closeCreateClientModal();
  };

  useEffect(() => {
    if (!showCreateClientModal && !showEditClientModal) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (showCreateClientModal) {
          closeCreateClientModal();
        }
        if (showEditClientModal) {
          closeEditClientModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCreateClientModal, showEditClientModal, closeCreateClientModal, closeEditClientModal]);

  const totalRevenue = useMemo(
    () => filteredData.reduce((acc, row) => acc + row.revenue, 0),
    [filteredData]
  );

  const clientKpis = useMemo(() => {
    const totalClients = filteredData.length;
    const activeClients = filteredData.filter((row) => row.status === 'Actif').length;
    const inactiveClients = filteredData.filter((row) => row.status === 'Inactif').length;
    const averageRevenue = totalClients > 0 ? totalRevenue / totalClients : 0;

    return [
      {
        id: 'total',
        label: 'Clients suivis',
        value: totalClients.toLocaleString('fr-FR'),
        helper: `${activeClients.toLocaleString('fr-FR')} actifs`,
      },
      {
        id: 'inactive',
        label: 'Clients inactifs',
        value: inactiveClients.toLocaleString('fr-FR'),
        helper: 'Clients non actifs',
      },
      {
        id: 'avg-revenue',
        label: 'CA moyen / client',
        value: formatCurrency(averageRevenue),
        helper: `Total ${formatCurrency(totalRevenue)}`,
      },
    ];
  }, [filteredData, totalRevenue]);


  return (
    <div className="dashboard-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Gestion CRM</p>
            <h1 className="dashboard-hero__title">Clients</h1>
            <p className="dashboard-hero__subtitle">
              Gérez vos prospects et clients en un seul endroit
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      <CRMFeedback message={feedback} />

      <section className="space-y-4">
        <CRMBackendStatus
          loading={backendLoading}
          error={backendError}
          loadingMessage="Synchronisation des clients avec le serveur…"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clientKpis.map((kpi, index) => {
            const Icon = [Users, Flame, TrendingUp][index] ?? Users;
            return (
              <div key={kpi.label} className="dashboard-kpi group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="dashboard-kpi__eyebrow">{kpi.label}</p>
                    <p className="dashboard-kpi__value">{kpi.value}</p>
                    <p className="dashboard-kpi__description">{kpi.helper}</p>
                  </div>
                  <div className="dashboard-kpi__icon">
                    <Icon />
                  </div>
                </div>
                <div className="dashboard-kpi__glow" aria-hidden />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tout sélectionner</span>
                </div>
                <CRMBulkActions
                  selectedCount={selectedRows.size}
                  actions={[
                    {
                      label: 'Imprimer',
                      icon: <Printer className="h-4 w-4" />,
                      onClick: handleBulkPrint,
                    },
                    ...(hasPermission('client.email')
                      ? [
                          {
                            label: 'Envoyer',
                            icon: <Send className="h-4 w-4" />,
                            onClick: handleBulkEmail,
                          },
                        ]
                      : []),
                    {
                      label: 'Transférer',
                      icon: <ArrowRightLeft className="h-4 w-4" />,
                      onClick: openTransferModal,
                    },
                    ...(hasPermission('client.archive')
                      ? [
                          {
                            label: 'Archiver',
                            onClick: handleBulkArchive,
                            variant: 'danger' as const,
                          },
                          {
                            label: 'Supprimer',
                            icon: <Trash2 className="h-4 w-4" />,
                            onClick: handleBulkDelete,
                            variant: 'danger' as const,
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
                <button
                  type="button"
                  onClick={() => setShowFilters((value) => !value)}
                  className={clsx(
                    'relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                    showFilters || activeFiltersCount > 0
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/40'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white dark:bg-blue-500">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                {hasPermission('client.edit') && (
                  <div 
                    className="group relative"
                    onMouseEnter={() => {
                      if (importTooltipTimeoutRef.current) {
                        clearTimeout(importTooltipTimeoutRef.current);
                        importTooltipTimeoutRef.current = null;
                      }
                      setShowImportTooltip(true);
                    }}
                    onMouseLeave={() => {
                      // Délai de 300ms avant de fermer le tooltip
                      importTooltipTimeoutRef.current = setTimeout(() => {
                        setShowImportTooltip(false);
                      }, 300);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => importInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="hidden sm:inline">Import</span>
                    </button>
                    {/* Tooltip simple qui reste ouvert au survol */}
                    {showImportTooltip && (
                      <div 
                        className="pointer-events-auto absolute bottom-full right-0 mb-2 z-50 w-72 rounded-lg border-2 border-slate-300 bg-white p-3 shadow-xl dark:border-slate-600 dark:bg-slate-800"
                        onMouseEnter={() => {
                          if (importTooltipTimeoutRef.current) {
                            clearTimeout(importTooltipTimeoutRef.current);
                            importTooltipTimeoutRef.current = null;
                          }
                          setShowImportTooltip(true);
                        }}
                        onMouseLeave={() => {
                          // Délai de 300ms avant de fermer le tooltip
                          importTooltipTimeoutRef.current = setTimeout(() => {
                            setShowImportTooltip(false);
                          }, 300);
                        }}
                      >
                        <div className="space-y-2.5">
                          <div>
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                              Importer des clients depuis un fichier CSV
                            </p>
                            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                              Téléchargez le template pour voir le format attendu
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadTemplate();
                            }}
                            className="w-full rounded-md border-2 border-blue-600 bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:border-blue-700 dark:bg-blue-500 dark:border-blue-500 dark:hover:bg-blue-600"
                          >
                            📥 Télécharger le template CSV
                          </button>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            <p className="mb-1 font-medium">Colonnes : Entreprise, Particulier, Prénom, Nom, Email, Téléphone, Adresse, Ville, SIRET, Statut, Tags</p>
                            <p className="mt-1 text-[9px]">Remplir soit "Entreprise" (professionnel) soit "Particulier"</p>
                          </div>
                        </div>
                        {/* Flèche pointant vers le bouton */}
                        <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 border-r-2 border-b-2 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800" />
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  type="button"
                  onClick={openCreateClientModal}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                >
                  Nouveau client
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Segment
                  </label>
                  <select
                    value={filters.segment}
                    onChange={(event) =>
                      setFilters((state) => ({
                        ...state,
                        segment: event.target.value as FilterState['segment'],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">Tous</option>
                    {uniqueSegments.map((segment) => (
                      <option key={segment} value={segment}>
                        {segment}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Statut</label>
                  <select
                    value={filters.status}
                    onChange={(event) =>
                      setFilters((state) => ({
                        ...state,
                        status: event.target.value as FilterState['status'],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">Tous</option>
                    {uniqueStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Ville</label>
                  <select
                    value={filters.city}
                    onChange={(event) =>
                      setFilters((state) => ({ ...state, city: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">Toutes</option>
                    {uniqueCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Tag</label>
                  <select
                    value={filters.tag}
                    onChange={(event) =>
                      setFilters((state) => ({ ...state, tag: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">Tous</option>
                    {uniqueTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      segment: '',
                      city: '',
                      tag: '',
                      status: '',
                    })
                  }
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <X className="h-4 w-4" />
                  Effacer les filtres
                </button>
              )}
            </div>
          )}

      </section>

      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)] lg:block">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-4 w-12" />
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Organisation / Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Dernier événement
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Chiffre d'affaires
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((row) => {
                const segmentStyle = segmentConfig[row.segment];
                return (
                  <tr
                    key={row.id}
                    className={clsx(
                      'group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer',
                      selectedRows.has(row.id) && 'bg-blue-50/50 dark:bg-blue-500/10'
                    )}
                    onClick={(e) => {
                      // Ne pas ouvrir la modale si on clique sur la checkbox, les boutons d'action ou les liens
                      const target = e.target as HTMLElement;
                      if (
                        target.closest('input[type="checkbox"]') ||
                        target.closest('button') ||
                        target.closest('a')
                      ) {
                        return;
                      }
                      openEditClientModal(row.id);
                    }}
                  >
                    <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                      <td className="px-6 py-5 align-middle text-center">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                            segmentStyle.color
                          )}
                        >
                          {segmentStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {row.organization}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{row.contactName || '—'}</p>
                            <div className="flex flex-wrap gap-1">
                              {row.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  {tag}
                                </span>
                              ))}
                              {row.tags.length > 3 && (
                                <span className="text-xs text-slate-400 dark:text-slate-500">
                                  +{row.tags.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <span className={clsx(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                          row.clientStatus === 'Actif' && 'bg-emerald-200 text-emerald-800 border border-emerald-300',
                          row.clientStatus === 'Non actif' && 'bg-slate-200 text-slate-700 border border-slate-300',
                          row.clientStatus === 'À appeler' && 'bg-orange-200 text-orange-800 border border-orange-300',
                          row.clientStatus === 'À contacter' && 'bg-purple-200 text-purple-800 border border-purple-300',
                          (!row.clientStatus || (row.clientStatus !== 'Actif' && row.clientStatus !== 'Non actif' && row.clientStatus !== 'À appeler' && row.clientStatus !== 'À contacter')) && 'bg-slate-200 text-slate-700 border border-slate-300'
                        )}>
                          {row.clientStatus || 'Actif'}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {row.nextActionDate ? formatDate(row.nextActionDate) : '—'}
                        </p>
                        <p className="max-w-[220px] truncate text-xs text-slate-600 dark:text-slate-400">
                          {row.nextActionNote}
                        </p>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(row.revenue)}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{row.segment}</p>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{row.email || '—'}</p>
                          <p>{row.phone || '—'}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{row.city || '—'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-start gap-2 opacity-100 transition group-hover:translate-x-[1px] group-hover:opacity-100">
                          {hasPermission('client.email') && (
                            <button
                              type="button"
                              onClick={() => sendEmail(row)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                              title="Email"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCall(row)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-green-100 hover:text-green-700 dark:text-slate-300 dark:hover:bg-green-900/30 dark:hover:text-green-200"
                            title="Appeler"
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                          {hasPermission('client.quote') && (
                            <button
                              type="button"
                              onClick={() => handleCreateDocument(row, 'devis')}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-purple-100 hover:text-purple-700 dark:text-slate-300 dark:hover:bg-purple-900/30 dark:hover:text-purple-200"
                              title="Créer devis"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('client.invoice') && (
                            <button
                              type="button"
                              onClick={() => handleCreateDocument(row, 'facture')}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-amber-100 hover:text-amber-600 dark:text-slate-300 dark:hover:bg-amber-900/30 dark:hover:text-amber-200"
                              title="Créer facture"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditClientModal(row.id);
                            }}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {hasPermission('client.archive') && (
                            <button
                              type="button"
                              onClick={() => handleArchive(row)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                              title="Archiver"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {filteredData.map((row) => {
          const segmentStyle = segmentConfig[row.segment];
          return (
            <div
              key={row.id}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors cursor-pointer dark:border-[var(--border)] dark:bg-[var(--surface)]"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (
                  target.closest('input[type="checkbox"]') ||
                  target.closest('button') ||
                  target.closest('a')
                ) {
                  return;
                }
                openEditClientModal(row.id);
              }}
            >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => toggleRowSelection(row.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        {row.organization}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{row.contactName || '—'}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={clsx(
                            'rounded-full px-2.5 py-1 text-xs font-medium',
                            segmentStyle.color
                          )}
                        >
                          {segmentStyle.label}
                        </span>
                        <span className={clsx(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                          row.clientStatus === 'Actif' && 'bg-emerald-200 text-emerald-800 border border-emerald-300',
                          row.clientStatus === 'Non actif' && 'bg-slate-200 text-slate-700 border border-slate-300',
                          row.clientStatus === 'À appeler' && 'bg-orange-200 text-orange-800 border border-orange-300',
                          row.clientStatus === 'À contacter' && 'bg-purple-200 text-purple-800 border border-purple-300',
                          (!row.clientStatus || (row.clientStatus !== 'Actif' && row.clientStatus !== 'Non actif' && row.clientStatus !== 'À appeler' && row.clientStatus !== 'À contacter')) && 'bg-slate-200 text-slate-700 border border-slate-300'
                        )}>
                          {row.clientStatus || 'Actif'}
                        </span>
                        {row.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Chiffre d’affaires</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {formatCurrency(row.revenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dernier événement</span>
                    <span className="text-slate-800 dark:text-slate-100">
                      {row.nextActionDate ? formatDate(row.nextActionDate) : '—'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{row.nextActionNote}</p>
                  <div className="space-y-1 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
                    <p className="dark:text-slate-200">{row.email || '—'}</p>
                    <p className="dark:text-slate-200">{row.phone || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{row.city || '—'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                  {hasPermission('client.email') && (
                    <button
                      type="button"
                      onClick={() => sendEmail(row)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/40"
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCall(row)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/40"
                  >
                    <Phone className="h-4 w-4" />
                    Appel
                  </button>
                  {hasPermission('client.quote') && (
                    <button
                      type="button"
                      onClick={() => handleCreateDocument(row, 'devis')}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-200 dark:hover:bg-purple-900/40"
                    >
                      <FileText className="h-4 w-4" />
                      Devis
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditClientModal(row.id);
                    }}
                    className="rounded-lg bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    title="Modifier"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {hasPermission('client.archive') && (
                    <button
                      type="button"
                      onClick={() => handleArchive(row)}
                      className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/40"
                      title="Archiver"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
            </div>
          </div>
          );
        })}
      </div>

      {filteredData.length === 0 && (
        <CRMEmptyState
          message="Ajustez votre recherche ou vos filtres pour retrouver vos clients."
        />
      )}

      <CRMModal isOpen={showCreateClientModal} onClose={closeCreateClientModal}>
        <form
          onSubmit={handleSubmitCreateClient}
          className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          <CRMModalHeader
            eyebrow="CRÉER UN CLIENT"
            title="Nouveau client"
            description="Renseignez les informations essentielles pour enregistrer un nouveau client."
            onClose={closeCreateClientModal}
          />

          <div className="space-y-4">
            <div className="space-y-3">
              <CRMFormLabel>Type de client</CRMFormLabel>
              <div className="inline-flex w-full items-center justify-between gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setCreateClientForm((prev) => ({ ...prev, type: 'company' }));
                    setCreateClientError(null);
                  }}
                  className={clsx(
                    'flex-1 rounded-lg px-4 py-2 transition focus-visible:outline-none',
                    createClientForm.type === 'company'
                      ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-700/20 dark:bg-purple-500 dark:ring-purple-400/20'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                  )}
                >
                  Entreprise
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateClientForm((prev) => ({ ...prev, type: 'individual', siret: '' }));
                    setCreateClientError(null);
                  }}
                  className={clsx(
                    'flex-1 rounded-lg px-4 py-2 transition focus-visible:outline-none',
                    createClientForm.type === 'individual'
                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20 dark:bg-blue-500 dark:ring-blue-400/20'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                  )}
                >
                  Particulier
                </button>
              </div>
            </div>

            <CRMErrorAlert message={createClientError} />

            <div className="grid gap-3 md:grid-cols-2">
              {createClientForm.type === 'company' && (
                <div className="md:col-span-2">
                  <CRMFormLabel htmlFor="client-name" required>
                    Raison sociale
                  </CRMFormLabel>
                  <CRMFormInput
                    id="client-name"
                    name="companyName"
                    type="text"
                    value={createClientForm.companyName}
                    onChange={(event) => {
                      setCreateClientForm((prev) => ({ ...prev, companyName: event.target.value }));
                      setCreateClientError(null);
                    }}
                    autoFocus
                    placeholder="Ex : WashGo Services"
                    required
                  />
                </div>
              )}
              {createClientForm.type === 'company' && (
                <div className="md:col-span-2">
                  <CRMFormLabel htmlFor="client-siret">Numéro SIRET</CRMFormLabel>
                  <CRMFormInput
                    id="client-siret"
                    name="siret"
                    type="text"
                    inputMode="numeric"
                    value={createClientForm.siret}
                    onChange={(event) => {
                      setCreateClientForm((prev) => ({ ...prev, siret: event.target.value }));
                      setCreateClientError(null);
                    }}
                    placeholder="123 456 789 00000"
                  />
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <CRMFormLabel htmlFor="client-first-name" required={createClientForm.type === 'individual'}>
                  Prénom
                </CRMFormLabel>
                <CRMFormInput
                  id="client-first-name"
                  name="contactFirstName"
                  type="text"
                  value={createClientForm.contactFirstName}
                  onChange={(event) => {
                    setCreateClientForm((prev) => ({ ...prev, contactFirstName: event.target.value }));
                    setCreateClientError(null);
                  }}
                  autoFocus={createClientForm.type === 'individual'}
                  placeholder="Ex : Jeanne"
                  required={createClientForm.type === 'individual' && !createClientForm.contactLastName}
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="client-last-name" required={createClientForm.type === 'individual'}>
                  Nom
                </CRMFormLabel>
                <CRMFormInput
                  id="client-last-name"
                  name="contactLastName"
                  type="text"
                  value={createClientForm.contactLastName}
                  onChange={(event) => {
                    setCreateClientForm((prev) => ({ ...prev, contactLastName: event.target.value }));
                    setCreateClientError(null);
                  }}
                  placeholder="Ex : Martin"
                  required={createClientForm.type === 'individual' && !createClientForm.contactFirstName}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <CRMFormLabel htmlFor="client-email">E-mail</CRMFormLabel>
                <CRMFormInput
                  id="client-email"
                  name="email"
                  type="email"
                  value={createClientForm.email}
                  onChange={(event) => {
                    setCreateClientForm((prev) => ({ ...prev, email: event.target.value }));
                    setCreateClientError(null);
                  }}
                  placeholder="contact@entreprise.fr"
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="client-phone">Téléphone</CRMFormLabel>
                <CRMFormInput
                  id="client-phone"
                  name="phone"
                  type="tel"
                  value={createClientForm.phone}
                  onChange={(event) => {
                    setCreateClientForm((prev) => ({ ...prev, phone: event.target.value }));
                    setCreateClientError(null);
                  }}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <CRMFormLabel htmlFor="client-address">Adresse</CRMFormLabel>
                <CRMFormInput
                  id="client-address"
                  name="address"
                  type="text"
                  value={createClientForm.address}
                  onChange={(event) => {
                    setCreateClientForm((prev) => ({ ...prev, address: event.target.value }));
                    setCreateClientError(null);
                  }}
                  placeholder="12 rue des Lavandières"
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="client-city">Ville</CRMFormLabel>
                <CRMFormInput
                  id="client-city"
                  name="city"
                  type="text"
                  value={createClientForm.city}
                  onChange={(event) => {
                    setCreateClientForm((prev) => ({ ...prev, city: event.target.value }));
                    setCreateClientError(null);
                  }}
                  placeholder="Paris"
                />
              </div>
            </div>

            <div>
              <CRMFormLabel htmlFor="client-status">Statut</CRMFormLabel>
              <CRMFormSelect
                id="client-status"
                name="status"
                value={createClientForm.status}
                onChange={(event) => {
                  setCreateClientForm((prev) => ({ ...prev, status: event.target.value as Client['status'] }));
                  setCreateClientError(null);
                }}
              >
                <option value="Actif">Actif</option>
                <option value="Non actif">Non actif</option>
                <option value="À appeler">À appeler</option>
                <option value="À contacter">À contacter</option>
              </CRMFormSelect>
            </div>

            <div>
              <CRMFormLabel htmlFor="client-tags">Tags</CRMFormLabel>
              <CRMFormInput
                id="client-tags"
                name="tags"
                type="text"
                value={createClientForm.tags}
                onChange={(event) => {
                  setCreateClientForm((prev) => ({ ...prev, tags: event.target.value }));
                  setCreateClientError(null);
                }}
                placeholder="premium, lavage auto, fidélité"
              />
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">Séparez les tags par des virgules.</p>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <CRMCancelButton onClick={closeCreateClientModal} />
            <CRMSubmitButton type="create">Créer le client</CRMSubmitButton>
          </div>
        </form>
      </CRMModal>

      <CRMModal isOpen={showEditClientModal} onClose={closeEditClientModal} maxWidth="9xl">
        <div className="flex flex-col bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[98vh] overflow-hidden">
          <div className="relative flex flex-col gap-1 pb-3 pt-4 px-5 border-b border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={closeEditClientModal}
              className="absolute top-4 right-5 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="space-y-0.5 pr-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">MODIFIER UN CLIENT</span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {editClientForm.companyName || `${editClientForm.contactFirstName} ${editClientForm.contactLastName}`.trim() || 'Client'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Mettez à jour les informations du client et consultez son suivi.
              </p>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden border-t border-slate-200 dark:border-slate-700">
            {/* Colonne gauche : Formulaire d'édition */}
            <form
              onSubmit={handleSubmitEditClient}
              className="flex flex-col w-[38%] border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-white dark:bg-slate-900"
            >
              <div className="flex flex-col gap-4 p-5">
                {/* Type de client */}
                <div className="space-y-2">
                  <CRMFormLabel>Type de client</CRMFormLabel>
                  <div className="inline-flex w-full items-center justify-between gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setEditClientForm((prev) => ({ ...prev, type: 'company' }));
                        setEditClientError(null);
                      }}
                      className={clsx(
                        'flex-1 rounded-lg px-4 py-2.5 text-sm transition focus-visible:outline-none',
                        editClientForm.type === 'company'
                          ? 'bg-purple-600 text-white shadow-sm dark:bg-purple-500'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                      )}
                    >
                      Entreprise
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditClientForm((prev) => ({ ...prev, type: 'individual', siret: '' }));
                        setEditClientError(null);
                      }}
                      className={clsx(
                        'flex-1 rounded-lg px-4 py-2.5 text-sm transition focus-visible:outline-none',
                        editClientForm.type === 'individual'
                          ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                      )}
                    >
                      Particulier
                    </button>
                  </div>
                </div>

                {/* Message d'erreur */}
                <CRMErrorAlert message={editClientError} />

                {/* Informations entreprise */}
                {editClientForm.type === 'company' && (
                  <div className="space-y-4">
                    <div>
                      <CRMFormLabel htmlFor="edit-client-name" required>
                        Raison sociale
                      </CRMFormLabel>
                      <CRMFormInput
                        id="edit-client-name"
                        name="companyName"
                        type="text"
                        value={editClientForm.companyName}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, companyName: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="Ex : WashGo Services"
                        required
                      />
                    </div>
                    <div>
                      <CRMFormLabel htmlFor="edit-client-siret">Numéro SIRET</CRMFormLabel>
                      <CRMFormInput
                        id="edit-client-siret"
                        name="siret"
                        type="text"
                        inputMode="numeric"
                        value={editClientForm.siret}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, siret: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="123 456 789 00000"
                      />
                    </div>
                  </div>
                )}

                {/* Informations de contact */}
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <CRMFormLabel 
                        htmlFor="edit-client-first-name" 
                        required={editClientForm.type === 'individual'}
                      >
                        Prénom
                      </CRMFormLabel>
                      <CRMFormInput
                        id="edit-client-first-name"
                        name="contactFirstName"
                        type="text"
                        value={editClientForm.contactFirstName}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, contactFirstName: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="Ex : Jeanne"
                        required={editClientForm.type === 'individual' && !editClientForm.contactLastName}
                      />
                    </div>
                    <div>
                      <CRMFormLabel 
                        htmlFor="edit-client-last-name" 
                        required={editClientForm.type === 'individual'}
                      >
                        Nom
                      </CRMFormLabel>
                      <CRMFormInput
                        id="edit-client-last-name"
                        name="contactLastName"
                        type="text"
                        value={editClientForm.contactLastName}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, contactLastName: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="Ex : Martin"
                        required={editClientForm.type === 'individual' && !editClientForm.contactFirstName}
                      />
                    </div>
                  </div>
                </div>

                {/* Coordonnées */}
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <CRMFormLabel htmlFor="edit-client-email">E-mail</CRMFormLabel>
                      <CRMFormInput
                        id="edit-client-email"
                        name="email"
                        type="email"
                        value={editClientForm.email}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, email: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="contact@entreprise.fr"
                      />
                    </div>
                    <div>
                      <CRMFormLabel htmlFor="edit-client-phone">Téléphone</CRMFormLabel>
                      <CRMFormInput
                        id="edit-client-phone"
                        name="phone"
                        type="tel"
                        value={editClientForm.phone}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, phone: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                  </div>
                </div>

                {/* Adresse */}
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <CRMFormLabel htmlFor="edit-client-address">Adresse</CRMFormLabel>
                      <CRMFormInput
                        id="edit-client-address"
                        name="address"
                        type="text"
                        value={editClientForm.address}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, address: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="12 rue des Lavandières"
                      />
                    </div>
                    <div>
                      <CRMFormLabel htmlFor="edit-client-city">Ville</CRMFormLabel>
                      <CRMFormInput
                        id="edit-client-city"
                        name="city"
                        type="text"
                        value={editClientForm.city}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, city: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="Paris"
                      />
                    </div>
                  </div>
                </div>

                {/* Statut */}
                <div className="space-y-2">
                  <CRMFormLabel htmlFor="edit-client-status">Statut</CRMFormLabel>
                  <CRMFormSelect
                    id="edit-client-status"
                    name="status"
                    value={editClientForm.status}
                    onChange={(event) => {
                      setEditClientForm((prev) => ({ ...prev, status: event.target.value as Client['status'] }));
                      setEditClientError(null);
                    }}
                  >
                    <option value="Actif">Actif</option>
                    <option value="Non actif">Non actif</option>
                    <option value="À appeler">À appeler</option>
                    <option value="À contacter">À contacter</option>
                  </CRMFormSelect>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <CRMFormLabel htmlFor="edit-client-tags">Tags</CRMFormLabel>
                  <CRMFormInput
                    id="edit-client-tags"
                    name="tags"
                    type="text"
                    value={editClientForm.tags}
                    onChange={(event) => {
                      setEditClientForm((prev) => ({ ...prev, tags: event.target.value }));
                      setEditClientError(null);
                    }}
                    placeholder="premium, lavage auto, fidélité"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Séparez les tags par des virgules.</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700 p-5 mt-auto">
                <CRMCancelButton onClick={closeEditClientModal} />
                <CRMSubmitButton type="update">
                  Enregistrer les modifications
                </CRMSubmitButton>
              </div>
            </form>

            {/* Colonne droite : Suivi du client */}
            <div className="flex flex-col w-[62%] overflow-y-auto bg-white dark:bg-slate-900">
              <div className="flex flex-col gap-4 p-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-0.5">Suivi du client</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Historique complet des interactions</p>
                </div>
                
                {/* Onglets */}
                <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl flex-wrap">
                {(editClientForm.type === 'company' 
                  ? ['services', 'devis', 'factures', 'notes', 'pricing', 'contacts'] as const
                  : ['services', 'devis', 'factures', 'notes', 'pricing'] as const
                ).map((tab) => {
                  const icons = {
                    services: Calendar,
                    devis: FileCheck,
                    factures: Receipt,
                    notes: MessageSquare,
                    pricing: Euro,
                    contacts: Users,
                  };
                  const Icon = icons[tab];
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={clsx(
                        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all rounded-lg flex-1 justify-center min-w-[120px]',
                        activeTab === tab
                          ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>
                        {tab === 'services' && 'Services'}
                        {tab === 'devis' && 'Devis'}
                        {tab === 'factures' && 'Factures'}
                        {tab === 'notes' && 'Notes'}
                        {tab === 'pricing' && 'Grille tarifaire'}
                        {tab === 'contacts' && 'Contacts'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Contenu des onglets */}
              {editingClientId && (() => {
                const clientEngagements = getClientEngagements(editingClientId);
                const clientNotes = notes.filter((note) => note.clientId === editingClientId);
                const servicesList = clientEngagements
                  .filter((e) => e.kind === 'service')
                  .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
                const devisList = clientEngagements
                  .filter((e) => e.kind === 'devis')
                  .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
                const facturesList = clientEngagements
                  .filter((e) => e.kind === 'facture')
                  .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

                return (
                  <div className="flex-1 overflow-y-auto">
                    {activeTab === 'services' && (
                      <div className="space-y-3">
                        {servicesList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <Calendar className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aucun service enregistré</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Les services effectués apparaîtront ici</p>
                          </div>
                        ) : (
                          servicesList.map((engagement) => {
                            const service = services.find((s) => s.id === engagement.serviceId);
                            const totals = computeEngagementTotals(engagement);
                            const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
                              réalisé: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                              planifié: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                              envoyé: { icon: Send, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                              annulé: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                              brouillon: { icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/50' },
                            };
                            const statusInfo = statusConfig[engagement.status] || statusConfig.brouillon;
                            const StatusIcon = statusInfo.icon;
                            return (
                              <div key={engagement.id} className="group p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="h-6 w-6 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                      </div>
                                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{service?.name || 'Service inconnu'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(engagement.scheduledAt)}</span>
                                      <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                                      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', statusInfo.bg, statusInfo.color)}>
                                        <StatusIcon className="h-3 w-3" />
                                        {engagement.status}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                      {formatCurrency(totals.price + totals.surcharge)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {activeTab === 'devis' && (
                      <div className="space-y-3 pb-6">
                        {devisList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <FileCheck className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aucun devis créé</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Les devis créés apparaîtront ici</p>
                          </div>
                        ) : (
                          devisList.map((engagement) => {
                            const service = services.find((s) => s.id === engagement.serviceId);
                            const totals = computeEngagementTotals(engagement);
                            const quoteStatus = engagement.quoteStatus || engagement.status;
                            const statusConfig: Record<string, { color: string; bg: string }> = {
                              accepté: { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                              refusé: { color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                              en_attente: { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                            };
                            const statusInfo = statusConfig[quoteStatus] || { color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/50' };
                            return (
                              <div key={engagement.id} className="group p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="h-6 w-6 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                                        <FileCheck className="h-3.5 w-3.5 text-purple-500" />
                                      </div>
                                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                                        Devis {engagement.quoteNumber || 'N/A'}
                                      </p>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{service?.name || 'Service inconnu'}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(engagement.scheduledAt)}</span>
                                      <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                                      <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusInfo.bg, statusInfo.color)}>
                                        {quoteStatus}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                      {formatCurrency(totals.price + totals.surcharge)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {activeTab === 'factures' && (
                      <div className="space-y-3 pb-6">
                        {facturesList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <Receipt className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aucune facture créée</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Les factures créées apparaîtront ici</p>
                          </div>
                        ) : (
                          facturesList.map((engagement) => {
                            const service = services.find((s) => s.id === engagement.serviceId);
                            const totals = computeEngagementTotals(engagement);
                            const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
                              réalisé: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                              envoyé: { icon: Send, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                              payé: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                              annulé: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
                            };
                            const statusInfo = statusConfig[engagement.status] || { icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/50' };
                            const StatusIcon = statusInfo.icon;
                            return (
                              <div key={engagement.id} className="group p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="h-6 w-6 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                                        <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                                      </div>
                                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                                        Facture {engagement.invoiceNumber || 'N/A'}
                                      </p>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{service?.name || 'Service inconnu'}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(engagement.scheduledAt)}</span>
                                      <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                                      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', statusInfo.bg, statusInfo.color)}>
                                        <StatusIcon className="h-3 w-3" />
                                        {engagement.status}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                      {formatCurrency(totals.price + totals.surcharge)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {activeTab === 'notes' && (
                      <div className="space-y-6 pb-6">
                        <div className="space-y-3">
                          {clientNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                              <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aucune note enregistrée</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Ajoutez des notes pour suivre les interactions avec ce client</p>
                            </div>
                          ) : (
                            clientNotes
                              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .map((note) => (
                                <div key={note.id} className="group p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-md transition-all">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                      <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                        <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(note.createdAt)}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        (useAppData as any).setState((state: any) => ({
                                          notes: state.notes.filter((n: Note) => n.id !== note.id),
                                        }));
                                        setFeedbackMessage('Note supprimée avec succès.');
                                      }}
                                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                                      aria-label="Supprimer la note"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                        
                        <div className="border-t-2 border-slate-200 dark:border-slate-700 pt-6">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-5 w-5 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                              <Plus className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            </div>
                            <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Ajouter une note
                            </label>
                          </div>
                          <textarea
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                            placeholder="Saisissez votre commentaire de suivi..."
                            rows={4}
                            className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newNoteContent.trim() && editingClientId) {
                                const newNote: Note = {
                                  id: `note-${Date.now()}-${Math.random()}`,
                                  clientId: editingClientId,
                                  content: newNoteContent.trim(),
                                  createdAt: new Date().toISOString(),
                                };
                                (useAppData as any).setState((state: any) => ({
                                  notes: [...state.notes, newNote],
                                }));
                                setNewNoteContent('');
                                setFeedbackMessage('Note ajoutée avec succès.');
                              }
                            }}
                            disabled={!newNoteContent.trim()}
                            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg dark:bg-blue-500 dark:hover:bg-blue-600"
                          >
                            <Plus className="h-4 w-4" />
                            Ajouter la note
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'contacts' && editingClientId && editClientForm.type === 'company' && (() => {
                      const editingClient = clients.find((c) => c.id === editingClientId);
                      const clientContacts = editingClient?.contacts || [];
                      
                      return (
                        <div className="space-y-6 pb-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                Personnes de l'entreprise
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Gérez les contacts et leurs rôles dans l'entreprise
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setCreateContactForm({
                                  firstName: '',
                                  lastName: '',
                                  email: '',
                                  mobile: '',
                                  roles: [],
                                  isBillingDefault: false,
                                });
                                setEditingContactId(null);
                                setShowCreateContactModal(true);
                              }}
                              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                            >
                              <Plus className="h-4 w-4" />
                              Ajouter une personne
                            </button>
                          </div>

                          <div className="space-y-3">
                            {clientContacts.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                <div className="h-12 w-12 rounded-full bg-white dark:bg-white border-2 border-slate-200 dark:border-slate-300 flex items-center justify-center mb-3">
                                  <Users className="h-6 w-6 text-slate-600 dark:text-slate-700" />
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Aucun contact enregistré</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Ajoutez des personnes à cette entreprise</p>
                              </div>
                            ) : (
                              clientContacts.map((contact) => (
                                <div key={contact.id} className="group p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-md transition-all">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="h-8 w-8 rounded-full bg-white dark:bg-white border-2 border-slate-200 dark:border-slate-300 flex items-center justify-center flex-shrink-0">
                                          <User className="h-4 w-4 text-blue-600 dark:text-blue-600" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {contact.firstName} {contact.lastName}
                                          </p>
                                          {contact.isBillingDefault && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white dark:bg-white border border-emerald-300 dark:border-emerald-500 text-emerald-700 dark:text-emerald-700 mt-1">
                                              Contact facturation par défaut
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="ml-10 space-y-1">
                                        {contact.email && (
                                          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            {contact.email}
                                          </p>
                                        )}
                                        {contact.mobile && (
                                          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {contact.mobile}
                                          </p>
                                        )}
                                        {contact.roles.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-2">
                                            {contact.roles.map((role) => (
                                              <span
                                                key={role}
                                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white dark:bg-white border border-purple-300 dark:border-purple-500 text-purple-700 dark:text-purple-700"
                                              >
                                                {role === 'achat' && 'Achat'}
                                                {role === 'facturation' && 'Facturation'}
                                                {role === 'technique' && 'Technique'}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCreateContactForm({
                                            firstName: contact.firstName,
                                            lastName: contact.lastName,
                                            email: contact.email,
                                            mobile: contact.mobile,
                                            roles: [...contact.roles],
                                            isBillingDefault: contact.isBillingDefault,
                                          });
                                          setEditingContactId(contact.id);
                                          setShowCreateContactModal(true);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                                        title="Modifier"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (editingClientId && editingClient) {
                                            const updatedContacts = editingClient.contacts.filter((c) => c.id !== contact.id);
                                            updateClient({
                                              ...editingClient,
                                              contacts: updatedContacts,
                                            });
                                            setFeedbackMessage('Contact supprimé avec succès.');
                                          }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
              </div>
            </div>
          </div>
        </div>
      </CRMModal>

      {/* Modale de transfert de client */}
      <CRMModal isOpen={showTransferModal} onClose={closeTransferModal}>
        <div className="p-6">
          <CRMModalHeader
            title={`Transférer ${selectedRows.size} client(s)`}
            onClose={closeTransferModal}
          />
          <form onSubmit={handleBulkTransfer} className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <CRMFormLabel htmlFor="transfer-target-company">
                  Entreprise de destination
                </CRMFormLabel>
                {transferLoading ? (
                  <div className="text-sm text-slate-500 dark:text-slate-400 py-2">
                    Chargement des entreprises...
                  </div>
                ) : (
                  <>
                    <CRMFormSelect
                      id="transfer-target-company"
                      value={transferTargetCompanyId}
                      onChange={(e) => setTransferTargetCompanyId(e.target.value)}
                      required
                      disabled={transferLoading || availableCompanies.length === 0}
                    >
                      <option value="">Sélectionner une entreprise</option>
                      {availableCompanies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </CRMFormSelect>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Les {selectedRows.size} client(s) sélectionné(s) seront transférés vers cette entreprise.
                    </p>
                  </>
                )}
              </div>

              {transferError && (
                <CRMErrorAlert message={transferError} />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <CRMCancelButton
                type="button"
                onClick={closeTransferModal}
                disabled={transferLoading}
              >
                Annuler
              </CRMCancelButton>
              <CRMSubmitButton
                type="submit"
                disabled={transferLoading || !transferTargetCompanyId || availableCompanies.length === 0}
              >
                {transferLoading && transferTargetCompanyId ? 'Transfert en cours...' : 'Transférer'}
              </CRMSubmitButton>
            </div>
          </form>
        </div>
      </CRMModal>

      {/* Modale de création/édition de contact */}
      <CRMModal isOpen={showCreateContactModal} onClose={closeCreateContactModal}>
        <div className="p-6 bg-white dark:bg-slate-900">
          <CRMModalHeader
            title={editingContactId ? 'Modifier le contact' : 'Ajouter un contact'}
            description={editingContactId ? 'Modifiez les informations du contact' : 'Ajoutez une nouvelle personne à cette entreprise'}
            onClose={closeCreateContactModal}
          />
          <div className="space-y-4 mt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <CRMFormLabel htmlFor="contact-first-name" required>
                  Prénom
                </CRMFormLabel>
                <CRMFormInput
                  id="contact-first-name"
                  type="text"
                  value={createContactForm.firstName}
                  onChange={(e) => setCreateContactForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Jean"
                  required
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="contact-last-name" required>
                  Nom
                </CRMFormLabel>
                <CRMFormInput
                  id="contact-last-name"
                  type="text"
                  value={createContactForm.lastName}
                  onChange={(e) => setCreateContactForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Dupont"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <CRMFormLabel htmlFor="contact-email">
                  E-mail
                </CRMFormLabel>
                <CRMFormInput
                  id="contact-email"
                  type="email"
                  value={createContactForm.email}
                  onChange={(e) => setCreateContactForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="jean.dupont@entreprise.fr"
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="contact-mobile">
                  Téléphone
                </CRMFormLabel>
                <CRMFormInput
                  id="contact-mobile"
                  type="tel"
                  value={createContactForm.mobile}
                  onChange={(e) => setCreateContactForm((prev) => ({ ...prev, mobile: e.target.value }))}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>

            <div>
              <CRMFormLabel>Rôles dans l'entreprise</CRMFormLabel>
              <div className="space-y-2 mt-2">
                {(['achat', 'facturation', 'technique'] as ClientContactRole[]).map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createContactForm.roles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCreateContactForm((prev) => ({ ...prev, roles: [...prev.roles, role] }));
                        } else {
                          setCreateContactForm((prev) => ({ ...prev, roles: prev.roles.filter((r) => r !== role) }));
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {role === 'achat' && 'Achat'}
                      {role === 'facturation' && 'Facturation'}
                      {role === 'technique' && 'Technique'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createContactForm.isBillingDefault}
                  onChange={(e) => setCreateContactForm((prev) => ({ ...prev, isBillingDefault: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Contact facturation par défaut
                </span>
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-6">
                Ce contact sera utilisé par défaut pour la facturation
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <CRMCancelButton onClick={closeCreateContactModal}>
                Annuler
              </CRMCancelButton>
              <CRMSubmitButton
                type="button"
                onClick={handleSubmitContact}
                disabled={!createContactForm.firstName.trim() || !createContactForm.lastName.trim()}
              >
                {editingContactId ? 'Modifier' : 'Ajouter'}
              </CRMSubmitButton>
            </div>
          </div>
        </div>
      </CRMModal>

      <input
        ref={importInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            handleImportFile(file);
            event.target.value = '';
          }
        }}
      />
    </div>
  );
};

export default ClientsPage;

