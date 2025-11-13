import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { format as formatDateToken } from 'date-fns';
import { useGoogleCalendarEvents } from '../hooks/useGoogleCalendarEvents';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Tag } from '../components/Tag';
import {
  IconArchive,
  IconDocument,
  IconDuplicate,
  IconEdit,
  IconPaperPlane,
  IconPrinter,
  IconReceipt,
} from '../components/icons';
import { ClipboardList, Clock3, Download, Euro, Filter, Plus, SlidersHorizontal, X } from 'lucide-react';
import type jsPDF from 'jspdf';
import {
  useAppData,
  Client,
  ClientContact,
  ClientContactRole,
  Company,
  Engagement,
  EngagementSendRecord,
  EngagementKind,
  EngagementStatus,
  EngagementOptionOverride,
  Service,
  ServiceCategory,
  ServiceOption,
  SupportType,
  DocumentRecord,
} from '../store/useAppData';
import { formatCurrency, formatDate, formatDuration, mergeBodyWithSignature } from '../lib/format';
import { downloadCsv, type CsvValue } from '../lib/csv';
import { generateInvoicePdf, generateQuotePdf } from '../lib/invoice';
import { BRAND_NAME } from '../lib/branding';
import { openEmailComposer, sendDocumentEmail, SendDocumentEmailResult } from '../lib/email';
import { CalendarEventService } from '../lib/calendarEventService';

// Fonction pour créer un événement Google Calendar
const createCalendarEvent = async (
  engagement: Engagement,
  options: {
    planningUser: string;
    startTime: string;
    estimatedDuration: number;
    client: Client;
    service: Service;
    selectedCompany: Company;
  }
) => {
  const { planningUser, startTime, estimatedDuration, client, service, selectedCompany } = options;
  
  // Calculer l'heure de fin
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + estimatedDuration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  
  // Créer les dates ISO avec timezone
  // engagement.scheduledAt est au format ISO, on extrait juste la date
  const scheduledDate = engagement.scheduledAt.split('T')[0]; // Extraire YYYY-MM-DD
  const startDateTime = `${scheduledDate}T${startTime}:00+01:00`;
  const endDateTime = `${scheduledDate}T${endTime}:00+01:00`;
  
  // Préparer les données de l'événement
  const eventData = {
    planning_user: planningUser,
    title: `Service - ${client.name}`,
    description: `Service: ${service.name}\nClient: ${client.name}\nEntreprise: ${selectedCompany.name}\nSupport: ${engagement.supportType} - ${engagement.supportDetail}`,
    start_time: startDateTime,
    end_time: endDateTime,
    location: client.address || 'Adresse non spécifiée'
  };
  
  // Utiliser le nouveau service
  return await CalendarEventService.createEvent(eventData);
};

type EngagementDraft = {
  clientId: string;
  companyId: string | '';
  scheduledAt: string;
  serviceId: string;
  optionIds: string[];
  optionOverrides: Record<string, EngagementOptionOverride>;
  status: EngagementStatus;
  kind: EngagementKind;
  supportType: SupportType;
  supportDetail: string;
  additionalCharge: number;
  contactIds: string[];
  // Planning
  planningUser: string | null; // 'clement', 'adrien', ou null pour tous
  startTime: string; // Heure de début (ex: "09:00")
};

type QuickClientDraft = {
  name: string;
  siret: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: Client['status'];
};

type ServiceEmailPrompt = {
  engagementId: string;
  serviceName: string;
};

type InvoiceEmailContext = {
  engagement: Engagement;
  client: Client;
  company: Company;
  service: Service;
  documentNumber: string;
  issueDate: Date;
  optionsSelected: ServiceOption[];
  optionOverrides?: Record<string, EngagementOptionOverride>;
  totals: { price: number; duration: number; surcharge: number };
  vatEnabled: boolean;
};

type OptionOverrideResolved = {
  quantity: number;
  durationMin: number;
  unitPriceHT: number;
};

const SERVICE_COLUMN_CONFIG = {
  document: {
    label: 'Document',
    defaultWidth: 160,
    minWidth: 140,
    maxWidth: 280,
    align: 'left' as const,
    resizable: true,
    defaultVisible: true,
  },
  client: {
    label: 'Client / Entreprise',
    defaultWidth: 160,
    minWidth: 140,
    maxWidth: 240,
    align: 'left' as const,
    resizable: true,
    defaultVisible: true,
  },
  support: {
    label: 'Support',
    defaultWidth: 120,
    minWidth: 100,
    maxWidth: 200,
    align: 'left' as const,
    resizable: true,
    defaultVisible: true,
  },
  prestations: {
    label: 'Prestations',
    defaultWidth: 180,
    minWidth: 150,
    maxWidth: 300,
    align: 'left' as const,
    resizable: true,
    defaultVisible: true,
  },
  duration: {
    label: 'Durée',
    defaultWidth: 100,
    minWidth: 80,
    maxWidth: 160,
    align: 'center' as const,
    resizable: true,
    defaultVisible: true,
  },
  amountHt: {
    label: 'Montant HT',
    defaultWidth: 110,
    minWidth: 95,
    maxWidth: 180,
    align: 'right' as const,
    resizable: true,
    defaultVisible: true,
  },
  vat: {
    label: 'TVA',
    defaultWidth: 90,
    minWidth: 80,
    maxWidth: 150,
    align: 'right' as const,
    resizable: true,
    defaultVisible: true,
  },
  total: {
    label: 'Total',
    defaultWidth: 110,
    minWidth: 95,
    maxWidth: 180,
    align: 'right' as const,
    resizable: true,
    defaultVisible: true,
  },
  status: {
    label: 'Statut',
    defaultWidth: 110,
    minWidth: 95,
    maxWidth: 180,
    align: 'center' as const,
    resizable: true,
    defaultVisible: true,
  },
  actions: {
    label: 'Actions',
    defaultWidth: 180,
    minWidth: 150,
    maxWidth: 280,
    align: 'right' as const,
    resizable: false,
    defaultVisible: true,
  },
} as const;

type ServiceColumnId = keyof typeof SERVICE_COLUMN_CONFIG;

const SERVICE_COLUMN_ORDER: ServiceColumnId[] = [
  'document',
  'client',
  'support',
  'prestations',
  'duration',
  'amountHt',
  'vat',
  'total',
  'status',
  'actions',
];

const getDefaultColumnVisibility = (): Record<ServiceColumnId, boolean> =>
  SERVICE_COLUMN_ORDER.reduce((acc, columnId) => {
    acc[columnId] = SERVICE_COLUMN_CONFIG[columnId].defaultVisible;
    return acc;
  }, {} as Record<ServiceColumnId, boolean>);

const getDefaultColumnWidths = (): Record<ServiceColumnId, number> =>
  SERVICE_COLUMN_ORDER.reduce((acc, columnId) => {
    acc[columnId] = SERVICE_COLUMN_CONFIG[columnId].defaultWidth;
    return acc;
  }, {} as Record<ServiceColumnId, number>);

const sanitizeDraftOverrides = (
  optionIds: string[],
  overrides?: Record<string, EngagementOptionOverride>
): Record<string, EngagementOptionOverride> => {
  if (!overrides) {
    return {};
  }
  const allowed = new Set(optionIds);
  const next: Record<string, EngagementOptionOverride> = {};
  for (const [optionId, value] of Object.entries(overrides)) {
    if (!allowed.has(optionId)) {
      continue;
    }
    const quantity = value.quantity && Number.isFinite(value.quantity) ? Math.max(1, value.quantity) : 1;
    const unitPrice =
      value.unitPriceHT !== undefined && Number.isFinite(value.unitPriceHT)
        ? Math.max(0, value.unitPriceHT)
        : undefined;
    const duration =
      value.durationMin !== undefined && Number.isFinite(value.durationMin)
        ? Math.max(0, value.durationMin)
        : undefined;
    next[optionId] = {
      quantity,
      unitPriceHT: unitPrice,
      durationMin: duration,
    };
  }
  return next;
};

const resolveOptionOverride = (
  option: ServiceOption,
  override: EngagementOptionOverride | undefined
): OptionOverrideResolved => ({
  quantity: override?.quantity && override.quantity > 0 ? override.quantity : 1,
  durationMin:
    override?.durationMin !== undefined && override.durationMin >= 0
      ? override.durationMin
      : option.defaultDurationMin,
  unitPriceHT:
    override?.unitPriceHT !== undefined && override.unitPriceHT >= 0
      ? override.unitPriceHT
      : option.unitPriceHT,
});

const toLocalInputValue = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromLocalInputValue = (value: string) => {
  if (!value) {
    return new Date().toISOString();
  }
  const [yearString, monthString, dayString] = value.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date().toISOString();
  }
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
};

const buildInitialDraft = (
  clients: Client[],
  services: Service[],
  companies: Company[],
  activeCompanyId: string | null
): EngagementDraft => ({
  clientId: clients[0]?.id ?? '',
  companyId: activeCompanyId ?? companies[0]?.id ?? '',
  scheduledAt: toLocalInputValue(new Date().toISOString()),
  serviceId: services[0]?.id ?? '',
  optionIds: [],
  optionOverrides: {},
  status: 'planifié',
  kind: 'service',
  supportType: 'Voiture',
  supportDetail: '',
  additionalCharge: 0,
  contactIds:
    clients[0]?.contacts.find((contact) => contact.active && contact.isBillingDefault)?.id
      ? [clients[0]!.contacts.find((contact) => contact.active && contact.isBillingDefault)!.id]
      : [],
  // Planning
  planningUser: null,
  startTime: '',
});

const buildDraftFromEngagement = (engagement: Engagement): EngagementDraft => ({
  clientId: engagement.clientId,
  companyId: engagement.companyId ?? '',
  scheduledAt: toLocalInputValue(engagement.scheduledAt),
  serviceId: engagement.serviceId,
  optionIds: engagement.optionIds,
  optionOverrides: sanitizeDraftOverrides(engagement.optionIds, engagement.optionOverrides),
  status: engagement.status,
  kind: engagement.kind,
  supportType: engagement.supportType,
  supportDetail: engagement.supportDetail,
  additionalCharge: engagement.additionalCharge,
  contactIds: [...engagement.contactIds],
  // Planning
  planningUser: (engagement as any).planningUser ?? null,
  startTime: (engagement as any).startTime ?? '',
});

const buildPreviewEngagement = (draft: EngagementDraft, kind: EngagementKind): Engagement => ({
  id: 'preview',
  clientId: draft.clientId,
  serviceId: draft.serviceId,
  optionIds: draft.optionIds,
  scheduledAt: fromLocalInputValue(draft.scheduledAt),
  status: draft.status,
  companyId: draft.companyId ? draft.companyId : null,
  kind,
  supportType: draft.supportType,
  supportDetail: draft.supportDetail.trim(),
  additionalCharge: draft.additionalCharge,
  contactIds: [...draft.contactIds],
  assignedUserIds: [],
  sendHistory: [],
  invoiceNumber: null,
  invoiceVatEnabled: null,
  quoteNumber: null,
  quoteStatus: kind === 'devis' ? 'brouillon' : null,
  optionOverrides: sanitizeDraftOverrides(draft.optionIds, draft.optionOverrides),
  mobileDurationMinutes: null,
  mobileCompletionComment: null,
});

const documentLabels: Record<EngagementKind, string> = {
  service: 'Service',
  devis: 'Devis',
  facture: 'Facture',
};

const serviceKindStyles: Record<EngagementKind, { label: string; className: string }> = {
  service: {
    label: 'Service',
    className: 'bg-blue-200 text-blue-800',
  },
  devis: {
    label: 'Devis',
    className: 'bg-purple-200 text-purple-800',
  },
  facture: {
    label: 'Facture',
    className: 'bg-emerald-200 text-emerald-800',
  },
};

const serviceStatusStyles: Record<EngagementStatus, { label: string; className: string }> = {
  brouillon: {
    label: 'Brouillon',
    className: 'bg-slate-200 text-slate-700 border border-slate-300 shadow-[0_1px_0_rgba(148,163,184,0.35)]',
  },
  envoyé: {
    label: 'Envoyé',
    className: 'bg-blue-200 text-blue-800 border border-blue-300 shadow-[0_1px_0_rgba(59,130,246,0.35)]',
  },
  planifié: {
    label: 'Planifié',
    className: 'bg-amber-200 text-amber-800 border border-amber-300 shadow-[0_1px_0_rgba(251,191,36,0.35)]',
  },
  réalisé: {
    label: 'Réalisé',
    className: 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)]',
  },
  annulé: {
    label: 'Annulé',
    className: 'bg-rose-200 text-rose-800 border border-rose-300 shadow-[0_1px_0_rgba(244,63,94,0.35)]',
  },
};

const documentTypeFromKind = (kind: EngagementKind): 'Service' | 'Devis' | 'Facture' => {
  if (kind === 'facture') return 'Facture';
  if (kind === 'devis') return 'Devis';
  return 'Service';
};

const buildLegacyDocumentNumber = (id: string, type: 'Service' | 'Devis' | 'Facture') => {
  const numeric = parseInt(id.replace(/\D/g, ''), 10);
  const prefix = type === 'Facture' ? 'FAC' : type === 'Devis' ? 'DEV' : 'SRV';
  if (Number.isNaN(numeric)) {
    return `${prefix}-${id.toUpperCase()}`;
  }
  return `${prefix}-${numeric.toString().padStart(4, '0')}`;
};

const getEngagementDocumentNumber = (engagement: Engagement) => {
  if (engagement.kind === 'facture') {
    return engagement.invoiceNumber ?? buildLegacyDocumentNumber(engagement.id, 'Facture');
  }
  if (engagement.kind === 'devis') {
    return engagement.quoteNumber ?? buildLegacyDocumentNumber(engagement.id, 'Devis');
  }
  const type = documentTypeFromKind(engagement.kind);
  return buildLegacyDocumentNumber(engagement.id, type);
};

const getNextInvoiceNumber = (engagementList: Engagement[], referenceDate: Date) => {
  const monthToken = formatDateToken(referenceDate, 'yyyyMM');
  const prefix = `FAC-${monthToken}-`;
  const invoicePattern = /^FAC-(\d{6})-(\d{4})$/;
  const highestSequenceForMonth = engagementList.reduce((acc, engagement) => {
    if (!engagement.invoiceNumber) {
      return acc;
    }
    const match = invoicePattern.exec(engagement.invoiceNumber.trim());
    if (!match) {
      return acc;
    }
    const [, month, sequenceRaw] = match;
    if (month !== monthToken) {
      return acc;
    }
    const sequence = Number.parseInt(sequenceRaw, 10);
    if (Number.isNaN(sequence)) {
      return acc;
    }
    return Math.max(acc, sequence);
  }, 0);
  const nextSequence = (highestSequenceForMonth + 1).toString().padStart(4, '0');
  return `${prefix}${nextSequence}`;
};

const getNextQuoteNumber = (engagementList: Engagement[], referenceDate: Date) => {
  const monthToken = formatDateToken(referenceDate, 'yyyyMM');
  const prefix = `DEV-${monthToken}-`;
  const quotePattern = /^DEV-(\d{6})-(\d{4})$/;
  const highestSequenceForMonth = engagementList.reduce((acc, engagement) => {
    if (!engagement.quoteNumber) {
      return acc;
    }
    const match = quotePattern.exec(engagement.quoteNumber.trim());
    if (!match) {
      return acc;
    }
    const [, month, sequenceRaw] = match;
    if (month !== monthToken) {
      return acc;
    }
    const sequence = Number.parseInt(sequenceRaw, 10);
    if (Number.isNaN(sequence)) {
      return acc;
    }
    return Math.max(acc, sequence);
  }, 0);
  const nextSequence = (highestSequenceForMonth + 1).toString().padStart(4, '0');
  return `${prefix}${nextSequence}`;
};

const sanitizeVatRate = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

const computeVatMultiplier = (value: number) => sanitizeVatRate(value) / 100;

