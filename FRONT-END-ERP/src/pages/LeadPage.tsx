import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

import * as Popover from '@radix-ui/react-popover';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { RowActionButton } from '../components/RowActionButton';
import {
  IconConvert,
  IconEdit,
  IconPaperPlane,
  IconTrash,
  IconClock,
  IconCall,
  IconNote,
  IconMail,
  IconPhone,
  IconDocument,
  IconService,
} from '../components/icons';
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
import { normalisePhone } from '../lib/phone';
import { Filter, Download, X, Search, Target, TrendingUp, Users, Flame } from 'lucide-react';

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

const statusTone: Record<LeadStatus, string> = {
  Nouveau: 'border-primary/30 text-primary',
  'À contacter': 'border-slate-300 text-slate-700',
  'En cours': 'border-blue-200 text-primary',
  'Devis envoyé': 'border-amber-200 text-amber-600',
  Gagné: 'border-emerald-200 text-emerald-600',
  Perdu: 'border-rose-200 text-rose-600',
};

const leadStatusConfig: Record<LeadStatus, { label: string; color: string }> = {
  Nouveau: {
    label: 'Nouveau',
    color: 'bg-blue-200 text-blue-800 border border-blue-300 shadow-[0_1px_0_rgba(59,130,246,0.35)]',
  },
  'À contacter': {
    label: 'À contacter',
    color: 'bg-slate-200 text-slate-700 border border-slate-300 shadow-[0_1px_0_rgba(148,163,184,0.35)]',
  },
  'En cours': {
    label: 'En cours',
    color: 'bg-sky-200 text-sky-800 border border-sky-300 shadow-[0_1px_0_rgba(14,165,233,0.35)]',
  },
  'Devis envoyé': {
    label: 'Devis envoyé',
    color: 'bg-amber-200 text-amber-800 border border-amber-300 shadow-[0_1px_0_rgba(245,158,11,0.35)]',
  },
  Gagné: {
    label: 'Gagné',
    color: 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)]',
  },
  Perdu: {
    label: 'Perdu',
    color: 'bg-rose-200 text-rose-800 border border-rose-300 shadow-[0_1px_0_rgba(244,63,94,0.35)]',
  },
};

const getLeadInitials = (company: string, contact: string) => {
  if (company) {
    const parts = company.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }
    return company.slice(0, 2).toUpperCase();
  }
  if (contact) {
    const parts = contact.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
    }
    return contact.slice(0, 2).toUpperCase();
  }
  return '??';
};

type PipelineStatusTheme = {
  accent: string;
  background: string;
  border: string;
  chip: string;
  shadow: string;
};

const pipelineStatusThemes: Record<LeadStatus, PipelineStatusTheme> = {
  Nouveau: {
    accent: '#2563eb',
    background: 'linear-gradient(135deg, rgba(37,99,235,0.14), rgba(59,130,246,0.06))',
    border: 'rgba(37,99,235,0.22)',
    chip: 'rgba(37,99,235,0.12)',
    shadow: '0 14px 28px rgba(37, 99, 235, 0.16)',
  },
  'À contacter': {
    accent: '#7c3aed',
    background: 'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(79,70,229,0.08))',
    border: 'rgba(124,58,237,0.24)',
    chip: 'rgba(124,58,237,0.14)',
    shadow: '0 14px 28px rgba(124, 58, 237, 0.18)',
  },
  'En cours': {
    accent: '#0ea5e9',
    background: 'linear-gradient(135deg, rgba(14,165,233,0.18), rgba(56,189,248,0.08))',
    border: 'rgba(14,165,233,0.20)',
    chip: 'rgba(14,165,233,0.12)',
    shadow: '0 14px 30px rgba(14, 165, 233, 0.16)',
  },
  'Devis envoyé': {
    accent: '#f59e0b',
    background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(249,115,22,0.06))',
    border: 'rgba(245,158,11,0.22)',
    chip: 'rgba(245,158,11,0.14)',
    shadow: '0 14px 28px rgba(245, 158, 11, 0.18)',
  },
  Gagné: {
    accent: '#10b981',
    background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(134,239,172,0.08))',
    border: 'rgba(16,185,129,0.22)',
    chip: 'rgba(16,185,129,0.12)',
    shadow: '0 14px 30px rgba(16, 185, 129, 0.18)',
  },
  Perdu: {
    accent: '#f43f5e',
    background: 'linear-gradient(135deg, rgba(244,63,94,0.16), rgba(248,113,113,0.06))',
    border: 'rgba(244,63,94,0.22)',
    chip: 'rgba(244,63,94,0.14)',
    shadow: '0 14px 28px rgba(244, 63, 94, 0.18)',
  },
};

