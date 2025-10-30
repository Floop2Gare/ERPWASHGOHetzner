import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import { RowActionButton } from '../components/RowActionButton';
import { IconConvert, IconEdit, IconPaperPlane, IconTrash } from '../components/icons';
import { formatCurrency, formatDateTime } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { BRAND_NAME } from '../lib/branding';
import {
  useAppData,
  Lead,
  LeadStatus,
  LeadActivityType,
  SupportType,
} from '../store/useAppData';
import { openEmailComposer } from '../lib/email';

const pipelineStatuses: LeadStatus[] = ['Nouveau', 'À contacter', 'En cours', 'Devis envoyé', 'Gagné', 'Perdu'];
const supportTypes: SupportType[] = ['Voiture', 'Canapé', 'Textile'];

const toInputDate = (value: string | null | undefined) => {
  if (!value) return '';
  return value.slice(0, 10);
};

const formatShortDate = (value: string | null | undefined) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
};

type LeadFormState = {
  company: string;
  contact: string;
  phone: string;
  email: string;
  source: string;
  segment: string;
  status: LeadStatus;
  nextStepDate: string;
  nextStepNote: string;
  estimatedValue: string;
  owner: string;
  tags: string;
  address: string;
  companyId: string;
  supportType: SupportType;
  supportDetail: string;
};

const buildFormState = (
  lead: Lead | null,
  defaultOwner: string,
  defaultCompanyId: string | null
): LeadFormState => ({
  company: lead?.company ?? '',
  contact: lead?.contact ?? '',
  phone: lead?.phone ?? '',
  email: lead?.email ?? '',
  source: lead?.source ?? '',
  segment: lead?.segment ?? '',
  status: lead?.status ?? 'Nouveau',
  nextStepDate: toInputDate(lead?.nextStepDate),
  nextStepNote: lead?.nextStepNote ?? '',
  estimatedValue:
    lead?.estimatedValue !== null && lead?.estimatedValue !== undefined
      ? String(lead.estimatedValue)
      : '',
  owner: lead?.owner ?? defaultOwner,
  tags: lead ? lead.tags.join(', ') : '',
  address: lead?.address ?? '',
  companyId: lead?.companyId ?? defaultCompanyId ?? '',
  supportType: lead?.supportType ?? 'Voiture',
  supportDetail: lead?.supportDetail ?? '',
});

const normalisePhone = (value: string) => value.replace(/\s+/g, '').trim();

const statusTone: Record<LeadStatus, string> = {
  Nouveau: 'border-primary/30 text-primary',
  'À contacter': 'border-slate-300 text-slate-700',
  'En cours': 'border-blue-200 text-primary',
  'Devis envoyé': 'border-amber-200 text-amber-600',
  Gagné: 'border-emerald-200 text-emerald-600',
  Perdu: 'border-rose-200 text-rose-600',
};

const LeadPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    leads,
    clients,
    services,
    companies,
    addLead,
    updateLead,
    removeLead,
    recordLeadActivity,
    bulkUpdateLeads,
    addClient,
    addClientContact,
    setClientBillingContact,
    restoreClientContact,
    getClient,
    setPendingEngagementSeed,
    hasPermission,
  } = useAppData();

  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    owner: 'Tous',
    status: 'Tous',
    source: 'Toutes',
    segment: 'Tous',
    tag: 'Tous',
  });
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<'create' | 'edit' | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [noteType, setNoteType] = useState<LeadActivityType>('note');
  const [noteDraft, setNoteDraft] = useState('');
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  const listSectionRef = useRef<HTMLDivElement | null>(null);
  const createSectionRef = useRef<HTMLDivElement | null>(null);
  const editSectionRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const owners = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.owner))).sort((a, b) => a.localeCompare(b)),
    [leads]
  );
  const sources = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.source))).sort((a, b) => a.localeCompare(b)),
    [leads]
  );
  const segments = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.segment))).sort((a, b) => a.localeCompare(b)),
    [leads]
  );
  const tagsCatalog = useMemo(
    () => Array.from(new Set(leads.flatMap((lead) => lead.tags))).sort((a, b) => a.localeCompare(b)),
    [leads]
  );

  const defaultOwner = owners[0] ?? 'Adrien';
  const defaultCompanyId = companies[0]?.id ?? null;
  const companiesById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  );

  const [leadForm, setLeadForm] = useState<LeadFormState>(
    buildFormState(null, defaultOwner, defaultCompanyId)
  );

  useEffect(() => {
    setLeadForm((current) => ({
      ...current,
      owner: current.owner || defaultOwner,
      companyId: current.companyId || defaultCompanyId || '',
    }));
  }, [defaultOwner, defaultCompanyId]);

  useEffect(() => {
    setSelectedLeadIds((ids) => ids.filter((id) => leads.some((lead) => lead.id === id)));
  }, [leads]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const leadId = params.get('leadId');
    if (!leadId) {
      return;
    }

    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('leadId');
    navigate({ pathname: location.pathname, search: nextParams.toString() ? `?${nextParams}` : '' }, { replace: true });

    const target = leads.find((lead) => lead.id === leadId);
    if (!target) {
      return;
    }
    setLeadForm(buildFormState(target, defaultOwner, defaultCompanyId));
    setEditingLeadId(target.id);
    setActivePanel('edit');
    setNoteDraft('');
    setNoteType('note');
    setFeedback(null);
  }, [location.pathname, location.search, leads, defaultOwner, defaultCompanyId, navigate]);

  useEffect(() => {
    const target = activePanel === 'create' ? createSectionRef.current : editSectionRef.current;
    if (!activePanel || !target) {
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      const focusable = target.querySelector<HTMLElement>('input, select, textarea');
      focusable?.focus({ preventScroll: true });
    }, 160);
  }, [activePanel]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (term) {
        const haystack = [lead.company, lead.contact, lead.email, lead.phone]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) {
          return false;
        }
      }
      if (filters.owner !== 'Tous' && lead.owner !== filters.owner) {
        return false;
      }
      if (filters.status !== 'Tous' && lead.status !== filters.status) {
        return false;
      }
      if (filters.source !== 'Toutes' && lead.source !== filters.source) {
        return false;
      }
      if (filters.segment !== 'Tous' && lead.segment !== filters.segment) {
        return false;
      }
      if (filters.tag !== 'Tous' && !lead.tags.includes(filters.tag)) {
        return false;
      }
      return true;
    });
  }, [leads, search, filters]);

  const editingLead = editingLeadId ? leads.find((lead) => lead.id === editingLeadId) ?? null : null;

  const emailDuplicate = useMemo(() => {
    const value = leadForm.email.trim().toLowerCase();
    if (!value) return false;
    return leads.some((lead) => lead.id !== editingLeadId && lead.email.toLowerCase() === value);
  }, [leadForm.email, leads, editingLeadId]);

  const phoneDuplicate = useMemo(() => {
    const value = normalisePhone(leadForm.phone);
    if (!value) return false;
    return leads.some((lead) => lead.id !== editingLeadId && normalisePhone(lead.phone) === value);
  }, [leadForm.phone, leads, editingLeadId]);

  const handleOpenCreate = () => {
    setLeadForm(buildFormState(null, defaultOwner, defaultCompanyId));
    setEditingLeadId(null);
    setActivePanel('create');
    setNoteDraft('');
    setFeedback(null);
  };

  const handleOpenEdit = (lead: Lead, intent?: LeadActivityType) => {
    setLeadForm(buildFormState(lead, defaultOwner, defaultCompanyId));
    setEditingLeadId(lead.id);
    setActivePanel('edit');
    if (intent) {
      setNoteType(intent);
    }
    setNoteDraft('');
    setFeedback(null);
  };

  const closePanels = () => {
    setActivePanel(null);
    setEditingLeadId(null);
    setNoteDraft('');
  };

  const scrollToList = useCallback(() => {
    requestAnimationFrame(() => {
      listSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const mapFormToPayload = () => {
    const tags = leadForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    const estimatedValue = Number.parseFloat(leadForm.estimatedValue);
    return {
      company: leadForm.company.trim(),
      contact: leadForm.contact.trim(),
      phone: leadForm.phone.trim(),
      email: leadForm.email.trim(),
      source: leadForm.source.trim(),
      segment: leadForm.segment.trim(),
      status: leadForm.status,
      nextStepDate: leadForm.nextStepDate ? leadForm.nextStepDate : null,
      nextStepNote: leadForm.nextStepNote.trim(),
      estimatedValue: Number.isFinite(estimatedValue) ? estimatedValue : null,
      owner: leadForm.owner,
      tags,
      address: leadForm.address.trim(),
      companyId: leadForm.companyId ? leadForm.companyId : null,
      supportType: leadForm.supportType,
      supportDetail: leadForm.supportDetail.trim(),
    } as const;
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadForm.company.trim() || !leadForm.contact.trim()) {
      setFeedback('Renseignez au minimum l’entreprise et le contact.');
      return;
    }
    if (emailDuplicate) {
      setFeedback('Un lead utilise déjà cet email.');
      return;
    }
    if (phoneDuplicate) {
      setFeedback('Un lead utilise déjà ce numéro.');
      return;
    }
    const payload = mapFormToPayload();
    const created = addLead({
      ...payload,
      lastContact: null,
    });
    setFeedback('Lead créé.');
    setSelectedLeadIds((ids) => [created.id, ...ids]);
    closePanels();
    scrollToList();
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingLeadId) {
      return;
    }
    if (!leadForm.company.trim() || !leadForm.contact.trim()) {
      setFeedback('Renseignez au minimum l’entreprise et le contact.');
      return;
    }
    if (emailDuplicate) {
      setFeedback('Un lead utilise déjà cet email.');
      return;
    }
    if (phoneDuplicate) {
      setFeedback('Un lead utilise déjà ce numéro.');
      return;
    }
    updateLead(editingLeadId, mapFormToPayload());
    setFeedback('Lead mis à jour.');
  };

  const ensureClientFromLead = (lead: Lead) => {
    const normalizedEmail = lead.email.trim().toLowerCase();
    const normalizedPhone = normalisePhone(lead.phone || '');
    const existingByEmail = normalizedEmail
      ? clients.find((client) =>
          client.contacts.some((contact) => contact.email.toLowerCase() === normalizedEmail)
        )
      : undefined;
    const existingByPhone = normalizedPhone
      ? clients.find((client) =>
          client.contacts.some(
            (contact) => normalisePhone(contact.mobile) === normalizedPhone
          )
        )
      : undefined;
    const existingClient = existingByEmail ?? existingByPhone;
    if (existingClient) {
      if (existingByEmail) {
        const contact = existingClient.contacts.find(
          (item) => item.email.toLowerCase() === normalizedEmail
        );
        if (contact && !contact.active) {
          restoreClientContact(existingClient.id, contact.id);
        }
      } else if (normalizedEmail) {
        const createdContact = addClientContact(existingClient.id, {
          firstName: lead.contact.split(' ')[0] || lead.contact || lead.company || 'Contact',
          lastName:
            lead.contact.split(' ').slice(1).join(' ') || lead.company || existingClient.name,
          email: lead.email || 'contact@client.fr',
          mobile: lead.phone || '+33 6 00 00 00 00',
          roles: ['facturation'],
          isBillingDefault: !existingClient.contacts.some(
            (contact) => contact.active && contact.isBillingDefault
          ),
        });
        if (createdContact?.isBillingDefault) {
          setClientBillingContact(existingClient.id, createdContact.id);
        }
      }
      return getClient(existingClient.id) ?? existingClient;
    }

    const fallbackName = lead.company || lead.contact || `Organisation ${BRAND_NAME}`;
    const sanitizedName = fallbackName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const generatedSiret = `TMP-${sanitizedName.slice(0, 8) || 'client'}-${Date.now()}`;
    const created = addClient({
      type: 'company',
      name: fallbackName,
      companyName: fallbackName,
      firstName: '',
      lastName: '',
      siret: generatedSiret,
      email: lead.email || 'contact@client.fr',
      phone: lead.phone || '+33 6 00 00 00 00',
      address: lead.address || '',
      city: lead.address || '',
      status: 'Prospect',
      tags: lead.tags,
      contacts: [],
    });
    const [firstName, ...lastParts] = (lead.contact || fallbackName).split(' ');
    const newContact = addClientContact(created.id, {
      firstName: firstName || fallbackName,
      lastName: lastParts.join(' ') || fallbackName,
      email: lead.email || 'contact@client.fr',
      mobile: lead.phone || '+33 6 00 00 00 00',
      roles: ['facturation'],
      isBillingDefault: true,
    });
    if (newContact) {
      setClientBillingContact(created.id, newContact.id);
    }
    return getClient(created.id) ?? created;
  };

  const handleCreateEngagement = (lead: Lead, kind: 'service' | 'devis') => {
    const client = ensureClientFromLead(lead);
    const companyId = lead.companyId ?? companies[0]?.id ?? null;
    const matchingService = services.find((service) => service.category === lead.supportType) ?? services[0];
    const preferredContact =
      client.contacts.find((contact) => contact.active && contact.isBillingDefault) ??
      client.contacts.find((contact) => contact.active);
    setPendingEngagementSeed({
      kind: kind === 'devis' ? 'devis' : 'service',
      clientId: client.id,
      companyId,
      supportType: lead.supportType ?? 'Voiture',
      supportDetail: lead.supportDetail ?? '',
      serviceId: matchingService?.id,
      optionIds: matchingService?.options.slice(0, 1).map((option) => option.id) ?? [],
      contactIds: preferredContact ? [preferredContact.id] : [],
    });
    navigate('/service');
  };

  const handleConvertToClient = (lead: Lead) => {
    const client = ensureClientFromLead(lead);
    updateLead(lead.id, { status: 'Gagné' });
    setFeedback(`Client ${client.name} enregistré. Statut du lead mis à jour.`);
  };

  const handleContactLead = (lead: Lead) => {
    if (!lead.email) {
      setFeedback('Ajoutez une adresse e-mail avant de contacter ce lead.');
      return;
    }
    const recipientName = lead.contact || lead.company || 'client';
    const subject = `${BRAND_NAME} – Suivi ${lead.company || lead.contact || ''}`.trim();
    const body = `Bonjour ${recipientName},\n\nJe me permets de revenir vers vous concernant votre demande.\nRestant à votre disposition,\n${BRAND_NAME}`;
    openEmailComposer({ to: [lead.email], subject, body });
    setFeedback('E-mail préparé dans Gmail.');
  };

  const handleAddActivity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingLeadId || !noteDraft.trim()) {
      return;
    }
    recordLeadActivity(editingLeadId, {
      type: noteType,
      content: noteDraft.trim(),
    });
    if (noteType === 'call') {
      setFeedback('Appel journalisé.');
    } else {
      setFeedback('Note ajoutée.');
    }
    setNoteDraft('');
  };

  const handleBulkContactLeads = () => {
    if (!selectedLeadIds.length) return;
    const targets = leads.filter((lead) => selectedLeadIds.includes(lead.id));
    if (!targets.length) return;
    targets.forEach((lead) => handleContactLead(lead));
  };

  const handleBulkConvertLeads = () => {
    if (!selectedLeadIds.length) return;
    const targets = leads.filter((lead) => selectedLeadIds.includes(lead.id));
    if (!targets.length) return;
    targets.forEach((lead) => handleConvertToClient(lead));
  };

  const handleBulkDeleteLeads = () => {
    if (!selectedLeadIds.length) return;
    const targets = leads.filter((lead) => selectedLeadIds.includes(lead.id));
    if (!targets.length) return;
    targets.forEach((lead) => handleDeleteLead(lead.id));
    setSelectedLeadIds([]);
    setFeedback('Leads supprimés.');
  };

  const handleDeleteLead = (leadId: string) => {
    removeLead(leadId);
    setFeedback('Lead supprimé.');
    if (editingLeadId === leadId) {
      closePanels();
    }
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length <= 1) {
      setFeedback('Le fichier ne contient pas de données exploitables.');
      return;
    }
    const header = lines[0];
    const separator = header.includes(';') ? ';' : ',';
    const columns = header.split(separator).map((column) => column.trim().toLowerCase());
    const getValue = (cells: string[], key: string) => {
      const index = columns.findIndex((column) => column === key.toLowerCase());
      return index >= 0 ? cells[index]?.trim() ?? '' : '';
    };

    lines.slice(1).forEach((line) => {
      const cells = line.split(separator).map((cell) => cell.replace(/^"|"$/g, ''));
      const email = getValue(cells, 'email');
      const phone = getValue(cells, 'telephone') || getValue(cells, 'téléphone');
      if (
        leads.some(
          (lead) => lead.email.toLowerCase() === email.toLowerCase() || normalisePhone(lead.phone) === normalisePhone(phone)
        )
      ) {
        return;
      }
      addLead({
        company: getValue(cells, 'entreprise'),
        contact: getValue(cells, 'contact') || getValue(cells, 'nom'),
        phone,
        email,
        source: getValue(cells, 'source') || 'Import',
        segment: getValue(cells, 'segment') || 'Pro local',
        status: (getValue(cells, 'statut') as LeadStatus) || 'Nouveau',
        nextStepDate: getValue(cells, 'prochain step date') || null,
        nextStepNote: getValue(cells, 'prochain step note') || '',
        estimatedValue: Number.parseFloat(getValue(cells, 'valeur')) || null,
        owner: getValue(cells, 'proprietaire') || defaultOwner,
        tags: getValue(cells, 'tags')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        address: getValue(cells, 'adresse'),
        companyId: defaultCompanyId,
        supportType: (getValue(cells, 'support') as SupportType) || 'Voiture',
        supportDetail: getValue(cells, 'support detail'),
        lastContact: null,
      });
    });
    setFeedback('Import terminé.');
  };

  const handleExport = () => {
    if (!filteredLeads.length) {
      setFeedback('Aucun lead à exporter.');
      return;
    }

    const header = [
      'Entreprise',
      'Contact',
      'Téléphone',
      'Email',
      'Source',
      'Segment',
      'Statut',
      'Prochain step',
      'Note prochaine étape',
      'Dernier contact',
      'Valeur estimée',
      'Propriétaire',
      'Tags',
      'Adresse',
      'Organisation associée',
      'Support',
      'Détail support',
      'Créé le',
      'Activités',
    ];

    const rows = filteredLeads.map((lead) => {
      const linkedCompany = lead.companyId ? companiesById.get(lead.companyId) : null;
      const activitiesSummary = lead.activities
        .map((activity) => {
          const dateLabel = formatDateTime(activity.createdAt);
          const label = activity.type === 'call' ? 'Appel' : 'Note';
          return `[${dateLabel}] ${label} – ${activity.content}`;
        })
        .join(' | ');
      return [
        lead.company,
        lead.contact,
        lead.phone,
        lead.email,
        lead.source,
        lead.segment,
        lead.status,
        lead.nextStepDate ? formatDateTime(lead.nextStepDate) : '',
        lead.nextStepNote,
        lead.lastContact ? formatDateTime(lead.lastContact) : '',
        lead.estimatedValue ?? '',
        lead.owner,
        lead.tags.join(', '),
        lead.address ?? '',
        linkedCompany?.name ?? '',
        lead.supportType ?? '',
        lead.supportDetail ?? '',
        formatDateTime(lead.createdAt),
        activitiesSummary,
      ];
    });

    downloadCsv({ fileName: 'leads.csv', header, rows });
    setFeedback(`${rows.length} lead(s) exporté(s).`);
  };

  const toggleSelection = (leadId: string) => {
    setSelectedLeadIds((current) =>
      current.includes(leadId) ? current.filter((id) => id !== leadId) : [...current, leadId]
    );
  };

  const allSelected =
    filteredLeads.length > 0 && filteredLeads.every((lead) => selectedLeadIds.includes(lead.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedLeadIds((current) => current.filter((id) => !filteredLeads.some((lead) => lead.id === id)));
    } else {
      setSelectedLeadIds((current) => Array.from(new Set([...current, ...filteredLeads.map((lead) => lead.id)])));
    }
  };

  const clearSelectedLeads = () => setSelectedLeadIds([]);

  const tableColumns = [
    <div key="lead-select" className="flex items-center gap-2">
      <input
        type="checkbox"
        className="table-checkbox h-4 w-4 rounded focus:ring-primary/40"
        aria-label="Sélectionner tous les leads"
        checked={allSelected}
        onChange={toggleSelectAll}
      />
      <span>Entreprise / Contact</span>
    </div>,
    'Téléphone',
    'Email',
    'Statut',
    'Source',
    'Prochaine action',
    'Propriétaire',
    'Actions',
  ];

  const tableRows = filteredLeads.map((lead) => {
    const isSelected = selectedLeadIds.includes(lead.id);
    const nextStep = lead.nextStepDate ? formatShortDate(lead.nextStepDate) : '—';
    const lastContact = lead.lastContact ? formatDateTime(lead.lastContact) : null;
    const estimatedValue =
      lead.estimatedValue !== null && lead.estimatedValue !== undefined
        ? formatCurrency(lead.estimatedValue)
        : null;

    return [
      <div key={`${lead.id}-identity`} className="flex items-start gap-3">
        <input
          type="checkbox"
          className="table-checkbox mt-0.5 h-4 w-4 flex-shrink-0 rounded focus:ring-primary/40"
          checked={isSelected}
          onChange={() => toggleSelection(lead.id)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Sélectionner ${lead.company || lead.contact || 'lead'}`}
        />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">{lead.contact || 'Sans contact'}</p>
          <p className="text-[11px] text-slate-500">{lead.company || 'Sans entreprise'}</p>
          {lead.tags.length > 0 && (
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">{lead.tags.join(' · ')}</p>
          )}
        </div>
      </div>,
      <a
        key={`${lead.id}-phone`}
        href={`tel:${lead.phone}`}
        onClick={(event) => event.stopPropagation()}
        className="text-primary hover:underline"
      >
        {lead.phone || '—'}
      </a>,
      <a
        key={`${lead.id}-email`}
        href={`mailto:${lead.email}`}
        onClick={(event) => event.stopPropagation()}
        className="break-words text-primary hover:underline"
      >
        {lead.email || '—'}
      </a>,
      <span key={`${lead.id}-status`} className="inline-flex items-center">
        <span
          className={clsx(
            'inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium',
            statusTone[lead.status]
          )}
        >
          {lead.status}
        </span>
      </span>,
      <div key={`${lead.id}-source`} className="space-y-1">
        <p className="text-slate-700">{lead.source || '—'}</p>
        {lead.segment && <p className="text-[11px] text-slate-500">{lead.segment}</p>}
      </div>,
      <div key={`${lead.id}-next`} className="space-y-1">
        <p className="font-medium text-slate-900">{nextStep}</p>
        {lead.nextStepNote && <p className="text-[11px] text-slate-500">{lead.nextStepNote}</p>}
        {lastContact && <p className="text-[10px] text-slate-400">Dernier contact {lastContact}</p>}
      </div>,
      <div key={`${lead.id}-owner`} className="space-y-1">
        <p className="font-medium text-slate-900">{lead.owner}</p>
        {estimatedValue && <p className="text-[11px] text-slate-500">{estimatedValue}</p>}
      </div>,
      <div key={`${lead.id}-actions`} className="flex flex-wrap justify-end gap-1">
        {hasPermission('lead.edit') && (
          <RowActionButton label="Modifier" onClick={() => handleOpenEdit(lead)}>
            <IconEdit />
          </RowActionButton>
        )}
        {hasPermission('lead.contact') && (
          <RowActionButton label="Contacter" onClick={() => handleContactLead(lead)}>
            <IconPaperPlane />
          </RowActionButton>
        )}
        {hasPermission('lead.convert') && (
          <RowActionButton label="Convertir en client" onClick={() => handleConvertToClient(lead)}>
            <IconConvert />
          </RowActionButton>
        )}
        {hasPermission('lead.delete') && (
          <RowActionButton label="Supprimer" tone="danger" onClick={() => handleDeleteLead(lead.id)}>
            <IconTrash />
          </RowActionButton>
        )}
      </div>,
    ];
  });

  const leadRowClassName = (index: number) => {
    const lead = filteredLeads[index];
    if (!lead) {
      return '';
    }
    const isSelected = selectedLeadIds.includes(lead.id);
    const isEditing = editingLeadId === lead.id;
    return clsx(
      'align-top text-slate-600 transition-colors',
      isSelected && 'bg-slate-100 text-slate-900',
      !isSelected && isEditing && 'bg-primary/5 text-slate-900'
    );
  };

  const leadCount = filteredLeads.length;

  const leadsByStatus = pipelineStatuses.map((status) => ({
    status,
    leads: filteredLeads.filter((lead) => lead.status === status),
  }));

  const kanban = (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {leadsByStatus.map(({ status, leads: statusLeads }) => (
        <div
          key={status}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const leadId = event.dataTransfer.getData('text/plain');
            if (leadId) {
              updateLead(leadId, { status });
              setDraggingLeadId(null);
            }
          }}
          onDragLeave={() => setDraggingLeadId(null)}
          className={clsx(
            'min-h-[220px] rounded-soft border border-slate-200 bg-white/70 p-4 text-sm',
            draggingLeadId ? 'transition-shadow' : undefined
          )}
        >
          <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-slate-500">
            <span>{status}</span>
            <span>{statusLeads.length}</span>
          </div>
          <div className="space-y-3">
            {statusLeads.map((lead) => (
              <article
                key={lead.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', lead.id);
                  setDraggingLeadId(lead.id);
                }}
                onDragEnd={() => setDraggingLeadId(null)}
                className={clsx(
                  'rounded-soft border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm transition',
                  draggingLeadId === lead.id && 'border-primary/60 shadow-md'
                )}
              >
                <p className="font-semibold text-slate-900">{lead.company || lead.contact}</p>
                <p>{lead.contact}</p>
                <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                  <a href={`tel:${lead.phone}`} className="block text-primary hover:underline">
                    {lead.phone}
                  </a>
                  <a href={`mailto:${lead.email}`} className="block text-primary hover:underline">
                    {lead.email}
                  </a>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  <p>Prochain step : {lead.nextStepDate ? formatShortDate(lead.nextStepDate) : '—'}</p>
                  {lead.nextStepNote && <p>{lead.nextStepNote}</p>}
                </div>
                {lead.estimatedValue && (
                  <p className="mt-2 text-[11px] font-medium text-slate-700">
                    {formatCurrency(lead.estimatedValue)}
                  </p>
                )}
              </article>
            ))}
            {!statusLeads.length && (
              <p className="rounded-soft border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center text-[11px] text-slate-400">
                Glissez un lead ici
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderActivities = (lead: Lead) => {
    if (!lead.activities.length) {
      return <p className="text-xs text-slate-500">Aucune note pour le moment.</p>;
    }
    return (
      <ul className="space-y-3">
        {lead.activities.map((activity) => (
          <li key={activity.id} className="rounded-soft border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-400">
              <span>{activity.type === 'call' ? 'Appel' : 'Note'}</span>
              <span>{formatDateTime(activity.createdAt)}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-slate-700">{activity.content}</p>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="lead-page space-y-7">
      <Card
        title="Leads"
        description="Centralisez prospection et pipeline dans une vue compacte."
        className="lead-card"
        action={
          <div className="flex flex-wrap items-center gap-2">
            {hasPermission('lead.edit') && (
              <Button variant="secondary" size="xs" onClick={handleOpenCreate}>
                Nouveau lead
              </Button>
            )}
            {hasPermission('lead.edit') && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => importInputRef.current?.click()}
              >
                Importer CSV
              </Button>
            )}
            <Button variant="secondary" size="xs" onClick={handleExport}>
              Exporter
            </Button>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setView((mode) => (mode === 'table' ? 'kanban' : 'table'))}
            >
              {view === 'table' ? 'Vue Kanban' : 'Vue Table'}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-search">
              Recherche
            </label>
            <input
              id="lead-search"
              type="search"
              placeholder="Entreprise, contact, email, téléphone"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-1 w-full rounded-soft border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-owner">
              Propriétaire
            </label>
            <select
              id="lead-owner"
              value={filters.owner}
              onChange={(event) => setFilters((prev) => ({ ...prev, owner: event.target.value }))}
              className="mt-1 w-full rounded-soft border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Tous">Tous</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-status">
              Statut
            </label>
            <select
              id="lead-status"
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="mt-1 w-full rounded-soft border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Tous">Tous</option>
              {pipelineStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-source">
              Source
            </label>
            <select
              id="lead-source"
              value={filters.source}
              onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))}
              className="mt-1 w-full rounded-soft border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Toutes">Toutes</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-segment">
              Segment
            </label>
            <select
              id="lead-segment"
              value={filters.segment}
              onChange={(event) => setFilters((prev) => ({ ...prev, segment: event.target.value }))}
              className="mt-1 w-full rounded-soft border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Tous">Tous</option>
              {segments.map((segment) => (
                <option key={segment} value={segment}>
                  {segment}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-tag">
              Tag
            </label>
            <select
              id="lead-tag"
              value={filters.tag}
              onChange={(event) => setFilters((prev) => ({ ...prev, tag: event.target.value }))}
              className="mt-1 w-full rounded-soft border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Tous">Tous</option>
              {tagsCatalog.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {feedback && <p className="mt-4 text-xs font-medium text-primary">{feedback}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="table-checkbox h-4 w-4 rounded focus:ring-primary/40"
              checked={allSelected}
              onChange={toggleSelectAll}
            />
            <span>Sélectionner tout</span>
          </div>
          {!!selectedLeadIds.length && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400">|</span>
              <span>{selectedLeadIds.length} sélectionnés</span>
              {hasPermission('lead.contact') && (
                <Button variant="ghost" size="xs" onClick={handleBulkContactLeads}>
                  Contacter
                </Button>
              )}
              {hasPermission('lead.convert') && (
                <Button variant="ghost" size="xs" onClick={handleBulkConvertLeads}>
                  Convertir
                </Button>
              )}
              {hasPermission('lead.delete') && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleBulkDeleteLeads}
                  className="text-rose-600 hover:text-rose-700"
                >
                  Supprimer
                </Button>
              )}
              <button
                type="button"
                onClick={clearSelectedLeads}
                className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-slate-600"
              >
                Vider la sélection
              </button>
            </div>
          )}
        </div>

        <div ref={listSectionRef}>
          {view === 'table' ? (
            <div className="mt-6 space-y-4">
            <div className="hidden md:block">
              <Table
                columns={tableColumns}
                rows={tableRows}
                tone="plain"
                density="compact"
                striped={false}
                onRowClick={(index) => handleOpenEdit(filteredLeads[index])}
                rowClassName={leadRowClassName}
              />
              {!tableRows.length && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  Aucun lead ne correspond aux filtres.
                </p>
              )}
            </div>

            <div className="md:hidden">
              <div className="space-y-3">
                {filteredLeads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const nextStep = lead.nextStepDate ? formatShortDate(lead.nextStepDate) : '—';
                  const lastContact = lead.lastContact ? formatDateTime(lead.lastContact) : null;
                  const estimatedValue =
                    lead.estimatedValue !== null && lead.estimatedValue !== undefined
                      ? formatCurrency(lead.estimatedValue)
                      : null;

                  return (
                    <div
                      key={lead.id}
                      role="button"
                      tabIndex={0}
                      className={clsx(
                        'rounded-soft border border-slate-200 bg-white px-3 py-3 text-[13px] text-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                        'cursor-pointer hover:bg-slate-100',
                        isSelected && 'border-primary/60 bg-slate-100 text-slate-900'
                      )}
                      onClick={() => handleOpenEdit(lead)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleOpenEdit(lead);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{lead.contact || 'Sans contact'}</p>
                          <p className="text-[12px] text-slate-500">{lead.company || 'Sans entreprise'}</p>
                          {lead.tags.length > 0 && (
                            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                              {lead.tags.join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="table-checkbox mt-0.5 h-4 w-4 rounded focus:ring-primary/40"
                            checked={isSelected}
                            onChange={() => toggleSelection(lead.id)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Sélectionner ${lead.company || lead.contact}`}
                          />
                          <span
                            className={clsx(
                              'inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium',
                              statusTone[lead.status]
                            )}
                          >
                            {lead.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-[12px]">
                        <a
                          href={`tel:${lead.phone}`}
                          onClick={(event) => event.stopPropagation()}
                          className="block text-primary hover:underline"
                        >
                          {lead.phone || '—'}
                        </a>
                        <a
                          href={`mailto:${lead.email}`}
                          onClick={(event) => event.stopPropagation()}
                          className="block break-words text-primary hover:underline"
                        >
                          {lead.email || '—'}
                        </a>
                      </div>
                      <div className="mt-3 space-y-1 text-[12px] text-slate-600">
                        <p className="font-medium text-slate-900">{nextStep}</p>
                        {lead.nextStepNote && <p className="text-[11px] text-slate-500">{lead.nextStepNote}</p>}
                        {lastContact && <p className="text-[11px] text-slate-400">Dernier contact {lastContact}</p>}
                        <div className="text-[11px] text-slate-500">
                          <span>{lead.owner}</span>
                          {estimatedValue && <span className="ml-2">• {estimatedValue}</span>}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-1">
                        {hasPermission('lead.edit') && (
                          <RowActionButton label="Modifier" onClick={() => handleOpenEdit(lead)}>
                            <IconEdit />
                          </RowActionButton>
                        )}
                        {hasPermission('lead.contact') && (
                          <RowActionButton label="Contacter" onClick={() => handleContactLead(lead)}>
                            <IconPaperPlane />
                          </RowActionButton>
                        )}
                        {hasPermission('lead.convert') && (
                          <RowActionButton label="Convertir en client" onClick={() => handleConvertToClient(lead)}>
                            <IconConvert />
                          </RowActionButton>
                        )}
                        {hasPermission('lead.delete') && (
                          <RowActionButton label="Supprimer" tone="danger" onClick={() => handleDeleteLead(lead.id)}>
                            <IconTrash />
                          </RowActionButton>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!filteredLeads.length && (
                  <p className="rounded-soft border border-dashed border-slate-200 bg-white/60 px-3 py-6 text-center text-xs text-slate-500">
                    Aucun lead ne correspond aux filtres.
                  </p>
                )}
              </div>
            </div>

            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{leadCount} leads</p>
          </div>
        ) : (
          kanban
        )}
        </div>
      </Card>

      {activePanel === 'create' && (
        <div ref={createSectionRef}>
          <Card
            title="Nouveau lead"
            description="Renseignez les informations principales"
            action={
              <button
                type="button"
                className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-slate-600"
                onClick={closePanels}
              >
                Fermer
              </button>
            }
            className="lead-card"
          >
            <form onSubmit={handleCreateSubmit} className="space-y-5 text-sm text-slate-700">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-company">
                    Entreprise
                  </label>
                  <input
                    id="lead-company"
                    value={leadForm.company}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, company: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-contact">
                    Contact
                  </label>
                  <input
                    id="lead-contact"
                    value={leadForm.contact}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, contact: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-phone">
                    Téléphone
                  </label>
                  <input
                    id="lead-phone"
                    value={leadForm.phone}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, phone: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {phoneDuplicate && <p className="text-[11px] text-primary">Numéro déjà utilisé.</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-email">
                    Email
                  </label>
                  <input
                    id="lead-email"
                    type="email"
                    value={leadForm.email}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, email: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {emailDuplicate && <p className="text-[11px] text-primary">Email déjà utilisé.</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-source-create">
                    Source
                  </label>
                  <input
                    id="lead-source-create"
                    value={leadForm.source}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, source: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-segment-create">
                    Segment
                  </label>
                  <input
                    id="lead-segment-create"
                    value={leadForm.segment}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, segment: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-status-create">
                    Statut
                  </label>
                  <select
                    id="lead-status-create"
                    value={leadForm.status}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, status: event.target.value as LeadStatus }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {pipelineStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-owner-create">
                    Propriétaire
                  </label>
                  <select
                    id="lead-owner-create"
                    value={leadForm.owner}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, owner: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {[leadForm.owner, ...owners]
                      .filter((value, index, array) => array.indexOf(value) === index)
                      .map((owner) => (
                        <option key={owner} value={owner}>
                          {owner}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-company-select">
                    Entreprise liée
                  </label>
                  <select
                    id="lead-company-select"
                    value={leadForm.companyId}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, companyId: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Aucune</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-next-date">
                    Prochain step
                  </label>
                  <input
                    id="lead-next-date"
                    type="date"
                    value={leadForm.nextStepDate}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, nextStepDate: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-next-note">
                    Détail step
                  </label>
                  <input
                    id="lead-next-note"
                    value={leadForm.nextStepNote}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, nextStepNote: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-value">
                    Valeur estimée
                  </label>
                  <input
                    id="lead-value"
                    type="number"
                    min="0"
                    step="0.5"
                    value={leadForm.estimatedValue}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, estimatedValue: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-address">
                    Adresse
                  </label>
                  <input
                    id="lead-address"
                    value={leadForm.address}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, address: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-support-type">
                    Support
                  </label>
                  <select
                    id="lead-support-type"
                    value={leadForm.supportType}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, supportType: event.target.value as SupportType }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {supportTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400"
                    htmlFor="lead-support-detail"
                  >
                    Détail support
                  </label>
                  <input
                    id="lead-support-detail"
                    value={leadForm.supportDetail}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, supportDetail: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="lead-tags">
                    Tags
                  </label>
                  <input
                    id="lead-tags"
                    value={leadForm.tags}
                    onChange={(event) => setLeadForm((draft) => ({ ...draft, tags: event.target.value }))}
                    placeholder="Séparés par des virgules"
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  Enregistrer le lead
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {activePanel === 'edit' && editingLead && (
        <div ref={editSectionRef}>
          <Card
            title={editingLead.company || editingLead.contact}
            description="Mettez à jour les informations ou ajoutez une interaction"
            action={
              <button
                type="button"
                className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-slate-600"
                onClick={closePanels}
              >
                Fermer
              </button>
            }
            className="lead-card"
          >
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <form onSubmit={handleEditSubmit} className="space-y-5 text-sm text-slate-700">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-company">
                      Entreprise
                    </label>
                    <input
                      id="edit-company"
                      value={leadForm.company}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, company: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-contact">
                      Contact
                    </label>
                    <input
                      id="edit-contact"
                      value={leadForm.contact}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, contact: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-phone">
                      Téléphone
                    </label>
                    <input
                      id="edit-phone"
                      value={leadForm.phone}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, phone: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {phoneDuplicate && <p className="text-[11px] text-primary">Numéro déjà utilisé.</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-email">
                      Email
                    </label>
                    <input
                      id="edit-email"
                      type="email"
                      value={leadForm.email}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, email: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    {emailDuplicate && <p className="text-[11px] text-primary">Email déjà utilisé.</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-source">
                      Source
                    </label>
                    <input
                      id="edit-source"
                      value={leadForm.source}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, source: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-segment">
                      Segment
                    </label>
                    <input
                      id="edit-segment"
                      value={leadForm.segment}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, segment: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-status">
                      Statut
                    </label>
                    <select
                      id="edit-status"
                      value={leadForm.status}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, status: event.target.value as LeadStatus }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {pipelineStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-owner">
                      Propriétaire
                    </label>
                    <select
                      id="edit-owner"
                      value={leadForm.owner}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, owner: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {[leadForm.owner, ...owners]
                        .filter((value, index, array) => array.indexOf(value) === index)
                        .map((owner) => (
                          <option key={owner} value={owner}>
                            {owner}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-company-select">
                      Entreprise liée
                    </label>
                    <select
                      id="edit-company-select"
                      value={leadForm.companyId}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, companyId: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">Aucune</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-next-date">
                      Prochain step
                    </label>
                    <input
                      id="edit-next-date"
                      type="date"
                      value={leadForm.nextStepDate}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, nextStepDate: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-next-note">
                      Détail step
                    </label>
                    <input
                      id="edit-next-note"
                      value={leadForm.nextStepNote}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, nextStepNote: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-value">
                      Valeur estimée
                    </label>
                    <input
                      id="edit-value"
                      type="number"
                      min="0"
                      step="0.5"
                      value={leadForm.estimatedValue}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, estimatedValue: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-address">
                      Adresse
                    </label>
                    <input
                      id="edit-address"
                      value={leadForm.address}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, address: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-support-type">
                      Support
                    </label>
                    <select
                      id="edit-support-type"
                      value={leadForm.supportType}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, supportType: event.target.value as SupportType }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {supportTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-support-detail">
                      Détail support
                    </label>
                    <input
                      id="edit-support-detail"
                      value={leadForm.supportDetail}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, supportDetail: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-tags">
                      Tags
                    </label>
                    <input
                      id="edit-tags"
                      value={leadForm.tags}
                      onChange={(event) => setLeadForm((draft) => ({ ...draft, tags: event.target.value }))}
                      placeholder="Séparés par des virgules"
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="submit" size="sm" variant="primary">
                    Mettre à jour le lead
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCreateEngagement(editingLead, 'devis')}
                  >
                    Préparer un devis
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCreateEngagement(editingLead, 'service')}
                  >
                    Planifier un service
                  </Button>
                </div>
              </form>

              <div className="space-y-5 text-sm text-slate-700">
                <section className="lead-surface space-y-3 rounded-soft border border-slate-200 bg-white/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                    Journal d’activité
                  </p>
                  {renderActivities(editingLead)}
                </section>
                <section className="lead-surface space-y-3 rounded-soft border border-slate-200 bg-white/70 p-4">
                  <form onSubmit={handleAddActivity} className="space-y-3">
                    <div className="flex gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name="activity-type"
                          value="note"
                          checked={noteType === 'note'}
                          onChange={() => setNoteType('note')}
                        />
                        Note
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          name="activity-type"
                          value="call"
                          checked={noteType === 'call'}
                          onChange={() => setNoteType('call')}
                        />
                        Appel
                      </label>
                    </div>
                    <textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder={noteType === 'call' ? 'Compte-rendu d’appel' : 'Note interne'}
                      className="h-28 w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" variant="primary" disabled={!noteDraft.trim()}>
                        Ajouter
                      </Button>
                    </div>
                  </form>
                </section>
              </div>
            </div>
          </Card>
        </div>
      )}

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

export default LeadPage;