const formatVatRateLabel = (value: number) => {
  const safe = sanitizeVatRate(value);
  if (Number.isInteger(safe)) {
    return safe.toString();
  }
  return safe.toFixed(2).replace(/\.00$/, '');
};

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} o`;
  }
  const kiloBytes = bytes / 1024;
  if (kiloBytes < 1024) {
    return `${kiloBytes < 10 ? kiloBytes.toFixed(1) : Math.round(kiloBytes)} Ko`;
  }
  const megaBytes = kiloBytes / 1024;
  if (megaBytes < 1024) {
    return `${megaBytes < 10 ? megaBytes.toFixed(1) : Math.round(megaBytes)} Mo`;
  }
  const gigaBytes = megaBytes / 1024;
  return `${gigaBytes < 10 ? gigaBytes.toFixed(1) : Math.round(gigaBytes)} Go`;
};

const ServicePage = () => {
  const {
    engagements,
    clients,
    services,
    companies,
    activeCompanyId,
    userProfile,
    currentUserId,
    documents,
    addClient,
    addClientContact,
    addEngagement,
    updateEngagement,
    removeEngagement,
    setClientBillingContact,
    recordEngagementSend,
    computeEngagementTotals,
    pendingEngagementSeed,
    setPendingEngagementSeed,
    vatEnabled,
    vatRate,
    getClient,
    resolveSignatureHtml,
    addDocument,
    updateDocument,
    hasPermission,
  } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<ServiceColumnId, boolean>>(
    () => getDefaultColumnVisibility()
  );
  const [columnWidths, setColumnWidths] = useState<Record<ServiceColumnId, number>>(
    () => getDefaultColumnWidths()
  );
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EngagementStatus | 'Tous'>('Tous');
  const [kindFilter, setKindFilter] = useState<EngagementKind | 'Tous'>('Tous');
  const [companyFilter, setCompanyFilter] = useState<'Toutes' | string>('Toutes');
  const [feedback, setFeedback] = useState<string | null>(null);
  const resizeStateRef = useRef<{
    columnId: ServiceColumnId;
    startX: number;
    startWidth: number;
  } | null>(null);

  const baseDraft = useMemo(
    () => buildInitialDraft(clients, services, companies, activeCompanyId),
    [clients, services, companies, activeCompanyId]
  );

  const [creationMode, setCreationMode] = useState<'service' | 'facture' | null>(null);
  const [creationDraft, setCreationDraft] = useState<EngagementDraft>(baseDraft);
  const [quickClientDraft, setQuickClientDraft] = useState<QuickClientDraft>({
    name: '',
    siret: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    status: 'Actif',
  });
  const [isAddingClient, setIsAddingClient] = useState(false);

  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [selectedEngagementIds, setSelectedEngagementIds] = useState<string[]>([]);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [editModalDraft, setEditModalDraft] = useState<EngagementDraft | null>(null);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const selectedEngagement = useMemo(
    () => engagements.find((engagement) => engagement.id === selectedEngagementId) ?? null,
    [engagements, selectedEngagementId]
  );
  const [editDraft, setEditDraft] = useState<EngagementDraft | null>(
    selectedEngagement ? buildDraftFromEngagement(selectedEngagement) : null
  );
  const [highlightQuote, setHighlightQuote] = useState(false);
  const [mailPrompt, setMailPrompt] = useState<ServiceEmailPrompt | null>(null);
  const [mailPromptClientId, setMailPromptClientId] = useState('');

  const clientsWithEmail = useMemo(
    () => clients.filter((client) => client.contacts.some((contact) => contact.active && contact.email)),
    [clients]
  );

  const clientsById = useMemo<Map<string, Client>>(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const companiesById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  );
  const buildSignatureReplacements = (companyContext?: Company | null) => {
    const fallbackCompany =
      companyContext ??
      (activeCompanyId ? companiesById.get(activeCompanyId) ?? null : null) ??
      companies[0] ??
      null;
    return {
      nom: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
      fonction: userProfile.role,
      telephone: userProfile.phone ?? '',
      téléphone: userProfile.phone ?? '',
      email: userProfile.email ?? '',
      entreprise: fallbackCompany?.name ?? BRAND_NAME,
      site: fallbackCompany?.website || fallbackCompany?.email || 'washandgo.fr',
    };
  };

  const persistEngagementDocument = useCallback(
    (
      pdf: jsPDF,
      context: {
        engagement: Engagement;
        documentNumber: string;
        documentType: 'Service' | 'Devis' | 'Facture';
        client?: Client | null;
        company?: Company | null;
        totals: { subtotal: number; vatAmount: number; total: number };
        vatEnabled: boolean;
        vatRate: number;
        issueDate: Date;
        recipients?: string[];
        pdfDataUri?: string;
      }
    ) => {
      if (context.documentType === 'Service') {
        return;
      }
      try {
        const dataUrl = context.pdfDataUri ?? pdf.output('datauristring');
        if (!dataUrl) {
          console.warn('[Wash&Go] Document généré sans contenu exploitable', {
            engagementId: context.engagement.id,
            documentNumber: context.documentNumber,
            documentType: context.documentType,
          });
          return;
        }
        const blob = pdf.output('blob');
        const ownerName = `${userProfile.firstName} ${userProfile.lastName}`.trim() || BRAND_NAME;
        const kindTag = context.documentType === 'Facture' ? 'facture' : 'devis';
        const tags = [
          kindTag,
          `engagement:${context.engagement.id}`,
          context.client?.id ? `client:${context.client.id}` : null,
        ].filter((value): value is string => Boolean(value && value.length));

        const category = context.documentType === 'Facture' ? 'Factures' : 'Devis';
        const payload = {
          title: `${context.documentNumber} — ${context.client?.name ?? 'Client non défini'}`,
          category,
          description: `${context.documentType} généré le ${formatDate(context.issueDate.toISOString())} pour ${
            context.client?.name ?? 'client non défini'
          }.`,
          owner: ownerName,
          companyId: context.company?.id ?? null,
          tags,
          source: 'Archive interne' as const,
          fileType: 'PDF',
          size: formatFileSize(blob.size),
          fileName: `${context.documentNumber}.pdf`,
          fileData: dataUrl,
          kind: context.documentType === 'Facture' ? 'facture' : 'devis',
          engagementId: context.engagement.id,
          number: context.documentNumber,
          status:
            context.documentType === 'Facture'
              ? (context.engagement.status === 'réalisé' ? 'payé' : 'envoyé')
              : context.engagement.quoteStatus ?? 'brouillon',
          totalHt: context.totals.subtotal,
          totalTtc: context.totals.total,
          vatAmount: context.vatEnabled ? context.totals.vatAmount : 0,
          vatRate: context.vatEnabled ? context.vatRate : 0,
          issueDate: context.issueDate.toISOString(),
          recipients: context.recipients && context.recipients.length ? context.recipients : undefined,
        } satisfies Omit<DocumentRecord, 'id' | 'updatedAt'> & { updatedAt?: string };

        const existing: DocumentRecord | undefined = documents.find((document) =>
          tags.every((tag) => document.tags.includes(tag))
        );

        if (existing) {
          updateDocument(existing.id, payload);
        } else {
          addDocument(payload);
        }
      } catch (error) {
        console.error('[Wash&Go] Impossible de persister le document généré', {
          error,
          engagementId: context.engagement.id,
          documentNumber: context.documentNumber,
          documentType: context.documentType,
        });
      }
    },
    [addDocument, documents, updateDocument, userProfile.firstName, userProfile.lastName]
  );
  const creationClient: Client | null = creationDraft.clientId
    ? clientsById.get(creationDraft.clientId) ?? null
    : null;


  useEffect(() => {
    setCreationDraft(baseDraft);
  }, [baseDraft]);

  useEffect(() => {
    const targetClient = creationClient;
    if (!targetClient) {
      if (creationDraft.contactIds.length) {
        setCreationDraft((draft) => ({ ...draft, contactIds: [] }));
      }
      return;
    }
    const preferred =
      targetClient.contacts.find((contact) => contact.active && contact.isBillingDefault) ??
      targetClient.contacts.find((contact) => contact.active);
    if (preferred && !creationDraft.contactIds.includes(preferred.id)) {
      setCreationDraft((draft) => ({ ...draft, contactIds: [preferred.id] }));
    } else if (!preferred && creationDraft.contactIds.length) {
      setCreationDraft((draft) => ({ ...draft, contactIds: [] }));
    }
  }, [creationClient, creationDraft.contactIds]);

  useEffect(() => {
    if (!pendingEngagementSeed) {
      return;
    }
    const {
      clientId,
      companyId,
      kind,
      supportType,
      supportDetail,
      serviceId,
      optionIds,
      contactIds,
    } = pendingEngagementSeed;
    setCreationMode(kind === 'facture' ? 'facture' : 'service');
    setCreationDraft((draft) => {
      const nextServiceId = serviceId ?? draft.serviceId;
      const nextOptionIds = optionIds ?? draft.optionIds;
      return {
        ...draft,
        clientId: clientId || draft.clientId,
        companyId: companyId ?? draft.companyId,
        supportType: supportType ?? draft.supportType,
        supportDetail: supportDetail ?? draft.supportDetail,
        serviceId: nextServiceId,
        optionIds: nextOptionIds,
        optionOverrides: sanitizeDraftOverrides(nextOptionIds, draft.optionOverrides),
        status: kind === 'facture' ? 'réalisé' : kind === 'devis' ? 'envoyé' : draft.status,
        contactIds: contactIds && contactIds.length ? contactIds : draft.contactIds,
      };
    });
    setIsAddingClient(false);
    setHighlightQuote(kind === 'devis');
    setPendingEngagementSeed(null);
  }, [pendingEngagementSeed, setPendingEngagementSeed]);

  useEffect(() => {
    if (selectedEngagement) {
      setEditDraft(buildDraftFromEngagement(selectedEngagement));
    } else {
      setEditDraft(null);
    }
  }, [selectedEngagement]);

  useEffect(() => {
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }
      const targetClient = clientsById.get(draft.clientId);
      if (!targetClient) {
        if (draft.contactIds.length) {
          return { ...draft, contactIds: [] };
        }
        return draft;
      }
      const activeIds = targetClient.contacts.filter((contact) => contact.active).map((contact) => contact.id);
      let nextIds = draft.contactIds.filter((id) => activeIds.includes(id));
      if (!nextIds.length) {
        const preferred =
          targetClient.contacts.find((contact) => contact.active && contact.isBillingDefault) ??
          targetClient.contacts.find((contact) => contact.active);
        if (preferred) {
          nextIds = [preferred.id];
        }
      }
      const unchanged =
        nextIds.length === draft.contactIds.length &&
        nextIds.every((id, index) => id === draft.contactIds[index]);
      if (unchanged) {
        return draft;
      }
      return { ...draft, contactIds: nextIds };
    });
  }, [clientsById]);

  const listSectionRef = useRef<HTMLDivElement | null>(null);
  const creationSectionRef = useRef<HTMLDivElement | null>(null);
  const editSectionRef = useRef<HTMLDivElement | null>(null);

  const closeCreation = useCallback(() => {
    setCreationMode(null);
    setHighlightQuote(false);
  }, []);

  // Gestion de la touche Échap pour fermer la modale
  useEffect(() => {
    if (!creationMode && !showEditServiceModal) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (creationMode) {
          closeCreation();
        }
        if (showEditServiceModal) {
          setShowEditServiceModal(false);
          setEditModalDraft(null);
          setEditModalError(null);
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [creationMode, showEditServiceModal, closeCreation]);

  useEffect(() => {
    if (!creationMode) {
      setHighlightQuote(false);
    }
  }, [creationMode]);

  useEffect(() => {
    if (!selectedEngagement || !editDraft) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const container = editSectionRef.current;
    if (!container) {
      return;
    }
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      const focusable = container.querySelector<HTMLElement>('input, select, textarea');
      focusable?.focus({ preventScroll: true });
    }, 180);
  }, [selectedEngagement, editDraft]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const engagementId = params.get('engagementId');
    if (!engagementId) {
      return;
    }

    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('engagementId');
    navigate({ pathname: location.pathname, search: nextParams.toString() ? `?${nextParams}` : '' }, { replace: true });

    if (engagements.some((engagement) => engagement.id === engagementId)) {
      setCreationMode(null);
      setSelectedEngagementId(engagementId);
    }
  }, [location.pathname, location.search, engagements, navigate]);

  const servicesById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);

  // Calculer la durée estimée du service
  const estimatedDuration = useMemo(() => {
    if (!creationDraft.serviceId) return null;
    const service = servicesById.get(creationDraft.serviceId);
    if (!service) return null;
    
    // Calculer la durée totale des options sélectionnées
    const totalDuration = creationDraft.optionIds.reduce((total, optionId) => {
      const option = service.options.find(opt => opt.id === optionId);
      if (!option) return total;
      
      const override = creationDraft.optionOverrides[optionId];
      const duration = override?.durationMin ?? option.defaultDurationMin ?? 0;
      return total + duration;
    }, 0);
    
    return totalDuration > 0 ? totalDuration : null;
  }, [creationDraft.serviceId, creationDraft.optionIds, creationDraft.optionOverrides, servicesById]);

  // Récupérer les événements du calendrier pour vérifier les disponibilités
  const { events: calendarEvents, loading: calendarLoading } = useGoogleCalendarEvents({
    userKey: creationDraft.planningUser || undefined,
    rangeDays: 1,
    pastDays: 0,
  });

  // Calculer les horaires disponibles pour la date sélectionnée
  const availableTimeSlots = useMemo(() => {
    if (!creationDraft.scheduledAt || !estimatedDuration) return [];

    const selectedDate = new Date(creationDraft.scheduledAt);
    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    
    // Filtrer les événements pour la date sélectionnée
    const dayEvents = calendarEvents.filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0];
      return eventDate === selectedDateStr;
    });

    // Créer des créneaux de 30 minutes de 8h à 18h
    const timeSlots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const startMinutes = hour * 60 + minute;
        const endMinutes = startMinutes + estimatedDuration;
        
        // Vérifier si le créneau est disponible
        const isAvailable = !dayEvents.some(event => {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);
          const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
          const eventEndMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
          
          // Vérifier s'il y a un conflit
          return (startMinutes < eventEndMinutes && endMinutes > eventStartMinutes);
        });

        if (isAvailable) {
          const endHour = Math.floor(endMinutes / 60);
          const endMin = endMinutes % 60;
          const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
          
          timeSlots.push({
            start: startTime,
            end: endTime,
            label: `${startTime} - ${endTime}`
          });
        }
      }
    }

    return timeSlots;
  }, [creationDraft.scheduledAt, estimatedDuration, calendarEvents]);

  useEffect(() => {
    setCreationDraft((draft) => {
      if (!draft.serviceId) {
        return draft;
      }
      const service = servicesById.get(draft.serviceId);
      if (!service) {
        return draft;
      }
      const allowed = new Set(service.options.map((option) => option.id));
      const filtered = draft.optionIds.filter((id) => allowed.has(id));
      const unchanged =
        filtered.length === draft.optionIds.length &&
        filtered.every((id, index) => id === draft.optionIds[index]);
      if (unchanged) {
        return draft;
      }
      return {
        ...draft,
        optionIds: filtered,
        optionOverrides: sanitizeDraftOverrides(filtered, draft.optionOverrides),
      };
    });
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }
      const service = servicesById.get(draft.serviceId);
      if (!service) {
        return draft;
      }
      const allowed = new Set(service.options.map((option) => option.id));
      const filtered = draft.optionIds.filter((id) => allowed.has(id));
      const unchanged =
        filtered.length === draft.optionIds.length &&
        filtered.every((id, index) => id === draft.optionIds[index]);
      if (unchanged) {
        return draft;
      }
      return {
        ...draft,
        optionIds: filtered,
        optionOverrides: sanitizeDraftOverrides(filtered, draft.optionOverrides),
      };
    });
  }, [servicesById]);

  const searchValue = search.trim().toLowerCase();

  const filteredEngagements = useMemo(() => {
    return engagements.filter((engagement) => {
      const client = clientsById.get(engagement.clientId);
      const company = engagement.companyId ? companiesById.get(engagement.companyId) : undefined;
      const service = servicesById.get(engagement.serviceId);
      const options = service?.options.filter((option) => engagement.optionIds.includes(option.id)) ?? [];
      const matchesSearch =
        searchValue.length === 0 ||
        [
          client?.name,
          company?.name,
          service?.name,
          engagement.supportDetail,
          ...options.map((option) => option.label),
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchValue));
      const matchesStatus = statusFilter === 'Tous' || engagement.status === statusFilter;
      const matchesKind = kindFilter === 'Tous' || engagement.kind === kindFilter;
      const matchesCompany = companyFilter === 'Toutes' || engagement.companyId === companyFilter;
      return matchesSearch && matchesStatus && matchesKind && matchesCompany;
    });
  }, [
    engagements,
    clientsById,
    companiesById,
    servicesById,
    searchValue,
    statusFilter,
    kindFilter,
    companyFilter,
  ]);

  useEffect(() => {
    setSelectedEngagementIds((current) =>
      current.filter((id) => engagements.some((engagement) => engagement.id === id))
    );
  }, [engagements]);

  const allEngagementsSelected =
    filteredEngagements.length > 0 &&
    filteredEngagements.every((engagement) => selectedEngagementIds.includes(engagement.id));

  const toggleEngagementSelection = (engagementId: string) => {
    setSelectedEngagementIds((current) =>
      current.includes(engagementId)
        ? current.filter((id) => id !== engagementId)
        : [...current, engagementId]
    );
  };

  const toggleSelectAllEngagements = () => {
    if (allEngagementsSelected) {
      setSelectedEngagementIds((current) =>
        current.filter((id) => !filteredEngagements.some((engagement) => engagement.id === id))
      );
    } else {
      setSelectedEngagementIds((current) => [
        ...new Set([...current, ...filteredEngagements.map((engagement) => engagement.id)]),
      ]);
    }
  };

  const clearSelectedEngagements = () => setSelectedEngagementIds([]);

  const selectedEngagementsForBulk = () =>
    engagements.filter((engagement) => selectedEngagementIds.includes(engagement.id));

  const handleBulkPrintEngagements = () => {
    const targets = selectedEngagementsForBulk();
    if (!targets.length) {
      return;
    }
    targets.forEach((engagement) => {
      void handleGenerateInvoice(engagement, 'print');
    });
  };

  const handleBulkSendEngagements = () => {
    const targets = selectedEngagementsForBulk();
    if (!targets.length) {
      return;
    }
    targets.forEach((engagement) => {
      void handleGenerateInvoice(engagement, 'email');
    });
  };

  const handleBulkArchiveEngagements = () => {
    const targets = selectedEngagementsForBulk();
    if (!targets.length) {
      return;
    }
    targets.forEach((engagement) => {
      removeEngagement(engagement.id);
      if (selectedEngagementId === engagement.id) {
        setSelectedEngagementId(null);
        setEditDraft(null);
      }
    });
    setSelectedEngagementIds([]);
    setFeedback(`${targets.length} prestation(s) archivées.`);
  };

  const handleBulkDeleteEngagements = () => {
    const targets = selectedEngagementsForBulk();
    if (!targets.length) {
      return;
    }
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${targets.length} prestation(s) ? Cette action est irréversible.`)) {
      return;
    }
    targets.forEach((engagement) => {
      removeEngagement(engagement.id);
      if (selectedEngagementId === engagement.id) {
        setSelectedEngagementId(null);
        setEditDraft(null);
      }
    });
    setSelectedEngagementIds([]);
    setFeedback(`${targets.length} prestation(s) supprimée(s).`);
  };

  const handleExportEngagements = () => {
    if (!filteredEngagements.length) {
      setFeedback('Aucune prestation à exporter.');
      return;
    }

    const maxRecipientContacts = filteredEngagements.reduce((max, engagement) => {
      const client = clientsById.get(engagement.clientId);
      const count = engagement.contactIds
        .map((contactId) => client?.contacts.find((contact) => contact.id === contactId) ?? null)
        .filter((contact): contact is ClientContact => Boolean(contact)).length;
      return Math.max(max, count);
    }, 0);

    const contactHeader: string[] = [];
    for (let index = 0; index < maxRecipientContacts; index += 1) {
      const labelIndex = index + 1;
      contactHeader.push(
        `Contact ${labelIndex} - Nom`,
        `Contact ${labelIndex} - Email`,
        `Contact ${labelIndex} - Téléphone`,
        `Contact ${labelIndex} - Rôles`,
        `Contact ${labelIndex} - Facturation`
      );
    }

    const header = [
      'Type de document',
      'Numéro',
      'Client',
      'Entreprise',
      'Statut prestation',
      'Statut commercial',
      'Date prévue',
      'Support',
      'Détail support',
      'Service',
      'Prestations sélectionnées',
      'Durée totale (minutes)',
      'Durée totale',
      'Montant HT',
      'Majoration',
      'TVA',
      'Total TTC',
      'TVA activée',
      'Nombre de contacts destinataires',
      ...contactHeader,
      'Dernier envoi',
    ];

    const rows = filteredEngagements.map((engagement) => {
      const client = clientsById.get(engagement.clientId);
      const company = engagement.companyId ? companiesById.get(engagement.companyId) ?? null : null;
      const service = servicesById.get(engagement.serviceId);
      const optionsSelected =
        service?.options.filter((option) => engagement.optionIds.includes(option.id)) ?? ([] as ServiceOption[]);
      const totals = computeEngagementTotals(engagement);
      const vatEnabledForRow = engagement.invoiceVatEnabled ?? (company?.vatEnabled ?? vatEnabled);
      const vatAmount = vatEnabledForRow ? Math.round(totals.price * vatMultiplier * 100) / 100 : 0;
      const finalTotal = totals.price + vatAmount + totals.surcharge;
      const optionSummary = optionsSelected.length
        ? optionsSelected
            .map((option) => {
              const override = resolveOptionOverride(option, engagement.optionOverrides?.[option.id]);
              const details = [
                `x${override.quantity}`,
                formatDuration(override.durationMin),
                formatCurrency(override.unitPriceHT),
              ].join(' · ');
              return `${option.label} (${details})`;
            })
            .join(' | ')
        : 'Aucune prestation';
      const contactDetails = engagement.contactIds
        .map((contactId) => client?.contacts.find((contact) => contact.id === contactId) ?? null)
        .filter((contact): contact is ClientContact => Boolean(contact));
      const contactCells: CsvValue[] = [];
      const contactCount = contactDetails.length;
      const contactName = (contact: ClientContact) => {
        const composed = `${contact.firstName} ${contact.lastName}`.trim();
        if (composed) {
          return composed;
        }
        if (contact.email) {
          return contact.email;
        }
        if (contact.mobile) {
          return contact.mobile;
        }
        return 'Contact';
      };
      for (let index = 0; index < maxRecipientContacts; index += 1) {
        const contact = contactDetails[index] ?? null;
        contactCells.push(
          contact ? contactName(contact) : '',
          contact?.email ?? '',
          contact?.mobile ?? '',
          contact && contact.roles.length ? contact.roles.join(', ') : '',
          contact?.isBillingDefault ? 'Oui' : ''
        );
      }
      const lastSendRecord = engagement.sendHistory.reduce<EngagementSendRecord | null>((latest, record) => {
        if (!latest) {
          return record;
        }
        return record.sentAt > latest.sentAt ? record : latest;
      }, null);
      const lastSendLabel = lastSendRecord ? formatDate(lastSendRecord.sentAt) : '';
      const lastSendContacts = lastSendRecord
        ? lastSendRecord.contactIds
            .map((contactId) => client?.contacts.find((contact) => contact.id === contactId)?.email ?? null)
            .filter((email): email is string => Boolean(email))
            .join(' | ')
        : '';

      return [
        documentLabels[engagement.kind],
        getEngagementDocumentNumber(engagement),
        client?.name ?? 'Client inconnu',
        company?.name ?? '',
        engagement.status,
        engagement.kind === 'devis'
          ? engagement.quoteStatus ?? '—'
          : engagement.kind === 'facture'
          ? 'Facture'
          : 'Service',
        formatDate(engagement.scheduledAt),
        engagement.supportType,
        engagement.supportDetail,
        service?.name ?? 'Service archivé',
        optionSummary,
        totals.duration,
        totals.duration ? formatDuration(totals.duration) : '',
        formatCurrency(totals.price),
        totals.surcharge ? formatCurrency(totals.surcharge) : '',
        vatEnabledForRow ? formatCurrency(vatAmount) : '',
        formatCurrency(finalTotal),
        vatEnabledForRow ? 'Oui' : 'Non',
        contactCount,
        ...contactCells,
        lastSendLabel ? `${lastSendLabel}${lastSendContacts ? ` – ${lastSendContacts}` : ''}` : '',
      ];
    });

    downloadCsv({ fileName: 'services.csv', header, rows });
    setFeedback(`${rows.length} prestation(s) exportée(s).`);
  };

  useEffect(() => {
    if (!selectedEngagementId) {
      return;
    }
    if (!filteredEngagements.some((item) => item.id === selectedEngagementId)) {
      setSelectedEngagementId(null);
    }
  }, [filteredEngagements, selectedEngagementId]);

  const creationSelectedService = servicesById.get(creationDraft.serviceId) ?? null;
  const editSelectedService = editDraft ? servicesById.get(editDraft.serviceId) ?? null : null;
  const creationSelectedOptions =
    creationSelectedService?.options
      .filter((option) => creationDraft.optionIds.includes(option.id))
      .map((option) => ({
        option,
        override: resolveOptionOverride(option, creationDraft.optionOverrides[option.id]),
      })) ?? [];
  const editSelectedOptions =
    editSelectedService?.options
      .filter((option) => (editDraft?.optionIds.includes(option.id) ?? false))
      .map((option) => ({
        option,
        override: resolveOptionOverride(option, editDraft?.optionOverrides?.[option.id]),
      })) ?? [];

  const editClient = editDraft ? clientsById.get(editDraft.clientId) ?? null : null;
  const editContacts: ClientContact[] = editClient
    ? editClient.contacts.filter((contact) => contact.active)
    : [];
  const creationCompany =
    creationDraft.companyId && creationDraft.companyId !== ''
      ? companiesById.get(creationDraft.companyId) ?? null
      : activeCompanyId
      ? companiesById.get(activeCompanyId) ?? null
      : null;
  const editCompany =
    editDraft && editDraft.companyId
      ? companiesById.get(editDraft.companyId) ?? null
      : selectedEngagement?.companyId
      ? companiesById.get(selectedEngagement.companyId) ?? null
      : activeCompanyId
      ? companiesById.get(activeCompanyId) ?? null
      : null;

  const vatPercent = sanitizeVatRate(vatRate);
  const vatMultiplier = computeVatMultiplier(vatRate);

  const creationTotals = useMemo(() => {
    if (!creationDraft.serviceId) {
      return { price: 0, duration: 0, surcharge: creationDraft.additionalCharge };
    }
    const preview = buildPreviewEngagement(
      {
        ...creationDraft,
        status: 'planifié',
      },
      'service'
    );
    return computeEngagementTotals(preview);
  }, [creationDraft, creationMode, computeEngagementTotals]);

  const editTotals = useMemo(() => {
    if (!editDraft || !selectedEngagement) {
      return { price: 0, duration: 0, surcharge: 0 };
    }
    const preview = buildPreviewEngagement(editDraft, selectedEngagement.kind);
    return computeEngagementTotals(preview);
  }, [editDraft, selectedEngagement, computeEngagementTotals]);

  const creationVatEnabled = creationCompany?.vatEnabled ?? vatEnabled;
  const creationVatAmount = creationVatEnabled ? creationTotals.price * vatMultiplier : 0;
  const creationTotalTtc = creationTotals.price + creationVatAmount + creationTotals.surcharge;
  const companyVatDefault = editCompany?.vatEnabled ?? vatEnabled;
  const editVatEnabled = selectedEngagement
    ? selectedEngagement.invoiceVatEnabled ?? companyVatDefault
    : companyVatDefault;
  const editVatAmount = editVatEnabled ? editTotals.price * vatMultiplier : 0;
  const editTotalTtc = editTotals.price + editVatAmount + editTotals.surcharge;
  const invoiceVatOverride = selectedEngagement?.invoiceVatEnabled ?? null;
  const vatLabel = `TVA (${formatVatRateLabel(vatPercent)} %)`;

  const summary = useMemo(
    () =>
      engagements.reduce(
        (acc, engagement) => {
          const totals = computeEngagementTotals(engagement);
          acc.count += 1;
          acc.revenue += totals.price;
          acc.duration += totals.duration;
          acc.surcharge += totals.surcharge;
          if (['planifié', 'envoyé', 'brouillon'].includes(engagement.status)) {
            acc.pipeline += 1;
          }
          return acc;
        },
        { count: 0, revenue: 0, duration: 0, pipeline: 0, surcharge: 0 }
      ),
    [engagements, computeEngagementTotals]
  );

  const totalRevenueHt = summary.revenue + summary.surcharge;

  const summaryChips = useMemo(
    () => [
      {
        label: summary.pipeline > 1 ? 'Prestations actives' : 'Prestation active',
        value: new Intl.NumberFormat('fr-FR').format(summary.pipeline),
      },
      {
        label: 'CA HT cumulé',
        value: formatCurrency(totalRevenueHt),
      },
      {
        label: 'Durée planifiée',
        value: formatDuration(summary.duration),
      },
    ],
    [summary.pipeline, summary.duration, totalRevenueHt]
  );

  const summaryCards = useMemo(
    () => [
      {
        label: 'Prestations suivies',
        value: new Intl.NumberFormat('fr-FR').format(summary.count),
        description:
          summary.pipeline > 0 ? `${summary.pipeline} en cours de traitement` : 'Aucune prestation en cours',
      },
      {
        label: 'CA HT cumulé',
        value: formatCurrency(totalRevenueHt),
        description:
          summary.surcharge > 0
            ? `Dont majorations ${formatCurrency(summary.surcharge)}`
            : 'Aucune majoration appliquée',
      },
      {
        label: 'Durée planifiée',
        value: formatDuration(summary.duration),
        description: 'Somme des interventions programmées',
      },
    ],
    [summary.count, summary.pipeline, summary.surcharge, summary.duration, totalRevenueHt]
  );

  const handleInvoiceVatToggle = () => {
    if (!selectedEngagement) {
      return;
    }
    const nextValue = !editVatEnabled;
    const normalized = nextValue === companyVatDefault ? null : nextValue;
    const updated = updateEngagement(selectedEngagement.id, {
      invoiceVatEnabled: normalized,
    });
    if (updated) {
      setSelectedEngagementId(updated.id);
      setEditDraft(buildDraftFromEngagement(updated));
      setFeedback(
        nextValue ? 'TVA activée pour cette facture.' : 'TVA désactivée pour cette facture.'
      );
    }
  };

  const handleInvoiceVatReset = () => {
    if (!selectedEngagement) {
      return;
    }
    const updated = updateEngagement(selectedEngagement.id, { invoiceVatEnabled: null });
    if (updated) {
      setSelectedEngagementId(updated.id);
      setEditDraft(buildDraftFromEngagement(updated));
      setFeedback('TVA réinitialisée sur le paramètre entreprise.');
    }
  };

  const toggleCreationOption = (optionId: string) => {
    setCreationDraft((draft) => {
      const alreadySelected = draft.optionIds.includes(optionId);
      if (alreadySelected) {
        const nextIds = draft.optionIds.filter((id) => id !== optionId);
        const nextOverrides = { ...draft.optionOverrides };
        delete nextOverrides[optionId];
        return {
          ...draft,
          optionIds: nextIds,
          optionOverrides: nextOverrides,
        };
      }
      const service = servicesById.get(draft.serviceId);
      if (!service) {
        return draft;
      }
      const option = service.options.find((item) => item.id === optionId);
      if (!option) {
        return draft;
      }
      return {
        ...draft,
        optionIds: [...draft.optionIds, optionId],
        optionOverrides: {
          ...draft.optionOverrides,
          [optionId]: {
            quantity: 1,
            durationMin: option.defaultDurationMin,
            unitPriceHT: option.unitPriceHT,
          },
        },
      };
    });
  };

  const toggleCreationContact = (contactId: string) => {
    setCreationDraft((draft) => ({
      ...draft,
      contactIds: draft.contactIds.includes(contactId)
        ? draft.contactIds.filter((id) => id !== contactId)
        : [...draft.contactIds, contactId],
    }));
  };

  const updateCreationOverride = (
    optionId: string,
    updates: Partial<OptionOverrideResolved>
  ) => {
    setCreationDraft((draft) => {
      if (!draft.optionIds.includes(optionId)) {
        return draft;
      }
      const current = draft.optionOverrides[optionId] ?? {};
      const next: EngagementOptionOverride = { ...current };
      if (updates.quantity !== undefined) {
        const value = Number.isFinite(updates.quantity) ? Math.max(1, updates.quantity) : 1;
        next.quantity = value;
      }
      if (updates.durationMin !== undefined) {
        const value = Number.isFinite(updates.durationMin) ? Math.max(0, updates.durationMin) : 0;
        next.durationMin = value;
      }
      if (updates.unitPriceHT !== undefined) {
        const value = Number.isFinite(updates.unitPriceHT) ? Math.max(0, updates.unitPriceHT) : 0;
        next.unitPriceHT = value;
      }
      return {
        ...draft,
        optionOverrides: {
          ...draft.optionOverrides,
          [optionId]: next,
        },
      };
    });
  };

  const toggleEditOption = (optionId: string) => {
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }
      const alreadySelected = draft.optionIds.includes(optionId);
      if (alreadySelected) {
        const nextIds = draft.optionIds.filter((id) => id !== optionId);
        const nextOverrides = { ...draft.optionOverrides };
        delete nextOverrides[optionId];
        return {
          ...draft,
          optionIds: nextIds,
          optionOverrides: nextOverrides,
        };
      }
      const service = servicesById.get(draft.serviceId);
      if (!service) {
        return draft;
      }
      const option = service.options.find((item) => item.id === optionId);
      if (!option) {
        return draft;
      }
      return {
        ...draft,
        optionIds: [...draft.optionIds, optionId],
        optionOverrides: {
          ...draft.optionOverrides,
          [optionId]: {
            quantity: 1,
            durationMin: option.defaultDurationMin,
            unitPriceHT: option.unitPriceHT,
          },
        },
      };
    });
  };

  const toggleEditContact = (contactId: string) => {
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }
      const contactIds = draft.contactIds.includes(contactId)
        ? draft.contactIds.filter((id) => id !== contactId)
        : [...draft.contactIds, contactId];
      return { ...draft, contactIds };
    });
  };

  const updateEditOverride = (
    optionId: string,
    updates: Partial<OptionOverrideResolved>
  ) => {
    setEditDraft((draft) => {
      if (!draft || !draft.optionIds.includes(optionId)) {
        return draft;
      }
      const current = draft.optionOverrides[optionId] ?? {};
      const next: EngagementOptionOverride = { ...current };
      if (updates.quantity !== undefined) {
        const value = Number.isFinite(updates.quantity) ? Math.max(1, updates.quantity) : 1;
        next.quantity = value;
      }
      if (updates.durationMin !== undefined) {
        const value = Number.isFinite(updates.durationMin) ? Math.max(0, updates.durationMin) : 0;
        next.durationMin = value;
      }
      if (updates.unitPriceHT !== undefined) {
        const value = Number.isFinite(updates.unitPriceHT) ? Math.max(0, updates.unitPriceHT) : 0;
        next.unitPriceHT = value;
      }
      return {
        ...draft,
        optionOverrides: {
          ...draft.optionOverrides,
          [optionId]: next,
        },
      };
    });
  };

  const handleQuickClientSubmit = () => {
    if (!quickClientDraft.name.trim() || !quickClientDraft.siret.trim()) {
      setFeedback('Renseignez au minimum le nom et le SIRET.');
      return;
    }
    const created = addClient({
      type: 'company',
      name: quickClientDraft.name.trim(),
      companyName: quickClientDraft.name.trim(),
      firstName: '',
      lastName: '',
      siret: quickClientDraft.siret.trim(),
      email: quickClientDraft.email.trim() || 'contact@client.fr',
      phone: quickClientDraft.phone.trim() || '+33 6 00 00 00 00',
      address: quickClientDraft.address.trim(),
      city: quickClientDraft.city.trim() || '—',
      status: quickClientDraft.status,
      tags: [],
    });
    const [firstName, ...restName] = quickClientDraft.name.trim().split(' ');
    const defaultContact = addClientContact(created.id, {
      firstName: firstName || 'Contact',
      lastName: restName.join(' ') || 'Facturation',
      email: quickClientDraft.email.trim() || 'contact@client.fr',
      mobile: quickClientDraft.phone.trim() || '+33 6 00 00 00 00',
      roles: ['facturation'],
      isBillingDefault: true,
    });
    const refreshedClient = getClient(created.id);
    const nextContactId = defaultContact?.id
      ?? refreshedClient?.contacts.find((contact) => contact.active && contact.isBillingDefault)?.id
      ?? refreshedClient?.contacts.find((contact) => contact.active)?.id
      ?? '';
    setCreationDraft((draft) => ({
      ...draft,
      clientId: created.id,
      contactIds: nextContactId ? [nextContactId] : draft.contactIds,
    }));
    setQuickClientDraft({ name: '', siret: '', email: '', phone: '', address: '', city: '', status: 'Actif' });
    setIsAddingClient(false);
    setFeedback(`Client « ${created.name} » ajouté.`);
  };

  const resolveEngagementRecipients = (engagement: Engagement, clientOverride?: Client | null) => {
    const targetClient = clientOverride ?? clientsById.get(engagement.clientId) ?? null;
    if (!targetClient) {
      return { emails: [] as string[], contactIds: [] as string[] };
    }
    const fallbackIds = targetClient.contacts
      .filter((contact) => contact.active && contact.isBillingDefault)
      .map((contact) => contact.id);
    const preferredIds = engagement.contactIds.length ? engagement.contactIds : fallbackIds;
    const uniqueIds = Array.from(new Set(preferredIds)).filter((id) =>
      targetClient.contacts.some((contact) => contact.id === id && contact.active)
    );
    const emails = uniqueIds
      .map((contactId) =>
        targetClient.contacts.find((contact) => contact.id === contactId && contact.active)?.email?.trim() ?? ''
      )
      .filter((email): email is string => email.length > 0);
    return { emails: Array.from(new Set(emails)), contactIds: uniqueIds };
  };

  const openMailForService = (engagement: Engagement, serviceName: string, client: Client | undefined) => {
    const targetClient = client ?? clientsById.get(engagement.clientId) ?? null;
    const recipients = resolveEngagementRecipients(engagement, targetClient);
    if (recipients.emails.length && recipients.contactIds.length) {
      const subject = `${BRAND_NAME} – Info service ${serviceName}`;
      const baseBody = `Bonjour,\n\nVoici les informations concernant le service "${serviceName}".\nSouhaitez-vous que je vous envoie un devis ?\n\nCordialement,\n${BRAND_NAME}`;
      const companyContext = engagement.companyId
        ? companiesById.get(engagement.companyId) ?? null
        : companiesById.get(activeCompanyId ?? '') ?? null;
      const signatureHtml = resolveSignatureHtml(
        companyContext?.id ?? engagement.companyId ?? activeCompanyId ?? null,
        currentUserId
      );
      const mergedBody = mergeBodyWithSignature(
        baseBody,
        signatureHtml,
        buildSignatureReplacements(companyContext)
      );
      if (typeof window !== 'undefined') {
        window.location.href = `mailto:${recipients.emails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mergedBody)}`;
      }
      recordEngagementSend(engagement.id, { contactIds: recipients.contactIds, subject });
      return;
    }
    setMailPrompt({ engagementId: engagement.id, serviceName });
    setMailPromptClientId(clientsWithEmail[0]?.id ?? '');
  };

  const submitMailPrompt = () => {
    if (!mailPrompt) {
      return;
    }
    const targetClient = clients.find((client) => client.id === mailPromptClientId);
    if (!targetClient) {
      return;
    }
    const recipients = targetClient.contacts
      .filter((contact) => contact.active && contact.email)
      .map((contact) => contact.email);
    const contactIds = targetClient.contacts
      .filter((contact) => contact.active && contact.email)
      .map((contact) => contact.id);
    if (!recipients.length) {
      return;
    }
    const subject = `${BRAND_NAME} – Info service ${mailPrompt.serviceName}`;
    const companyContext = companiesById.get(activeCompanyId ?? '') ?? null;
    const baseBody = `Bonjour,\n\nVoici les informations concernant le service "${mailPrompt.serviceName}".\nSouhaitez-vous que je vous envoie un devis ?\n\nCordialement,\n${BRAND_NAME}`;
    const signatureHtml = resolveSignatureHtml(companyContext?.id ?? activeCompanyId ?? null, currentUserId);
    const mergedBody = mergeBodyWithSignature(
      baseBody,
      signatureHtml,
      buildSignatureReplacements(companyContext)
    );
    if (typeof window !== 'undefined') {
      window.location.href = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mergedBody)}`;
    }
    if (contactIds.length) {
      recordEngagementSend(mailPrompt.engagementId, { contactIds, subject });
    }
    setMailPrompt(null);
    setMailPromptClientId('');
  };

  const cancelMailPrompt = () => {
    setMailPrompt(null);
    setMailPromptClientId('');
  };

  const openQuoteFromEngagement = (engagement: Engagement) => {
    setFeedback(null);
    const draft = buildDraftFromEngagement(engagement);
    setCreationDraft({
      ...draft,
      companyId: draft.companyId || activeCompanyId || '',
      optionIds: [...engagement.optionIds],
      status: 'planifié',
    });
    setHighlightQuote(true);
    setCreationMode('service');
  };

  const handleCreateService = async (options?: { sendAsQuote?: boolean }) => {
    setFeedback(null);
    if (!creationDraft.clientId || !creationDraft.serviceId) {
      setFeedback('Sélectionnez un client et un service.');
      return;
    }
    if (!creationDraft.companyId) {
      setFeedback("Sélectionnez l'entreprise associée au document.");
      return;
    }
    if (!creationDraft.contactIds.length) {
      setFeedback('Sélectionnez au moins un contact destinataire.');
      return;
    }
    const service = servicesById.get(creationDraft.serviceId) ?? null;
    if (!service) {
      console.error('[Wash&Go] Service introuvable lors de la création de la prestation', {
        serviceId: creationDraft.serviceId,
      });
      setFeedback('Le service sélectionné est introuvable. Veuillez réessayer.');
      return;
    }

    const client = clientsById.get(creationDraft.clientId) ?? null;
    if (!client) {
      console.error('[Wash&Go] Client introuvable lors de la création de la prestation', {
        clientId: creationDraft.clientId,
      });
      setFeedback('Le client sélectionné est introuvable.');
      return;
    }

    const selectedCompany = creationDraft.companyId ? companiesById.get(creationDraft.companyId) ?? null : null;
    if (!selectedCompany) {
      setFeedback("Impossible de retrouver l'entreprise associée.");
      return;
    }

    const engagement = addEngagement({
      clientId: creationDraft.clientId,
      serviceId: creationDraft.serviceId,
      optionIds: creationDraft.optionIds,
      optionOverrides: creationDraft.optionOverrides,
      scheduledAt: fromLocalInputValue(creationDraft.scheduledAt),
      status: options?.sendAsQuote ? 'brouillon' : creationDraft.status,
      companyId: selectedCompany.id,
      kind: options?.sendAsQuote ? 'devis' : 'service',
      supportType: creationDraft.supportType,
      supportDetail: creationDraft.supportDetail.trim(),
      additionalCharge: creationDraft.additionalCharge,
      contactIds: creationDraft.contactIds,
      sendHistory: [],
      invoiceNumber: null,
      invoiceVatEnabled: null,
      quoteNumber: null,
      quoteStatus: options?.sendAsQuote ? 'brouillon' : null,
      // Planning
      planningUser: creationDraft.planningUser,
      startTime: creationDraft.startTime,
    });

    // Créer l'événement Google Calendar si planning et horaire sont définis
    if (creationDraft.planningUser && creationDraft.startTime && estimatedDuration) {
      try {
        const calendarResult = await createCalendarEvent(engagement, {
          planningUser: creationDraft.planningUser,
          startTime: creationDraft.startTime,
          estimatedDuration,
          client,
          service,
          selectedCompany
        });
        
        if (calendarResult.success) {
          console.log('[Wash&Go] Événement Google Calendar créé avec succès:', calendarResult.event_id);
        } else {
          console.error('[Wash&Go] Erreur lors de la création de l\'événement Google Calendar:', calendarResult.error);
          setFeedback('Service enregistré, mais erreur lors de la synchronisation avec le planning.');
        }
      } catch (error) {
        console.error('[Wash&Go] Erreur lors de la création de l\'événement Google Calendar:', error);
        setFeedback('Service enregistré, mais erreur lors de la synchronisation avec le planning.');
      }
    }

    setHighlightQuote(false);
    setIsAddingClient(false);
    setSelectedEngagementIds([]);
    setSelectedEngagementId(null);
    setEditDraft(null);

    if (options?.sendAsQuote) {
      await handleGenerateQuote(engagement, 'email', { autoCreated: true });
    } else {
      setFeedback('Service enregistré.');
    }
    setCreationMode(null);
    scrollToList();
  };

  const handleUpdateService = async () => {
    setEditModalError(null);
    if (!selectedEngagement || !editModalDraft) {
      setEditModalError('Aucun service sélectionné.');
      return;
    }
    if (!editModalDraft.clientId || !editModalDraft.serviceId) {
      setEditModalError('Sélectionnez un client et un service.');
      return;
    }
    if (!editModalDraft.companyId) {
      setEditModalError("Sélectionnez l'entreprise associée au document.");
      return;
    }
    if (!editModalDraft.contactIds.length) {
      setEditModalError('Sélectionnez au moins un contact destinataire.');
      return;
    }

    const service = servicesById.get(editModalDraft.serviceId) ?? null;
    if (!service) {
      console.error('[Wash&Go] Service introuvable lors de la mise à jour de la prestation', {
        serviceId: editModalDraft.serviceId,
      });
      setEditModalError('Le service sélectionné est introuvable. Veuillez réessayer.');
      return;
    }

    const client = clientsById.get(editModalDraft.clientId) ?? null;
    if (!client) {
      console.error('[Wash&Go] Client introuvable lors de la mise à jour de la prestation', {
        clientId: editModalDraft.clientId,
      });
      setEditModalError('Le client sélectionné est introuvable.');
      return;
    }

    const selectedCompany = editModalDraft.companyId ? companiesById.get(editModalDraft.companyId) ?? null : null;
    if (!selectedCompany) {
      setEditModalError("Impossible de retrouver l'entreprise associée.");
      return;
    }

    try {
      const updated = updateEngagement(selectedEngagement.id, {
        clientId: editModalDraft.clientId,
        serviceId: editModalDraft.serviceId,
        optionIds: editModalDraft.optionIds,
        optionOverrides: editModalDraft.optionOverrides,
        scheduledAt: fromLocalInputValue(editModalDraft.scheduledAt),
        status: editModalDraft.status,
        kind: editModalDraft.kind,
        companyId: selectedCompany.id,
        supportType: editModalDraft.supportType,
        supportDetail: editModalDraft.supportDetail.trim(),
        additionalCharge: editModalDraft.additionalCharge,
        contactIds: editModalDraft.contactIds,
        planningUser: editModalDraft.planningUser,
        startTime: editModalDraft.startTime,
      });

      if (!updated) {
        setEditModalError('Erreur lors de la mise à jour du service. Veuillez réessayer.');
        return;
      }

      setFeedback('Service mis à jour avec succès.');
      setShowEditServiceModal(false);
      setEditModalDraft(null);
      setEditModalError(null);
      setSelectedEngagementId(updated.id);
      setEditDraft(buildDraftFromEngagement(updated));
    } catch (error) {
      console.error('[Wash&Go] Erreur lors de la mise à jour du service', error);
      setEditModalError('Une erreur est survenue lors de la mise à jour. Veuillez réessayer.');
    }
  };

  const closeEditServiceModal = () => {
    setShowEditServiceModal(false);
    setEditModalDraft(null);
    setEditModalError(null);
  };

  const sendInvoiceEmail = async ({
    engagement,
    client,
    company,
    service,
    documentNumber,
    issueDate,
    optionsSelected,
    optionOverrides,
    totals,
    vatEnabled,
    pdfDataUri,
  }: InvoiceEmailContext & {
    optionsSelected: ServiceOption[];
    pdfDataUri: string;
    totals: { price: number; duration: number; surcharge: number };
  }): Promise<{ status: 'sent' | 'fallback' | 'error'; message?: string }> => {
    const recipients = resolveEngagementRecipients(engagement, client);
    if (!recipients.emails.length || !recipients.contactIds.length) {
      return {
        status: 'error',
        message: 'Ajoutez un contact facturation avec une adresse e-mail pour envoyer la facture.',
      };
    }

    const contact = client.contacts.find((item) => recipients.contactIds.includes(item.id)) ?? null;
    const candidateFirstNames = [contact?.firstName, client.firstName].map((value) => value?.trim()).filter(Boolean);
    const candidateLastNames = [contact?.lastName, client.lastName, client.name]
      .map((value) => value?.trim())
      .filter(Boolean);
    const greetingName = `${candidateFirstNames[0] ?? ''} ${candidateLastNames[0] ?? ''}`.trim() || client.name;

    const supportDetail = engagement.supportDetail?.trim();
    const supportLine = supportDetail
      ? `${engagement.supportType} – ${supportDetail}`
      : engagement.supportType || 'Support';

    const subtotal = totals.price + totals.surcharge;
    const vatAmount = vatEnabled ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
    const totalTtc = vatEnabled ? subtotal + vatAmount : subtotal;
    const vatSuffix = vatEnabled
      ? ` (TVA ${formatVatRateLabel(vatPercent)} % : ${formatCurrency(vatAmount)})`
      : '';

    const prestationEntries = optionsSelected.map((option) => {
      const override = optionOverrides?.[option.id];
      const quantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
      const durationValue =
        override?.durationMin !== undefined && override.durationMin >= 0
          ? override.durationMin
          : option.defaultDurationMin;
      const unitPrice =
        override?.unitPriceHT !== undefined && override.unitPriceHT >= 0
          ? override.unitPriceHT
          : option.unitPriceHT;
      const quantityLabel = quantity !== 1 ? `${quantity} × ` : '';
      const durationLabel = durationValue ? ` (${formatDuration(durationValue)})` : '';
      const lineTotal = formatCurrency(unitPrice * quantity);
      return `• ${quantityLabel}${option.label}${durationLabel} – ${lineTotal}`;
    });
    if (totals.surcharge > 0) {
      prestationEntries.push(`• Majoration – ${formatCurrency(totals.surcharge)}`);
    }
    const prestationsBlock = prestationEntries.length
      ? `\n  ${prestationEntries.join('\n  ')}`
      : ' Voir le détail dans la facture';

    const subject = `Facture ${documentNumber} – ${client.name}`;
    const baseBody = [
      `Bonjour ${greetingName},`,
      '',
      `Veuillez trouver ci-joint la facture ${documentNumber} relative au service « ${service.name} ».`,
      '',
      'Détails principaux :',
      `- Client : ${client.name}`,
      `- Support : ${supportLine}`,
      `- Prestations :${prestationsBlock}`,
      `- Total HT : ${formatCurrency(subtotal)}${vatSuffix}`,
      `- Total TTC : ${formatCurrency(totalTtc)}`,
      `- Date : ${issueDate.toLocaleDateString('fr-FR')}`,
      '',
      'Restant à votre disposition,',
    ].join('\n');

    const signatureHtml = resolveSignatureHtml(company.id, currentUserId);
    let bodyWithSignature = mergeBodyWithSignature(baseBody, signatureHtml, buildSignatureReplacements(company));
    if (!signatureHtml) {
      const fallbackName = `${userProfile.firstName ?? ''} ${userProfile.lastName ?? ''}`.trim() || BRAND_NAME;
      const fallbackSignature = `Cordialement,\n${fallbackName}`;
      bodyWithSignature = `${bodyWithSignature}\n\n${fallbackSignature}`.trim();
    }

    const sendResult: SendDocumentEmailResult = await sendDocumentEmail({
      to: recipients.emails,
      subject,
      body: bodyWithSignature,
      attachment: { filename: `${documentNumber}.pdf`, dataUri: pdfDataUri },
    });

    if (sendResult.ok) {
      recordEngagementSend(engagement.id, { contactIds: recipients.contactIds, subject });
      return { status: 'sent' };
    }

    if ((sendResult as any).reason === 'not-configured') {
      openEmailComposer({ to: recipients.emails, subject, body: bodyWithSignature });
      recordEngagementSend(engagement.id, { contactIds: recipients.contactIds, subject });
      return { status: 'fallback', message: 'SMTP non configuré – e-mail ouvert dans votre messagerie.' };
    }

    return {
      status: 'error',
      message: (sendResult as any).message ?? "Impossible d'envoyer la facture par e-mail.",
    };
  };

  const sendQuoteEmail = async ({
    engagement,
    client,
    company,
    service,
    documentNumber,
    issueDate,
    optionsSelected,
    optionOverrides,
    totals,
    vatEnabled,
    pdfDataUri,
  }: InvoiceEmailContext & {
    optionsSelected: ServiceOption[];
    pdfDataUri: string;
    totals: { price: number; duration: number; surcharge: number };
  }): Promise<{ status: 'sent' | 'fallback' | 'error'; message?: string }> => {
    const recipients = resolveEngagementRecipients(engagement, client);
    if (!recipients.emails.length || !recipients.contactIds.length) {
      return {
        status: 'error',
        message: 'Ajoutez un contact destinataire avec une adresse e-mail pour envoyer le devis.',
      };
    }

    const subtotal = totals.price + totals.surcharge;
    const vatAmount = vatEnabled ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
    const totalTtc = vatEnabled ? subtotal + vatAmount : subtotal;
    const vatSuffix = vatEnabled
      ? ` (TVA ${formatVatRateLabel(vatPercent)} % : ${formatCurrency(vatAmount)})`
      : '';

    const prestationEntries = optionsSelected.map((option) => {
      const override = optionOverrides?.[option.id];
      const quantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
      const durationValue =
        override?.durationMin !== undefined && override.durationMin >= 0
          ? override.durationMin
          : option.defaultDurationMin;
      const unitPrice =
        override?.unitPriceHT !== undefined && override.unitPriceHT >= 0
          ? override.unitPriceHT
          : option.unitPriceHT;
      const quantityLabel = quantity !== 1 ? `${quantity} × ` : '';
      const durationLabel = durationValue ? ` (${formatDuration(durationValue)})` : '';
      const lineTotal = formatCurrency(unitPrice * quantity);
      return `• ${quantityLabel}${option.label}${durationLabel} – ${lineTotal}`;
    });
    if (totals.surcharge > 0) {
      prestationEntries.push(`• Majoration – ${formatCurrency(totals.surcharge)}`);
    }
    const prestationsBlock = prestationEntries.length
      ? `\n  ${prestationEntries.join('\n  ')}`
      : ' Voir le détail dans le devis';

    const subject = `Devis ${documentNumber} – ${client.name}`;
    const baseBody = [
      `Bonjour ${client.name},`,
      '',
      `Veuillez trouver ci-joint le devis ${documentNumber} pour le service « ${service.name} ».`,
      '',
      'Détails principaux :',
      `- Client : ${client.name}`,
      `- Support : ${
        engagement.supportDetail?.trim()
          ? `${engagement.supportType} – ${engagement.supportDetail}`
          : engagement.supportType || 'Support'
      }`,
      `- Prestations :${prestationsBlock}`,
      `- Total HT estimé : ${formatCurrency(subtotal)}${vatSuffix}`,
      `- Total TTC estimé : ${formatCurrency(totalTtc)}`,
      `- Date d'émission : ${issueDate.toLocaleDateString('fr-FR')}`,
      '',
      'Validité du devis : 30 jours.',
      '',
      'Restant à votre disposition pour toute précision,',
    ].join('\n');

    const signatureHtml = resolveSignatureHtml(company.id, currentUserId);
    let bodyWithSignature = mergeBodyWithSignature(baseBody, signatureHtml, buildSignatureReplacements(company));
    if (!signatureHtml) {
      const fallbackName = `${userProfile.firstName ?? ''} ${userProfile.lastName ?? ''}`.trim() || BRAND_NAME;
      const fallbackSignature = `Cordialement,\n${fallbackName}`;
      bodyWithSignature = `${bodyWithSignature}\n\n${fallbackSignature}`.trim();
    }

    const sendResult: SendDocumentEmailResult = await sendDocumentEmail({
      to: recipients.emails,
      subject,
      body: bodyWithSignature,
      attachment: { filename: `${documentNumber}.pdf`, dataUri: pdfDataUri },
    });

    if (sendResult.ok) {
      recordEngagementSend(engagement.id, { contactIds: recipients.contactIds, subject });
      return { status: 'sent' };
    }

    if ((sendResult as any).reason === 'not-configured') {
      openEmailComposer({ to: recipients.emails, subject, body: bodyWithSignature });
      recordEngagementSend(engagement.id, { contactIds: recipients.contactIds, subject });
      return { status: 'fallback', message: 'SMTP non configuré – e-mail ouvert dans votre messagerie.' };
    }

    return {
      status: 'error',
      message: (sendResult as any).message ?? "Impossible d'envoyer le devis par e-mail.",
    };
  };

  const handleGenerateInvoice = async (
    engagement: Engagement,
    mode: 'download' | 'email' | 'print' = 'download'
  ) => {
    setFeedback(null);
    const service = servicesById.get(engagement.serviceId) ?? null;
    if (!service) {
      console.error('[Wash&Go] Service introuvable lors de la génération de facture', {
        engagementId: engagement.id,
        serviceId: engagement.serviceId,
      });
      setFeedback('Service introuvable pour cette prestation.');
      return;
    }
    const client = clientsById.get(engagement.clientId) ?? null;
    if (!client) {
      console.error('[Wash&Go] Client introuvable lors de la génération de facture', {
        engagementId: engagement.id,
        clientId: engagement.clientId,
      });
      setFeedback('Client introuvable pour cette prestation.');
      return;
    }
    const preferredCompany = engagement.companyId ? companiesById.get(engagement.companyId) ?? null : null;
    const company = preferredCompany ?? (activeCompanyId ? companiesById.get(activeCompanyId) ?? null : null);
    if (!company) {
      setFeedback('Associez une entreprise avant de générer une facture.');
      return;
    }
    const optionsSelected = service.options.filter((option) => engagement.optionIds.includes(option.id));
    if (!optionsSelected.length && engagement.additionalCharge <= 0) {
      setFeedback('Sélectionnez au moins une prestation à facturer.');
      return;
    }

    if (!company.name.trim() || !company.siret.trim()) {
      setFeedback("Complétez le nom et le SIRET de l'entreprise avant de générer une facture.");
      return;
    }
    if (!client.name.trim()) {
      setFeedback('Le client doit avoir un nom pour générer une facture.');
      return;
    }

    const totals = computeEngagementTotals(engagement);
    const issueDate = new Date();
    const vatEnabledForInvoice = engagement.invoiceVatEnabled ?? (company.vatEnabled ?? vatEnabled);
    const documentNumber = engagement.invoiceNumber ?? getNextInvoiceNumber(engagements, issueDate);

    try {
      const pdf = generateInvoicePdf({
        documentNumber,
        issueDate,
        serviceDate: new Date(engagement.scheduledAt),
        company,
        client,
        service,
        options: optionsSelected,
        optionOverrides: engagement.optionOverrides ?? {},
        additionalCharge: engagement.additionalCharge,
        vatRate: vatPercent,
        vatEnabled: vatEnabledForInvoice,
        status: engagement.status,
        supportType: engagement.supportType,
        supportDetail: engagement.supportDetail,
        paymentMethod: undefined,
      });
      const subtotal = totals.price + totals.surcharge;
      const vatAmount = vatEnabledForInvoice ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
      const totalTtc = vatEnabledForInvoice ? subtotal + vatAmount : subtotal;
      const pdfDataUri = pdf.output('datauristring');

      const recipients = resolveEngagementRecipients(engagement, client);

      persistEngagementDocument(pdf, {
        engagement,
        documentNumber,
        documentType: 'Facture',
        client,
        company,
        totals: { subtotal, vatAmount, total: totalTtc },
        vatEnabled: vatEnabledForInvoice,
        vatRate: vatPercent,
        issueDate,
        recipients: recipients.emails.length ? recipients.emails : undefined,
        pdfDataUri,
      });

      if (mode === 'download') {
        pdf.save(`${documentNumber}.pdf`);
      } else if (mode === 'print' && typeof window !== 'undefined') {
        pdf.autoPrint?.();
        const blobUrl = pdf.output('bloburl');
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      }

      const updated = updateEngagement(engagement.id, {
        status: 'réalisé',
        kind: 'facture',
        companyId: company.id,
        invoiceNumber: documentNumber,
        invoiceVatEnabled: vatEnabledForInvoice,
      });
      const nextEngagement = updated ?? engagement;
      setSelectedEngagementId(nextEngagement.id);
      setEditDraft(buildDraftFromEngagement(nextEngagement));

      if (mode === 'email') {
        const emailResult = await sendInvoiceEmail({
          engagement: nextEngagement,
          client,
          company,
          service,
          documentNumber,
          issueDate,
          optionsSelected,
          optionOverrides: nextEngagement.optionOverrides ?? {},
          totals,
          vatEnabled: vatEnabledForInvoice,
          pdfDataUri,
        });
        if (emailResult.status === 'error') {
          setFeedback(emailResult.message ?? "Impossible d'envoyer la facture par e-mail.");
          return;
        }
        if (emailResult.status === 'fallback') {
          pdf.save(`${documentNumber}.pdf`);
          setFeedback(
            emailResult.message ??
              'SMTP indisponible – le PDF a été téléchargé et votre messagerie a été ouverte.'
          );
        } else {
          setFeedback('Facture envoyée par e-mail.');
        }
      } else if (mode === 'print') {
        setFeedback('Facture générée et prête pour impression.');
      } else {
        setFeedback('Facture générée et téléchargée.');
      }
    } catch (error) {
      console.error('[Wash&Go] Échec de génération de la facture', {
        error,
        engagementId: engagement.id,
        serviceId: engagement.serviceId,
      });
      setFeedback('Impossible de générer la facture. Vérifiez les informations et réessayez.');
    }
  };

  const handleGenerateQuote = async (
    engagement: Engagement,
    mode: 'download' | 'email' = 'download',
    options?: { autoCreated?: boolean }
  ) => {
    setFeedback(null);
    const service = servicesById.get(engagement.serviceId) ?? null;
    if (!service) {
      console.error('[Wash&Go] Service introuvable lors de la génération de devis', {
        engagementId: engagement.id,
        serviceId: engagement.serviceId,
      });
      setFeedback('Service introuvable pour cette prestation.');
      return;
    }
    const client = clientsById.get(engagement.clientId) ?? null;
    if (!client) {
      console.error('[Wash&Go] Client introuvable lors de la génération de devis', {
        engagementId: engagement.id,
        clientId: engagement.clientId,
      });
      setFeedback('Client introuvable pour cette prestation.');
      return;
    }
    const preferredCompany = engagement.companyId ? companiesById.get(engagement.companyId) ?? null : null;
    const company = preferredCompany ?? (activeCompanyId ? companiesById.get(activeCompanyId) ?? null : null);
    if (!company) {
      setFeedback('Associez une entreprise avant de générer un devis.');
      return;
    }

    const optionsSelected = service.options.filter((option) => engagement.optionIds.includes(option.id));
    if (!optionsSelected.length && engagement.additionalCharge <= 0) {
      setFeedback('Sélectionnez au moins une prestation à inclure dans le devis.');
      return;
    }

    if (!company.name.trim() || !company.siret.trim()) {
      setFeedback("Complétez le nom et le SIRET de l'entreprise avant de générer un devis.");
      return;
    }
    if (!client.name.trim()) {
      setFeedback('Le client doit avoir un nom pour générer un devis.');
      return;
    }

    const totals = computeEngagementTotals(engagement);
    const issueDate = new Date();
    const vatEnabledForQuote = company.vatEnabled ?? vatEnabled;
    const documentNumber = engagement.quoteNumber ?? getNextQuoteNumber(engagements, issueDate);

    try {
      const pdf = generateQuotePdf({
        documentNumber,
        issueDate,
        serviceDate: new Date(engagement.scheduledAt),
        company,
        client,
        service,
        options: optionsSelected,
        optionOverrides: engagement.optionOverrides ?? {},
        additionalCharge: engagement.additionalCharge,
        vatRate: vatPercent,
        vatEnabled: vatEnabledForQuote,
        status: engagement.status,
        supportType: engagement.supportType,
        supportDetail: engagement.supportDetail,
        validityNote: '30 jours',
      });

      const subtotal = totals.price + totals.surcharge;
      const vatAmount = vatEnabledForQuote ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
      const totalTtc = vatEnabledForQuote ? subtotal + vatAmount : subtotal;
      const pdfDataUri = pdf.output('datauristring');

      const recipients = resolveEngagementRecipients(engagement, client);

      persistEngagementDocument(pdf, {
        engagement,
        documentNumber,
        documentType: 'Devis',
        client,
        company,
        totals: { subtotal, vatAmount, total: totalTtc },
        vatEnabled: vatEnabledForQuote,
        vatRate: vatPercent,
        issueDate,
        recipients: recipients.emails.length ? recipients.emails : undefined,
        pdfDataUri,
      });

      if (mode === 'download') {
        if (typeof window !== 'undefined') {
          const blobUrl = pdf.output('bloburl');
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
        }
        pdf.save(`${documentNumber}.pdf`);
      }

      const updated = updateEngagement(engagement.id, {
        status: mode === 'email' ? 'envoyé' : engagement.status ?? 'brouillon',
        kind: 'devis',
        companyId: company.id,
        quoteNumber: documentNumber,
        quoteStatus: mode === 'email' ? 'envoyé' : engagement.quoteStatus ?? 'brouillon',
      });
      const nextEngagement = updated ?? engagement;
      setSelectedEngagementId(nextEngagement.id);
      setEditDraft(buildDraftFromEngagement(nextEngagement));

      if (mode === 'email') {
        const emailResult = await sendQuoteEmail({
          engagement: nextEngagement,
          client,
          company,
          service,
          documentNumber,
          issueDate,
          optionsSelected,
          optionOverrides: nextEngagement.optionOverrides ?? {},
          totals,
          vatEnabled: vatEnabledForQuote,
          pdfDataUri,
        });

        if (emailResult.status === 'error') {
          setFeedback(emailResult.message ?? "Impossible d'envoyer le devis par e-mail.");
          return;
        }
        if (emailResult.status === 'fallback') {
          if (typeof window !== 'undefined') {
            const blobUrl = pdf.output('bloburl');
            window.open(blobUrl, '_blank', 'noopener,noreferrer');
          }
          pdf.save(`${documentNumber}.pdf`);
          setFeedback(
            emailResult.message ??
              "SMTP indisponible – le devis a été téléchargé et un brouillon d'e-mail a été ouvert."
          );
        } else {
          const successMessage = options?.autoCreated
            ? 'Devis préparé et e-mail envoyé.'
            : 'Devis envoyé par e-mail.';
          setFeedback(successMessage);
        }
      } else {
        setFeedback('Devis généré et téléchargé.');
      }
    } catch (error) {
      console.error('[Wash&Go] Échec de génération du devis', {
        error,
        engagementId: engagement.id,
        serviceId: engagement.serviceId,
      });
      setFeedback('Impossible de générer le devis. Vérifiez les informations et réessayez.');
    }
  };