const DotsIcon = () => (
  <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true" focusable="false">
    <circle cx="2.5" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="13.5" cy="8" r="1.5" fill="currentColor" />
  </svg>
);

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
    removeLeadActivity,
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
  const [filters, setFilters] = useState({
    owner: 'Tous',
    status: 'Tous',
    source: 'Toutes',
    segment: 'Tous',
    tag: 'Tous',
  });
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<'create' | 'edit' | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [noteType, setNoteType] = useState<LeadActivityType>('note');
  const [noteDraft, setNoteDraft] = useState('');
  const [pendingActivities, setPendingActivities] = useState<Array<{ type: LeadActivityType; content: string }>>([]);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  const listSectionRef = useRef<HTMLDivElement | null>(null);
  const editSectionRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const leadRefs = useRef<Record<string, HTMLElement | null>>({});

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
    const target = activePanel === 'edit' ? editSectionRef.current : null;
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      const focusable = target.querySelector<HTMLElement>('input, select, textarea');
      focusable?.focus({ preventScroll: true });
    }, 160);
  }, [activePanel]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showEditLeadModal) {
        setShowEditLeadModal(false);
        setEditingLeadId(null);
        setFeedback(null);
        setPendingActivities([]);
      }
    };
    if (showEditLeadModal) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showEditLeadModal]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
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
  }, [leads, filters]);

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
    setShowCreateLeadModal(true);
    setNoteDraft('');
    setFeedback(null);
    setPendingActivities([]);
  };

  const handleCloseCreateModal = () => {
    setShowCreateLeadModal(false);
    setFeedback(null);
  };

  const handleOpenEdit = (lead: Lead, intent?: LeadActivityType) => {
    setLeadForm(buildFormState(lead, defaultOwner, defaultCompanyId));
    setEditingLeadId(lead.id);
    setShowEditLeadModal(true);
    if (intent) {
      setNoteType(intent);
    }
    setNoteDraft('');
    setFeedback(null);
    setPendingActivities([]);
  };

  const handleCloseEditModal = () => {
    setShowEditLeadModal(false);
    setEditingLeadId(null);
    setFeedback(null);
    setPendingActivities([]);
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

  const scrollToLead = useCallback((leadId: string) => {
    const attemptScroll = (retries = 8) => {
      const element = leadRefs.current[leadId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (retries > 0) {
        window.requestAnimationFrame(() => attemptScroll(retries - 1));
      }
    };
    attemptScroll();
  }, []);

  const handlePipelineLeadClick = (leadId: string) => {
    setView('table');
    window.requestAnimationFrame(() => scrollToLead(leadId));
  };

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
      setFeedback("Renseignez au minimum l'entreprise et le contact.");
      return;
    }
    if (emailDuplicate) {
      setFeedback("Un lead utilise déjà cet email.");
      return;
    }
    if (phoneDuplicate) {
      setFeedback("Un lead utilise déjà ce numéro.");
      return;
    }
    const payload = mapFormToPayload();
    const created = addLead({
      ...payload,
      lastContact: null,
    });
    
    // Ajouter les activités en attente
    pendingActivities.forEach((activity) => {
      recordLeadActivity(created.id, activity);
    });
    
    setFeedback('Lead créé.');
    setSelectedLeadIds((ids) => [created.id, ...ids]);
    setShowCreateLeadModal(false);
    setPendingActivities([]);
    scrollToList();
  };

  const handleAddPendingActivity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!noteDraft.trim()) {
      return;
    }
    setPendingActivities((prev) => [
      ...prev,
      {
        type: noteType,
        content: noteDraft.trim(),
      },
    ]);
    setNoteDraft('');
    setNoteType('note');
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingLeadId) {
      return;
    }
    if (!leadForm.company.trim() || !leadForm.contact.trim()) {
      setFeedback("Renseignez au minimum l'entreprise et le contact.");
      return;
    }
    if (emailDuplicate) {
      setFeedback("Un lead utilise déjà cet email.");
      return;
    }
    if (phoneDuplicate) {
      setFeedback("Un lead utilise déjà ce numéro.");
      return;
    }
    updateLead(editingLeadId, mapFormToPayload());
    
    // Ajouter les activités en attente
    pendingActivities.forEach((activity) => {
      recordLeadActivity(editingLeadId, activity);
    });
    
    setFeedback('Lead mis à jour.');
    setPendingActivities([]);
    setTimeout(() => {
      handleCloseEditModal();
    }, 1000);
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
    'Statut',
    'Prochaine action',
    'Valeur estimée',
    'Téléphone',
    'Email',
    'Source',
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
      <div
        key={`${lead.id}-identity`}
        ref={(element) => {
          if (element) {
            leadRefs.current[lead.id] = element;
          } else {
            delete leadRefs.current[lead.id];
          }
        }}
        className="flex items-start gap-3"
      >
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
      <span key={`${lead.id}-status`} className="inline-flex items-center">
        <span
          className={clsx(
            'inline-flex items-center rounded-full border-2 px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all hover:scale-105',
            statusTone[lead.status]
          )}
        >
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-current opacity-60" />
          {lead.status}
        </span>
      </span>,
      <div key={`${lead.id}-next`} className="space-y-1">
        <div className="flex items-center gap-1.5">
          {lead.nextStepDate && (
            <IconClock />
          )}
          <p className="font-semibold text-slate-900">{nextStep}</p>
        </div>
        {lead.nextStepNote && <p className="text-[11px] text-slate-600">{lead.nextStepNote}</p>}
        {lastContact && <p className="text-[10px] text-slate-400">Dernier contact {lastContact}</p>}
      </div>,
      <div key={`${lead.id}-value`} className="space-y-1">
        {estimatedValue ? (
          <div className="flex items-baseline gap-1">
            <p className="font-bold text-xl text-primary drop-shadow-sm">{estimatedValue}</p>
            <span className="text-[10px] text-slate-400">€</span>
          </div>
        ) : (
          <p className="text-slate-400">—</p>
        )}
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
      <div key={`${lead.id}-source`} className="space-y-1">
        <p className="text-slate-700">{lead.source || '—'}</p>
        {lead.segment && <p className="text-[11px] text-slate-500">{lead.segment}</p>}
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

  const totalLeads = filteredLeads.length;
  const activeLeads = useMemo(
    () => filteredLeads.filter((lead) => lead.status !== 'Perdu' && lead.status !== 'Gagné').length,
    [filteredLeads]
  );
  const leadsInProgress = useMemo(
    () => filteredLeads.filter((lead) => lead.status === 'En cours' || lead.status === 'Devis envoyé').length,
    [filteredLeads]
  );
  const visibleLeadCount = filteredLeads.length;

  const totalEstimatedValue = useMemo(
    () =>
      filteredLeads.reduce(
        (acc, lead) => acc + (lead.estimatedValue !== null && lead.estimatedValue !== undefined ? lead.estimatedValue : 0),
        0
      ),
    [filteredLeads]
  );

  const leadKpis = useMemo(() => {
    const averageValue = totalLeads > 0 ? totalEstimatedValue / totalLeads : 0;
    return [
      {
        id: 'total',
        label: 'Leads suivis',
        value: totalLeads.toLocaleString('fr-FR'),
        helper: `${activeLeads.toLocaleString('fr-FR')} actifs`,
        icon: Users,
      },
      {
        id: 'pipeline',
        label: 'Leads en qualification',
        value: leadsInProgress.toLocaleString('fr-FR'),
        helper: 'Pipeline en qualification',
        icon: Target,
      },
      {
        id: 'value',
        label: 'Valeur moyenne / lead',
        value: formatCurrency(averageValue),
        helper: `Total ${formatCurrency(totalEstimatedValue)}`,
        icon: TrendingUp,
      },
    ];
  }, [totalLeads, activeLeads, leadsInProgress, totalEstimatedValue]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.owner !== 'Tous') count += 1;
    if (filters.status !== 'Tous') count += 1;
    if (filters.source !== 'Toutes') count += 1;
    if (filters.segment !== 'Tous') count += 1;
    if (filters.tag !== 'Tous') count += 1;
    return count;
  }, [filters]);

  const leadsByStatus = useMemo(
    () =>
      pipelineStatuses.map((status) => ({
        status,
        leads: filteredLeads.filter((lead) => lead.status === status),
      })),
    [filteredLeads]
  );

  const leadsByStatusMap = useMemo(() => {
    const map = new Map<LeadStatus, Lead[]>();
    leadsByStatus.forEach(({ status, leads: statusLeads }) => {
      map.set(status, statusLeads);
    });
    return map;
  }, [leadsByStatus]);

  const pipelineMetrics = useMemo(() => {
    return pipelineStatuses.map((status) => {
      const statusLeads = leadsByStatusMap.get(status) ?? [];
      const total = statusLeads.length;
      const shareOfAll = totalLeads === 0 ? 0 : total / totalLeads;
      const sortedVisible = [...statusLeads].sort((a, b) => {
        const nextStepAValue = a.nextStepDate ? Date.parse(a.nextStepDate) : Number.POSITIVE_INFINITY;
        const nextStepBValue = b.nextStepDate ? Date.parse(b.nextStepDate) : Number.POSITIVE_INFINITY;
        const nextStepA = Number.isFinite(nextStepAValue) ? nextStepAValue : Number.POSITIVE_INFINITY;
        const nextStepB = Number.isFinite(nextStepBValue) ? nextStepBValue : Number.POSITIVE_INFINITY;
        if (nextStepA !== nextStepB) {
          return nextStepA - nextStepB;
        }
        const createdAtA = Date.parse(a.createdAt);
        const createdAtB = Date.parse(b.createdAt);
        const safeCreatedAtA = Number.isFinite(createdAtA) ? createdAtA : 0;
        const safeCreatedAtB = Number.isFinite(createdAtB) ? createdAtB : 0;
        return safeCreatedAtB - safeCreatedAtA;
      });
      const nextLead = sortedVisible[0] ?? null;
      return {
        status,
        total,
        visible: total,
        visibilityRatio: 1,
        shareOfAll,
        leads: sortedVisible,
        nextLead,
      };
    });
  }, [leadsByStatusMap, totalLeads]);

  const handleStatusFilterToggle = (status: LeadStatus) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? 'Tous' : status,
    }));
  };

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
      return <p className="text-xs text-slate-500">Aucune activité pour le moment.</p>;
    }
    const sortedActivities = [...lead.activities].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return (
      <div className="relative">
        {/* Timeline verticale */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
        <ul className="space-y-4">
          {sortedActivities.map((activity, index) => (
            <li key={activity.id} className="relative flex gap-4">
              {/* Point de timeline */}
              <div className={clsx(
                "relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-white shadow-lg transition-all",
                activity.type === 'call' 
                  ? 'bg-gradient-to-br from-primary to-primary/80' 
                  : 'bg-gradient-to-br from-slate-400 to-slate-500'
              )}>
                {activity.type === 'call' ? (
                  <IconCall />
                ) : (
                  <IconNote />
                )}
              </div>
              {/* Contenu de l'activité */}
              <div className="flex-1 rounded-xl border border-slate-200/60 bg-white p-4 shadow-md transition-all hover:shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    {activity.type === 'call' ? (
                      <>
                        <IconCall />
                        Appel téléphonique
                      </>
                    ) : (
                      <>
                        <IconNote />
                        Note interne
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400">{formatDateTime(activity.createdAt)}</span>
                </div>
                <p className="whitespace-pre-line text-xs text-slate-700">{activity.content}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="dashboard-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Gestion CRM</p>
            <h1 className="dashboard-hero__title">Prospection</h1>
            <p className="dashboard-hero__subtitle">
              Pilotez vos leads et convertissez vos prospects en clients
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
          {leadKpis.map((kpi, index) => {
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
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tout sélectionner</span>
                </div>
                {selectedLeadIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-l border-slate-200 pl-4 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedLeadIds.length} sélectionné(s)
                    </span>
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
                  </div>
                )}
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
                <button
                  type="button"
                  onClick={() => setFiltersVisible((value) => !value)}
                  className={clsx(
                    'relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                    filtersVisible || activeFiltersCount > 0
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
                {hasPermission('lead.edit') && (
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white/90"
                  >
                    Nouveau lead
                  </button>
                )}
              </div>
            </div>
          </div>

        {filtersVisible && (
          <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Propriétaire</label>
                  <select
                    value={filters.owner}
                    onChange={(event) => setFilters((prev) => ({ ...prev, owner: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Statut</label>
                  <select
                    value={filters.status}
                    onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Source</label>
                  <select
                    value={filters.source}
                    onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Segment</label>
                  <select
                    value={filters.segment}
                    onChange={(event) => setFilters((prev) => ({ ...prev, segment: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Tag</label>
                  <select
                    value={filters.tag}
                    onChange={(event) => setFilters((prev) => ({ ...prev, tag: event.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <p className="text-slate-500 dark:text-slate-400">
                  {activeFiltersCount ? `${activeFiltersCount} filtre(s) actif(s)` : 'Aucun filtre actif'}
                </p>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters({
                        owner: 'Tous',
                        status: 'Tous',
                        source: 'Toutes',
                        segment: 'Tous',
                        tag: 'Tous',
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    <X className="h-3.5 w-3.5" />
                    Effacer les filtres
                  </button>
                )}
              </div>
            </div>
          )}
      </section>

      <div ref={listSectionRef} className="space-y-6">
        {view === 'table' ? (
          <>
            <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)] lg:block">
              <div className="overflow-x-auto rounded-2xl">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                    <tr>
                      <th className="w-12 px-4 py-4" />
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Entreprise / Contact
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Statut
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Prochaine action
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Valeur estimée
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Téléphone
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Source
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map((lead) => {
                      const isSelected = selectedLeadIds.includes(lead.id);
                      const nextStep = lead.nextStepDate ? formatShortDate(lead.nextStepDate) : '—';
                      const lastContact = lead.lastContact ? formatDateTime(lead.lastContact) : null;
                      const estimatedValue =
                        lead.estimatedValue !== null && lead.estimatedValue !== undefined
                          ? formatCurrency(lead.estimatedValue)
                          : null;
                      const statusStyle = leadStatusConfig[lead.status];
                      const avatarLabel = getLeadInitials(lead.company || '', lead.contact || '');

                      return (
                        <tr
                          key={lead.id}
                          onClick={() => handleOpenEdit(lead)}
                          className={clsx(
                            'group transition hover:bg-slate-50 dark:hover:bg-white/5',
                            isSelected && 'bg-blue-50/50 dark:bg-blue-500/10'
                          )}
                        >
                          <td className="px-6 py-5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(event) => {
                                event.stopPropagation();
                                toggleSelection(lead.id);
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  {lead.contact || 'Sans contact'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{lead.company || 'Sans entreprise'}</p>
                                {lead.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {lead.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 align-middle text-center">
                            <span
                              className={clsx(
                                'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                                statusStyle.color
                              )}
                            >
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="px-6 py-5 align-middle">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{nextStep}</p>
                              {lead.nextStepNote && (
                                <p className="text-xs text-slate-600 dark:text-slate-400">{lead.nextStepNote}</p>
                              )}
                              {lastContact && (
                                <p className="text-xs text-slate-500 dark:text-slate-500">Dernier contact {lastContact}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 align-middle text-right">
                            {estimatedValue ? (
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{estimatedValue}</p>
                            ) : (
                              <p className="text-sm text-slate-400">—</p>
                            )}
                          </td>
                          <td className="px-6 py-5 align-middle">
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(event) => event.stopPropagation()}
                              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {lead.phone || '—'}
                            </a>
                          </td>
                          <td className="px-6 py-5 align-middle">
                            <a
                              href={`mailto:${lead.email}`}
                              onClick={(event) => event.stopPropagation()}
                              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                            >
                              {lead.email || '—'}
                            </a>
                          </td>
                          <td className="px-6 py-5 align-middle">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{lead.source || '—'}</p>
                              {lead.segment && <p className="text-xs text-slate-600 dark:text-slate-400">{lead.segment}</p>}
                            </div>
                          </td>
                          <td className="px-6 py-5 align-middle">
                            <div className="flex items-center justify-end gap-2">
                              {hasPermission('lead.edit') && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleOpenEdit(lead);
                                  }}
                                  className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                  title="Modifier"
                                >
                                  <span className="h-4 w-4"><IconEdit /></span>
                                </button>
                              )}
                              {hasPermission('lead.contact') && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleContactLead(lead);
                                  }}
                                  className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                                  title="Contacter"
                                >
                                  <span className="h-4 w-4"><IconPaperPlane /></span>
                                </button>
                              )}
                              {hasPermission('lead.convert') && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleConvertToClient(lead);
                                  }}
                                  className="rounded-lg p-2 text-slate-600 transition hover:bg-emerald-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-200"
                                  title="Convertir en client"
                                >
                                  <span className="h-4 w-4"><IconConvert /></span>
                                </button>
                              )}
                              {hasPermission('lead.delete') && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteLead(lead.id);
                                  }}
                                  className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                                  title="Supprimer"
                                >
                                  <span className="h-4 w-4"><IconTrash /></span>
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
              {filteredLeads.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <Search className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Aucun lead trouvé</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Ajustez votre recherche ou vos filtres pour retrouver vos leads.
                  </p>
                </div>
              )}
            </div>

            <div className="lg:hidden">
              <div className="space-y-3">
                {filteredLeads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const nextStep = lead.nextStepDate ? formatShortDate(lead.nextStepDate) : '—';
                  const lastContact = lead.lastContact ? formatDateTime(lead.lastContact) : null;
                  const estimatedValue =
                    lead.estimatedValue !== null && lead.estimatedValue !== undefined
                      ? formatCurrency(lead.estimatedValue)
                      : null;
                  const statusStyle = leadStatusConfig[lead.status];
                  const avatarLabel = getLeadInitials(lead.company || '', lead.contact || '');

                  return (
                    <div
                      key={lead.id}
                      role="button"
                      tabIndex={0}
                      ref={(element) => {
                        if (element) {
                          leadRefs.current[lead.id] = element;
                        } else {
                          delete leadRefs.current[lead.id];
                        }
                      }}
                      className={clsx(
                        'rounded-2xl border border-slate-200 bg-white p-4 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900',
                        'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800',
                        isSelected && 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
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
                        <div className="flex items-center gap-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                              {lead.contact || 'Sans contact'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{lead.company || 'Sans entreprise'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            checked={isSelected}
                            onChange={() => toggleSelection(lead.id)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Sélectionner ${lead.company || lead.contact}`}
                          />
                          <span
                            className={clsx(
                              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                              statusStyle.color
                            )}
                          >
                            {statusStyle.label}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-xs">
                        <a
                          href={`tel:${lead.phone}`}
                          onClick={(event) => event.stopPropagation()}
                          className="block text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {lead.phone || '—'}
                        </a>
                        <a
                          href={`mailto:${lead.email}`}
                          onClick={(event) => event.stopPropagation()}
                          className="block break-words text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {lead.email || '—'}
                        </a>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{nextStep}</p>
                        {lead.nextStepNote && <p className="text-xs text-slate-500">{lead.nextStepNote}</p>}
                        {lastContact && <p className="text-xs text-slate-400">Dernier contact {lastContact}</p>}
                        <div className="text-xs text-slate-500">
                          <span>{lead.owner}</span>
                          {estimatedValue && <span className="ml-2">• {estimatedValue}</span>}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-1">
                        {hasPermission('lead.edit') && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenEdit(lead);
                            }}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            title="Modifier"
                          >
                            <span className="h-4 w-4"><IconEdit /></span>
                          </button>
                        )}
                        {hasPermission('lead.contact') && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleContactLead(lead);
                            }}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                            title="Contacter"
                          >
                            <span className="h-4 w-4"><IconPaperPlane /></span>
                          </button>
                        )}
                        {hasPermission('lead.convert') && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleConvertToClient(lead);
                            }}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-emerald-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-200"
                            title="Convertir en client"
                          >
                            <span className="h-4 w-4"><IconConvert /></span>
                          </button>
                        )}
                        {hasPermission('lead.delete') && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteLead(lead.id);
                            }}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                            title="Supprimer"
                          >
                            <span className="h-4 w-4"><IconTrash /></span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!filteredLeads.length && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Aucun lead ne correspond aux filtres.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
              {visibleLeadCount} lead{visibleLeadCount > 1 ? 's' : ''}
            </div>
            </>
          ) : (
            kanban
          )}
      </div>

      {showCreateLeadModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4 py-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-lead-title"
            onClick={handleCloseCreateModal}
          >
            <div
              className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 transition dark:border-slate-700 dark:bg-slate-900"
              onClick={(event) => event.stopPropagation()}
            >
              <form
                onSubmit={handleCreateSubmit}
                className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
              >
                {/* En-tête avec titre et bouton de fermeture */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
                      CRÉER UN LEAD
                    </span>
                    <h2 id="create-lead-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      Nouveau lead
                    </h2>
                    <p className="max-w-lg text-xs text-slate-500 dark:text-slate-400">
                      Renseignez les informations principales pour créer un nouveau lead.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Contenu principal du formulaire */}
                <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                  <div className="space-y-4">
                    {feedback && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200">
                        {feedback}
                      </div>
                    )}

                    {/* Informations de contact */}
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-company"
                        >
                          Entreprise *
                        </label>
                        <input
                          id="modal-lead-company"
                          type="text"
                          value={leadForm.company}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, company: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          required
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-contact"
                        >
                          Contact *
                        </label>
                        <input
                          id="modal-lead-contact"
                          type="text"
                          value={leadForm.contact}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, contact: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          required
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-phone"
                        >
                          Téléphone
                        </label>
                        <input
                          id="modal-lead-phone"
                          type="tel"
                          value={leadForm.phone}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, phone: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        {phoneDuplicate && (
                          <p className="mt-1 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                            ⚠️ Numéro déjà utilisé.
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-email"
                        >
                          Email
                        </label>
                        <input
                          id="modal-lead-email"
                          type="email"
                          value={leadForm.email}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, email: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        {emailDuplicate && (
                          <p className="mt-1 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                            ⚠️ Email déjà utilisé.
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-address"
                        >
                          Adresse
                        </label>
                        <input
                          id="modal-lead-address"
                          type="text"
                          value={leadForm.address}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, address: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Détails commerciaux */}
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-source"
                        >
                          Source
                        </label>
                        <input
                          id="modal-lead-source"
                          type="text"
                          value={leadForm.source}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, source: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-segment"
                        >
                          Segment
                        </label>
                        <input
                          id="modal-lead-segment"
                          type="text"
                          value={leadForm.segment}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, segment: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-status"
                        >
                          Statut
                        </label>
                        <select
                          id="modal-lead-status"
                          value={leadForm.status}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, status: event.target.value as LeadStatus }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          {pipelineStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-owner"
                        >
                          Propriétaire
                        </label>
                        <select
                          id="modal-lead-owner"
                          value={leadForm.owner}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, owner: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-value"
                        >
                          Valeur estimée
                        </label>
                        <input
                          id="modal-lead-value"
                          type="number"
                          min="0"
                          step="0.5"
                          value={leadForm.estimatedValue}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, estimatedValue: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-company-select"
                        >
                          Entreprise liée
                        </label>
                        <select
                          id="modal-lead-company-select"
                          value={leadForm.companyId}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, companyId: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="">Aucune</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-support-type"
                        >
                          Support
                        </label>
                        <select
                          id="modal-lead-support-type"
                          value={leadForm.supportType}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, supportType: event.target.value as SupportType }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          {supportTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-support-detail"
                        >
                          Détail support
                        </label>
                        <input
                          id="modal-lead-support-detail"
                          type="text"
                          value={leadForm.supportDetail}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, supportDetail: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-tags"
                        >
                          Tags
                        </label>
                        <input
                          id="modal-lead-tags"
                          type="text"
                          value={leadForm.tags}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, tags: event.target.value }))}
                          placeholder="Séparés par des virgules"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Prochaine étape */}
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-next-date"
                        >
                          Date de l'action
                        </label>
                        <input
                          id="modal-lead-next-date"
                          type="date"
                          value={leadForm.nextStepDate}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, nextStepDate: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="modal-lead-next-note"
                        >
                          Note de l'action
                        </label>
                        <input
                          id="modal-lead-next-note"
                          type="text"
                          value={leadForm.nextStepNote}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, nextStepNote: event.target.value }))}
                          placeholder="Ex: Relance téléphonique, envoi devis..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                    </div>
                  </div>

                  {/* Section de suivi de prospection */}
                  <div className="space-y-4">
                  {/* Journal des activités */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-1 w-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
                      <h3 className="text-xs font-bold text-slate-900 tracking-tight dark:text-slate-100">
                        Suivi de prospection
                      </h3>
                    </div>
                    {pendingActivities.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Aucune activité pour le moment. Ajoutez des notes ou des appels ci-dessous.
                      </p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                        <ul className="space-y-3">
                          {pendingActivities.map((activity, index) => (
                            <li key={index} className="relative flex gap-3">
                              <div
                                className={clsx(
                                  'relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white shadow-md dark:border-slate-800',
                                  activity.type === 'call'
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                    : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                )}
                              >
                                {activity.type === 'call' ? (
                                  <IconCall className="h-4 w-4 text-white" />
                                ) : (
                                  <IconNote className="h-4 w-4 text-white" />
                                )}
                              </div>
                              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                    {activity.type === 'call' ? (
                                      <>
                                        <IconCall className="h-3 w-3" />
                                        Appel téléphonique
                                      </>
                                    ) : (
                                      <>
                                        <IconNote className="h-3 w-3" />
                                        Note interne
                                      </>
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">{activity.content}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Ajouter une activité */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <form onSubmit={handleAddPendingActivity} className="space-y-3">
                      <div className="flex gap-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="activity-type-modal"
                            value="note"
                            checked={noteType === 'note'}
                            onChange={() => setNoteType('note')}
                            className="cursor-pointer"
                          />
                          <IconNote className="h-3.5 w-3.5" />
                          Note
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="activity-type-modal"
                            value="call"
                            checked={noteType === 'call'}
                            onChange={() => setNoteType('call')}
                            className="cursor-pointer"
                          />
                          <IconCall className="h-3.5 w-3.5" />
                          Appel
                        </label>
                      </div>
                      <textarea
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder={noteType === 'call' ? "Compte-rendu d'appel..." : 'Note interne...'}
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        disabled={!noteDraft.trim()}
                        className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
                      >
                        Ajouter
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Pied de page avec boutons d'action */}
                <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Créer le lead
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {showEditLeadModal &&
        editingLeadId &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4 py-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-lead-title"
            onClick={handleCloseEditModal}
          >
            <div
              className="relative w-full max-w-[95vw] max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 transition dark:border-slate-700 dark:bg-slate-900"
              onClick={(event) => event.stopPropagation()}
            >
              <form
                onSubmit={handleEditSubmit}
                className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
              >
                {/* En-tête avec titre et bouton de fermeture */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
                      MODIFIER UN LEAD
                    </span>
                    <h2 id="edit-lead-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {editingLead?.company || editingLead?.contact || 'Lead'}
                    </h2>
                    <p className="max-w-lg text-xs text-slate-500 dark:text-slate-400">
                      Mettez à jour les informations du lead.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Contenu principal du formulaire */}
                <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                  {/* Colonne gauche : Données du lead */}
                  <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)] pr-2">
                    {feedback && (
                      <div className={clsx(
                        "rounded-lg border px-3 py-2 text-xs",
                        feedback.includes('mis à jour') || feedback.includes('créé')
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200"
                      )}>
                        {feedback}
                      </div>
                    )}

                    {/* Informations de contact */}
                    <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-company"
                        >
                          Entreprise *
                        </label>
                        <input
                          id="edit-modal-lead-company"
                          type="text"
                          value={leadForm.company}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, company: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          required
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-contact"
                        >
                          Contact *
                        </label>
                        <input
                          id="edit-modal-lead-contact"
                          type="text"
                          value={leadForm.contact}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, contact: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          required
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-phone"
                        >
                          Téléphone
                        </label>
                        <input
                          id="edit-modal-lead-phone"
                          type="tel"
                          value={leadForm.phone}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, phone: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        {phoneDuplicate && (
                          <p className="mt-1 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                            ⚠️ Numéro déjà utilisé.
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-email"
                        >
                          Email
                        </label>
                        <input
                          id="edit-modal-lead-email"
                          type="email"
                          value={leadForm.email}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, email: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        {emailDuplicate && (
                          <p className="mt-1 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                            ⚠️ Email déjà utilisé.
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-address"
                        >
                          Adresse
                        </label>
                        <input
                          id="edit-modal-lead-address"
                          type="text"
                          value={leadForm.address}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, address: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                    </div>

                  {/* Détails commerciaux */}
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-source"
                        >
                          Source
                        </label>
                        <input
                          id="edit-modal-lead-source"
                          type="text"
                          value={leadForm.source}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, source: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-segment"
                        >
                          Segment
                        </label>
                        <input
                          id="edit-modal-lead-segment"
                          type="text"
                          value={leadForm.segment}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, segment: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-status"
                        >
                          Statut
                        </label>
                        <select
                          id="edit-modal-lead-status"
                          value={leadForm.status}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, status: event.target.value as LeadStatus }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          {pipelineStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-owner"
                        >
                          Propriétaire
                        </label>
                        <select
                          id="edit-modal-lead-owner"
                          value={leadForm.owner}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, owner: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-value"
                        >
                          Valeur estimée
                        </label>
                        <input
                          id="edit-modal-lead-value"
                          type="number"
                          min="0"
                          step="0.5"
                          value={leadForm.estimatedValue}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, estimatedValue: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-company-select"
                        >
                          Entreprise liée
                        </label>
                        <select
                          id="edit-modal-lead-company-select"
                          value={leadForm.companyId}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, companyId: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="">Aucune</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-support-type"
                        >
                          Support
                        </label>
                        <select
                          id="edit-modal-lead-support-type"
                          value={leadForm.supportType}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, supportType: event.target.value as SupportType }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          {supportTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-support-detail"
                        >
                          Détail support
                        </label>
                        <input
                          id="edit-modal-lead-support-detail"
                          type="text"
                          value={leadForm.supportDetail}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, supportDetail: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-tags"
                        >
                          Tags
                        </label>
                        <input
                          id="edit-modal-lead-tags"
                          type="text"
                          value={leadForm.tags}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, tags: event.target.value }))}
                          placeholder="Séparés par des virgules"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                    </div>

                  {/* Prochaine étape */}
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-next-date"
                        >
                          Date de l'action
                        </label>
                        <input
                          id="edit-modal-lead-next-date"
                          type="date"
                          value={leadForm.nextStepDate}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, nextStepDate: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400"
                          htmlFor="edit-modal-lead-next-note"
                        >
                          Note de l'action
                        </label>
                        <input
                          id="edit-modal-lead-next-note"
                          type="text"
                          value={leadForm.nextStepNote}
                          onChange={(event) => setLeadForm((draft) => ({ ...draft, nextStepNote: event.target.value }))}
                          placeholder="Ex: Relance téléphonique, envoi devis..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                  </div>

                  {/* Colonne droite : Historique de suivi */}
                  <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Journal des activités */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-1 w-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
                        <h3 className="text-xs font-bold text-slate-900 tracking-tight dark:text-slate-100">
                          Historique de suivi
                        </h3>
                      </div>
                      {(!editingLead?.activities || editingLead.activities.length === 0) && pendingActivities.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Aucune activité pour le moment. Ajoutez des notes ou des appels ci-dessous.
                        </p>
                      ) : (
                        <div className="relative">
                          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                          <ul className="space-y-3">
                            {/* Afficher d'abord les activités existantes du lead */}
                            {editingLead?.activities?.map((activity) => (
                              <li key={activity.id} className="relative flex gap-3">
                                <div
                                  className={clsx(
                                    'relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white shadow-md dark:border-slate-800',
                                    activity.type === 'call'
                                      ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                      : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                  )}
                                >
                                  {activity.type === 'call' ? (
                                    <IconCall className="h-4 w-4 text-white" />
                                  ) : (
                                    <IconNote className="h-4 w-4 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                  <div className="mb-1 flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                      {activity.type === 'call' ? (
                                        <>
                                          <IconCall className="h-3 w-3" />
                                          Appel téléphonique
                                        </>
                                      ) : (
                                        <>
                                          <IconNote className="h-3 w-3" />
                                          Note interne
                                        </>
                                      )}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                        {formatDateTime(activity.createdAt)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (editingLeadId && confirm(`Êtes-vous sûr de vouloir supprimer cette ${activity.type === 'call' ? 'appel' : 'note'} ?`)) {
                                            removeLeadActivity(editingLeadId, activity.id);
                                            setFeedback(`${activity.type === 'call' ? 'Appel' : 'Note'} supprimé(e).`);
                                          }
                                        }}
                                        className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                                        aria-label={`Supprimer ${activity.type === 'call' ? "l'appel" : 'la note'}`}
                                      >
                                        <IconTrash />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{activity.content}</p>
                                </div>
                              </li>
                            ))}
                            {/* Afficher ensuite les activités en attente */}
                            {pendingActivities.map((activity, index) => (
                              <li key={`pending-${index}`} className="relative flex gap-3">
                                <div
                                  className={clsx(
                                    'relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-white shadow-md dark:border-slate-800',
                                    activity.type === 'call'
                                      ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                      : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                  )}
                                >
                                  {activity.type === 'call' ? (
                                    <IconCall className="h-4 w-4 text-white" />
                                  ) : (
                                    <IconNote className="h-4 w-4 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                  <div className="mb-1 flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                      {activity.type === 'call' ? (
                                        <>
                                          <IconCall className="h-3 w-3" />
                                          Appel téléphonique
                                        </>
                                      ) : (
                                        <>
                                          <IconNote className="h-3 w-3" />
                                          Note interne
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400">{activity.content}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Ajouter une activité */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <form onSubmit={handleAddPendingActivity} className="space-y-3">
                        <div className="flex gap-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="activity-type-edit-modal"
                              value="note"
                              checked={noteType === 'note'}
                              onChange={() => setNoteType('note')}
                              className="cursor-pointer"
                            />
                            <IconNote className="h-3.5 w-3.5" />
                            Note
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="activity-type-edit-modal"
                              value="call"
                              checked={noteType === 'call'}
                              onChange={() => setNoteType('call')}
                              className="cursor-pointer"
                            />
                            <IconCall className="h-3.5 w-3.5" />
                            Appel
                          </label>
                        </div>
                        <textarea
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                          placeholder={noteType === 'call' ? "Compte-rendu d'appel..." : 'Note interne...'}
                          rows={4}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="submit"
                          disabled={!noteDraft.trim()}
                          className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
                        >
                          Ajouter
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                {/* Pied de page avec boutons d'action */}
                <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Mettre à jour
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
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
                {/* Actions rapides */}
                <section className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/50 to-white p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)]">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-1 w-8 rounded-full bg-gradient-to-r from-primary to-primary/50" />
                    <p className="text-sm font-bold text-slate-900 tracking-tight">
                      Actions rapides
                    </p>
                  </div>
                  <div className="grid gap-2.5">
                    {hasPermission('lead.contact') && editingLead.email && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleContactLead(editingLead)}
                        className="w-full justify-start gap-2"
                      >
                        <IconMail />
                        Contacter par email
                      </Button>
                    )}
                    {editingLead.phone && (
                      <a
                        href={`tel:${editingLead.phone}`}
                        className="flex w-full items-center justify-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <IconPhone />
                        Appeler
                      </a>
                    )}
                    {hasPermission('lead.convert') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleConvertToClient(editingLead)}
                        className="w-full justify-start gap-2"
                      >
                        <IconConvert />
                        Convertir en client
                      </Button>
                    )}
                    {hasPermission('lead.edit') && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCreateEngagement(editingLead, 'devis')}
                          className="w-full justify-start gap-2"
                        >
                          <IconDocument />
                          Créer un devis
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCreateEngagement(editingLead, 'service')}
                          className="w-full justify-start gap-2"
                        >
                          <IconService />
                          Planifier un service
                        </Button>
                      </>
                    )}
                  </div>
                </section>

                {/* Informations principales */}
                <section className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)]">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-1 w-8 rounded-full bg-gradient-to-r from-primary to-primary/50" />
                    <p className="text-sm font-bold text-slate-900 tracking-tight">
                      Informations principales
                    </p>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Entreprise</p>
                      <p className="font-medium text-slate-900">{editingLead.company || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Contact</p>
                      <p className="font-medium text-slate-900">{editingLead.contact || '—'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">Téléphone</p>
                        {editingLead.phone ? (
                          <a href={`tel:${editingLead.phone}`} className="text-primary hover:underline">
                            {editingLead.phone}
                          </a>
                        ) : (
                          <p className="text-slate-400">—</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">Email</p>
                        {editingLead.email ? (
                          <a href={`mailto:${editingLead.email}`} className="text-primary hover:underline">
                            {editingLead.email}
                          </a>
                        ) : (
                          <p className="text-slate-400">—</p>
                        )}
                      </div>
                    </div>
                    {editingLead.estimatedValue !== null && editingLead.estimatedValue !== undefined && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">Valeur estimée</p>
                        <p className="font-bold text-lg text-primary">{formatCurrency(editingLead.estimatedValue)}</p>
                      </div>
                    )}
                    {editingLead.nextStepDate && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">Prochaine action</p>
                        <p className="font-medium text-slate-900">{formatShortDate(editingLead.nextStepDate)}</p>
                        {editingLead.nextStepNote && (
                          <p className="mt-1 text-slate-600">{editingLead.nextStepNote}</p>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* Journal d'activité */}
                <section className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)]">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-1 w-8 rounded-full bg-gradient-to-r from-primary to-primary/50" />
                    <p className="text-sm font-bold text-slate-900 tracking-tight">
                      Journal des activités
                    </p>
                  </div>
                  {renderActivities(editingLead)}
                </section>

                {/* Ajouter une activité */}
                <section className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/50 to-white p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.08)]">
                  <form onSubmit={handleAddActivity} className="space-y-3">
                    <div className="flex gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="activity-type"
                          value="note"
                          checked={noteType === 'note'}
                          onChange={() => setNoteType('note')}
                          className="cursor-pointer"
                        />
                        <IconNote />
                        Note
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="activity-type"
                          value="call"
                          checked={noteType === 'call'}
                          onChange={() => setNoteType('call')}
                          className="cursor-pointer"
                        />
                        <IconCall />
                        Appel
                      </label>
                    </div>
                    <textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder={noteType === 'call' ? "Compte-rendu d'appel..." : "Note interne..."}
                      className="h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" variant="primary" disabled={!noteDraft.trim()}>
                        Ajouter une activité
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
