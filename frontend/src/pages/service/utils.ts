import { format as formatDateToken } from 'date-fns';
import type {
  Client,
  Company,
  Engagement,
  EngagementKind,
  EngagementOptionOverride,
  EngagementStatus,
  Service,
  ServiceOption,
} from '../../store/useAppData';
import type { EngagementDraft, OptionOverrideResolved } from './types';
import { CalendarEventService } from '../../lib/calendarEventService';

// Fonction pour créer un événement Google Calendar
export const createCalendarEvent = async (
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

export const sanitizeDraftOverrides = (
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

export const resolveOptionOverride = (
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

export const toLocalInputValue = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const fromLocalInputValue = (value: string) => {
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

export const buildInitialDraft = (
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
  assignedUserId: '', // Collaborateur obligatoire pour le planning
  assignedUserIds: [], // Collaborateurs assignés au devis/service
});

export const buildDraftFromEngagement = (engagement: Engagement): EngagementDraft => {
  // Vérifier si la planification est activée : scheduledAt doit exister ET planningUser ou startTime doivent être définis
  const hasPlanningUser = (engagement as any).planningUser && (engagement as any).planningUser.trim() !== '';
  const hasStartTime = (engagement as any).startTime && (engagement as any).startTime.trim() !== '';
  const hasPlanning = engagement.scheduledAt && engagement.scheduledAt.trim() !== '' && (hasPlanningUser || hasStartTime);
  
  // Si la planification n'est pas activée, scheduledAt doit être vide dans le draft
  const scheduledAtValue = hasPlanning ? toLocalInputValue(engagement.scheduledAt) : '';
  
  const draft: EngagementDraft = {
  clientId: engagement.clientId,
  companyId: engagement.companyId || '',
  scheduledAt: scheduledAtValue,
  serviceId: engagement.serviceId,
  optionIds: engagement.optionIds,
  optionOverrides: sanitizeDraftOverrides(engagement.optionIds, engagement.optionOverrides),
  status: engagement.status,
  kind: engagement.kind,
  supportType: engagement.supportType,
  supportDetail: engagement.supportDetail,
  additionalCharge: engagement.additionalCharge,
  contactIds: [...engagement.contactIds],
  // Planning : si pas de planification, mettre à null/vide
  planningUser: hasPlanning && hasPlanningUser
    ? (engagement as any).planningUser 
    : null,
  startTime: hasPlanning && hasStartTime
    ? (engagement as any).startTime 
    : '',
  assignedUserId: engagement.assignedUserIds && engagement.assignedUserIds.length > 0 
    ? engagement.assignedUserIds[0] 
    : '',
  // Charger tous les collaborateurs assignés
  assignedUserIds: engagement.assignedUserIds && engagement.assignedUserIds.length > 0
    ? [...engagement.assignedUserIds]
    : [],
  };
  
  // Ajouter le nom du devis s'il existe
  if ((engagement as any).quoteName) {
    (draft as any).quoteName = (engagement as any).quoteName;
  }
  
  // Inclure TOUTES les données mobile et catégories dans le draft
  if ((engagement as any).mainCategoryId) {
    (draft as any).mainCategoryId = (engagement as any).mainCategoryId;
  }
  if ((engagement as any).subCategoryId) {
    (draft as any).subCategoryId = (engagement as any).subCategoryId;
  }
  if (engagement.mobileDurationMinutes !== null && engagement.mobileDurationMinutes !== undefined) {
    (draft as any).mobileDurationMinutes = engagement.mobileDurationMinutes;
  }
  if (engagement.mobileCompletionComment) {
    (draft as any).mobileCompletionComment = engagement.mobileCompletionComment;
  }
  
  return draft;
};

export const buildPreviewEngagement = (draft: EngagementDraft, kind: EngagementKind): Engagement => ({
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
  assignedUserIds: draft.assignedUserId ? [draft.assignedUserId] : [],
  sendHistory: [],
  invoiceNumber: null,
  invoiceVatEnabled: null,
  quoteNumber: null,
  quoteStatus: kind === 'devis' ? 'brouillon' : null,
  optionOverrides: sanitizeDraftOverrides(draft.optionIds, draft.optionOverrides),
  mobileDurationMinutes: null,
  mobileCompletionComment: null,
});

export const documentLabels: Record<EngagementKind, string> = {
  service: 'Service',
  devis: 'Devis',
  facture: 'Facture',
};

export const serviceKindStyles: Record<EngagementKind, { label: string; className: string }> = {
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

export const serviceStatusStyles: Record<EngagementStatus, { label: string; className: string }> = {
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

export const documentTypeFromKind = (kind: EngagementKind): 'Service' | 'Devis' | 'Facture' => {
  if (kind === 'facture') return 'Facture';
  if (kind === 'devis') return 'Devis';
  return 'Service';
};

export const buildLegacyDocumentNumber = (id: string, type: 'Service' | 'Devis' | 'Facture') => {
  const numeric = parseInt(id.replace(/\D/g, ''), 10);
  const prefix = type === 'Facture' ? 'FAC' : type === 'Devis' ? 'DEV' : 'SRV';
  if (Number.isNaN(numeric)) {
    return `${prefix}-${id.toUpperCase()}`;
  }
  return `${prefix}-${numeric.toString().padStart(4, '0')}`;
};

export const getEngagementDocumentNumber = (engagement: Engagement) => {
  if (engagement.kind === 'facture') {
    return engagement.invoiceNumber ?? buildLegacyDocumentNumber(engagement.id, 'Facture');
  }
  if (engagement.kind === 'devis') {
    return engagement.quoteNumber ?? buildLegacyDocumentNumber(engagement.id, 'Devis');
  }
  // Pour les services, vérifier s'ils ont un quoteNumber (venant d'un devis converti)
  if (engagement.quoteNumber) {
    return engagement.quoteNumber;
  }
  const type = documentTypeFromKind(engagement.kind);
  return buildLegacyDocumentNumber(engagement.id, type);
};

export const getNextInvoiceNumber = (engagementList: Engagement[], referenceDate: Date) => {
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

export const getNextQuoteNumber = (engagementList: Engagement[], referenceDate: Date) => {
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

export const sanitizeVatRate = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

export const computeVatMultiplier = (value: number) => sanitizeVatRate(value) / 100;

export const formatVatRateLabel = (value: number) => {
  const safe = sanitizeVatRate(value);
  if (Number.isInteger(safe)) {
    return safe.toString();
  }
  return safe.toFixed(2).replace(/\.00$/, '');
};

export const formatFileSize = (bytes: number) => {
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