const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEngagement || !editDraft) {
      return;
    }
    if (!editDraft.contactIds.length) {
      setFeedback('Sélectionnez au moins un contact destinataire.');
      return;
    }
    const updated = updateEngagement(selectedEngagement.id, {
      clientId: editDraft.clientId,
      serviceId: editDraft.serviceId,
      optionIds: editDraft.optionIds,
      optionOverrides: editDraft.optionOverrides,
      scheduledAt: fromLocalInputValue(editDraft.scheduledAt),
      status: editDraft.status,
      companyId: editDraft.companyId ? editDraft.companyId : null,
      supportType: editDraft.supportType,
      supportDetail: editDraft.supportDetail.trim(),
      additionalCharge: editDraft.additionalCharge,
      contactIds: editDraft.contactIds,
    });
    if (updated) {
      setFeedback('Prestation mise à jour.');
      setSelectedEngagementId(updated.id);
      setEditDraft(buildDraftFromEngagement(updated));
    }
  };

  const handleRemove = (engagementId: string) => {
    removeEngagement(engagementId);
    setFeedback('Prestation supprimée.');
    setSelectedEngagementIds((current) => current.filter((id) => id !== engagementId));
    if (selectedEngagementId === engagementId) {
      setSelectedEngagementId(null);
      setEditDraft(null);
    }
  };

  const openCreation = () => {
    setFeedback(null);
    setCreationMode('service');
    setCreationDraft({
      ...baseDraft,
      status: 'planifié',
    });
    setIsAddingClient(false);
    setSelectedEngagementId(null);
    setEditDraft(null);
  };

  const scrollToList = useCallback(() => {
    requestAnimationFrame(() => {
      listSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const anyVatEnabled = useMemo(() => {
    return engagements.some((engagement) => {
      const companyRef = engagement.companyId ? companiesById.get(engagement.companyId) : null;
      const resolvedVat = engagement.invoiceVatEnabled ?? (companyRef ? companyRef.vatEnabled : vatEnabled);
      return resolvedVat;
    });
  }, [companiesById, engagements, vatEnabled]);

  const totalColumnLabel = anyVatEnabled ? 'Total TTC' : 'Total';
  const showVatColumn = anyVatEnabled;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'Tous') {
      count += 1;
    }
    if (kindFilter !== 'Tous') {
      count += 1;
    }
    if (companyFilter !== 'Toutes') {
      count += 1;
    }
    return count;
  }, [statusFilter, kindFilter, companyFilter]);

  useEffect(() => {
    if (!showVatColumn && columnVisibility.vat) {
      setColumnVisibility((prev) => ({ ...prev, vat: false }));
    }
  }, [showVatColumn, columnVisibility.vat]);

  const visibleColumns = useMemo(() => {
    return SERVICE_COLUMN_ORDER.filter((columnId) => {
      if (columnId === 'vat' && !showVatColumn) {
        return false;
      }
      return columnVisibility[columnId];
    });
  }, [columnVisibility, showVatColumn]);

  const toggleColumnVisibility = useCallback(
    (columnId: ServiceColumnId) => {
      setColumnVisibility((prev) => {
        const isCurrentlyVisible = prev[columnId];
        const remainingVisible = SERVICE_COLUMN_ORDER.filter((id) => {
          if (id === columnId) {
            return false;
          }
          if (id === 'vat' && !showVatColumn) {
            return false;
          }
          return prev[id];
        }).length;

        if (isCurrentlyVisible && remainingVisible === 0) {
          return prev;
        }

        return {
          ...prev,
          [columnId]: !isCurrentlyVisible,
        };
      });
    },
    [showVatColumn]
  );

  const updateColumnWidth = useCallback((columnId: ServiceColumnId, nextWidth: number) => {
     const config = SERVICE_COLUMN_CONFIG[columnId];
     const clamped = Math.min(config.maxWidth, Math.max(config.minWidth, nextWidth));
     setColumnWidths((prev) => ({ ...prev, [columnId]: clamped }));
   }, []);

  const handleColumnResizeMove = useCallback(
    (event: MouseEvent) => {
      const state = resizeStateRef.current;
      if (!state) {
        return;
      }
      const delta = event.clientX - state.startX;
      updateColumnWidth(state.columnId, state.startWidth + delta);
    },
    [updateColumnWidth]
  );

  const handleColumnResizeEnd = useCallback(() => {
    if (!resizeStateRef.current) {
      return;
    }
    resizeStateRef.current = null;
    document.removeEventListener('mousemove', handleColumnResizeMove);
    document.removeEventListener('mouseup', handleColumnResizeEnd);
    document.body.style.removeProperty('cursor');
    document.body.classList.remove('select-none');
  }, [handleColumnResizeMove]);

  const startColumnResize = useCallback(
    (columnId: ServiceColumnId, clientX: number) => {
      const currentWidth = columnWidths[columnId] ?? SERVICE_COLUMN_CONFIG[columnId].defaultWidth;
      resizeStateRef.current = {
        columnId,
        startX: clientX,
        startWidth: currentWidth,
      };
      document.addEventListener('mousemove', handleColumnResizeMove);
      document.addEventListener('mouseup', handleColumnResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.classList.add('select-none');
    },
    [columnWidths, handleColumnResizeEnd, handleColumnResizeMove]
  );

  useEffect(() => {
    return () => {
      handleColumnResizeEnd();
    };
  }, [handleColumnResizeEnd]);

  const resetColumnPreferences = useCallback(() => {
    setColumnVisibility(getDefaultColumnVisibility());
    setColumnWidths(getDefaultColumnWidths());
  }, []);

  const resolveAlignmentClass = useCallback(
    (columnId: ServiceColumnId, scope: 'header' | 'cell') => {
      const align = SERVICE_COLUMN_CONFIG[columnId].align;
      if (align === 'center') {
        return 'text-center';
      }
      if (align === 'right') {
        return scope === 'header' ? 'text-right' : 'text-right';
      }
      return scope === 'header' ? 'text-left' : 'text-left';
    },
    []
  );

  const serviceTableRows = filteredEngagements.map((engagement) => {
    const client = clientsById.get(engagement.clientId);
    const company = engagement.companyId ? companiesById.get(engagement.companyId) : undefined;
    const service = servicesById.get(engagement.serviceId);
    const optionsSelected =
      service?.options.filter((option) => engagement.optionIds.includes(option.id)) ?? ([] as ServiceOption[]);
    const totals = computeEngagementTotals(engagement);
    const vatEnabledForRow = engagement.invoiceVatEnabled ?? (company?.vatEnabled ?? vatEnabled);
    const vatAmount = vatEnabledForRow ? totals.price * vatMultiplier : 0;
    const totalWithVat = totals.price + vatAmount;
    const finalTotal = totalWithVat + totals.surcharge;
    const documentNumber = getEngagementDocumentNumber(engagement);
    const kindStyle = serviceKindStyles[engagement.kind];
    const statusStyle = serviceStatusStyles[engagement.status];
    const optionsSummary =
      optionsSelected.length > 0
        ? optionsSelected.map((option) => option.label).join(' • ')
        : 'Aucune prestation sélectionnée';

    return {
      id: engagement.id,
      engagement,
      isSelected: selectedEngagementIds.includes(engagement.id),
      isActive: selectedEngagementId === engagement.id,
      kindStyle,
      statusStyle,
      documentLabel: documentLabels[engagement.kind],
      documentNumber,
      scheduledAt: formatDate(engagement.scheduledAt),
      avatarLabel: documentLabels[engagement.kind].slice(0, 2).toUpperCase(),
      clientName: client?.name ?? 'Client inconnu',
      companyName: company?.name ?? '—',
      supportType: engagement.supportType,
      supportDetail: engagement.supportDetail,
      serviceName: service?.name ?? 'Service archivé',
      optionsSummary,
      durationLabel: totals.duration ? formatDuration(totals.duration) : '—',
      amountHtLabel: formatCurrency(totals.price),
      vatLabel: vatEnabledForRow ? formatCurrency(vatAmount) : null,
      totalLabel: formatCurrency(finalTotal),
      surchargeLabel: totals.surcharge ? formatCurrency(totals.surcharge) : null,
    };
  });

  const renderDesktopActions = (engagement: Engagement) => (
    <div className="flex items-center justify-end gap-2 opacity-100 transition group-hover:translate-x-[1px] group-hover:opacity-100">
      {hasPermission('service.duplicate') && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openQuoteFromEngagement(engagement);
          }}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-purple-100 hover:text-purple-700 dark:text-slate-300 dark:hover:bg-purple-900/30 dark:hover:text-purple-200"
          title="Dupliquer"
        >
          <IconDuplicate />
        </button>
      )}
      {hasPermission('service.print') && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void handleGenerateInvoice(engagement, 'print');
          }}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-amber-100 hover:text-amber-700 dark:text-slate-300 dark:hover:bg-amber-900/30 dark:hover:text-amber-200"
          title="Imprimer"
        >
          <IconPrinter />
        </button>
      )}
      {hasPermission('service.invoice') && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void handleGenerateInvoice(engagement);
          }}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-emerald-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-200"
          title={engagement.kind === 'facture' ? 'Télécharger facture' : 'Créer facture'}
        >
          <IconReceipt />
        </button>
      )}
      {hasPermission('service.email') && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (engagement.kind === 'devis') {
              void handleGenerateQuote(engagement, 'email');
            } else {
              void handleGenerateInvoice(engagement, 'email');
            }
          }}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
          title={engagement.kind === 'devis' ? 'Envoyer devis' : 'Envoyer facture'}
        >
          <IconPaperPlane />
        </button>
      )}
    </div>
  );

  const renderMobileActions = (engagement: Engagement) => {
    const actions = [
      hasPermission('service.duplicate') && {
        key: 'duplicate',
        label: 'Dupliquer',
        onClick: () => openQuoteFromEngagement(engagement),
        className: 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-200',
        icon: <IconDuplicate />,
      },
      hasPermission('service.print') && {
        key: 'print',
        label: 'Imprimer',
        onClick: () => {
          void handleGenerateInvoice(engagement, 'print');
        },
        className: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-200',
        icon: <IconPrinter />,
      },
      hasPermission('service.invoice') && {
        key: 'invoice',
        label: engagement.kind === 'facture' ? 'Télécharger facture' : 'Créer facture',
        onClick: () => {
          void handleGenerateInvoice(engagement);
        },
        className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200',
        icon: <IconReceipt />,
      },
      hasPermission('service.email') && {
        key: 'email',
        label: engagement.kind === 'devis' ? 'Envoyer devis' : 'Envoyer facture',
        onClick: () => {
          if (engagement.kind === 'devis') {
            void handleGenerateQuote(engagement, 'email');
          } else {
            void handleGenerateInvoice(engagement, 'email');
          }
        },
        className: 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200',
        icon: <IconPaperPlane />,
      },
    ].filter(Boolean) as Array<{
      key: string;
      label: string;
      onClick: () => void;
      className: string;
      icon: JSX.Element;
    }>;

    if (!actions.length) {
      return null;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              action.onClick();
            }}
            className={clsx(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
              action.className
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    );
  };

  const renderColumnContent = useCallback(
    (columnId: ServiceColumnId, row: (typeof serviceTableRows)[number]) => {
      switch (columnId) {
        case 'document':
          return (
            <div className="space-y-1">
              <span
                className={clsx(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  row.kindStyle.className
                )}
              >
                {row.kindStyle.label}
              </span>
              <p className="truncate text-xs text-slate-600 dark:text-slate-400" title={`N° ${row.documentNumber}`}>
                N° {row.documentNumber}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">{row.scheduledAt}</p>
            </div>
          );
        case 'client':
          return (
            <div className="space-y-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={row.clientName}>
                {row.clientName}
              </p>
              <p className="truncate text-xs text-slate-600 dark:text-slate-400" title={row.companyName}>
                {row.companyName}
              </p>
            </div>
          );
        case 'support':
          return (
            <div className="space-y-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={row.supportType}>
                {row.supportType}
              </p>
              {row.supportDetail ? (
                <p className="truncate text-xs text-slate-600 dark:text-slate-400" title={row.supportDetail}>
                  {row.supportDetail}
                </p>
              ) : null}
            </div>
          );
        case 'prestations':
          return (
            <div className="space-y-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={row.serviceName}>
                {row.serviceName}
              </p>
              <p className="truncate text-xs text-slate-600 dark:text-slate-400" title={row.optionsSummary}>
                {row.optionsSummary}
              </p>
            </div>
          );
        case 'duration':
          return <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.durationLabel}</p>;
        case 'amountHt':
          return <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.amountHtLabel}</p>;
        case 'vat':
          return <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.vatLabel ?? '—'}</p>;
        case 'total':
          return (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.totalLabel}</p>
              {row.surchargeLabel ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">Dont majoration {row.surchargeLabel}</p>
              ) : null}
            </div>
          );
        case 'status':
          return (
            <span
              className={clsx(
                'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold',
                row.statusStyle.className
              )}
            >
              {row.statusStyle.label}
            </span>
          );
        case 'actions':
          return renderDesktopActions(row.engagement);
        default:
          return null;
      }
    },
    [renderDesktopActions]
  );

  return (
    <div className="dashboard-page space-y-10">
        <header className="dashboard-hero">
          <div className="dashboard-hero__content">
            <div className="dashboard-hero__intro">
              <p className="dashboard-hero__eyebrow">Suivi des prestations</p>
              <h1 className="dashboard-hero__title">Pilotez vos services au quotidien</h1>
              <p className="dashboard-hero__subtitle">
                Centralisez devis, interventions et factures pour garder une vision claire de votre activité.
              </p>
            </div>
          </div>
          <div className="dashboard-hero__glow" aria-hidden />
        </header>

        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summaryCards.map((card, index) => {
              const Icon = [ClipboardList, Euro, Clock3][index] ?? ClipboardList;
              return (
                <div key={card.label} className="dashboard-kpi group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="dashboard-kpi__eyebrow">{card.label}</p>
                      <p className="dashboard-kpi__value">{card.value}</p>
                      <p className="dashboard-kpi__description">{card.description}</p>
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

        {feedback && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2 text-xs text-primary">
            {feedback}
          </div>
        )}

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-1 items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allEngagementsSelected}
                    onChange={toggleSelectAllEngagements}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tout sélectionner</span>
                </div>
                {selectedEngagementIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 border-l border-slate-200 pl-4 dark:border-slate-700">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedEngagementIds.length} sélectionnée(s)
                    </span>
                    {hasPermission('service.print') && (
                      <Button variant="ghost" size="xs" onClick={handleBulkPrintEngagements}>
                        Imprimer
                      </Button>
                    )}
                    {hasPermission('service.email') && (
                      <Button variant="ghost" size="xs" onClick={handleBulkSendEngagements}>
                        Envoyer
                      </Button>
                    )}
                    {hasPermission('service.archive') && (
                      <>
                        <Button variant="ghost" size="xs" onClick={handleBulkArchiveEngagements} className="text-rose-600 hover:text-rose-700">
                          Archiver
                        </Button>
                        <Button variant="ghost" size="xs" onClick={handleBulkDeleteEngagements} className="text-red-600 hover:text-red-700">
                          Supprimer
                        </Button>
                      </>
                    )}
                  </div>
                )}
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
                <button
                  type="button"
                  onClick={() => setShowColumnManager((value) => !value)}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                    showColumnManager
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/40'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Colonnes
                </button>
                <button
                  type="button"
                  onClick={handleExportEngagements}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                {hasPermission('service.create') && (
                  <Button
                    onClick={() => openCreation()}
                    variant="primary"
                    size="md"
                  >
                    <Plus className="h-4 w-4" />
                    Nouveau service
                  </Button>
                )}
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Statut</label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as EngagementStatus | 'Tous')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="Tous">Tous</option>
                    <option value="brouillon">Brouillon</option>
                    <option value="envoyé">Envoyé</option>
                    <option value="planifié">Planifié</option>
                    <option value="réalisé">Réalisé</option>
                    <option value="annulé">Annulé</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Type</label>
                  <select
                    value={kindFilter}
                    onChange={(event) => setKindFilter(event.target.value as EngagementKind | 'Tous')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="Tous">Tous</option>
                    <option value="service">Service</option>
                    <option value="devis">Devis</option>
                    <option value="facture">Facture</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Entreprise</label>
                  <select
                    value={companyFilter}
                    onChange={(event) => setCompanyFilter(event.target.value as 'Toutes' | string)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="Toutes">Toutes</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
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
                    onClick={() => {
                      setStatusFilter('Tous');
                      setKindFilter('Tous');
                      setCompanyFilter('Toutes');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    <X className="h-3.5 w-3.5" />
                    Effacer les filtres
                  </button>
                )}
              </div>
            </div>
          )}
          {showColumnManager && (
            <div className="space-y-4 border-t border-slate-200 pt-6 transition-colors dark:border-slate-800">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    Colonnes visibles
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Activez ou masquez les colonnes du tableau services selon vos besoins.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetColumnPreferences}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Réinitialiser
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowColumnManager(false)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <X className="h-3.5 w-3.5" />
                    Fermer
                  </button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {SERVICE_COLUMN_ORDER.map((columnId) => {
                  const config = SERVICE_COLUMN_CONFIG[columnId];
                  const isVatColumn = columnId === 'vat';
                  const isDisabled = isVatColumn && !showVatColumn;
                  const isChecked =
                    columnVisibility[columnId] && (!isVatColumn || (isVatColumn && showVatColumn));
                  return (
                    <label
                      key={columnId}
                      className={clsx(
                        'flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition',
                        isDisabled
                          ? 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:bg-blue-900/20'
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="font-semibold">{config.label}</span>
                        {isDisabled && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            Non disponible (TVA désactivée)
                          </span>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => (!isDisabled ? toggleColumnVisibility(columnId) : null)}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{visibleColumns.length} colonne(s) affichée(s)</span>
                <span>
                  Largeur personnalisée enregistrée pour {Object.keys(columnWidths).length} colonne(s)
                </span>
              </div>
            </div>
          )}
        </section>

        <div ref={listSectionRef} className="space-y-4">

          <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)] lg:block">
            <div className="overflow-x-auto rounded-2xl">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                  <tr>
                    <th className="w-12 px-4 py-4" />
                    {visibleColumns.map((columnId) => {
                      const config = SERVICE_COLUMN_CONFIG[columnId];
                      const headerLabel = columnId === 'total' ? totalColumnLabel : config.label;
                      return (
                        <th
                          key={`service-head-${columnId}`}
                          className={clsx(
                            'px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300',
                            resolveAlignmentClass(columnId, 'header')
                          )}
                          style={{ minWidth: columnWidths[columnId], width: columnWidths[columnId] }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span>{headerLabel}</span>
                            {config.resizable ? (
                              <button
                                type="button"
                                className="group -mr-2 flex h-7 w-4 cursor-col-resize items-center justify-center rounded-full border border-transparent transition hover:border-slate-300/70 hover:bg-slate-200/60 dark:hover:border-slate-600/60 dark:hover:bg-slate-700/50"
                                onMouseDown={(event) => {
                                  if (event.button !== 0) {
                                    return;
                                  }
                                  event.preventDefault();
                                  startColumnResize(columnId, event.clientX);
                                }}
                                onDoubleClick={(event) => {
                                  event.preventDefault();
                                  updateColumnWidth(columnId, SERVICE_COLUMN_CONFIG[columnId].defaultWidth);
                                }}
                                title="Glissez pour redimensionner · Double-cliquez pour réinitialiser"
                              >
                                <span className="h-4 w-[3px] rounded-full bg-slate-400/70 transition group-hover:bg-blue-500 dark:bg-slate-500/70" />
                              </button>
                            ) : null}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceTableRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => {
                        setCreationMode(null);
                        setSelectedEngagementId(row.id);
                        setEditDraft(null);
                        const engagement = engagements.find((e) => e.id === row.id);
                        if (engagement) {
                          setEditModalDraft(buildDraftFromEngagement(engagement));
                          setEditModalError(null);
                          setShowEditServiceModal(true);
                        }
                      }}
                      className={clsx(
                        'group cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/5',
                        row.isSelected && 'bg-blue-50/50 dark:bg-blue-500/10',
                        row.isActive && 'ring-2 ring-primary/30'
                      )}
                    >
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          checked={row.isSelected}
                          onChange={(event) => {
                            event.stopPropagation();
                            toggleEngagementSelection(row.id);
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      {visibleColumns.map((columnId) => (
                        <td
                          key={`${row.id}-${columnId}`}
                          className={clsx('px-6 py-5 align-middle', resolveAlignmentClass(columnId, 'cell'))}
                          style={{ minWidth: columnWidths[columnId], width: columnWidths[columnId] }}
                        >
                          {renderColumnContent(columnId, row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 lg:hidden">
            {serviceTableRows.map((row) => (
              <div
                key={row.id}
                onClick={() => {
                  setCreationMode(null);
                  setSelectedEngagementId(row.id);
                  setEditDraft(null);
                  const engagement = engagements.find((e) => e.id === row.id);
                  if (engagement) {
                    setEditModalDraft(buildDraftFromEngagement(engagement));
                    setEditModalError(null);
                    setShowEditServiceModal(true);
                  }
                }}
                className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors cursor-pointer dark:border-[var(--border)] dark:bg-[var(--surface)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={row.isSelected}
                      onChange={(event) => {
                        event.stopPropagation();
                        toggleEngagementSelection(row.id);
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-semibold text-white shadow-md">
                      {row.avatarLabel}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{row.documentLabel}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{row.documentNumber}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">{row.scheduledAt}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                            row.kindStyle.className
                          )}
                        >
                          {row.kindStyle.label}
                        </span>
                        {columnVisibility.status && (
                          <span
                            className={clsx(
                              'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                              row.statusStyle.className
                            )}
                          >
                            {row.statusStyle.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  {columnVisibility.client && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{row.clientName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{row.companyName}</p>
                    </div>
                  )}
                  {columnVisibility.support && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Support</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{row.supportType}</p>
                      {row.supportDetail ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{row.supportDetail}</p>
                      ) : null}
                    </div>
                  )}
                  {columnVisibility.prestations && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prestations</p>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{row.serviceName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{row.optionsSummary}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {columnVisibility.duration && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Durée</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{row.durationLabel}</p>
                      </div>
                    )}
                    {columnVisibility.amountHt && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Montant HT</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{row.amountHtLabel}</p>
                      </div>
                    )}
                    {columnVisibility.vat && row.vatLabel && showVatColumn && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">TVA</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{row.vatLabel}</p>
                      </div>
                    )}
                    {columnVisibility.total && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{totalColumnLabel}</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{row.totalLabel}</p>
                        {row.surchargeLabel ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">Majoration {row.surchargeLabel}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {columnVisibility.actions ? renderMobileActions(row.engagement) : null}
              </div>
            ))}
          </div>

          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-muted/80">
            {serviceTableRows.length} prestation(s)
          </p>

          {serviceTableRows.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <span className="text-2xl text-slate-400 dark:text-slate-500">📄</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Aucune prestation trouvée</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ajustez votre recherche ou vos filtres pour retrouver vos services.
              </p>
            </div>
          )}
        </div>

        {creationMode &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4 py-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-service-title"
              onClick={closeCreation}
            >
              <div
                className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 transition dark:border-slate-700 dark:bg-slate-900"
                onClick={(event) => event.stopPropagation()}
              >
                <form
                  onSubmit={async (event) => {
                    event.preventDefault();
                    await handleCreateService();
                  }}
                  className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
                >
                  {/* En-tête avec titre et bouton de fermeture */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
                        NOUVEAU SERVICE
                      </span>
                      <h2 id="create-service-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Nouveau service
                      </h2>
                      <p className="max-w-lg text-xs text-slate-500 dark:text-slate-400">
                        Sélectionnez client, prestations et support pour créer une nouvelle prestation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeCreation}
                      className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      aria-label="Fermer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Contenu principal du formulaire */}
                  <div className="space-y-4">
                    {/* 1. Informations du client et de l'entreprise */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="mb-4">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">1. Informations</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Client et entreprise</p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="create-client">
                            Client
                          </label>
                          <select
                            id="create-client"
                            value={creationDraft.clientId}
                            onChange={(event) => setCreationDraft((draft) => ({ ...draft, clientId: event.target.value }))}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          >
                            <option value="">Sélectionner un client…</option>
                            {clients.map((client) => (
                              <option key={client.id} value={client.id}>
                                {client.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setIsAddingClient((value) => !value)}
                            className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {isAddingClient ? 'Annuler l\'ajout' : '+ Ajouter un client'}
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="create-company">
                            Entreprise
                          </label>
                          <select
                            id="create-company"
                            value={creationDraft.companyId}
                            onChange={(event) =>
                              setCreationDraft((draft) => ({ ...draft, companyId: event.target.value as string | '' }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          >
                            <option value="">Sélectionner une entreprise…</option>
                            {companies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {isAddingClient && (
                        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                          <h4 className="mb-3 text-xs font-medium text-slate-900 dark:text-slate-100">Nouveau client</h4>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <input
                              required
                              value={quickClientDraft.name}
                              onChange={(event) =>
                                setQuickClientDraft((draft) => ({ ...draft, name: event.target.value }))
                              }
                              placeholder="Nom de l'organisation"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <input
                              required
                              value={quickClientDraft.siret}
                              onChange={(event) =>
                                setQuickClientDraft((draft) => ({ ...draft, siret: event.target.value }))
                              }
                              placeholder="SIRET"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <input
                              value={quickClientDraft.email}
                              onChange={(event) =>
                                setQuickClientDraft((draft) => ({ ...draft, email: event.target.value }))
                              }
                              placeholder="Email"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <input
                              value={quickClientDraft.phone}
                              onChange={(event) =>
                                setQuickClientDraft((draft) => ({ ...draft, phone: event.target.value }))
                              }
                              placeholder="Téléphone"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <input
                              value={quickClientDraft.address}
                              onChange={(event) =>
                                setQuickClientDraft((draft) => ({ ...draft, address: event.target.value }))
                              }
                              placeholder="Adresse"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <input
                              value={quickClientDraft.city}
                              onChange={(event) =>
                                setQuickClientDraft((draft) => ({ ...draft, city: event.target.value }))
                              }
                              placeholder="Ville"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <div className="col-span-full">
                              <div className="flex gap-4">
                                {(['Actif', 'Prospect'] as Client['status'][]).map((status) => (
                                  <label key={status} className="flex items-center gap-2 text-xs">
                                    <input
                                      type="radio"
                                      name="client-status"
                                      value={status}
                                      checked={quickClientDraft.status === status}
                                      onChange={(event) =>
                                        setQuickClientDraft((draft) => ({
                                          ...draft,
                                          status: event.target.value as Client['status'],
                                        }))
                                      }
                                      className="h-3 w-3 text-blue-600 focus:ring-blue-500/20"
                                    />
                                    {status}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="col-span-full flex justify-end">
                              <Button type="button" size="sm" onClick={handleQuickClientSubmit}>
                                Enregistrer
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. La prestation choisie */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="mb-4">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">2. Prestation</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Type, produit et options</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="create-service-category">
                              Type de prestation
                            </label>
                            <select
                              id="create-service-category"
                              value={creationSelectedService?.category || ''}
                              onChange={(event) => {
                                const category = event.target.value as ServiceCategory | '';
                                if (category && creationSelectedService?.category !== category) {
                                  const firstServiceInCategory = services.find((s) => s.category === category && s.active);
                                  if (firstServiceInCategory) {
                                    setCreationDraft((draft) => ({
                                      ...draft,
                                      serviceId: firstServiceInCategory.id,
                                      optionIds: [],
                                      optionOverrides: {},
                                    }));
                                  }
                                }
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            >
                              <option value="">Tous les types</option>
                              <option value="Voiture">Voiture</option>
                              <option value="Canapé">Canapé</option>
                              <option value="Textile">Textile</option>
                              <option value="Autre">Autre</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="create-service">
                              Produit / Service *
                            </label>
                            <select
                              id="create-service"
                              value={creationDraft.serviceId}
                              onChange={(event) =>
                                setCreationDraft((draft) => ({
                                  ...draft,
                                  serviceId: event.target.value,
                                  optionIds: [],
                                  optionOverrides: {},
                                }))
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              required
                            >
                              <option value="">Sélectionner un produit…</option>
                              {(() => {
                                const category = creationSelectedService?.category;
                                const filteredServices = category 
                                  ? services.filter((s) => s.category === category && s.active)
                                  : services.filter((s) => s.active);
                                return filteredServices.map((service) => (
                                  <option key={service.id} value={service.id}>
                                    {service.name}
                                  </option>
                                ));
                              })()}
                            </select>
                          </div>
                        </div>
                      
                        {/* Options du service */}
                        {creationSelectedService && (
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-medium text-slate-900 dark:text-slate-100">Options</h4>
                              <div className="text-right">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {creationTotals.duration ? formatDuration(creationTotals.duration) : '—'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {creationVatEnabled
                                    ? `${formatCurrency(creationTotals.price)} HT · ${formatCurrency(creationTotalTtc)} TTC`
                                    : `${formatCurrency(creationTotals.price)} HT`}
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {creationSelectedService.options.map((option) => {
                                const selected = creationDraft.optionIds.includes(option.id);
                                const override = resolveOptionOverride(option, creationDraft.optionOverrides[option.id]);
                                return (
                                  <div
                                    key={option.id}
                                    className={clsx(
                                      'rounded-lg border p-3 transition-all dark:border-slate-700',
                                      selected
                                        ? 'border-blue-500/30 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:bg-slate-800/50'
                                    )}
                                  >
                                    <label className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-2">
                                        <input
                                          type="checkbox"
                                          checked={selected}
                                          onChange={() => toggleCreationOption(option.id)}
                                          className="mt-0.5 h-3 w-3 text-blue-600 focus:ring-blue-500/20"
                                        />
                                        <div>
                                          <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{option.label}</span>
                                          {option.description && (
                                            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{option.description}</p>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                                        <p>{formatCurrency(option.unitPriceHT)} HT</p>
                                        <p>{formatDuration(option.defaultDurationMin)}</p>
                                      </div>
                                    </label>
                                    
                                    {selected && (
                                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                        <div>
                                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                                            Quantité
                                          </label>
                                          <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={override.quantity}
                                            onChange={(event) =>
                                              updateCreationOverride(option.id, {
                                                quantity: Number.parseFloat(event.target.value) || 1,
                                              })
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                          />
                                        </div>
                                        <div>
                                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                                            Prix HT
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={override.unitPriceHT}
                                            onChange={(event) =>
                                              updateCreationOverride(option.id, {
                                                unitPriceHT: Number.parseFloat(event.target.value) || 0,
                                              })
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                          />
                                        </div>
                                        <div>
                                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                                            Durée (min)
                                          </label>
                                          <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={override.durationMin}
                                            onChange={(event) =>
                                              updateCreationOverride(option.id, {
                                                durationMin: Number.parseInt(event.target.value, 10) || 0,
                                              })
                                            }
                                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Support */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="mb-4">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">3. Support</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Type et détail du support</p>
                      </div>
                      
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="create-support-type">
                            Type de support *
                          </label>
                          <select
                            id="create-support-type"
                            value={creationDraft.supportType}
                            onChange={(event) =>
                              setCreationDraft((draft) => ({ ...draft, supportType: event.target.value as SupportType }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            required
                          >
                            <option value="Voiture">Voiture</option>
                            <option value="Canapé">Canapé</option>
                            <option value="Textile">Textile</option>
                            <option value="Autre">Autre</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="create-support-detail">
                            Détail du support
                          </label>
                          <input
                            id="create-support-detail"
                            type="text"
                            value={creationDraft.supportDetail}
                            onChange={(event) =>
                              setCreationDraft((draft) => ({ ...draft, supportDetail: event.target.value }))
                            }
                            placeholder="Ex : Modèle, couleur..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 4. Planning et date */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="mb-4">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">4. Planning</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Date et horaire</p>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Durée estimée */}
                        {estimatedDuration && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-xs font-medium text-slate-900 dark:text-slate-100">Durée estimée</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Selon les options sélectionnées</p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  {Math.floor(estimatedDuration / 60)}h {estimatedDuration % 60}min
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Planning, date et heure */}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              Planning
                            </label>
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => setCreationDraft(prev => ({ ...prev, planningUser: null }))}
                                className={clsx(
                                  'w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                                  creationDraft.planningUser === null
                                    ? 'border-blue-600 bg-blue-600 text-white dark:bg-blue-500'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                )}
                              >
                                Tous les plannings
                              </button>
                              <button
                                type="button"
                                onClick={() => setCreationDraft(prev => ({ ...prev, planningUser: 'clement' }))}
                                className={clsx(
                                  'w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                                  creationDraft.planningUser === 'clement'
                                    ? 'border-blue-600 bg-blue-600 text-white dark:bg-blue-500'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                )}
                              >
                                Planning Clément
                              </button>
                              <button
                                type="button"
                                onClick={() => setCreationDraft(prev => ({ ...prev, planningUser: 'adrien' }))}
                                className={clsx(
                                  'w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                                  creationDraft.planningUser === 'adrien'
                                    ? 'border-blue-600 bg-blue-600 text-white dark:bg-blue-500'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                )}
                              >
                                Planning Adrien
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="create-date">
                              Date prévue *
                            </label>
                            <input
                              id="create-date"
                              type="date"
                              value={creationDraft.scheduledAt}
                              onChange={(event) =>
                                setCreationDraft((draft) => ({ ...draft, scheduledAt: event.target.value }))
                              }
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              required
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              Horaires disponibles
                            </label>
                            {calendarLoading ? (
                              <div className="text-xs text-slate-500 dark:text-slate-400">Chargement...</div>
                            ) : availableTimeSlots.length > 0 ? (
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {availableTimeSlots.map((slot, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    onClick={() => setCreationDraft(prev => ({ ...prev, startTime: slot.start }))}
                                    className={clsx(
                                      'w-full rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                                      creationDraft.startTime === slot.start
                                        ? 'border-blue-600 bg-blue-600 text-white dark:bg-blue-500'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    )}
                                  >
                                    {slot.label}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {creationDraft.scheduledAt && estimatedDuration 
                                  ? 'Aucun créneau disponible pour cette durée' 
                                  : 'Sélectionnez une date et un service'
                                }
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Affichage de l'heure de fin calculée */}
                        {creationDraft.startTime && estimatedDuration && (
                          <div className="rounded-lg border border-blue-500/20 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-900/20">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Planning estimé</span>
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                {creationDraft.startTime} - {(() => {
                                  const [hours, minutes] = creationDraft.startTime.split(':').map(Number);
                                  const startMinutes = hours * 60 + minutes;
                                  const endMinutes = startMinutes + estimatedDuration;
                                  const endHours = Math.floor(endMinutes / 60);
                                  const endMins = endMinutes % 60;
                                  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
                                })()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 5. Statut et contacts */}
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="mb-4">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">5. Informations complémentaires</h3>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Statut, contacts et majoration</p>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Statut */}
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="create-status">
                            Statut *
                          </label>
                          <select
                            id="create-status"
                            value={creationDraft.status}
                            onChange={(event) =>
                              setCreationDraft((draft) => ({ ...draft, status: event.target.value as EngagementStatus }))
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            required
                          >
                            <option value="brouillon">Brouillon</option>
                            <option value="envoyé">Envoyé</option>
                            <option value="planifié">Planifié</option>
                            <option value="réalisé">Réalisé</option>
                            <option value="annulé">Annulé</option>
                          </select>
                        </div>

                        {/* Contacts destinataires */}
                        {creationClient && (
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              Contacts destinataires *
                            </label>
                            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                              {creationClient.contacts.filter((contact) => contact.active).length > 0 ? (
                                creationClient.contacts
                                  .filter((contact) => contact.active)
                                  .map((contact) => {
                                    const fullName = `${contact.firstName} ${contact.lastName}`.trim();
                                    const isChecked = creationDraft.contactIds.includes(contact.id);
                                    return (
                                      <label
                                        key={contact.id}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800"
                                      >
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                          <span className="font-medium text-slate-900 dark:text-slate-100">{fullName || contact.email}</span>
                                          {contact.isBillingDefault && (
                                            <span className="text-[10px] uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Facturation par défaut</span>
                                          )}
                                          {contact.roles.length > 0 && (
                                            <span className="flex flex-wrap gap-1 text-xs text-slate-500 dark:text-slate-400">
                                              {contact.roles.join(', ')}
                                            </span>
                                          )}
                                          <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {contact.email} {contact.mobile ? `• ${contact.mobile}` : ''}
                                          </span>
                                        </div>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => toggleCreationContact(contact.id)}
                                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                        />
                                      </label>
                                    );
                                  })
                              ) : (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Aucun contact actif pour ce client. Ajoutez un contact dans la gestion des clients.
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Majoration */}
                        <div>
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="create-additional-charge">
                            Majoration (€)
                          </label>
                          <input
                            id="create-additional-charge"
                            type="number"
                            step="0.01"
                            min="0"
                            value={creationDraft.additionalCharge}
                            onChange={(event) => {
                              const value = Number.parseFloat(event.target.value) || 0;
                              setCreationDraft((draft) => ({ ...draft, additionalCharge: Math.max(0, value) }));
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Résumé des totaux */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Résumé</p>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                {creationTotals.duration ? `Durée : ${formatDuration(creationTotals.duration)}` : 'Aucune durée estimée'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                {creationVatEnabled
                                  ? `${formatCurrency(creationTotals.price)} HT · ${formatCurrency(creationTotalTtc)} TTC`
                                  : `${formatCurrency(creationTotals.price)} HT`}
                              </p>
                              {creationTotals.surcharge > 0 && (
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  Dont majoration : {formatCurrency(creationTotals.surcharge)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
              
                  </div>

                  {/* Pied de page avec boutons d'action */}
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={closeCreation}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      <Plus className="h-3 w-3" />
                      Créer le service
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}


      {/* Modale de modification de service */}
      {showEditServiceModal &&
        editModalDraft &&
        selectedEngagement &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4 py-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-service-modal-title"
            onClick={closeEditServiceModal}
          >
            <div
              className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 transition dark:border-slate-700 dark:bg-slate-900"
              onClick={(event) => event.stopPropagation()}
            >
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  await handleUpdateService();
                }}
                className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
              >
                {/* En-tête avec titre et bouton de fermeture */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
                      MODIFIER UN SERVICE
                    </span>
                    <h2 id="edit-service-modal-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {getEngagementDocumentNumber(selectedEngagement)}
                    </h2>
                    <p className="max-w-lg text-xs text-slate-500 dark:text-slate-400">
                      Modifiez les informations du service. Les modifications seront enregistrées immédiatement.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeEditServiceModal}
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Contenu principal du formulaire */}
                <div className="space-y-4">
                  {editModalError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-100">
                      {editModalError}
                    </div>
                  )}

                  {/* 1. Client & Entreprise */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-modal-client">
                        Client *
                      </label>
                      <select
                        id="edit-modal-client"
                        value={editModalDraft.clientId}
                        onChange={(event) =>
                          setEditModalDraft((draft) => {
                            if (!draft) return draft;
                            const newClientId = event.target.value;
                            const newClient = clientsById.get(newClientId);
                            const defaultContactId =
                              newClient?.contacts.find((contact) => contact.active && contact.isBillingDefault)?.id ??
                              newClient?.contacts.find((contact) => contact.active)?.id;
                            return {
                              ...draft,
                              clientId: newClientId,
                              contactIds: defaultContactId ? [defaultContactId] : [],
                            };
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      >
                        <option value="">Sélectionner un client…</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-modal-company">
                        Entreprise *
                      </label>
                      <select
                        id="edit-modal-company"
                        value={editModalDraft.companyId}
                        onChange={(event) =>
                          setEditModalDraft((draft) => {
                            if (!draft) return draft;
                            return { ...draft, companyId: event.target.value as string | '' };
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      >
                        <option value="">Sélectionner une entreprise…</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2. Support (Type de support + Détail) */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-modal-support-type">
                        Type de support *
                      </label>
                      <select
                        id="edit-modal-support-type"
                        value={editModalDraft.supportType}
                        onChange={(event) =>
                          setEditModalDraft((draft) => {
                            if (!draft) return draft;
                            return { ...draft, supportType: event.target.value as SupportType };
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      >
                        <option value="Voiture">Voiture</option>
                        <option value="Canapé">Canapé</option>
                        <option value="Textile">Textile</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-modal-support-detail">
                        Détail du support
                      </label>
                      <input
                        id="edit-modal-support-detail"
                        type="text"
                        value={editModalDraft.supportDetail}
                        onChange={(event) =>
                          setEditModalDraft((draft) => {
                            if (!draft) return draft;
                            return { ...draft, supportDetail: event.target.value };
                          })
                        }
                        placeholder="Ex : Modèle, couleur..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* 3. Type de prestation + Produit/Service */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-modal-service-category">
                        Type de prestation
                      </label>
                      <select
                        id="edit-modal-service-category"
                        value={(() => {
                          const service = editModalDraft.serviceId ? servicesById.get(editModalDraft.serviceId) : null;
                          return service?.category || '';
                        })()}
                        onChange={(event) => {
                          const category = event.target.value as ServiceCategory | '';
                          if (category) {
                            const firstServiceInCategory = services.find((s) => s.category === category && s.active);
                            if (firstServiceInCategory) {
                              setEditModalDraft((draft) => {
                                if (!draft) return draft;
                                const allowed = new Set(firstServiceInCategory.options.map((option) => option.id));
                                const filtered = draft.optionIds.filter((id) => allowed.has(id));
                                return {
                                  ...draft,
                                  serviceId: firstServiceInCategory.id,
                                  optionIds: filtered,
                                  optionOverrides: sanitizeDraftOverrides(filtered, draft.optionOverrides),
                                };
                              });
                            }
                          }
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="">Tous les types</option>
                        <option value="Voiture">Voiture</option>
                        <option value="Canapé">Canapé</option>
                        <option value="Textile">Textile</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-modal-service">
                        Produit / Service *
                      </label>
                      <select
                        id="edit-modal-service"
                        value={editModalDraft.serviceId}
                        onChange={(event) => {
                          setEditModalDraft((draft) => {
                            if (!draft) return draft;
                            const newServiceId = event.target.value;
                            const service = servicesById.get(newServiceId);
                            if (!service) return draft;
                            const allowed = new Set(service.options.map((option) => option.id));
                            const filtered = draft.optionIds.filter((id) => allowed.has(id));
                            return {
                              ...draft,
                              serviceId: newServiceId,
                              optionIds: filtered,
                              optionOverrides: sanitizeDraftOverrides(filtered, draft.optionOverrides),
                            };
                          });
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      >
                        <option value="">Sélectionner un produit…</option>
                        {(() => {
                          const currentService = editModalDraft.serviceId ? servicesById.get(editModalDraft.serviceId) : null;
                          const category = currentService?.category;
                          const filteredServices = category 
                            ? services.filter((s) => s.category === category && s.active)
                            : services.filter((s) => s.active);
                          return filteredServices.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.name}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>

                  {/* 4. Prestations (options avec checkboxes) */}
                  {(() => {
                    const editModalSelectedService = editModalDraft.serviceId ? servicesById.get(editModalDraft.serviceId) : null;
                    return editModalSelectedService && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                            Prestations
                          </label>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {(() => {
                                const totalDuration = editModalDraft.optionIds.reduce((total, optionId) => {
                                  const option = editModalSelectedService.options.find(opt => opt.id === optionId);
                                  if (!option) return total;
                                  const override = editModalDraft.optionOverrides[optionId];
                                  const duration = override?.durationMin ?? option.defaultDurationMin ?? 0;
                                  return total + duration;
                                }, 0);
                                return totalDuration ? formatDuration(totalDuration) : '—';
                              })()}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {(() => {
                                const totalPrice = editModalDraft.optionIds.reduce((total, optionId) => {
                                  const option = editModalSelectedService.options.find(opt => opt.id === optionId);
                                  if (!option) return total;
                                  const override = editModalDraft.optionOverrides[optionId];
                                  const price = override?.unitPriceHT ?? option.unitPriceHT ?? 0;
                                  const quantity = override?.quantity ?? 1;
                                  return total + (price * quantity);
                                }, 0);
                                return formatCurrency(totalPrice);
                              })()} HT
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {editModalSelectedService.options.map((option) => {
                            const selected = editModalDraft.optionIds.includes(option.id);
                            const override = resolveOptionOverride(option, editModalDraft.optionOverrides[option.id]);
                            return (
                              <div
                                key={option.id}
                                className={clsx(
                                  'rounded-lg border p-3 transition-all dark:border-slate-700',
                                  selected
                                    ? 'border-blue-500/30 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:bg-slate-800/50'
                                )}
                              >
                                <label className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() => {
                                        setEditModalDraft((draft) => {
                                          if (!draft) return draft;
                                          const currentIds = draft.optionIds;
                                          const nextIds = currentIds.includes(option.id)
                                            ? currentIds.filter((id) => id !== option.id)
                                            : [...currentIds, option.id];
                                          return { ...draft, optionIds: nextIds };
                                        });
                                      }}
                                      className="mt-0.5 h-3 w-3 text-blue-600 focus:ring-blue-500/20"
                                    />
                                    <div>
                                      <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{option.label}</span>
                                      {option.description && (
                                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{option.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                                    <p>{formatCurrency(option.unitPriceHT)} HT</p>
                                    <p>{formatDuration(option.defaultDurationMin)}</p>
                                  </div>
                                </label>
                                
                                {selected && (
                                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                    <div>
                                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                                        Quantité
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={override.quantity}
                                        onChange={(event) => {
                                          setEditModalDraft((draft) => {
                                            if (!draft) return draft;
                                            return {
                                              ...draft,
                                              optionOverrides: {
                                                ...draft.optionOverrides,
                                                [option.id]: {
                                                  ...draft.optionOverrides[option.id],
                                                  quantity: Number.parseFloat(event.target.value) || 1,
                                                },
                                              },
                                            };
                                          });
                                        }}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                                        Prix HT
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={override.unitPriceHT}
                                        onChange={(event) => {
                                          setEditModalDraft((draft) => {
                                            if (!draft) return draft;
                                            return {
                                              ...draft,
                                              optionOverrides: {
                                                ...draft.optionOverrides,
                                                [option.id]: {
                                                  ...draft.optionOverrides[option.id],
                                                  unitPriceHT: Number.parseFloat(event.target.value) || 0,
                                                },
                                              },
                                            };
                                          });
                                        }}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                                        Durée (min)
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={override.durationMin}
                                        onChange={(event) => {
                                          setEditModalDraft((draft) => {
                                            if (!draft) return draft;
                                            return {
                                              ...draft,
                                              optionOverrides: {
                                                ...draft.optionOverrides,
                                                [option.id]: {
                                                  ...draft.optionOverrides[option.id],
                                                  durationMin: Number.parseInt(event.target.value, 10) || 0,
                                                },
                                              },
                                            };
                                          });
                                        }}
                                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 5. Date prévue + Statut + Type de document */}
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-modal-date">
                        Date prévue *
                      </label>
                      <input
                        id="edit-modal-date"
                        type="date"
                        value={editModalDraft.scheduledAt}
                        onChange={(event) =>
                          setEditModalDraft((draft) => {
                            if (!draft) return draft;
                            return { ...draft, scheduledAt: event.target.value };
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-modal-status">
                        Statut *
                      </label>
                      <select
                        id="edit-modal-status"
                        value={editModalDraft.status}
                        onChange={(event) =>
                          setEditModalDraft((draft) => {
                            if (!draft) return draft;
                            return { ...draft, status: event.target.value as EngagementStatus };
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      >
                        <option value="brouillon">Brouillon</option>
                        <option value="envoyé">Envoyé</option>
                        <option value="planifié">Planifié</option>
                        <option value="réalisé">Réalisé</option>
                        <option value="annulé">Annulé</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-modal-kind">
                        Type de document *
                      </label>
                      <select
                        id="edit-modal-kind"
                        value={editModalDraft.kind}
                        onChange={(event) =>
                          setEditModalDraft((draft) => {
                            if (!draft) return draft;
                            return { ...draft, kind: event.target.value as EngagementKind };
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      >
                        <option value="service">Service</option>
                        <option value="devis">Devis</option>
                        <option value="facture">Facture</option>
                      </select>
                    </div>
                  </div>

                  {/* 6. Contacts destinataires */}
                  {editModalDraft.clientId && (() => {
                    const editModalClient = clientsById.get(editModalDraft.clientId) ?? null;
                    return editModalClient && (
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                          Contacts destinataires *
                        </label>
                        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                          {editModalClient.contacts.filter((contact) => contact.active).length > 0 ? (
                            editModalClient.contacts
                              .filter((contact) => contact.active)
                              .map((contact) => {
                                const fullName = `${contact.firstName} ${contact.lastName}`.trim();
                                const isChecked = editModalDraft.contactIds.includes(contact.id);
                                return (
                                  <label
                                    key={contact.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800"
                                  >
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <span className="font-medium text-slate-900 dark:text-slate-100">{fullName || contact.email}</span>
                                      {contact.isBillingDefault && (
                                        <span className="text-[10px] uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Facturation par défaut</span>
                                      )}
                                      {contact.roles.length > 0 && (
                                        <span className="flex flex-wrap gap-1 text-xs text-slate-500 dark:text-slate-400">
                                          {contact.roles.join(', ')}
                                        </span>
                                      )}
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {contact.email} {contact.mobile ? `• ${contact.mobile}` : ''}
                                      </span>
                                    </div>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setEditModalDraft((draft) => {
                                          if (!draft) return draft;
                                          const currentIds = draft.contactIds;
                                          const nextIds = currentIds.includes(contact.id)
                                            ? currentIds.filter((id) => id !== contact.id)
                                            : [...currentIds, contact.id];
                                          return { ...draft, contactIds: nextIds };
                                        });
                                      }}
                                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                    />
                                  </label>
                                );
                              })
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Aucun contact actif pour ce client. Ajoutez un contact dans la gestion des clients.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 7. Majoration */}
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="edit-modal-additional-charge">
                      Majoration (€)
                    </label>
                    <input
                      id="edit-modal-additional-charge"
                      type="number"
                      step="0.01"
                      min="0"
                      value={editModalDraft.additionalCharge}
                      onChange={(event) =>
                        setEditModalDraft((draft) => {
                          if (!draft) return draft;
                          const value = Number.parseFloat(event.target.value) || 0;
                          return { ...draft, additionalCharge: Math.max(0, value) };
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Pied de page avec boutons d'action */}
                <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={closeEditServiceModal}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    Enregistrer
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

export default ServicePage;
