import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Filter, Download, Mail, Phone, Edit2, Trash2, FileText, X, Search, Users, Flame, TrendingUp, Printer, Send, Plus } from 'lucide-react';
import clsx from 'clsx';

import { useAppData, type Client, type ClientContact } from '../store/useAppData';
import { formatCurrency, formatDate } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { BRAND_NAME } from '../lib/branding';
import { openEmailComposer } from '../lib/email';

type TableRowType = 'prospect' | 'client_actif' | 'client_inactif';

type TableRowStatus = 'Actif' | 'Prospect' | 'Inactif';

type FilterState = {
  status: '' | TableRowStatus;
  segment: '' | 'Entreprise' | 'Particulier';
  city: string;
  tag: string;
};

type TableRow = {
  id: string;
  client: Client;
  contact: ClientContact | null;
  contactId: string | null;
  type: TableRowType;
  status: TableRowStatus;
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
  Prospect: {
    label: 'Prospect',
    color: 'bg-blue-200 text-blue-800 border border-blue-300 shadow-[0_1px_0_rgba(59,130,246,0.35)]',
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
      : hasActiveContacts && client.status === 'Prospect'
      ? 'prospect'
      : 'client_inactif';
  const status: TableRowStatus =
    type === 'client_inactif' ? 'Inactif' : client.status === 'Prospect' ? 'Prospect' : 'Actif';

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
    organization,
    contactName,
    email,
    phone,
    city: client.city ?? '',
    nextActionDate: client.lastService || null,
    nextActionNote: client.lastService
      ? 'Dernière prestation enregistrée'
      : 'Aucune prestation récente',
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
  status: 'Prospect',
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
  } = useAppData();

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    segment: '',
    city: '',
    tag: '',
  });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
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

  const tableData = useMemo<TableRow[]>(() => {
    return clients
      .map((client) => buildRow(client, getClientRevenue(client.id) ?? 0))
      .sort((a, b) => a.organization.localeCompare(b.organization, 'fr', { sensitivity: 'base' }));
  }, [clients, getClientRevenue]);

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

  const filteredData = useMemo(() => {
    return tableData.filter((row) => {
      if (filters.status && row.status !== filters.status) {
        return false;
      }
      if (filters.segment && row.segment !== filters.segment) {
        return false;
      }
      if (filters.city && row.city !== filters.city) {
        return false;
      }
      if (filters.tag && !row.tags.includes(filters.tag)) {
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
    navigate('/service');
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
                <th>Statut</th>
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
                  <td>${row.status}</td>
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
      'Statut',
      'Type',
      'Contact principal',
      'Email',
      'Téléphone',
      'Ville',
      'Dernière prestation',
      'Note',
      'Chiffre d’affaires HT',
      'Tags',
    ];
    const rows = filteredData.map((row) => [
      row.organization,
      row.status,
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
      status: client.status,
    });
    setEditClientError(null);
    setShowEditClientModal(true);
  }, [clients]);

  const closeEditClientModal = useCallback(() => {
    setShowEditClientModal(false);
    setEditingClientId(null);
    setEditClientForm({ ...CREATE_CLIENT_DEFAULTS });
    setEditClientError(null);
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
    const prospectClients = filteredData.filter((row) => row.status === 'Prospect').length;
    const averageRevenue = totalClients > 0 ? totalRevenue / totalClients : 0;

    return [
      {
        id: 'total',
        label: 'Clients suivis',
        value: totalClients.toLocaleString('fr-FR'),
        helper: `${activeClients.toLocaleString('fr-FR')} actifs`,
      },
      {
        id: 'prospects',
        label: 'Prospects engagés',
        value: prospectClients.toLocaleString('fr-FR'),
        helper: 'Pipeline en qualification',
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

      {feedback && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 shadow-sm dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-200">
          {feedback}
        </div>
      )}

      <section className="space-y-4">
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
                {selectedRows.size > 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-l border-slate-200 pl-4 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedRows.size} sélectionné(s)
                    </span>
                    <button
                      type="button"
                      onClick={handleBulkPrint}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimer
                    </button>
                    {hasPermission('client.email') && (
                      <button
                        type="button"
                        onClick={handleBulkEmail}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Send className="h-4 w-4" />
                        Envoyer
                      </button>
                    )}
                    {hasPermission('client.archive') && (
                      <>
                        <button
                          type="button"
                          onClick={handleBulkArchive}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30"
                        >
                          Archiver
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
                <button
                  type="button"
                  onClick={openCreateClientModal}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nouveau client</span>
                  <span className="sm:hidden">Nouveau</span>
                </button>
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
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    <option value="Actif">Actif</option>
                    <option value="Prospect">Prospect</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>
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
                      status: '',
                      segment: '',
                      city: '',
                      tag: '',
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
                      'group transition hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer',
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
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <Search className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Aucun résultat trouvé</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ajustez votre recherche ou vos filtres pour retrouver vos clients.
          </p>
        </div>
      )}

      {showCreateClientModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4 py-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-client-title"
            onClick={closeCreateClientModal}
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 transition dark:border-slate-700 dark:bg-slate-900"
              onClick={(event) => event.stopPropagation()}
            >
              <form
                onSubmit={handleSubmitCreateClient}
                className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">CRÉER UN CLIENT</span>
                    <h2 id="create-client-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Nouveau client
                    </h2>
                    <p className="max-w-lg text-xs text-slate-500 dark:text-slate-400">
                      Renseignez les informations essentielles pour enregistrer un nouveau client.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCreateClientModal}
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Type de client</label>
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

                  {createClientError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-100">
                      {createClientError}
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="client-name">
                        {createClientForm.type === 'company' ? 'Raison sociale *' : 'Nom / organisation'}
                      </label>
                      <input
                        id="client-name"
                        name="companyName"
                        type="text"
                        value={createClientForm.companyName}
                        onChange={(event) => {
                          setCreateClientForm((prev) => ({ ...prev, companyName: event.target.value }));
                          setCreateClientError(null);
                        }}
                        autoFocus={createClientForm.type === 'company'}
                        placeholder={
                          createClientForm.type === 'company' ? 'Ex : WashGo Services' : 'Ex : Jeanne Martin'
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required={createClientForm.type === 'company'}
                      />
                    </div>
                    {createClientForm.type === 'company' && (
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="client-siret">
                          Numéro SIRET
                        </label>
                        <input
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
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="client-first-name">
                        Prénom {createClientForm.type === 'individual' ? '*' : ''}
                      </label>
                      <input
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
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required={createClientForm.type === 'individual' && !createClientForm.contactLastName}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="client-last-name">
                        Nom {createClientForm.type === 'individual' ? '*' : ''}
                      </label>
                      <input
                        id="client-last-name"
                        name="contactLastName"
                        type="text"
                        value={createClientForm.contactLastName}
                        onChange={(event) => {
                          setCreateClientForm((prev) => ({ ...prev, contactLastName: event.target.value }));
                          setCreateClientError(null);
                        }}
                        placeholder="Ex : Martin"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required={createClientForm.type === 'individual' && !createClientForm.contactFirstName}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="client-email">
                        E-mail
                      </label>
                      <input
                        id="client-email"
                        name="email"
                        type="email"
                        value={createClientForm.email}
                        onChange={(event) => {
                          setCreateClientForm((prev) => ({ ...prev, email: event.target.value }));
                          setCreateClientError(null);
                        }}
                        placeholder="contact@entreprise.fr"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="client-phone">
                        Téléphone
                      </label>
                      <input
                        id="client-phone"
                        name="phone"
                        type="tel"
                        value={createClientForm.phone}
                        onChange={(event) => {
                          setCreateClientForm((prev) => ({ ...prev, phone: event.target.value }));
                          setCreateClientError(null);
                        }}
                        placeholder="06 12 34 56 78"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="client-address">
                        Adresse
                      </label>
                      <input
                        id="client-address"
                        name="address"
                        type="text"
                        value={createClientForm.address}
                        onChange={(event) => {
                          setCreateClientForm((prev) => ({ ...prev, address: event.target.value }));
                          setCreateClientError(null);
                        }}
                        placeholder="12 rue des Lavandières"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="client-city">
                        Ville
                      </label>
                      <input
                        id="client-city"
                        name="city"
                        type="text"
                        value={createClientForm.city}
                        onChange={(event) => {
                          setCreateClientForm((prev) => ({ ...prev, city: event.target.value }));
                          setCreateClientError(null);
                        }}
                        placeholder="Paris"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="client-tags">
                      Tags
                    </label>
                    <input
                      id="client-tags"
                      name="tags"
                      type="text"
                      value={createClientForm.tags}
                      onChange={(event) => {
                        setCreateClientForm((prev) => ({ ...prev, tags: event.target.value }));
                        setCreateClientError(null);
                      }}
                      placeholder="premium, lavage auto, fidélité"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">Séparez les tags par des virgules.</p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={closeCreateClientModal}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <Plus className="h-4 w-4" />
                    Créer le client
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {showEditClientModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4 py-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-client-title"
            onClick={closeEditClientModal}
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 transition dark:border-slate-700 dark:bg-slate-900"
              onClick={(event) => event.stopPropagation()}
            >
              <form
                onSubmit={handleSubmitEditClient}
                className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
                      MODIFIER UN CLIENT
                    </span>
                    <h2 id="edit-client-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {editClientForm.companyName || `${editClientForm.contactFirstName} ${editClientForm.contactLastName}`.trim() || 'Client'}
                    </h2>
                    <p className="max-w-lg text-xs text-slate-500 dark:text-slate-400">
                      Mettez à jour les informations du client. Les modifications seront enregistrées immédiatement.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeEditClientModal}
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Type de client</label>
                    <div className="inline-flex w-full items-center justify-between gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setEditClientForm((prev) => ({ ...prev, type: 'company' }));
                          setEditClientError(null);
                        }}
                        className={clsx(
                          'flex-1 rounded-lg px-4 py-2 transition focus-visible:outline-none',
                          editClientForm.type === 'company'
                            ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-700/20 dark:bg-purple-500 dark:ring-purple-400/20'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
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
                          'flex-1 rounded-lg px-4 py-2 transition focus-visible:outline-none',
                          editClientForm.type === 'individual'
                            ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20 dark:bg-blue-500 dark:ring-blue-400/20'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                        )}
                      >
                        Particulier
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Statut</label>
                    <div className="inline-flex w-full items-center justify-between gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800/80">
                      <button
                        type="button"
                        onClick={() => {
                          setEditClientForm((prev) => ({ ...prev, status: 'Actif' }));
                          setEditClientError(null);
                        }}
                        className={clsx(
                          'flex-1 rounded-lg px-4 py-2 transition focus-visible:outline-none',
                          editClientForm.status === 'Actif'
                            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700/20 dark:bg-emerald-500 dark:ring-emerald-400/20'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                        )}
                      >
                        Actif
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditClientForm((prev) => ({ ...prev, status: 'Prospect' }));
                          setEditClientError(null);
                        }}
                        className={clsx(
                          'flex-1 rounded-lg px-4 py-2 transition focus-visible:outline-none',
                          editClientForm.status === 'Prospect'
                            ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20 dark:bg-blue-500 dark:ring-blue-400/20'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                        )}
                      >
                        Prospect
                      </button>
                    </div>
                  </div>

                  {editClientError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-100">
                      {editClientError}
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-client-name">
                        {editClientForm.type === 'company' ? 'Raison sociale *' : 'Nom / organisation'}
                      </label>
                      <input
                        id="edit-client-name"
                        name="companyName"
                        type="text"
                        value={editClientForm.companyName}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, companyName: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder={
                          editClientForm.type === 'company' ? 'Ex : WashGo Services' : 'Ex : Jeanne Martin'
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required={editClientForm.type === 'company'}
                      />
                    </div>
                    {editClientForm.type === 'company' && (
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-client-siret">
                          Numéro SIRET
                        </label>
                        <input
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
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-client-first-name">
                        Prénom {editClientForm.type === 'individual' ? '*' : ''}
                      </label>
                      <input
                        id="edit-client-first-name"
                        name="contactFirstName"
                        type="text"
                        value={editClientForm.contactFirstName}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, contactFirstName: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="Ex : Jeanne"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required={editClientForm.type === 'individual' && !editClientForm.contactLastName}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-client-last-name">
                        Nom {editClientForm.type === 'individual' ? '*' : ''}
                      </label>
                      <input
                        id="edit-client-last-name"
                        name="contactLastName"
                        type="text"
                        value={editClientForm.contactLastName}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, contactLastName: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="Ex : Martin"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required={editClientForm.type === 'individual' && !editClientForm.contactFirstName}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-client-email">
                        E-mail
                      </label>
                      <input
                        id="edit-client-email"
                        name="email"
                        type="email"
                        value={editClientForm.email}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, email: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="contact@entreprise.fr"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-client-phone">
                        Téléphone
                      </label>
                      <input
                        id="edit-client-phone"
                        name="phone"
                        type="tel"
                        value={editClientForm.phone}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, phone: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="06 12 34 56 78"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-client-address">
                        Adresse
                      </label>
                      <input
                        id="edit-client-address"
                        name="address"
                        type="text"
                        value={editClientForm.address}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, address: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="12 rue des Lavandières"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-client-city">
                        Ville
                      </label>
                      <input
                        id="edit-client-city"
                        name="city"
                        type="text"
                        value={editClientForm.city}
                        onChange={(event) => {
                          setEditClientForm((prev) => ({ ...prev, city: event.target.value }));
                          setEditClientError(null);
                        }}
                        placeholder="Paris"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-client-tags">
                      Tags
                    </label>
                    <input
                      id="edit-client-tags"
                      name="tags"
                      type="text"
                      value={editClientForm.tags}
                      onChange={(event) => {
                        setEditClientForm((prev) => ({ ...prev, tags: event.target.value }));
                        setEditClientError(null);
                      }}
                      placeholder="premium, lavage auto, fidélité"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">Séparez les tags par des virgules.</p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={closeEditClientModal}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    <Edit2 className="h-4 w-4" />
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ClientsPage;

