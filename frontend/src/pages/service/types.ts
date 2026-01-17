import type {
  Client,
  Engagement,
  EngagementKind,
  EngagementOptionOverride,
  EngagementStatus,
  Service,
  ServiceOption,
  SupportType,
  Company,
} from '../../store/useAppData';

export type EngagementDraft = {
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
  quoteName?: string | null; // Nom libre du devis pour tri et identification
  // Planning
  planningUser: string | null; // 'clement', 'adrien', ou null pour tous
  startTime: string; // Heure de début (ex: "09:00")
  assignedUserId: string; // ID du collaborateur assigné pour le planning (obligatoire)
  assignedUserIds?: string[]; // IDs des collaborateurs assignés au devis/service (optionnel, multiple)
};

export type QuickClientDraft = {
  name: string;
  siret: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: Client['status'];
};

export type ServiceEmailPrompt = {
  engagementId: string;
  serviceName: string;
};

export type InvoiceEmailContext = {
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

export type OptionOverrideResolved = {
  quantity: number;
  durationMin: number;
  unitPriceHT: number;
};

