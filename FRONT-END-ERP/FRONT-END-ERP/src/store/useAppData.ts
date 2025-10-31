import { create } from 'zustand';
import { addMinutes, format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { BRAND_FULL_TITLE, BRAND_NAME } from '../lib/branding';
import {
  APP_PAGE_OPTIONS,
  USER_ROLE_LABELS,
  type AppPageKey,
  type PermissionKey,
  type UserRole,
  normalizePages,
  normalizePermissions,
} from '../lib/rbac';
import { ClientService, ServiceService, AppointmentService, CompanyService } from '../lib/backendServices';

export type ClientContactRole = 'achat' | 'facturation' | 'technique';

export type ClientContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  roles: ClientContactRole[];
  isBillingDefault: boolean;
  active: boolean;
};

export type ClientType = 'company' | 'individual';

export type Client = {
  id: string;
  type: ClientType;
  name: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  siret: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: 'Actif' | 'Prospect';
  tags: string[];
  lastService: string;
  contacts: ClientContact[];
};

export type ServiceOption = {
  id: string;
  label: string;
  description?: string;
  defaultDurationMin: number;
  unitPriceHT: number;
  tvaPct?: number | null;
  active: boolean;
};

export type ServiceCategory = 'Voiture' | 'Canapé' | 'Textile' | 'Autre';

export type Service = {
  id: string;
  category: ServiceCategory;
  name: string;
  description?: string;
  options: ServiceOption[];
  active: boolean;
};

export type EngagementOptionOverride = {
  quantity?: number;
  unitPriceHT?: number;
  durationMin?: number;
};

export type EngagementStatus = 'brouillon' | 'envoyé' | 'planifié' | 'réalisé' | 'annulé';

export type EngagementKind = 'service' | 'devis' | 'facture';

export type SupportType = 'Voiture' | 'Canapé' | 'Textile';

export type ThemeMode = 'light' | 'dark';

export type SidebarTitlePreference = {
  text: string;
  hidden: boolean;
};

export type EngagementSendRecord = {
  id: string;
  sentAt: string;
  contactIds: string[];
  subject: string | null;
};

export type Engagement = {
  id: string;
  clientId: string;
  serviceId: string;
  optionIds: string[];
  scheduledAt: string;
  status: EngagementStatus;
  companyId: string | null;
  kind: EngagementKind;
  supportType: SupportType;
  supportDetail: string;
  additionalCharge: number;
  contactIds: string[];
  assignedUserIds: string[];
  sendHistory: EngagementSendRecord[];
  invoiceNumber: string | null;
  invoiceVatEnabled: boolean | null;
  quoteNumber: string | null;
  quoteStatus: CommercialDocumentStatus | null;
  optionOverrides?: Record<string, EngagementOptionOverride>;
  mobileDurationMinutes?: number | null;
  mobileCompletionComment?: string | null;
  // Planning
  planningUser?: string | null; // 'clement', 'adrien', ou null pour tous
  startTime?: string; // Heure de début (ex: "09:00")
};

export type Note = {
  id: string;
  clientId: string;
  content: string;
  createdAt: string;
};

export type Slot = {
  id: string;
  date: string;
  start: string;
  end: string;
  engagementId?: string;
};

export type Kpi = {
  label: string;
  day: number;
  week: number;
};

export type ProjectTaskStatus = 'À faire' | 'En cours' | 'Terminé' | 'Bloqué';

export type ProjectTaskPriority = 'Faible' | 'Normale' | 'Haute' | 'Critique';

export type ProjectTask = {
  id: string;
  name: string;
  owner: string;
  assigneeId: string;
  start: string;
  end: string;
  progress: number;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  estimatedHours: number;
  comments: number;
  attachments: number;
  dependencies: string[];
  description: string;
  lastUpdated: string;
};

export type ProjectMember = {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  avatarColor: string;
  capacity: number;
};

export type Project = {
  id: string;
  name: string;
  clientId: string;
  manager: string;
  start: string;
  end: string;
  status: 'Planifié' | 'En cours' | 'Clôturé';
  memberIds: string[];
  tasks: ProjectTask[];
};

export type PurchaseStatus = 'Brouillon' | 'Validé' | 'Payé' | 'Annulé';
export type PurchaseCategory =
  | 'Produits'
  | 'Services'
  | 'Carburant'
  | 'Entretien'
  | 'Sous-traitance'
  | 'Autre';

export type Purchase = {
  id: string;
  companyId: string | null;
  vendor: string;
  reference: string;
  description?: string;
  date: string;
  amountHt: number;
  vatRate: number;
  amountTtc: number;
  category: PurchaseCategory;
  status: PurchaseStatus;
  recurring: boolean;
  notes?: string;
  vehicleId?: string | null;
  kilometers?: number | null;
};

export type Vehicle = {
  id: string;
  name: string;
  mileage: number;
  usageRate: number;
  costPerKm: number;
  active: boolean;
};

export type ServiceCategorySummary = {
  category: Service['category'];
  total: number;
  active: number;
  averagePrice: number;
  averageDuration: number;
  revenue: number;
};

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl?: string;
  password: string;
  emailSignatureHtml: string;
  emailSignatureUseDefault: boolean;
  emailSignatureUpdatedAt?: string;
};

export type NotificationPreferences = {
  emailAlerts: boolean;
  internalAlerts: boolean;
  smsAlerts: boolean;
};

export type Company = {
  id: string;
  name: string;
  logoUrl: string;
  invoiceLogoUrl?: string; // Logo spécifique pour les factures (120x50)
  address: string;
  postalCode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  siret: string;
  vatNumber: string;
  legalNotes: string;
  documentHeaderTitle?: string;
  documentHeaderSubtitle?: string;
  documentHeaderNote?: string;
  vatEnabled: boolean;
  isDefault: boolean;
  defaultSignatureId?: string | null;
  // Informations bancaires
  bankName?: string;
  bankAddress?: string;
  iban?: string;
  bic?: string;
  // Planning
  planningUser?: string | null; // 'clement', 'adrien', ou null pour tous
};

export type EmailSignatureScope = 'company' | 'user';

export type EmailSignature = {
  id: string;
  scope: EmailSignatureScope;
  companyId: string | null;
  userId: string | null;
  label: string;
  html: string;
  isDefault: boolean;
  updatedAt: string;
};

export type DocumentSource = 'Google Drive' | 'Lien externe' | 'Archive interne';

export type CommercialDocumentKind = 'devis' | 'facture';

export type CommercialDocumentStatus = 'brouillon' | 'envoyé' | 'accepté' | 'refusé' | 'payé';

export type DocumentRecord = {
  id: string;
  title: string;
  category: string;
  description: string;
  updatedAt: string;
  owner: string;
  companyId: string | null;
  tags: string[];
  source: DocumentSource;
  url?: string;
  fileType?: string;
  size?: string;
  fileName?: string;
  fileData?: string;
  kind?: CommercialDocumentKind;
  engagementId?: string | null;
  number?: string | null;
  status?: CommercialDocumentStatus | null;
  totalHt?: number | null;
  totalTtc?: number | null;
  vatAmount?: number | null;
  vatRate?: number | null;
  issueDate?: string | null;
  dueDate?: string | null;
  recipients?: string[];
};

export type DocumentWorkspace = {
  driveRootUrl: string;
  lastSync: string | null;
  contact: string;
};

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  pages: (AppPageKey | '*')[];
  permissions: (PermissionKey | '*')[];
  active: boolean;
  profile: UserProfile;
  notificationPreferences: NotificationPreferences;
};

export type LeadStatus =
  | 'Nouveau'
  | 'À contacter'
  | 'En cours'
  | 'Devis envoyé'
  | 'Gagné'
  | 'Perdu';

export type LeadActivityType = 'note' | 'call';

export type LeadActivity = {
  id: string;
  type: LeadActivityType;
  content: string;
  createdAt: string;
};

export type Lead = {
  id: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  source: string;
  segment: string;
  status: LeadStatus;
  nextStepDate: string | null;
  nextStepNote: string;
  lastContact: string | null;
  estimatedValue: number | null;
  owner: string;
  tags: string[];
  address?: string;
  companyId?: string | null;
  supportType?: SupportType;
  supportDetail?: string;
  createdAt: string;
  activities: LeadActivity[];
};

export type PendingEngagementSeed = {
  kind: EngagementKind;
  clientId: string;
  companyId: string | null;
  supportType?: SupportType;
  supportDetail?: string;
  serviceId?: string;
  optionIds?: string[];
  contactIds?: string[];
};

type AppState = {
  clients: Client[];
  leads: Lead[];
  services: Service[];
  engagements: Engagement[];
  purchases: Purchase[];
  vehicles: Vehicle[];
  notes: Note[];
  slots: Slot[];
  kpis: Kpi[];
  stats: {
    revenueSeries: { label: string; value: number }[];
    volumeSeries: { label: string; value: number }[];
    topServices: { name: string; revenue: number; count: number }[];
    averageDuration: number;
    cities: { city: string; count: number }[];
    projectVelocity: { projectId: string; projectName: string; progress: number }[];
  };
  projects: Project[];
  projectMembers: ProjectMember[];
  userProfile: UserProfile;
  notificationPreferences: NotificationPreferences;
  companies: Company[];
  activeCompanyId: string | null;
  documents: DocumentRecord[];
  documentWorkspace: DocumentWorkspace;
  authUsers: AuthUser[];
  currentUserId: string | null;
  pendingEngagementSeed: PendingEngagementSeed | null;
  vatEnabled: boolean;
  vatRate: number;
  theme: ThemeMode;
  sidebarTitlePreference: SidebarTitlePreference;
  emailSignatures: EmailSignature[];
  getCurrentUser: () => AuthUser | null;
  getClient: (id: string) => Client | undefined;
  getService: (id: string) => Service | undefined;
  getCompany: (id: string) => Company | undefined;
  getProjectMember: (id: string) => ProjectMember | undefined;
  computeEngagementTotals: (engagement: Engagement) => {
    price: number;
    duration: number;
    surcharge: number;
  };
  computeDurationPerformance: () => {
    totalCompleted: number;
    averageEstimatedDuration: number;
    averageRealDuration: number;
    averageDeviation: number;
    averageDeviationPercentage: number;
    performanceByService: Array<{
      serviceId: string;
      serviceName: string;
      count: number;
      averageEstimatedDuration: number;
      averageRealDuration: number;
      averageDeviation: number;
      averageDeviationPercentage: number;
    }>;
  };
  setSidebarTitlePreference: (updates: Partial<SidebarTitlePreference>) => void;
  resetSidebarTitlePreference: () => void;
  addLead: (
    payload: Omit<Lead, 'id' | 'activities' | 'createdAt' | 'lastContact'> & Partial<Pick<Lead, 'lastContact'>>
  ) => Lead;
  updateLead: (leadId: string, updates: Partial<Omit<Lead, 'id'>>) => Lead | null;
  removeLead: (leadId: string) => void;
  recordLeadActivity: (leadId: string, activity: Omit<LeadActivity, 'id' | 'createdAt'>) => LeadActivity | null;
  bulkUpdateLeads: (leadIds: string[], updates: Partial<Omit<Lead, 'id' | 'activities'>>) => void;
  addClient: (
    payload: Omit<Client, 'id' | 'lastService' | 'contacts'> &
      Partial<Pick<Client, 'lastService'>> & { contacts?: ClientContact[] }
  ) => Client;
  updateClient: (clientId: string, updates: Partial<Omit<Client, 'id' | 'contacts'>>) => Client | null;
  addClientContact: (
    clientId: string,
    payload: Omit<ClientContact, 'id' | 'isBillingDefault' | 'active'> & { isBillingDefault?: boolean }
  ) => ClientContact | null;
  updateClientContact: (
    clientId: string,
    contactId: string,
    updates: Partial<Omit<ClientContact, 'id'>>
  ) => ClientContact | null;
  archiveClientContact: (clientId: string, contactId: string) => boolean;
  restoreClientContact: (clientId: string, contactId: string) => void;
  setClientBillingContact: (clientId: string, contactId: string) => void;
  removeClient: (clientId: string) => void;
  restoreClient: (payload: { client: Client; engagements: Engagement[]; notes: Note[] }) => void;
  addEngagement: (
    payload: Omit<Engagement, 'id' | 'assignedUserIds'> & { assignedUserIds?: string[] }
  ) => Engagement;
  updateEngagement: (
    engagementId: string,
    updates: Partial<Omit<Engagement, 'id'>> & { assignedUserIds?: string[] }
  ) => Engagement | null;
  recordEngagementSend: (
    engagementId: string,
    payload: { contactIds: string[]; subject?: string | null }
  ) => EngagementSendRecord | null;
  removeEngagement: (engagementId: string) => void;
  getClientRevenue: (clientId: string) => number;
  getClientEngagements: (clientId: string) => Engagement[];
  getServiceCategorySummary: () => ServiceCategorySummary[];
  getServiceOverview: () => {
    totalServices: number;
    totalActive: number;
    averagePrice: number;
    averageDuration: number;
    revenue: number;
  };
  addPurchase: (payload: Omit<Purchase, 'id' | 'amountTtc'>) => Purchase;
  updatePurchase: (
    purchaseId: string,
    updates: Partial<Omit<Purchase, 'id' | 'amountTtc'>>
  ) => Purchase | null;
  removePurchase: (purchaseId: string) => void;
  bulkRemovePurchases: (purchaseIds: string[]) => void;
  addVehicle: (payload: Omit<Vehicle, 'id'>) => Vehicle;
  updateVehicle: (vehicleId: string, updates: Partial<Omit<Vehicle, 'id'>>) => Vehicle | null;
  removeVehicle: (vehicleId: string) => void;
  addService: (payload: Omit<Service, 'id'>) => Service;
  updateService: (serviceId: string, updates: Partial<Omit<Service, 'id'>>) => Service | null;
  removeService: (serviceId: string) => void;
  addServiceOption: (serviceId: string, payload: Omit<ServiceOption, 'id'>) => ServiceOption | null;
  updateServiceOption: (
    serviceId: string,
    optionId: string,
    updates: Partial<Omit<ServiceOption, 'id'>>
  ) => ServiceOption | null;
  removeServiceOption: (serviceId: string, optionId: string) => void;
  addDocument: (
    payload: Omit<DocumentRecord, 'id' | 'updatedAt'> & { updatedAt?: string }
  ) => DocumentRecord;
  updateDocument: (
    documentId: string,
    updates: Partial<Omit<DocumentRecord, 'id'> & { updatedAt?: string }>
  ) => DocumentRecord | null;
  removeDocument: (documentId: string) => void;
  updateDocumentWorkspace: (updates: Partial<DocumentWorkspace>) => void;
  createProjectTask: (
    projectId: string,
    payload: Omit<ProjectTask, 'id' | 'owner' | 'lastUpdated'>
  ) => ProjectTask | null;
  updateProjectTask: (projectId: string, taskId: string, updates: Partial<ProjectTask>) => void;
  removeProjectTask: (projectId: string, taskId: string) => void;
  updateUserProfile: (updates: Partial<Omit<UserProfile, 'id'>>) => void;
  updateNotificationPreferences: (updates: Partial<NotificationPreferences>) => void;
  updateUserAvatar: (avatarUrl: string) => void;
  addCompany: (payload: Omit<Company, 'id'>) => Company;
  updateCompany: (companyId: string, updates: Partial<Omit<Company, 'id'>>) => Company | null;
  removeCompany: (companyId: string) => void;
  setActiveCompany: (companyId: string) => void;
  setPendingEngagementSeed: (seed: PendingEngagementSeed | null) => void;
  setVatEnabled: (enabled: boolean) => void;
  setVatRate: (rate: number) => void;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  createEmailSignature: (
    payload: {
      scope: EmailSignatureScope;
      companyId?: string | null;
      userId?: string | null;
      label: string;
      html: string;
      isDefault?: boolean;
    }
  ) => EmailSignature;
  updateEmailSignatureRecord: (
    signatureId: string,
    updates: Partial<Omit<EmailSignature, 'id' | 'scope'>>
  ) => EmailSignature | null;
  removeEmailSignature: (signatureId: string) => void;
  setDefaultEmailSignature: (signatureId: string) => void;
  getDefaultSignatureForCompany: (companyId: string | null) => EmailSignature | null;
  getDefaultSignatureForUser: (userId: string | null, companyId?: string | null) => EmailSignature | null;
  resolveSignatureHtml: (companyId?: string | null, userId?: string | null) => string | undefined;
  hasPageAccess: (page: AppPageKey) => boolean;
  hasPermission: (permission: PermissionKey) => boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  createUserAccount: (
    payload: {
      username: string;
      password: string;
      role: UserRole;
      pages: (AppPageKey | '*')[];
      permissions: (PermissionKey | '*')[];
    }
  ) => { success: boolean; error?: string };
  updateUserAccount: (
    userId: string,
    updates: {
      role?: UserRole;
      pages?: (AppPageKey | '*')[];
      permissions?: (PermissionKey | '*')[];
    }
  ) => { success: boolean; error?: string };
  setUserActiveState: (userId: string, active: boolean) => { success: boolean; error?: string };
  resetUserPassword: (userId: string, password: string) => { success: boolean; error?: string };
};

const generateContactId = () => `ct${Date.now()}${Math.floor(Math.random() * 1000)}`;

const generateSignatureId = () => `sig-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const normaliseContactRoles = (roles: ClientContactRole[]): ClientContactRole[] => {
  const unique = Array.from(new Set(roles));
  return unique.length ? unique : ['facturation'];
};

const cloneContacts = (contacts: ClientContact[]): ClientContact[] =>
  contacts.map((contact) => ({ ...contact, roles: [...contact.roles] }));

const ensureBillingDefault = (contacts: ClientContact[], preferredId?: string): ClientContact[] => {
  let targetId = preferredId;
  if (targetId) {
    const exists = contacts.some((contact) => contact.id === targetId && contact.active);
    if (!exists) {
      targetId = undefined;
    }
  }
  if (!targetId) {
    const existingDefault = contacts.find((contact) => contact.active && contact.isBillingDefault);
    if (existingDefault) {
      targetId = existingDefault.id;
    } else {
      const firstActive = contacts.find((contact) => contact.active);
      targetId = firstActive?.id;
    }
  }
  return contacts.map((contact) => ({
    ...contact,
    isBillingDefault: contact.active && contact.id === targetId,
  }));
};

const safeTrim = (value?: string | null) => (value ?? '').trim();

const formatTime = (date: Date) => format(date, "HH'h'mm", { locale: fr });

const computeServiceAveragePrice = (service: Service | undefined) => {
  if (!service || service.options.length === 0) {
    return 0;
  }
  const base = service.options.filter((option) => option.active);
  const options = base.length > 0 ? base : service.options;
  const total = options.reduce((sum, option) => sum + option.unitPriceHT, 0);
  return total / options.length;
};

const computeServiceAverageDuration = (service: Service | undefined) => {
  if (!service || service.options.length === 0) {
    return 0;
  }
  const base = service.options.filter((option) => option.active);
  const options = base.length > 0 ? base : service.options;
  const optionDuration = options.reduce((sum, option) => sum + option.defaultDurationMin, 0);
  return optionDuration / options.length;
};

// Fonction pour calculer les statistiques de performance (écart estimé vs réel)
const computeDurationPerformance = (engagements: Engagement[], services: Service[]) => {
  const completedEngagements = engagements.filter(
    (engagement) => engagement.status === 'réalisé' && engagement.mobileDurationMinutes && engagement.mobileDurationMinutes > 0
  );
  
  if (completedEngagements.length === 0) {
    return {
      totalCompleted: 0,
      averageEstimatedDuration: 0,
      averageRealDuration: 0,
      averageDeviation: 0,
      averageDeviationPercentage: 0,
      performanceByService: []
    };
  }
  
  let totalEstimated = 0;
  let totalReal = 0;
  const servicePerformance: Record<string, { estimated: number; real: number; count: number }> = {};
  
  completedEngagements.forEach((engagement) => {
    const estimatedDuration = computeEstimatedDuration(engagement, services);
    const realDuration = engagement.mobileDurationMinutes!;
    
    totalEstimated += estimatedDuration;
    totalReal += realDuration;
    
    // Grouper par service
    if (!servicePerformance[engagement.serviceId]) {
      servicePerformance[engagement.serviceId] = { estimated: 0, real: 0, count: 0 };
    }
    servicePerformance[engagement.serviceId].estimated += estimatedDuration;
    servicePerformance[engagement.serviceId].real += realDuration;
    servicePerformance[engagement.serviceId].count += 1;
  });
  
  const averageEstimatedDuration = totalEstimated / completedEngagements.length;
  const averageRealDuration = totalReal / completedEngagements.length;
  const averageDeviation = averageRealDuration - averageEstimatedDuration;
  const averageDeviationPercentage = averageEstimatedDuration > 0 ? (averageDeviation / averageEstimatedDuration) * 100 : 0;
  
  const performanceByService = Object.entries(servicePerformance).map(([serviceId, data]) => {
    const service = services.find(s => s.id === serviceId);
    const avgEstimated = data.estimated / data.count;
    const avgReal = data.real / data.count;
    const deviation = avgReal - avgEstimated;
    const deviationPercentage = avgEstimated > 0 ? (deviation / avgEstimated) * 100 : 0;
    
    return {
      serviceId,
      serviceName: service?.name || 'Service inconnu',
      count: data.count,
      averageEstimatedDuration: avgEstimated,
      averageRealDuration: avgReal,
      averageDeviation: deviation,
      averageDeviationPercentage: deviationPercentage
    };
  });
  
  return {
    totalCompleted: completedEngagements.length,
    averageEstimatedDuration,
    averageRealDuration,
    averageDeviation,
    averageDeviationPercentage,
    performanceByService
  };
};

const initialProfile: UserProfile = {
  id: 'user-adrien',
  firstName: 'Adrien',
  lastName: 'Martin',
  email: 'adrien.martin@washandgo.fr',
  phone: '+33 6 52 11 32 74',
  role: 'Administrateur',
  avatarUrl: undefined,
  password: '',
  emailSignatureHtml: '',
  emailSignatureUseDefault: false,
  emailSignatureUpdatedAt: undefined,
};

const initialNotificationPreferences: NotificationPreferences = {
  emailAlerts: true,
  internalAlerts: true,
  smsAlerts: false,
};

const nowIso = new Date().toISOString();

const initialEmailSignatures: EmailSignature[] = [
  {
    id: 'sig-company-co1-default',
    scope: 'company',
    companyId: 'co1',
    userId: null,
    label: 'Signature Wash&Go France',
    html:
      '<p><strong>Wash&amp;Go France</strong><br/>45 avenue du Pilotage<br/>contact@washandgo.fr<br/>+33 5 45 12 32 10</p>',
    isDefault: true,
    updatedAt: nowIso,
  },
  {
    id: 'sig-company-co2-default',
    scope: 'company',
    companyId: 'co2',
    userId: null,
    label: 'Signature Wash&Go Île-de-France',
    html:
      '<p><strong>Wash&amp;Go Île-de-France</strong><br/>18 avenue des Ternes<br/>idf@washandgo.fr<br/>+33 1 88 91 22 03</p>',
    isDefault: true,
    updatedAt: nowIso,
  },
  {
    id: 'sig-user-adrien-default',
    scope: 'user',
    companyId: 'co1',
    userId: 'auth-adrien',
    label: 'Adrien – Wash&Go',
    html: `<p><strong>Adrien Martin</strong><br/>Administrateur – ${BRAND_FULL_TITLE}<br/><a href="mailto:adrien.martin@washandgo.fr">adrien.martin@washandgo.fr</a><br/>+33 6 52 11 32 74</p>`,
    isDefault: true,
    updatedAt: nowIso,
  },
];

const initialCompanies: Company[] = [
  {
    id: 'co1',
    name: 'Wash&Go France',
    logoUrl: '',
    address: '45 avenue du Pilotage',
    postalCode: '33300',
    city: 'Bordeaux',
    country: 'France',
    phone: '+33 5 45 12 32 10',
    email: 'contact@washandgo.fr',
    website: 'https://washandgo.fr',
    siret: '812 445 908 00027',
    vatNumber: 'FR45 812445908',
    legalNotes: 'Prestataire de propreté professionnelle.',
    documentHeaderTitle: 'Wash&Go',
    documentHeaderSubtitle: 'Pilotage et opérations de propreté',
    documentHeaderNote: 'Documents émis par Wash&Go France – règlement à 30 jours.',
    vatEnabled: true,
    isDefault: true,
    defaultSignatureId: 'sig-company-co1-default',
  },
  {
    id: 'co2',
    name: 'Wash&Go Île-de-France',
    logoUrl: '',
    address: '18 avenue des Ternes',
    postalCode: '75017',
    city: 'Paris',
    country: 'France',
    phone: '+33 1 88 91 22 03',
    email: 'idf@washandgo.fr',
    website: 'https://washandgo.fr',
    siret: '912 887 330 00018',
    vatNumber: 'FR12 912887330',
    legalNotes: 'Agence Île-de-France – TVA 20 %.',
    documentHeaderTitle: 'Wash&Go Île-de-France',
    documentHeaderSubtitle: 'Solutions premium pour flotte et textile',
    documentHeaderNote: 'Agence Île-de-France – TVA 20 % et règlement à 30 jours.',
    vatEnabled: true,
    isDefault: false,
    defaultSignatureId: 'sig-company-co2-default',
  },
];

const initialVehicles: Vehicle[] = [
  {
    id: 'veh1',
    name: 'Renault Master Atelier',
    mileage: 84210,
    usageRate: 78,
    costPerKm: 0.38,
    active: true,
  },
  {
    id: 'veh2',
    name: 'Peugeot Expert Textile',
    mileage: 61350,
    usageRate: 64,
    costPerKm: 0.33,
    active: true,
  },
  {
    id: 'veh3',
    name: 'Citroën Berlingo Support',
    mileage: 48820,
    usageRate: 52,
    costPerKm: 0.29,
    active: true,
  },
];

const initialDocumentWorkspace: DocumentWorkspace = {
  driveRootUrl: 'https://drive.google.com/drive/folders/washandgo-documents',
  lastSync: '2024-04-08T08:30:00+02:00',
  contact: 'Adrien Martin',
};

const computeAmountTtc = (amountHt: number, vatRate: number) => {
  const safeHt = Number.isFinite(amountHt) ? amountHt : 0;
  const safeVat = Number.isFinite(vatRate) ? vatRate : 0;
  return Math.round(safeHt * (1 + safeVat / 100) * 100) / 100;
};

const PASSWORD_HASH_SALT = 'washandgo::auth::v1';

const hashPassword = (value: string) => {
  const normalized = `${PASSWORD_HASH_SALT}:${value.normalize('NFKC')}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0;
  }
  return `fnv1a:${hash.toString(16).padStart(8, '0')}`;
};

const verifyPassword = (value: string, hashed: string) => hashPassword(value) === hashed;

const initialAuthUsers: AuthUser[] = [
  {
    id: 'auth-adrien',
    username: 'Adrien',
    fullName: 'Adrien Martin',
    passwordHash: hashPassword('8J7shdvt'),
    role: 'superAdmin',
    pages: ['*'],
    permissions: ['*'],
    active: true,
    profile: { ...initialProfile },
    notificationPreferences: { ...initialNotificationPreferences },
  },
];

const sanitizeAuthUser = (user: Partial<AuthUser> & { password?: string }): AuthUser => {
  const rawUsername = typeof user.username === 'string' && user.username.trim() ? user.username.trim() : 'Utilisateur';
  const normalizedUsername = rawUsername;
  const fullName = typeof user.fullName === 'string' && user.fullName.trim() ? user.fullName.trim() : normalizedUsername;
  const role: UserRole =
    user.role && ['superAdmin', 'admin', 'manager', 'agent', 'lecture'].includes(user.role)
      ? (user.role as UserRole)
      : 'agent';
  const passwordHash =
    typeof user.passwordHash === 'string' && user.passwordHash
      ? user.passwordHash
      : typeof user.password === 'string' && user.password
        ? hashPassword(user.password)
        : hashPassword('changeme');

  const rawPages = Array.isArray(user.pages) ? (user.pages as (AppPageKey | '*' | string)[]) : [];
  const hasWildcardPages = rawPages.includes('*');
  const pages: (AppPageKey | '*')[] = hasWildcardPages
    ? ['*']
    : rawPages.length > 0
      ? normalizePages(rawPages)
      : role === 'superAdmin'
        ? ['*']
        : [];

  const rawPermissions = Array.isArray(user.permissions)
    ? (user.permissions as (PermissionKey | '*' | string)[])
    : [];
  const hasWildcardPermissions = rawPermissions.includes('*');
  const permissions: (PermissionKey | '*')[] = hasWildcardPermissions
    ? ['*']
    : rawPermissions.length > 0
      ? normalizePermissions(rawPermissions)
      : role === 'superAdmin'
        ? ['*']
        : [];

  const active = typeof user.active === 'boolean' ? user.active : true;

  const profileSource = user.profile ? { ...user.profile } : { ...initialProfile };
  profileSource.password = '';

  const notificationSource = user.notificationPreferences
    ? { ...initialNotificationPreferences, ...user.notificationPreferences }
    : { ...initialNotificationPreferences };

  return {
    id: typeof user.id === 'string' && user.id ? user.id : `auth-${Date.now()}`,
    username: normalizedUsername,
    fullName,
    passwordHash,
    role,
    pages: pages.length ? pages : [],
    permissions: permissions.length ? permissions : [],
    active,
    profile: profileSource,
    notificationPreferences: notificationSource,
  };
};

const AUTH_STORAGE_KEY = 'washandgo-auth-state';
const VAT_STORAGE_KEY = 'washandgo-vat-settings';
const THEME_STORAGE_KEY = 'washandgo-theme';
const SIDEBAR_TITLE_STORAGE_KEY = 'washandgo:sidebar-title';
const LEGACY_THEME_STORAGE_KEYS = ['washingo-theme', 'washango-theme'];
const LEGACY_AUTH_STORAGE_KEYS = ['washingo-auth-state', 'washango-auth-state'];
const LEGACY_VAT_STORAGE_KEYS = ['washingo-vat-settings', 'washango-vat-settings'];
const LEGACY_SIDEBAR_TITLE_STORAGE_KEYS = ['washingo:sidebar-title', 'washango:sidebar-title'];

const DEFAULT_SIDEBAR_TITLE_PREFERENCE: SidebarTitlePreference = {
  text: BRAND_FULL_TITLE,
  hidden: false,
};

const parseSidebarTitlePreference = (raw: string | null): SidebarTitlePreference | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      return { text: parsed, hidden: false };
    }
    if (parsed && typeof parsed === 'object') {
      const text = typeof (parsed as { text?: unknown }).text === 'string'
        ? (parsed as { text?: string }).text ?? ''
        : DEFAULT_SIDEBAR_TITLE_PREFERENCE.text;
      const hidden = Boolean((parsed as { hidden?: unknown }).hidden);
      return { text, hidden };
    }
  } catch (error) {
    return { text: raw, hidden: false };
  }
  return null;
};

const resolveInitialSidebarTitlePreference = (): SidebarTitlePreference => {
  if (typeof window === 'undefined') {
    return DEFAULT_SIDEBAR_TITLE_PREFERENCE;
  }
  let raw = window.localStorage.getItem(SIDEBAR_TITLE_STORAGE_KEY);
  if (!raw) {
    for (const legacyKey of LEGACY_SIDEBAR_TITLE_STORAGE_KEYS) {
      raw = window.localStorage.getItem(legacyKey);
      if (raw) {
        break;
      }
    }
  }
  const parsed = parseSidebarTitlePreference(raw);
  if (!parsed) {
    return DEFAULT_SIDEBAR_TITLE_PREFERENCE;
  }
  return {
    text: typeof parsed.text === 'string' ? parsed.text : DEFAULT_SIDEBAR_TITLE_PREFERENCE.text,
    hidden: Boolean(parsed.hidden),
  };
};

const persistSidebarTitlePreference = (preference: SidebarTitlePreference) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(SIDEBAR_TITLE_STORAGE_KEY, JSON.stringify(preference));
    LEGACY_SIDEBAR_TITLE_STORAGE_KEYS.forEach((legacyKey) => {
      window.localStorage.removeItem(legacyKey);
    });
  } catch (error) {
    console.warn('Impossible de sauvegarder le titre de la sidebar.', error);
  }
};

type PersistedAuthState = {
  currentUserId: string | null;
  authUsers: AuthUser[];
};

type PersistedVatSettings = {
  perCompany: Record<string, boolean>;
  rate: number;
};

const loadPersistedAuthState = (): PersistedAuthState | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    let raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_AUTH_STORAGE_KEYS) {
        raw = window.localStorage.getItem(legacyKey);
        if (raw) {
          break;
        }
      }
    }
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedAuthState;
    if (!Array.isArray(parsed.authUsers)) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Impossible de charger les informations de connexion.', error);
    return null;
  }
};

const persistAuthState = (authUsers: AuthUser[], currentUserId: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const snapshot: PersistedAuthState = {
      authUsers: authUsers.map((user) => sanitizeAuthUser(user)),
      currentUserId,
    };
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(snapshot));
    LEGACY_AUTH_STORAGE_KEYS.forEach((legacyKey) => {
      window.localStorage.removeItem(legacyKey);
    });
  } catch (error) {
    console.warn('Impossible de sauvegarder les informations de connexion.', error);
  }
};

const loadPersistedVatSettings = (): PersistedVatSettings | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    let raw = window.localStorage.getItem(VAT_STORAGE_KEY);
    if (!raw) {
      for (const legacyKey of LEGACY_VAT_STORAGE_KEYS) {
        raw = window.localStorage.getItem(legacyKey);
        if (raw) {
          break;
        }
      }
    }
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as
      | PersistedVatSettings
      | { enabled: boolean; rate: number };
    if (parsed && 'perCompany' in parsed && typeof parsed.rate === 'number') {
      return {
        perCompany: typeof parsed.perCompany === 'object' && parsed.perCompany
          ? parsed.perCompany
          : {},
        rate: parsed.rate,
      };
    }
    if (parsed && 'enabled' in parsed && typeof parsed.rate === 'number') {
      return {
        perCompany: { __legacy__: parsed.enabled },
        rate: parsed.rate,
      };
    }
    return null;
  } catch (error) {
    console.warn('Impossible de charger les paramètres de TVA.', error);
    return null;
  }
};

const persistVatSettings = (settings: PersistedVatSettings) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(VAT_STORAGE_KEY, JSON.stringify(settings));
    LEGACY_VAT_STORAGE_KEYS.forEach((legacyKey) => {
      window.localStorage.removeItem(legacyKey);
    });
  } catch (error) {
    console.warn('Impossible de sauvegarder les paramètres de TVA.', error);
  }
};

const resolveInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }
  let stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (!stored) {
    for (const legacyKey of LEGACY_THEME_STORAGE_KEYS) {
      stored = window.localStorage.getItem(legacyKey);
      if (stored) {
        break;
      }
    }
  }
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const persistTheme = (mode: ThemeMode) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    LEGACY_THEME_STORAGE_KEYS.forEach((legacyKey) => {
      window.localStorage.removeItem(legacyKey);
    });
  } catch (error) {
    console.warn('Impossible de sauvegarder le thème sélectionné.', error);
  }
};

const initialDocuments: DocumentRecord[] = [
  {
    id: 'doc-contrat-horizon-2024',
    title: 'Contrat cadre Groupe Horizon 2024',
    category: 'Commercial',
    description:
      'Accord annuel couvrant les prestations véhicules et textile pour les 18 sites du groupe Horizon.',
    updatedAt: '2024-04-05T10:12:00+02:00',
    owner: 'Marion Lefèvre',
    companyId: 'co1',
    tags: ['Contrat', 'Renouvellement'],
    source: 'Google Drive',
    url: 'https://drive.google.com/file/d/contrat-horizon-2024/view',
    fileType: 'PDF',
    size: '1,8 Mo',
  },
  {
    id: 'doc-reporting-q1-2024',
    title: 'Reporting financier T1 2024',
    category: 'Financier',
    description: 'Synthèse des revenus, marges et indicateurs opérationnels consolidés du premier trimestre.',
    updatedAt: '2024-04-09T07:45:00+02:00',
    owner: 'Adrien Martin',
    companyId: 'co2',
    tags: ['Finance', 'Trimestriel'],
    source: 'Google Drive',
    url: 'https://docs.google.com/spreadsheets/d/reporting-t1-2024/edit',
    fileType: 'XLSX',
    size: '312 Ko',
  },
  {
    id: 'doc-procedures-hse',
    title: 'Procédures HSE - Mise à jour avril 2024',
    category: 'Opérationnel',
    description: 'Version consolidée des protocoles sécurité et hygiène applicables aux équipes terrain.',
    updatedAt: '2024-04-02T16:05:00+02:00',
    owner: 'Clément Dubois',
    companyId: 'co1',
    tags: ['Qualité', 'Sécurité'],
    source: 'Archive interne',
    fileType: 'PDF',
    size: '2,4 Mo',
  },
  {
    id: 'doc-preavis-textiluxe',
    title: 'Préavis Textiluxe – Conditions 2024',
    category: 'Juridique',
    description: 'Clausier et mentions légales validés pour l’extension du contrat Textiluxe.',
    updatedAt: '2024-03-28T11:20:00+01:00',
    owner: 'Sophie Bernard',
    companyId: 'co2',
    tags: ['Contrat', 'Textile'],
    source: 'Lien externe',
    url: 'https://drive.google.com/file/d/preavis-textiluxe/view',
    fileType: 'DOCX',
    size: '184 Ko',
  },
];

const persistedVatSettings = loadPersistedVatSettings();

const initialVatSettings: PersistedVatSettings = {
  perCompany: {},
  rate: persistedVatSettings?.rate ?? 0.2,
};

initialCompanies.forEach((company) => {
  const perCompanyMap = persistedVatSettings?.perCompany ?? {};
  const persistedValue =
    (persistedVatSettings?.perCompany &&
      (perCompanyMap[company.id] ?? perCompanyMap['__legacy__'])) ??
    company.vatEnabled;
  company.vatEnabled = persistedValue ?? true;
  initialVatSettings.perCompany[company.id] = company.vatEnabled;
});

const initialClients: Client[] = [
  {
    id: 'c1',
    type: 'company',
    name: 'BronzoPérasso',
    companyName: 'BronzoPérasso',
    firstName: null,
    lastName: null,
    siret: '55212098700032',
    email: 'contact@bronzoperasso.fr',
    phone: '+33 4 91 00 11 22',
    address: '14 avenue des Artisans',
    city: 'Marseille',
    status: 'Actif',
    tags: ['BTP', 'Premium'],
    lastService: '2024-04-08',
    contacts: ensureBillingDefault([
      {
        id: 'ct1',
        firstName: 'Marion',
        lastName: 'Lefebvre',
        email: 'marion.lefebvre@bronzoperasso.fr',
        mobile: '+33 6 78 12 45 90',
        roles: ['facturation'],
        isBillingDefault: true,
        active: true,
      },
      {
        id: 'ct2',
        firstName: 'Hugo',
        lastName: 'Bianchi',
        email: 'hugo.bianchi@bronzoperasso.fr',
        mobile: '+33 6 61 24 33 12',
        roles: ['achat', 'technique'],
        isBillingDefault: false,
        active: true,
      },
    ]),
  },
  {
    id: 'c2',
    type: 'company',
    name: 'Wash&Go Nord',
    companyName: 'Wash&Go Nord',
    firstName: null,
    lastName: null,
    siret: '82144596300054',
    email: 'support@washandgo-nord.fr',
    phone: '+33 3 27 84 90 12',
    address: '52 rue du Port',
    city: 'Lille',
    status: 'Actif',
    tags: ['Industriel'],
    lastService: '2024-04-04',
    contacts: ensureBillingDefault([
      {
        id: 'ct3',
        firstName: 'Adrien',
        lastName: 'Morel',
        email: 'adrien.morel@washandgo-nord.fr',
        mobile: '+33 7 50 45 11 20',
        roles: ['facturation', 'achat'],
        isBillingDefault: true,
        active: true,
      },
      {
        id: 'ct4',
        firstName: 'Chloé',
        lastName: 'Santos',
        email: 'chloe.santos@washandgo-nord.fr',
        mobile: '+33 7 70 65 12 33',
        roles: ['technique'],
        isBillingDefault: false,
        active: true,
      },
    ]),
  },
  {
    id: 'c3',
    type: 'company',
    name: 'Textiluxe',
    companyName: 'Textiluxe',
    firstName: null,
    lastName: null,
    siret: '90233456700018',
    email: 'bonjour@textiluxe.fr',
    phone: '+33 1 88 91 22 03',
    address: '8 boulevard Haussmann',
    city: 'Paris',
    status: 'Prospect',
    tags: ['Retail'],
    lastService: '2024-03-30',
    contacts: ensureBillingDefault([
      {
        id: 'ct5',
        firstName: 'Sofia',
        lastName: 'Benali',
        email: 'sofia.benali@textiluxe.fr',
        mobile: '+33 6 12 45 56 78',
        roles: ['facturation'],
        isBillingDefault: true,
        active: true,
      },
    ]),
  },
  {
    id: 'c4',
    type: 'company',
    name: 'Maison Varenne',
    companyName: 'Maison Varenne',
    firstName: null,
    lastName: null,
    siret: '47800256900027',
    email: 'contact@maison-varenne.fr',
    phone: '+33 4 72 88 01 55',
    address: '3 place Bellecour',
    city: 'Lyon',
    status: 'Actif',
    tags: ['Résidentiel'],
    lastService: '2024-04-02',
    contacts: ensureBillingDefault([
      {
        id: 'ct6',
        firstName: 'Camille',
        lastName: 'Richard',
        email: 'camille.richard@maison-varenne.fr',
        mobile: '+33 6 45 77 11 88',
        roles: ['achat'],
        isBillingDefault: false,
        active: true,
      },
      {
        id: 'ct7',
        firstName: 'Thomas',
        lastName: 'Dupuy',
        email: 'thomas.dupuy@maison-varenne.fr',
        mobile: '+33 6 32 48 19 24',
        roles: ['facturation'],
        isBillingDefault: true,
        active: true,
      },
    ]),
  },
  {
    id: 'c5',
    type: 'company',
    name: 'Garage du Parc',
    companyName: 'Garage du Parc',
    firstName: null,
    lastName: null,
    siret: '38977654300041',
    email: 'atelier@garageduparc.fr',
    phone: '+33 2 47 90 33 77',
    address: '18 rue de la Gare',
    city: 'Tours',
    status: 'Actif',
    tags: ['Auto'],
    lastService: '2024-04-06',
    contacts: ensureBillingDefault([
      {
        id: 'ct8',
        firstName: 'Luc',
        lastName: 'Charrier',
        email: 'luc.charrier@garageduparc.fr',
        mobile: '+33 6 77 12 90 45',
        roles: ['facturation', 'technique'],
        isBillingDefault: true,
        active: true,
      },
    ]),
  },
];

const initialLeads: Lead[] = [
  {
    id: 'l1',
    company: 'Fiducia Conseil',
    contact: 'Emma Robert',
    phone: '+33 1 72 44 18 02',
    email: 'emma.robert@fiducia-conseil.fr',
    source: 'Recommandation',
    segment: 'Pro local',
    status: 'En cours',
    nextStepDate: '2024-04-12',
    nextStepNote: 'Préparer proposition entretien textile showroom',
    lastContact: '2024-04-08T10:15:00+02:00',
    estimatedValue: 1850,
    owner: 'Adrien',
    tags: ['Textile', 'Showroom'],
    address: '12 rue des Lilas, 69002 Lyon',
    companyId: 'co1',
    supportType: 'Textile',
    supportDetail: 'Tapis showroom 80 m²',
    createdAt: '2024-03-28T11:12:00+02:00',
    activities: [
      {
        id: 'la1',
        type: 'note',
        content: 'Premier échange au salon Equip Pro, intérêt pour forfait textile.',
        createdAt: '2024-03-28T11:12:00+02:00',
      },
      {
        id: 'la2',
        type: 'call',
        content: 'Appel de qualification, envoi d’une pré-étude.',
        createdAt: '2024-04-08T10:15:00+02:00',
      },
    ],
  },
  {
    id: 'l2',
    company: 'Résidence Le Patio',
    contact: 'Julien Camus',
    phone: '+33 5 61 21 43 88',
    email: 'gestion@residence-lepatio.fr',
    source: 'Site web',
    segment: 'Particulier',
    status: 'À contacter',
    nextStepDate: '2024-04-10',
    nextStepNote: 'Confirmer disponibilités pour intervention canapé',
    lastContact: null,
    estimatedValue: 420,
    owner: 'Clément',
    tags: ['Canapé'],
    address: '4 avenue du Parc, 31000 Toulouse',
    companyId: 'co1',
    supportType: 'Canapé',
    supportDetail: 'Canapé 3 places',
    createdAt: '2024-04-06T09:32:00+02:00',
    activities: [
      {
        id: 'la3',
        type: 'note',
        content: 'Formulaire web – besoin d’un entretien canapé avant emménagement.',
        createdAt: '2024-04-06T09:32:00+02:00',
      },
    ],
  },
  {
    id: 'l3',
    company: 'AutoNova Fleet',
    contact: 'Laura Mendes',
    phone: '+33 4 78 20 05 11',
    email: 'lmendes@autonova.fr',
    source: 'Salon',
    segment: 'TP/VRD',
    status: 'Devis envoyé',
    nextStepDate: '2024-04-15',
    nextStepNote: 'Relance devis flotte utilitaire',
    lastContact: '2024-04-05T16:40:00+02:00',
    estimatedValue: 3120,
    owner: 'Adrien',
    tags: ['Voiture', 'Flotte'],
    address: '28 boulevard des Producteurs, 42000 Saint-Étienne',
    companyId: 'co2',
    supportType: 'Voiture',
    supportDetail: 'Flotte utilitaires 12 véhicules',
    createdAt: '2024-03-22T15:08:00+01:00',
    activities: [
      {
        id: 'la4',
        type: 'note',
        content: 'Discussion sur contrat trimestriel flotte utilitaire.',
        createdAt: '2024-03-22T15:08:00+01:00',
      },
      {
        id: 'la5',
        type: 'call',
        content: 'Présentation devis détaillé par téléphone.',
        createdAt: '2024-04-05T16:40:00+02:00',
      },
    ],
  },
];

const initialServices: Service[] = [
  {
    id: 's1',
    category: 'Voiture',
    name: 'Nettoyage intérieur complet',
    description: 'Aspiration, dégraissage et protection des surfaces intérieures.',
    options: [
      {
        id: 'o1',
        label: 'Protection tissus',
        description: 'Protection',
        unitPriceHT: 35,
        defaultDurationMin: 30,
        tvaPct: 20,
        active: true,
      },
      {
        id: 'o2',
        label: 'Traitement désodorisant',
        description: 'Confort',
        unitPriceHT: 15,
        defaultDurationMin: 15,
        tvaPct: 20,
        active: true,
      },
    ],
    active: true,
  },
  {
    id: 's2',
    category: 'Canapé',
    name: 'Détachage canapé 3 places',
    description: 'Nettoyage vapeur et traitement anti-taches.',
    options: [
      {
        id: 'o3',
        label: 'Protection imperméabilisante',
        description: 'Protection',
        unitPriceHT: 25,
        defaultDurationMin: 20,
        tvaPct: 20,
        active: true,
      },
    ],
    active: true,
  },
  {
    id: 's3',
    category: 'Textile',
    name: 'Nettoyage tapis laine',
    description: 'Aspiration en profondeur et shampoing doux.',
    options: [
      {
        id: 'o4',
        label: 'Traitement anti-acariens',
        description: 'Santé',
        unitPriceHT: 40,
        defaultDurationMin: 25,
        tvaPct: 20,
        active: true,
      },
      {
        id: 'o5',
        label: 'Séchage accéléré',
        description: 'Logistique',
        unitPriceHT: 20,
        defaultDurationMin: 15,
        tvaPct: 20,
        active: true,
      },
    ],
    active: true,
  },
  {
    id: 's4',
    category: 'Voiture',
    name: 'Rénovation sièges cuir',
    description: 'Nettoyage, nourrissage et finition satinée.',
    options: [
      {
        id: 'o6',
        label: 'Protection anti-UV',
        description: 'Protection',
        unitPriceHT: 30,
        defaultDurationMin: 20,
        tvaPct: 20,
        active: true,
      },
    ],
    active: false,
  },
];

const initialEngagements: Engagement[] = [
  {
    id: 'e1',
    clientId: 'c1',
    serviceId: 's1',
    optionIds: ['o1'],
    scheduledAt: '2024-04-09T09:00:00+02:00',
    status: 'planifié',
    companyId: 'co1',
    kind: 'service',
    supportType: 'Voiture',
    supportDetail: 'SUV hybride',
    additionalCharge: 0,
    contactIds: ['ct1'],
    assignedUserIds: ['auth-adrien'],
    sendHistory: [],
    invoiceNumber: null,
    invoiceVatEnabled: null,
    quoteNumber: null,
    quoteStatus: null,
    mobileDurationMinutes: null,
    mobileCompletionComment: null,
  },
  {
    id: 'e2',
    clientId: 'c2',
    serviceId: 's2',
    optionIds: ['o3'],
    scheduledAt: '2024-04-09T13:30:00+02:00',
    status: 'envoyé',
    companyId: 'co2',
    kind: 'devis',
    supportType: 'Canapé',
    supportDetail: 'Angle 5 places',
    additionalCharge: 0,
    contactIds: ['ct3'],
    assignedUserIds: ['auth-adrien'],
    sendHistory: [],
    invoiceNumber: null,
    invoiceVatEnabled: null,
    quoteNumber: 'DEV-202404-0001',
    quoteStatus: 'envoyé',
    mobileDurationMinutes: null,
    mobileCompletionComment: null,
  },
  {
    id: 'e3',
    clientId: 'c3',
    serviceId: 's3',
    optionIds: ['o4', 'o5'],
    scheduledAt: '2024-04-08T17:30:00+02:00',
    status: 'réalisé',
    companyId: 'co1',
    kind: 'facture',
    supportType: 'Textile',
    supportDetail: 'Tapis laine 8 m²',
    additionalCharge: 0,
    contactIds: ['ct5'],
    assignedUserIds: ['auth-adrien'],
    sendHistory: [],
    invoiceNumber: 'FAC-202404-0001',
    invoiceVatEnabled: true,
    quoteNumber: null,
    quoteStatus: null,
    mobileDurationMinutes: 75, // Durée réelle : 75 min (estimé : 30+15=45 min)
    mobileCompletionComment: 'Service terminé avec succès',
  },
  {
    id: 'e4',
    clientId: 'c4',
    serviceId: 's1',
    optionIds: [],
    scheduledAt: '2024-04-10T07:30:00+02:00',
    status: 'réalisé',
    companyId: 'co1',
    kind: 'service',
    supportType: 'Voiture',
    supportDetail: 'Citadine de prêt',
    additionalCharge: 0,
    contactIds: ['ct7'],
    assignedUserIds: ['auth-adrien'],
    sendHistory: [],
    invoiceNumber: null,
    invoiceVatEnabled: null,
    quoteNumber: null,
    quoteStatus: null,
    mobileDurationMinutes: 35, // Durée réelle : 35 min (estimé : 30 min)
    mobileCompletionComment: 'Service rapide et efficace',
  },
  {
    id: 'e5',
    clientId: 'c5',
    serviceId: 's2',
    optionIds: [],
    scheduledAt: '2024-04-11T15:30:00+02:00',
    status: 'annulé',
    companyId: 'co2',
    kind: 'service',
    supportType: 'Canapé',
    supportDetail: 'Convertible 3 places',
    additionalCharge: 0,
    contactIds: ['ct8'],
    assignedUserIds: ['auth-adrien'],
    sendHistory: [],
    invoiceNumber: null,
    invoiceVatEnabled: null,
    quoteNumber: null,
    quoteStatus: null,
    mobileDurationMinutes: null,
    mobileCompletionComment: null,
  },
];

const initialPurchases: Purchase[] = [
  {
    id: 'p1',
    companyId: 'co1',
    vendor: 'ProNet Supplies',
    reference: 'ACH-2024-001',
    description: 'Réassort produits textiles',
    date: '2024-03-04',
    amountHt: 1180,
    vatRate: 20,
    amountTtc: 1416,
    category: 'Produits',
    status: 'Payé',
    recurring: false,
    notes: 'Règlement à 30 jours - livraison atelier Bordeaux',
    vehicleId: null,
    kilometers: null,
  },
  {
    id: 'p2',
    companyId: 'co1',
    vendor: 'CleanCar Distributeur',
    reference: 'ACH-2024-002',
    description: 'Kit detailing flotte utilitaire',
    date: '2024-03-12',
    amountHt: 760,
    vatRate: 20,
    amountTtc: 912,
    category: 'Services',
    status: 'Validé',
    recurring: false,
    notes: 'Forfait préparation lavage printemps',
    vehicleId: null,
    kilometers: null,
  },
  {
    id: 'p3',
    companyId: 'co2',
    vendor: 'Textiléo',
    reference: 'ACH-2024-003',
    description: 'Recharge détachant textile premium',
    date: '2024-03-18',
    amountHt: 540,
    vatRate: 20,
    amountTtc: 648,
    category: 'Produits',
    status: 'Brouillon',
    recurring: true,
    notes: 'Abonnement mensuel textile',
    vehicleId: null,
    kilometers: null,
  },
  {
    id: 'p4',
    companyId: 'co2',
    vendor: 'AquaWash',
    reference: 'ACH-2024-004',
    description: 'Maintenance annuelle stations mobiles',
    date: '2024-02-27',
    amountHt: 1685,
    vatRate: 20,
    amountTtc: 2022,
    category: 'Entretien',
    status: 'Payé',
    recurring: true,
    notes: 'Maintenance réseau Île-de-France',
    vehicleId: null,
    kilometers: null,
  },
  {
    id: 'p5',
    companyId: 'co1',
    vendor: 'Carburant calculé',
    reference: 'FUEL-2024-03',
    description: 'Kilomètres atelier mars',
    date: '2024-03-28',
    amountHt: 418,
    vatRate: 20,
    amountTtc: 501.6,
    category: 'Carburant',
    status: 'Payé',
    recurring: true,
    notes: 'Estimation carburant basée sur 1100 km',
    vehicleId: 'veh1',
    kilometers: 1100,
  },
];

const kpis: Kpi[] = [
  { label: 'Prestations', day: 3, week: 18 },
  { label: 'Chiffre d’affaires estimé', day: 540, week: 3120 },
  { label: 'Durée totale', day: 6.5, week: 32 },
];

const baseStats = {
  revenueSeries: [
    { label: 'Semaine 12', value: 3200 },
    { label: 'Semaine 13', value: 3450 },
    { label: 'Semaine 14', value: 3120 },
    { label: 'Semaine 15', value: 3680 },
  ],
  volumeSeries: [
    { label: 'Janvier', value: 54 },
    { label: 'Février', value: 48 },
    { label: 'Mars', value: 62 },
    { label: 'Avril', value: 35 },
  ],
  topServices: [
    { name: 'Nettoyage intérieur complet', revenue: 18600, count: 155 },
    { name: 'Détachage canapé 3 places', revenue: 14200, count: 132 },
    { name: 'Nettoyage tapis laine', revenue: 12540, count: 84 },
  ],
  averageDuration: 118,
  cities: [
    { city: 'Bordeaux', count: 42 },
    { city: 'Paris', count: 33 },
    { city: 'Lille', count: 27 },
    { city: 'Lyon', count: 21 },
  ],
};

const notes: Note[] = [
  {
    id: 'n1',
    clientId: 'c1',
    content: 'Préférer les interventions du matin. Accès badge bâtiment B.',
    createdAt: '2024-04-01T09:10:00+02:00',
  },
  {
    id: 'n2',
    clientId: 'c2',
    content: 'Transmettre les rapports sous 24h.',
    createdAt: '2024-04-03T14:26:00+02:00',
  },
];

const projectMembers: ProjectMember[] = [
  {
    id: 'member-jean',
    firstName: 'Marion',
    lastName: 'Lefèvre',
    role: 'Directrice de projet',
    email: 'marion.lefevre@atelier-proprete.fr',
    phone: '+33 6 52 11 32 74',
    avatarColor: '#0f172a',
    capacity: 38,
  },
  {
    id: 'member-ines',
    firstName: 'Adrien',
    lastName: 'Martin',
    role: 'Coordinateur terrain',
    email: 'adrien.martin@atelier-proprete.fr',
    phone: '+33 6 63 44 18 20',
    avatarColor: '#2563eb',
    capacity: 36,
  },
  {
    id: 'member-louis',
    firstName: 'Clément',
    lastName: 'Dubois',
    role: 'Chef de projet',
    email: 'clement.dubois@atelier-proprete.fr',
    phone: '+33 6 47 28 91 05',
    avatarColor: '#0f766e',
    capacity: 40,
  },
  {
    id: 'member-paul',
    firstName: 'Sophie',
    lastName: 'Bernard',
    role: 'Responsable qualité',
    email: 'sophie.bernard@atelier-proprete.fr',
    phone: '+33 6 19 85 42 70',
    avatarColor: '#7c3aed',
    capacity: 32,
  },
  {
    id: 'member-camille',
    firstName: 'Hugo',
    lastName: 'Petit',
    role: 'Account manager',
    email: 'hugo.petit@atelier-proprete.fr',
    phone: '+33 6 21 54 76 38',
    avatarColor: '#1d4ed8',
    capacity: 30,
  },
  {
    id: 'member-marie',
    firstName: 'Emma',
    lastName: 'Robert',
    role: 'Spécialiste catalogue',
    email: 'emma.robert@atelier-proprete.fr',
    phone: '+33 6 33 72 45 11',
    avatarColor: '#be123c',
    capacity: 34,
  },
  {
    id: 'member-sami',
    firstName: 'Laura',
    lastName: 'Mendes',
    role: 'Analyste opérations',
    email: 'laura.mendes@atelier-proprete.fr',
    phone: '+33 6 42 81 73 22',
    avatarColor: '#0ea5e9',
    capacity: 28,
  },
];

const projects: Project[] = [
  {
    id: 'p1',
    name: 'Programme concession Bordeaux',
    clientId: 'c1',
    manager: 'Marion Lefèvre',
    start: '2024-03-18',
    end: '2024-06-07',
    status: 'En cours',
    memberIds: ['member-jean', 'member-ines', 'member-louis', 'member-paul'],
    tasks: [
      {
        id: 'pt1',
        name: 'Audit et cadrage',
        owner: 'Marion Lefèvre',
        assigneeId: 'member-jean',
        start: '2024-03-18',
        end: '2024-03-22',
        progress: 100,
        status: 'Terminé',
        priority: 'Normale',
        estimatedHours: 32,
        comments: 3,
        attachments: 2,
        dependencies: [],
        description: 'Analyse des besoins et cadrage du périmètre fonctionnel avec le client.',
        lastUpdated: '2024-03-22T17:20:00+02:00',
      },
      {
        id: 'pt2',
        name: 'Planification des équipes',
        owner: 'Adrien Martin',
        assigneeId: 'member-ines',
        start: '2024-03-25',
        end: '2024-04-05',
        progress: 75,
        status: 'En cours',
        priority: 'Haute',
        estimatedHours: 44,
        comments: 4,
        attachments: 1,
        dependencies: ['pt1'],
        description: 'Constitution des binômes et ordonnancement des interventions terrain.',
        lastUpdated: '2024-04-08T09:15:00+02:00',
      },
      {
        id: 'pt3',
        name: 'Déploiement terrain',
        owner: 'Clément Dubois',
        assigneeId: 'member-louis',
        start: '2024-04-08',
        end: '2024-05-24',
        progress: 35,
        status: 'En cours',
        priority: 'Haute',
        estimatedHours: 96,
        comments: 1,
        attachments: 0,
        dependencies: ['pt2'],
        description: 'Pilotage du déploiement sur site et suivi des indicateurs de qualité.',
        lastUpdated: '2024-04-09T14:42:00+02:00',
      },
      {
        id: 'pt7',
        name: 'Recette et transfert',
        owner: 'Sophie Bernard',
        assigneeId: 'member-paul',
        start: '2024-05-27',
        end: '2024-06-07',
        progress: 10,
        status: 'À faire',
        priority: 'Normale',
        estimatedHours: 28,
        comments: 0,
        attachments: 1,
        dependencies: ['pt3'],
        description: 'Phase de tests, recette fonctionnelle et transfert au client.',
        lastUpdated: '2024-04-05T08:00:00+02:00',
      },
    ],
  },
  {
    id: 'p2',
    name: 'Renouvellement contrats textile',
    clientId: 'c3',
    manager: 'Sophie Bernard',
    start: '2024-04-02',
    end: '2024-05-17',
    status: 'Planifié',
    memberIds: ['member-sami', 'member-camille', 'member-marie', 'member-jean'],
    tasks: [
      {
        id: 'pt4',
        name: 'Analyse volume',
        owner: 'Laura Mendes',
        assigneeId: 'member-sami',
        start: '2024-04-02',
        end: '2024-04-11',
        progress: 60,
        status: 'En cours',
        priority: 'Normale',
        estimatedHours: 30,
        comments: 2,
        attachments: 2,
        dependencies: [],
        description: 'Consolidation des volumes traités et projection trimestrielle.',
        lastUpdated: '2024-04-08T11:32:00+02:00',
      },
      {
        id: 'pt5',
        name: 'Négociation fournisseurs',
        owner: 'Hugo Petit',
        assigneeId: 'member-camille',
        start: '2024-04-08',
        end: '2024-04-26',
        progress: 40,
        status: 'En cours',
        priority: 'Critique',
        estimatedHours: 42,
        comments: 5,
        attachments: 3,
        dependencies: ['pt4'],
        description: 'Renégociation des conditions commerciales et du SLA.',
        lastUpdated: '2024-04-09T16:18:00+02:00',
      },
      {
        id: 'pt6',
        name: 'Mise à jour catalogue',
        owner: 'Emma Robert',
        assigneeId: 'member-marie',
        start: '2024-04-22',
        end: '2024-05-17',
        progress: 10,
        status: 'À faire',
        priority: 'Haute',
        estimatedHours: 54,
        comments: 1,
        attachments: 4,
        dependencies: ['pt5'],
        description: 'Refonte des fiches prestations et actualisation des médias marketing.',
        lastUpdated: '2024-04-04T10:24:00+02:00',
      },
      {
        id: 'pt8',
        name: 'Campagne annonce clients',
        owner: 'Adrien Martin',
        assigneeId: 'member-jean',
        start: '2024-05-06',
        end: '2024-05-24',
        progress: 5,
        status: 'À faire',
        priority: 'Normale',
        estimatedHours: 24,
        comments: 0,
        attachments: 0,
        dependencies: ['pt6'],
        description: 'Automatisation des communications clients autour du nouveau catalogue.',
        lastUpdated: '2024-04-06T09:12:00+02:00',
      },
    ],
  },
];

const sanitizeOptionOverrides = (
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

// Fonction pour calculer la durée estimée (toujours depuis le devis)
const computeEstimatedDuration = (engagement: Engagement, catalogue: Service[] = initialServices) => {
  const service = catalogue.find((item) => item.id === engagement.serviceId);
  if (!service) {
    return 0;
  }
  const overrides = sanitizeOptionOverrides(engagement.optionIds, engagement.optionOverrides);
  const selectedOptions = service.options.filter((option) => engagement.optionIds.includes(option.id));
  
  return selectedOptions.reduce((acc, option) => {
    const override = overrides[option.id];
    const quantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
    const durationValue = override?.durationMin ?? option.defaultDurationMin;
    return acc + durationValue * quantity;
  }, 0);
};

const computeTotals = (engagement: Engagement, catalogue: Service[] = initialServices) => {
  const service = catalogue.find((item) => item.id === engagement.serviceId);
  if (!service) {
    return { price: 0, duration: 0, surcharge: 0 };
  }
  const overrides = sanitizeOptionOverrides(engagement.optionIds, engagement.optionOverrides);
  const selectedOptions = service.options.filter((option) => engagement.optionIds.includes(option.id));
  const price = selectedOptions.reduce((acc, option) => {
    const override = overrides[option.id];
    const quantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
    const unitPrice = override?.unitPriceHT ?? option.unitPriceHT;
    return acc + unitPrice * quantity;
  }, 0);
  
  // Utiliser la durée réelle si le service est réalisé et qu'une durée mobile est enregistrée
  let duration: number;
  if (engagement.status === 'réalisé' && engagement.mobileDurationMinutes && engagement.mobileDurationMinutes > 0) {
    duration = engagement.mobileDurationMinutes;
  } else {
    // Sinon, utiliser la durée estimée du devis
    duration = computeEstimatedDuration(engagement, catalogue);
  }
  
  const surcharge = engagement.additionalCharge ?? 0;
  return { price, duration, surcharge };
};

const buildSlots = (currentEngagements: Engagement[], currentServices: Service[]): Slot[] =>
  currentEngagements.map((engagement) => {
    const startDate = new Date(engagement.scheduledAt);
    const { duration } = computeTotals(engagement, currentServices);
    const endDate = addMinutes(startDate, duration);
    return {
      id: `slot-${engagement.id}`,
      date: format(startDate, 'yyyy-MM-dd'),
      start: formatTime(startDate),
      end: formatTime(endDate),
      engagementId: engagement.id,
    };
  });

const deriveVelocity = (projectList: Project[]) =>
  projectList.map((project) => ({
    projectId: project.id,
    projectName: project.name,
    progress:
      project.tasks.reduce((acc, task) => acc + task.progress, 0) / Math.max(project.tasks.length, 1),
  }));

const persistedAuthState = loadPersistedAuthState();
const rawAuthUsers =
  persistedAuthState && persistedAuthState.authUsers.length > 0
    ? persistedAuthState.authUsers
    : initialAuthUsers;

const seedAuthUsers = rawAuthUsers.map((user) => sanitizeAuthUser(user));
const seedCurrentUserId = persistedAuthState?.currentUserId ?? null;
const resolvedCurrentUser =
  seedCurrentUserId
    ? seedAuthUsers.find((user) => user.id === seedCurrentUserId && user.active) ?? null
    : null;
const seedProfileSource =
  (resolvedCurrentUser ? resolvedCurrentUser.profile : seedAuthUsers[0]?.profile) || initialProfile;
const seedNotificationSource =
  (resolvedCurrentUser
    ? resolvedCurrentUser.notificationPreferences
    : seedAuthUsers[0]?.notificationPreferences) || initialNotificationPreferences;
const initialCurrentUserId = resolvedCurrentUser?.id ?? null;
const initialTheme = resolveInitialTheme();
const initialSidebarTitlePreference = resolveInitialSidebarTitlePreference();
export const useAppData = create<AppState>((set, get) => ({
  clients: initialClients,
  leads: initialLeads,
  services: initialServices,
  engagements: initialEngagements,
  purchases: initialPurchases,
  vehicles: initialVehicles,
  notes,
  slots: buildSlots(initialEngagements, initialServices),
  kpis,
  stats: {
    ...baseStats,
    projectVelocity: deriveVelocity(projects),
  },
  projects,
  projectMembers,
  userProfile: { ...seedProfileSource },
  notificationPreferences: { ...seedNotificationSource },
  companies: initialCompanies,
  activeCompanyId: initialCompanies[0]?.id ?? null,
  emailSignatures: initialEmailSignatures,
  documents: initialDocuments,
  documentWorkspace: initialDocumentWorkspace,
  authUsers: seedAuthUsers.map((user) => ({
    ...user,
    profile: { ...user.profile },
    notificationPreferences: { ...user.notificationPreferences },
    pages: [...user.pages],
    permissions: [...user.permissions],
  })),
  currentUserId: initialCurrentUserId,
  pendingEngagementSeed: null,
  vatEnabled: initialCompanies[0]?.vatEnabled ?? true,
  vatRate: initialVatSettings.rate,
  theme: initialTheme,
  sidebarTitlePreference: initialSidebarTitlePreference,
  getCurrentUser: () => {
    const { authUsers, currentUserId } = get();
    const user = authUsers.find((candidate) => candidate.id === currentUserId);
    return user && user.active ? user : null;
  },
  getClient: (id) => get().clients.find((client) => client.id === id),
  getService: (id) => get().services.find((service) => service.id === id),
  getCompany: (id) => get().companies.find((company) => company.id === id),
  getProjectMember: (id) => get().projectMembers.find((member) => member.id === id),
  computeEngagementTotals: (engagement) => {
    const { services } = get();
    return computeTotals(engagement, services);
  },
  computeDurationPerformance: () => {
    const { engagements, services } = get();
    return computeDurationPerformance(engagements, services);
  },
  addLead: (payload) => {
    const newLead: Lead = {
      ...payload,
      id: `l${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastContact: payload.lastContact ?? null,
      activities: [],
    };
    set((state) => ({
      leads: [newLead, ...state.leads],
    }));
    return newLead;
  },
  updateLead: (leadId, updates) => {
    let updated: Lead | null = null;
    set((state) => ({
      leads: state.leads.map((lead) => {
        if (lead.id !== leadId) {
          return lead;
        }
        updated = {
          ...lead,
          ...updates,
        };
        return updated;
      }),
    }));
    return updated;
  },
  removeLead: (leadId) => {
    set((state) => ({
      leads: state.leads.filter((lead) => lead.id !== leadId),
    }));
  },
  recordLeadActivity: (leadId, activity) => {
    let recorded: LeadActivity | null = null;
    set((state) => ({
      leads: state.leads.map((lead) => {
        if (lead.id !== leadId) {
          return lead;
        }
        recorded = {
          id: `la${Date.now()}`,
          createdAt: new Date().toISOString(),
          ...activity,
        };
        const nextActivities = [recorded, ...lead.activities];
        return {
          ...lead,
          activities: nextActivities,
          lastContact: activity.type === 'call' ? recorded.createdAt : lead.lastContact,
        };
      }),
    }));
    return recorded;
  },
  bulkUpdateLeads: (leadIds, updates) => {
    set((state) => ({
      leads: state.leads.map((lead) =>
        leadIds.includes(lead.id)
          ? {
              ...lead,
              ...updates,
            }
          : lead
      ),
    }));
  },
  addClient: (payload) => {
    const type: ClientType = payload.type ?? 'company';
    const providedName = safeTrim(payload.name);
    const companyNameInput = safeTrim(payload.companyName);
    const firstNameInput = safeTrim(payload.firstName);
    const lastNameInput = safeTrim(payload.lastName);
    const email = safeTrim(payload.email);
    const phone = safeTrim(payload.phone);
    const address = safeTrim(payload.address);
    const city = safeTrim(payload.city);
    const tags = payload.tags.map((tag) => tag.trim()).filter(Boolean);
    const baseContacts = payload.contacts ? ensureBillingDefault(cloneContacts(payload.contacts)) : [];
    const companyName = type === 'company' ? companyNameInput || providedName : '';
    const firstName = type === 'individual' ? firstNameInput : '';
    const lastName = type === 'individual' ? lastNameInput : '';
    const siret = type === 'company' ? safeTrim(payload.siret) : '';
    const name =
      type === 'company'
        ? companyName || providedName
        : [firstName, lastName].filter(Boolean).join(' ') || providedName;
    let created: Client | null = null;
    set((state) => {
      const existing = state.clients.find((client) => {
        if (siret && client.siret && client.siret === siret) {
          return true;
        }
        if (email && client.email.toLowerCase() === email.toLowerCase()) {
          return true;
        }
        return false;
      });
      if (existing) {
        const merged: Client = {
          ...existing,
          type,
          name,
          companyName: type === 'company' ? companyName || name : null,
          firstName: type === 'individual' ? firstName || null : null,
          lastName: type === 'individual' ? lastName || null : null,
          siret,
          email,
          phone,
          address,
          city,
          status: payload.status,
          tags,
          lastService: payload.lastService ?? existing.lastService,
          contacts: baseContacts.length ? ensureBillingDefault(baseContacts) : existing.contacts,
        };
        created = merged;
        return {
          clients: state.clients.map((client) => (client.id === existing.id ? merged : client)),
        };
      }
      const newClient: Client = {
        id: `c${Date.now()}`,
        type,
        name,
        companyName: type === 'company' ? (companyName || name) : null,
        firstName: type === 'individual' ? (firstName || null) : null,
        lastName: type === 'individual' ? (lastName || null) : null,
        siret,
        email,
        phone,
        address,
        city,
        status: payload.status,
        tags,
        lastService: payload.lastService ?? format(new Date(), 'yyyy-MM-dd'),
        contacts: baseContacts.length ? ensureBillingDefault(baseContacts) : [],
      };
      created = newClient;
      return {
        clients: [newClient, ...state.clients],
      };
    });
    
    // Synchroniser immédiatement avec le backend
    if (created) {
      ClientService.createClient(created)
        .then(async (result) => {
        if (result.success) {
            // Invalidation + re-fetch de la liste depuis le backend
            const refreshed = await ClientService.getClients();
            if (refreshed.success) {
              set({ clients: refreshed.data });
            }
          console.log('[Store] ✅ Client créé et synchronisé:', created!.id);
        } else {
          console.error('[Store] ❌ Erreur synchronisation client:', result.error);
        }
        })
        .catch((error) => {
        console.error('[Store] ❌ Erreur création client:', error);
      });
    }
    
    return created!;
  },
  updateClient: (clientId, updates) => {
    let updated: Client | null = null;
    set((state) => ({
      clients: state.clients.map((client) => {
        if (client.id !== clientId) {
          return client;
        }
        const nextType: ClientType = updates.type ?? client.type;
        const providedName = updates.name !== undefined ? safeTrim(updates.name) : client.name;
        const companyNameRaw =
          nextType === 'company'
            ? safeTrim(updates.companyName ?? client.companyName ?? '')
            : '';
        const firstNameRaw =
          nextType === 'individual'
            ? safeTrim(updates.firstName ?? client.firstName ?? '')
            : '';
        const lastNameRaw =
          nextType === 'individual'
            ? safeTrim(updates.lastName ?? client.lastName ?? '')
            : '';
        const name =
          nextType === 'company'
            ? companyNameRaw || providedName
            : [firstNameRaw, lastNameRaw].filter(Boolean).join(' ') || providedName;
        const siret =
          nextType === 'company'
            ? updates.siret !== undefined
              ? safeTrim(updates.siret)
              : client.siret
            : '';
        const email = updates.email !== undefined ? safeTrim(updates.email) : client.email;
        const phone = updates.phone !== undefined ? safeTrim(updates.phone) : client.phone;
        const address = updates.address !== undefined ? safeTrim(updates.address) : client.address;
        const city = updates.city !== undefined ? safeTrim(updates.city) : client.city;
        const tags =
          updates.tags !== undefined
            ? updates.tags.map((tag) => tag.trim()).filter(Boolean)
            : client.tags;
        const next: Client = {
          ...client,
          ...updates,
          type: nextType,
          name,
          companyName: nextType === 'company' ? (companyNameRaw || name) : null,
          firstName: nextType === 'individual' ? (firstNameRaw || null) : null,
          lastName: nextType === 'individual' ? (lastNameRaw || null) : null,
          siret,
          email,
          phone,
          address,
          city,
          tags,
          contacts: ensureBillingDefault(cloneContacts(client.contacts)),
        };
        updated = next;
        return next;
      }),
    }));
    // Synchroniser backend puis re-fetch la liste
    if (updated) {
      ClientService.updateClient(clientId, updated)
        .then(async (result) => {
          if (result.success) {
            const refreshed = await ClientService.getClients();
            if (refreshed.success) {
              set({ clients: refreshed.data });
            }
          }
        })
        .catch(() => {});
    }
    return updated;
  },
  addClientContact: (clientId, payload) => {
    const email = payload.email.trim();
    const contactRoles = normaliseContactRoles(payload.roles);
    let created: ClientContact | null = null;
    set((state) => ({
      clients: state.clients.map((client) => {
        if (client.id !== clientId) {
          return client;
        }
        const contacts = cloneContacts(client.contacts);
        const existingByEmail = contacts.find(
          (contact) => contact.email.toLowerCase() === email.toLowerCase()
        );
        if (existingByEmail) {
          const updatedContact: ClientContact = {
            ...existingByEmail,
            firstName: payload.firstName.trim(),
            lastName: payload.lastName.trim(),
            email,
            mobile: payload.mobile.trim(),
            roles: contactRoles,
            isBillingDefault: payload.isBillingDefault ?? existingByEmail.isBillingDefault,
            active: true,
          };
          created = updatedContact;
          const nextContacts = contacts.map((contact) =>
            contact.id === existingByEmail.id ? updatedContact : contact
          );
          return {
            ...client,
            contacts: ensureBillingDefault(nextContacts, updatedContact.isBillingDefault ? updatedContact.id : undefined),
          };
        }
        const newContact: ClientContact = {
          id: generateContactId(),
          firstName: payload.firstName.trim(),
          lastName: payload.lastName.trim(),
          email,
          mobile: payload.mobile.trim(),
          roles: contactRoles,
          isBillingDefault: Boolean(payload.isBillingDefault),
          active: true,
        };
        created = newContact;
        const nextContacts = ensureBillingDefault([newContact, ...contacts],
          newContact.isBillingDefault ? newContact.id : undefined);
        return {
          ...client,
          contacts: nextContacts,
        };
      }),
    }));
    return created;
  },
  updateClientContact: (clientId, contactId, updates) => {
    let updatedContact: ClientContact | null = null;
    set((state) => ({
      clients: state.clients.map((client) => {
        if (client.id !== clientId) {
          return client;
        }
        const nextContacts = client.contacts.map((contact) => {
          if (contact.id !== contactId) {
            return { ...contact, roles: [...contact.roles] };
          }
          const roles = updates.roles ? normaliseContactRoles(updates.roles) : contact.roles;
          const next: ClientContact = {
            ...contact,
            ...updates,
            firstName: updates.firstName !== undefined ? updates.firstName.trim() : contact.firstName,
            lastName: updates.lastName !== undefined ? updates.lastName.trim() : contact.lastName,
            email: updates.email !== undefined ? updates.email.trim() : contact.email,
            mobile: updates.mobile !== undefined ? updates.mobile.trim() : contact.mobile,
            roles,
            active: updates.active !== undefined ? updates.active : contact.active,
          };
          updatedContact = next;
          return next;
        });
        return {
          ...client,
          contacts: ensureBillingDefault(nextContacts, updates.isBillingDefault ? contactId : undefined),
        };
      }),
    }));
    return updatedContact;
  },
  archiveClientContact: (clientId, contactId) => {
    let archived = false;
    set((state) => ({
      clients: state.clients.map((client) => {
        if (client.id !== clientId) {
          return client;
        }
        const nextContacts = client.contacts.map((contact) => {
          if (contact.id !== contactId) {
            return { ...contact, roles: [...contact.roles] };
          }
          archived = true;
          return { ...contact, active: false };
        });
        const withDefault = ensureBillingDefault(nextContacts);
        return {
          ...client,
          contacts: withDefault,
        };
      }),
      engagements: state.engagements.map((engagement) =>
        engagement.contactIds.includes(contactId)
          ? {
              ...engagement,
              contactIds: engagement.contactIds.filter((id) => id !== contactId),
            }
          : engagement
      ),
    }));
    return archived;
  },
  restoreClientContact: (clientId, contactId) => {
    set((state) => ({
      clients: state.clients.map((client) => {
        if (client.id !== clientId) {
          return client;
        }
        const nextContacts = client.contacts.map((contact) =>
          contact.id === contactId
            ? { ...contact, active: true }
            : { ...contact, roles: [...contact.roles] }
        );
        return {
          ...client,
          contacts: ensureBillingDefault(nextContacts, contactId),
        };
      }),
    }));
  },
  setClientBillingContact: (clientId, contactId) => {
    set((state) => ({
      clients: state.clients.map((client) => {
        if (client.id !== clientId) {
          return client;
        }
        const nextContacts = client.contacts.map((contact) => ({
          ...contact,
          roles: [...contact.roles],
        }));
        return {
          ...client,
          contacts: ensureBillingDefault(nextContacts, contactId),
        };
      }),
    }));
  },
  removeClient: (clientId) => {
    set((state) => {
      const nextClients = state.clients.filter((client) => client.id !== clientId);
      const nextEngagements = state.engagements.filter((engagement) => engagement.clientId !== clientId);
      const nextNotes = state.notes.filter((note) => note.clientId !== clientId);
      return {
        clients: nextClients,
        engagements: nextEngagements,
        notes: nextNotes,
        slots: buildSlots(nextEngagements, state.services),
      };
    });
    // Synchroniser backend puis re-fetch la liste
    ClientService.deleteClient(clientId)
      .then(async (result) => {
        const refreshed = await ClientService.getClients();
        if (refreshed.success) {
          set({ clients: refreshed.data });
        }
      })
      .catch(() => {});
  },
  restoreClient: ({ client, engagements: engagementsToRestore, notes: notesToRestore }) => {
    set((state) => {
      const existingClients = state.clients.filter((item) => item.id !== client.id);
      const existingEngagements = state.engagements.filter(
        (engagement) => !engagementsToRestore.some((restored) => restored.id === engagement.id)
      );
      const existingNotes = state.notes.filter(
        (note) => !notesToRestore.some((restored) => restored.id === note.id)
      );
      const nextEngagements = [...engagementsToRestore, ...existingEngagements];
      const nextNotes = [...notesToRestore, ...existingNotes];
      return {
        clients: [
          {
            ...client,
            contacts: ensureBillingDefault(cloneContacts(client.contacts)),
          },
          ...existingClients,
        ],
        engagements: nextEngagements,
        notes: nextNotes,
        slots: buildSlots(nextEngagements, state.services),
      };
    });
  },
  addEngagement: (payload) => {
    const optionIds = payload.optionIds ? [...payload.optionIds] : [];
    const overrides = sanitizeOptionOverrides(optionIds, payload.optionOverrides);
    const newEngagement: Engagement = {
      ...payload,
      optionIds,
      optionOverrides: overrides,
      additionalCharge: payload.additionalCharge ?? 0,
      contactIds: payload.contactIds ?? [],
      assignedUserIds: payload.assignedUserIds ? [...payload.assignedUserIds] : [],
      sendHistory: payload.sendHistory ?? [],
      invoiceNumber: payload.invoiceNumber ?? null,
      invoiceVatEnabled:
        Object.prototype.hasOwnProperty.call(payload, 'invoiceVatEnabled')
          ? payload.invoiceVatEnabled ?? null
          : null,
      quoteNumber: payload.quoteNumber ?? null,
      quoteStatus:
        Object.prototype.hasOwnProperty.call(payload, 'quoteStatus')
          ? payload.quoteStatus ?? null
          : payload.kind === 'devis'
          ? 'brouillon'
          : null,
      mobileDurationMinutes:
        Object.prototype.hasOwnProperty.call(payload, 'mobileDurationMinutes')
          ? payload.mobileDurationMinutes ?? null
          : null,
      mobileCompletionComment:
        Object.prototype.hasOwnProperty.call(payload, 'mobileCompletionComment')
          ? payload.mobileCompletionComment ?? null
          : null,
      // Planning
      planningUser: payload.planningUser ?? null,
      startTime: payload.startTime ?? null,
      id: `e${Date.now()}`,
    };
    set((state) => {
      const nextEngagements = [newEngagement, ...state.engagements];
      return {
        engagements: nextEngagements,
        slots: buildSlots(nextEngagements, state.services),
      };
    });
    return newEngagement;
  },
  updateEngagement: (engagementId, updates) => {
    let updated: Engagement | null = null;
    set((state) => {
      const nextEngagements = state.engagements.map((engagement) => {
        if (engagement.id !== engagementId) {
          return engagement;
        }
        const optionIds = updates.optionIds ? [...updates.optionIds] : engagement.optionIds;
        const overrides = sanitizeOptionOverrides(optionIds, updates.optionOverrides ?? engagement.optionOverrides);
        const next: Engagement = {
          ...engagement,
          ...updates,
          optionIds,
          optionOverrides: overrides,
          additionalCharge:
            updates.additionalCharge !== undefined ? updates.additionalCharge : engagement.additionalCharge,
          contactIds: updates.contactIds ? [...updates.contactIds] : engagement.contactIds,
          sendHistory: updates.sendHistory ? [...updates.sendHistory] : engagement.sendHistory,
          assignedUserIds:
            updates.assignedUserIds !== undefined
              ? [...(updates.assignedUserIds ?? [])]
              : engagement.assignedUserIds,
          quoteNumber: updates.quoteNumber !== undefined ? updates.quoteNumber : engagement.quoteNumber,
          quoteStatus: updates.quoteStatus !== undefined ? updates.quoteStatus : engagement.quoteStatus,
          mobileDurationMinutes:
            updates.mobileDurationMinutes !== undefined
              ? updates.mobileDurationMinutes
              : engagement.mobileDurationMinutes ?? null,
          mobileCompletionComment:
            updates.mobileCompletionComment !== undefined
              ? updates.mobileCompletionComment
              : engagement.mobileCompletionComment ?? null,
        };
        updated = next;
        return next;
      });
      return {
        engagements: nextEngagements,
        slots: buildSlots(nextEngagements, state.services),
      };
    });
    return updated;
  },
  recordEngagementSend: (engagementId, payload) => {
    let recorded: EngagementSendRecord | null = null;
    const cleanedIds = Array.from(new Set((payload.contactIds ?? []).filter(Boolean)));
    if (!cleanedIds.length) {
      return null;
    }
    set((state) => ({
      engagements: state.engagements.map((engagement) => {
        if (engagement.id !== engagementId) {
          return engagement;
        }
        const record: EngagementSendRecord = {
          id: `es${Date.now()}`,
          sentAt: new Date().toISOString(),
          contactIds: cleanedIds,
          subject: payload.subject ?? null,
        };
        recorded = record;
        const mergedContacts = Array.from(new Set([...engagement.contactIds, ...cleanedIds]));
        return {
          ...engagement,
          contactIds: mergedContacts,
          sendHistory: [record, ...engagement.sendHistory],
          quoteStatus:
            engagement.kind === 'devis' && engagement.quoteStatus !== 'accepté' && engagement.quoteStatus !== 'refusé'
              ? 'envoyé'
              : engagement.quoteStatus,
        };
      }),
    }));
    return recorded;
  },
  removeEngagement: (engagementId) => {
    set((state) => {
      const nextEngagements = state.engagements.filter((engagement) => engagement.id !== engagementId);
      return {
        engagements: nextEngagements,
        slots: buildSlots(nextEngagements, state.services),
      };
    });
  },
  getClientRevenue: (clientId) => {
    const { engagements } = get();
    return engagements
      .filter((engagement) => engagement.clientId === clientId && engagement.status !== 'annulé')
      .reduce((acc, engagement) => {
        const totals = get().computeEngagementTotals(engagement);
        return acc + totals.price + totals.surcharge;
      }, 0);
  },
  getClientEngagements: (clientId) => get().engagements.filter((engagement) => engagement.clientId === clientId),
  getServiceCategorySummary: () => {
    const { services, engagements } = get();
    const compute = get().computeEngagementTotals;
    return ['Voiture', 'Canapé', 'Textile', 'Autre'].map((category) => {
      const typedCategory = category as Service['category'];
      const catalog = services.filter((service) => service.category === typedCategory);
      const aggregate = catalog.reduce(
        (acc, service) => {
          const related = engagements.filter((engagement) => engagement.serviceId === service.id);
          const revenue = related.reduce((sum, engagement) => {
            const totals = compute(engagement);
            return sum + totals.price + totals.surcharge;
          }, 0);
          const duration = related.reduce((sum, engagement) => sum + compute(engagement).duration, 0);
          const averagePrice = computeServiceAveragePrice(service);
          const averageDuration = computeServiceAverageDuration(service);
          return {
            revenue: acc.revenue + revenue,
            duration: acc.duration + duration,
            total: acc.total + 1,
            active: acc.active + (service.active ? 1 : 0),
            optionPrice: acc.optionPrice + averagePrice,
            referenceDuration: acc.referenceDuration + averageDuration,
          };
        },
        {
          revenue: 0,
          duration: 0,
          total: 0,
          active: 0,
          optionPrice: 0,
          referenceDuration: 0,
        }
      );

      return {
        category: typedCategory,
        total: aggregate.total,
        active: aggregate.active,
        averagePrice: aggregate.total ? aggregate.optionPrice / aggregate.total : 0,
        averageDuration: aggregate.total ? aggregate.referenceDuration / aggregate.total : 0,
        revenue: aggregate.revenue,
      } satisfies ServiceCategorySummary;
    });
  },
  getServiceOverview: () => {
    const { services, engagements } = get();
    const compute = get().computeEngagementTotals;
    const summary = services.reduce(
      (acc, service) => {
        const related = engagements.filter((engagement) => engagement.serviceId === service.id);
        const totals = related.reduce(
          (sum, engagement) => {
            const result = compute(engagement);
            return {
              revenue: sum.revenue + result.price + result.surcharge,
              duration: sum.duration + result.duration,
            };
          },
          { revenue: 0, duration: 0 }
        );
        const averagePrice = computeServiceAveragePrice(service);
        const averageDuration = computeServiceAverageDuration(service);
        return {
          revenue: acc.revenue + totals.revenue,
          duration: acc.duration + totals.duration,
          optionPrice: acc.optionPrice + averagePrice,
          referenceDuration: acc.referenceDuration + averageDuration,
          total: acc.total + 1,
          active: acc.active + (service.active ? 1 : 0),
        };
      },
      { revenue: 0, duration: 0, optionPrice: 0, referenceDuration: 0, total: 0, active: 0 }
    );

    return {
      totalServices: summary.total,
      totalActive: summary.active,
      averagePrice: summary.total ? summary.optionPrice / summary.total : 0,
      averageDuration: summary.total ? summary.referenceDuration / summary.total : 0,
      revenue: summary.revenue,
    };
  },
  addPurchase: (payload) => {
    const amountHt = Number.isFinite(payload.amountHt) ? payload.amountHt : 0;
    const vatRate = Number.isFinite(payload.vatRate) ? payload.vatRate : 0;
    const newPurchase: Purchase = {
      ...payload,
      companyId: payload.companyId ?? null,
      vehicleId: payload.vehicleId ?? null,
      kilometers: payload.kilometers ?? null,
      amountHt,
      vatRate,
      amountTtc: computeAmountTtc(amountHt, vatRate),
      recurring: payload.recurring ?? false,
      id: `pur${Date.now()}`,
    };
    set((state) => ({ purchases: [newPurchase, ...state.purchases] }));
    return newPurchase;
  },
  updatePurchase: (purchaseId, updates) => {
    let updated: Purchase | null = null;
    set((state) => ({
      purchases: state.purchases.map((purchase) => {
        if (purchase.id !== purchaseId) {
          return purchase;
        }
        const amountHt =
          updates.amountHt !== undefined && Number.isFinite(updates.amountHt)
            ? updates.amountHt
            : purchase.amountHt;
        const vatRate =
          updates.vatRate !== undefined && Number.isFinite(updates.vatRate)
            ? updates.vatRate
            : purchase.vatRate;
        updated = {
          ...purchase,
          ...updates,
          amountHt,
          vatRate,
          amountTtc: computeAmountTtc(amountHt, vatRate),
          companyId:
            updates.companyId !== undefined ? updates.companyId : purchase.companyId,
          vehicleId:
            updates.vehicleId !== undefined ? updates.vehicleId : purchase.vehicleId ?? null,
          kilometers:
            updates.kilometers !== undefined ? updates.kilometers : purchase.kilometers ?? null,
          recurring:
            updates.recurring !== undefined ? updates.recurring : purchase.recurring,
        };
        return updated;
      }),
    }));
    return updated;
  },
  removePurchase: (purchaseId) => {
    set((state) => ({
      purchases: state.purchases.filter((purchase) => purchase.id !== purchaseId),
    }));
  },
  bulkRemovePurchases: (purchaseIds) => {
    if (!purchaseIds.length) {
      return;
    }
    set((state) => ({
      purchases: state.purchases.filter((purchase) => !purchaseIds.includes(purchase.id)),
    }));
  },
  addVehicle: (payload) => {
    const newVehicle: Vehicle = {
      ...payload,
      id: `veh${Date.now()}`,
    };
    set((state) => ({ vehicles: [...state.vehicles, newVehicle] }));
    return newVehicle;
  },
  updateVehicle: (vehicleId, updates) => {
    let updated: Vehicle | null = null;
    set((state) => ({
      vehicles: state.vehicles.map((vehicle) => {
        if (vehicle.id !== vehicleId) {
          return vehicle;
        }
        updated = {
          ...vehicle,
          ...updates,
        };
        return updated;
      }),
    }));
    return updated;
  },
  removeVehicle: (vehicleId) => {
    set((state) => ({
      vehicles: state.vehicles.filter((vehicle) => vehicle.id !== vehicleId),
    }));
  },
  addService: (payload) => {
    const newService: Service = {
      ...payload,
      id: `s${Date.now()}`,
    };
    set((state) => {
      const nextServices = [...state.services, newService];
      return {
        services: nextServices,
        slots: buildSlots(state.engagements, nextServices),
      };
    });
    
    // Synchroniser immédiatement avec le backend
    ServiceService.createService(newService).then(result => {
      if (result.success) {
        console.log('[Store] ✅ Service créé et synchronisé:', newService.id);
      } else {
        console.error('[Store] ❌ Erreur synchronisation service:', result.error);
      }
    }).catch(error => {
      console.error('[Store] ❌ Erreur création service:', error);
    });
    
    return newService;
  },
  updateService: (serviceId, updates) => {
    let updated: Service | null = null;
    set((state) => {
      const nextServices = state.services.map((service) => {
        if (service.id !== serviceId) {
          return service;
        }
        updated = {
          ...service,
          ...updates,
          options: updates.options ?? service.options,
        };
        return updated;
      });
      return {
        services: nextServices,
        slots: buildSlots(state.engagements, nextServices),
      };
    });
    return updated;
  },
  removeService: (serviceId) => {
    set((state) => {
      const nextServices = state.services.filter((service) => service.id !== serviceId);
      const nextEngagements = state.engagements.filter((engagement) => engagement.serviceId !== serviceId);
      return {
        services: nextServices,
        engagements: nextEngagements,
        slots: buildSlots(nextEngagements, nextServices),
      };
    });
  },
  addServiceOption: (serviceId, payload) => {
    let created: ServiceOption | null = null;
    set((state) => {
      const nextServices = state.services.map((service) => {
        if (service.id !== serviceId) {
          return service;
        }
        const duration = Number.isFinite(payload.defaultDurationMin)
          ? Math.max(0, payload.defaultDurationMin)
          : 0;
        const unitPrice = Number.isFinite(payload.unitPriceHT) ? Math.max(0, payload.unitPriceHT) : 0;
        const tva =
          payload.tvaPct === null || payload.tvaPct === undefined || Number.isNaN(payload.tvaPct)
            ? null
            : payload.tvaPct;
        created = {
          id: `opt${Date.now()}`,
          label: payload.label.trim(),
          description: payload.description?.trim() || undefined,
          defaultDurationMin: duration,
          unitPriceHT: unitPrice,
          tvaPct: tva,
          active: payload.active ?? true,
        };
        return {
          ...service,
          options: [...service.options, created!],
        };
      });
      return {
        services: nextServices,
        slots: buildSlots(state.engagements, nextServices),
      };
    });
    return created;
  },
  updateServiceOption: (serviceId, optionId, updates) => {
    let updated: ServiceOption | null = null;
    set((state) => {
      const nextServices = state.services.map((service) => {
        if (service.id !== serviceId) {
          return service;
        }
        const nextOptions = service.options.map((option) => {
          if (option.id !== optionId) {
            return option;
          }
          const duration =
            updates.defaultDurationMin !== undefined && Number.isFinite(updates.defaultDurationMin)
              ? Math.max(0, updates.defaultDurationMin)
              : option.defaultDurationMin;
          const unitPrice =
            updates.unitPriceHT !== undefined && Number.isFinite(updates.unitPriceHT)
              ? Math.max(0, updates.unitPriceHT)
              : option.unitPriceHT;
          const tva =
            Object.prototype.hasOwnProperty.call(updates, 'tvaPct')
              ? updates.tvaPct === null || updates.tvaPct === undefined || Number.isNaN(updates.tvaPct)
                ? null
                : updates.tvaPct
              : option.tvaPct ?? null;
          updated = {
            ...option,
            ...updates,
            label: updates.label !== undefined ? updates.label.trim() : option.label,
            description:
              updates.description !== undefined ? updates.description?.trim() || undefined : option.description,
            defaultDurationMin: duration,
            unitPriceHT: unitPrice,
            tvaPct: tva,
            active: updates.active !== undefined ? updates.active : option.active,
          };
          return updated;
        });
        return {
          ...service,
          options: nextOptions,
        };
      });
      return {
        services: nextServices,
        slots: buildSlots(state.engagements, nextServices),
      };
    });
    return updated;
  },
  removeServiceOption: (serviceId, optionId) => {
    set((state) => {
      const nextServices = state.services.map((service) => {
        if (service.id !== serviceId) {
          return service;
        }
        return {
          ...service,
          options: service.options.filter((option) => option.id !== optionId),
        };
      });
      return {
        services: nextServices,
        slots: buildSlots(state.engagements, nextServices),
      };
    });
  },
  addDocument: (payload) => {
    const now = new Date().toISOString();
    const tags = payload.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [];
    const title = payload.title.trim();
    const category = payload.category.trim() || 'Non classé';
    const description = payload.description?.trim() ?? '';
    const owner = payload.owner.trim();
    const companyId = payload.companyId && payload.companyId.trim().length > 0 ? payload.companyId : null;
    const url = payload.url?.trim() ? payload.url.trim() : undefined;
    const fileType = payload.fileType?.trim() || undefined;
    const size = payload.size?.trim() || undefined;
    const fileName = payload.fileName?.trim() || undefined;
    const fileData = payload.fileData?.trim() || undefined;
    const kind = payload.kind ?? undefined;
    const engagementId = payload.engagementId ?? null;
    const number = payload.number ?? null;
    const status = payload.status ?? null;
    const totalHt = payload.totalHt ?? null;
    const totalTtc = payload.totalTtc ?? null;
    const vatAmount = payload.vatAmount ?? null;
    const vatRate = payload.vatRate ?? null;
    const issueDate = payload.issueDate ?? null;
    const dueDate = payload.dueDate ?? null;
    const recipients = payload.recipients ?? undefined;
    const newDocument: DocumentRecord = {
      id: `doc-${Date.now()}`,
      title,
      category,
      description,
      updatedAt: payload.updatedAt ?? now,
      owner,
      companyId,
      tags,
      source: payload.source,
      url,
      fileType,
      size,
      fileName,
      fileData,
      kind,
      engagementId,
      number,
      status,
      totalHt,
      totalTtc,
      vatAmount,
      vatRate,
      issueDate,
      dueDate,
      recipients,
    };
    set((state) => ({
      documents: [newDocument, ...state.documents],
    }));
    return newDocument;
  },
  updateDocument: (documentId, updates) => {
    let updated: DocumentRecord | null = null;
    set((state) => {
      const nextDocuments = state.documents.map((document) => {
        if (document.id !== documentId) {
          return document;
        }

        const tags = updates.tags
          ? updates.tags.map((tag) => tag.trim()).filter(Boolean)
          : document.tags;

        const hasCompanyUpdate = Object.prototype.hasOwnProperty.call(updates, 'companyId');
        const companyId = hasCompanyUpdate
          ? updates.companyId && typeof updates.companyId === 'string' && updates.companyId.trim().length > 0
            ? updates.companyId
            : null
          : document.companyId;

        const url = Object.prototype.hasOwnProperty.call(updates, 'url')
          ? updates.url && updates.url.trim().length > 0
            ? updates.url.trim()
            : undefined
          : document.url;

        const fileType = Object.prototype.hasOwnProperty.call(updates, 'fileType')
          ? updates.fileType?.trim() || undefined
          : document.fileType;

        const size = Object.prototype.hasOwnProperty.call(updates, 'size')
          ? updates.size?.trim() || undefined
          : document.size;
        const fileName = Object.prototype.hasOwnProperty.call(updates, 'fileName')
          ? updates.fileName?.trim() || undefined
          : document.fileName;
        const fileData = Object.prototype.hasOwnProperty.call(updates, 'fileData')
          ? updates.fileData?.trim() || undefined
          : document.fileData;
        const kind = Object.prototype.hasOwnProperty.call(updates, 'kind')
          ? updates.kind ?? undefined
          : document.kind;
        const engagementId = Object.prototype.hasOwnProperty.call(updates, 'engagementId')
          ? updates.engagementId ?? null
          : document.engagementId ?? null;
        const number = Object.prototype.hasOwnProperty.call(updates, 'number')
          ? updates.number ?? null
          : document.number ?? null;
        const status = Object.prototype.hasOwnProperty.call(updates, 'status')
          ? updates.status ?? null
          : document.status ?? null;
        const totalHt = Object.prototype.hasOwnProperty.call(updates, 'totalHt')
          ? updates.totalHt ?? null
          : document.totalHt ?? null;
        const totalTtc = Object.prototype.hasOwnProperty.call(updates, 'totalTtc')
          ? updates.totalTtc ?? null
          : document.totalTtc ?? null;
        const vatAmount = Object.prototype.hasOwnProperty.call(updates, 'vatAmount')
          ? updates.vatAmount ?? null
          : document.vatAmount ?? null;
        const vatRate = Object.prototype.hasOwnProperty.call(updates, 'vatRate')
          ? updates.vatRate ?? null
          : document.vatRate ?? null;
        const issueDate = Object.prototype.hasOwnProperty.call(updates, 'issueDate')
          ? updates.issueDate ?? null
          : document.issueDate ?? null;
        const dueDate = Object.prototype.hasOwnProperty.call(updates, 'dueDate')
          ? updates.dueDate ?? null
          : document.dueDate ?? null;
        const recipients = Object.prototype.hasOwnProperty.call(updates, 'recipients')
          ? updates.recipients ?? undefined
          : document.recipients;

        const next: DocumentRecord = {
          ...document,
          title: updates.title !== undefined ? updates.title.trim() : document.title,
          category: updates.category !== undefined ? updates.category.trim() || 'Non classé' : document.category,
          description:
            updates.description !== undefined ? updates.description?.trim() ?? '' : document.description,
          owner: updates.owner !== undefined ? updates.owner.trim() : document.owner,
          updatedAt: updates.updatedAt ?? new Date().toISOString(),
          companyId,
          tags,
          source: updates.source ?? document.source,
          url,
          fileType,
          size,
          fileName,
          fileData,
          kind,
          engagementId,
          number,
          status,
          totalHt,
          totalTtc,
          vatAmount,
          vatRate,
          issueDate,
          dueDate,
          recipients,
        };

        updated = next;
        return next;
      });
      return {
        documents: nextDocuments,
      };
    });
    return updated;
  },
  removeDocument: (documentId) => {
    set((state) => ({
      documents: state.documents.filter((document) => document.id !== documentId),
    }));
  },
  updateDocumentWorkspace: (updates) => {
    set((state) => {
      const hasDriveUpdate = Object.prototype.hasOwnProperty.call(updates, 'driveRootUrl');
      const hasContactUpdate = Object.prototype.hasOwnProperty.call(updates, 'contact');

      const driveRootUrl = hasDriveUpdate && updates.driveRootUrl !== undefined
        ? updates.driveRootUrl.trim()
        : state.documentWorkspace.driveRootUrl;

      const contact = hasContactUpdate && updates.contact !== undefined
        ? updates.contact.trim()
        : state.documentWorkspace.contact;

      return {
        documentWorkspace: {
          ...state.documentWorkspace,
          ...updates,
          driveRootUrl,
          contact,
        },
      };
    });
  },
  createProjectTask: (projectId, payload) => {
    let created: ProjectTask | null = null;
    set((state) => {
      const member = state.projectMembers.find((candidate) => candidate.id === payload.assigneeId);
      const newTask: ProjectTask = {
        ...payload,
        id: `pt${Date.now()}`,
        owner: member ? `${member.firstName} ${member.lastName}` : 'Non assigné',
        lastUpdated: new Date().toISOString(),
      };
      const projects = state.projects.map((project) => {
        if (project.id !== projectId) {
          return project;
        }
        created = newTask;
        const memberIds = payload.assigneeId
          ? project.memberIds.includes(payload.assigneeId)
            ? project.memberIds
            : [...project.memberIds, payload.assigneeId]
          : project.memberIds;
        return {
          ...project,
          memberIds,
          tasks: [...project.tasks, newTask],
        };
      });

      if (!created) {
        return {};
      }

      return {
        projects,
        stats: {
          ...state.stats,
          projectVelocity: deriveVelocity(projects),
        },
      };
    });
    return created;
  },
  updateProjectTask: (projectId, taskId, updates) => {
    set((state) => {
      const projects = state.projects.map((project) => {
        if (project.id !== projectId) {
          return project;
        }
        const tasks = project.tasks.map((task) => {
          if (task.id !== taskId) {
            return task;
          }
          const nextTask: ProjectTask = {
            ...task,
            ...updates,
          };
          if (updates.assigneeId) {
            const member = state.projectMembers.find((candidate) => candidate.id === updates.assigneeId);
            if (member) {
              nextTask.owner = `${member.firstName} ${member.lastName}`;
            }
          }
          if (updates.start || updates.end) {
            const startDate = new Date(nextTask.start);
            const endDate = new Date(nextTask.end);
            if (endDate < startDate) {
              if (updates.start && !updates.end) {
                nextTask.end = nextTask.start;
              } else {
                nextTask.start = nextTask.end;
              }
            }
          }
          nextTask.lastUpdated = new Date().toISOString();
          return nextTask;
        });
        const memberIds = Array.from(
          new Set([
            ...project.memberIds,
            ...tasks.map((task) => task.assigneeId).filter((id) => Boolean(id)),
          ])
        );
        return {
          ...project,
          memberIds,
          tasks,
        };
      });

      return {
        projects,
        stats: {
          ...state.stats,
          projectVelocity: deriveVelocity(projects),
        },
      };
    });
  },
  removeProjectTask: (projectId, taskId) => {
    set((state) => {
      const projects = state.projects.map((project) => {
        if (project.id !== projectId) {
          return project;
        }
        return {
          ...project,
          tasks: project.tasks.filter((task) => task.id !== taskId),
        };
      });

      return {
        projects,
        stats: {
          ...state.stats,
          projectVelocity: deriveVelocity(projects),
        },
      };
    });
  },
  updateUserProfile: (updates) => {
    set((state) => {
      const nextProfile = {
        ...state.userProfile,
        ...updates,
      };

      const nextUsers = state.authUsers.map((user) => {
        if (user.id !== state.currentUserId) {
          return user;
        }
        const mergedProfile = {
          ...user.profile,
          ...updates,
          password: '',
        };
        const sanitized = sanitizeAuthUser({
          ...user,
          fullName: `${mergedProfile.firstName} ${mergedProfile.lastName}`.trim() || user.fullName,
          profile: mergedProfile,
        });
        return sanitized;
      });

      persistAuthState(nextUsers, state.currentUserId);

      return {
        userProfile: nextProfile,
        authUsers: nextUsers,
      };
    });
  },
  updateNotificationPreferences: (updates) => {
    set((state) => {
      const nextPreferences = {
        ...state.notificationPreferences,
        ...updates,
      };

      const nextUsers = state.authUsers.map((user) =>
        user.id === state.currentUserId
          ? {
              ...user,
              notificationPreferences: {
                ...user.notificationPreferences,
                ...updates,
              },
            }
          : user
      );

      persistAuthState(nextUsers, state.currentUserId);

      return {
        notificationPreferences: nextPreferences,
        authUsers: nextUsers,
      };
    });
  },
  updateUserAvatar: (avatarUrl) => {
    set((state) => {
      const nextProfile = {
        ...state.userProfile,
        avatarUrl,
      };

      const nextUsers = state.authUsers.map((user) =>
        user.id === state.currentUserId
          ? {
              ...user,
              profile: {
                ...user.profile,
                avatarUrl,
              },
            }
          : user
      );

      persistAuthState(nextUsers, state.currentUserId);

      return {
        userProfile: nextProfile,
        authUsers: nextUsers,
      };
    });
  },
  addCompany: (payload) => {
    const companyId = `co${Date.now()}`;
    const safePayload: Omit<Company, 'id'> = {
      name: payload.name,
      logoUrl: payload.logoUrl ?? '',
      invoiceLogoUrl: payload.invoiceLogoUrl ?? '',
      address: payload.address ?? '',
      postalCode: payload.postalCode ?? '',
      city: payload.city ?? '',
      country: payload.country ?? '',
      phone: payload.phone ?? '',
      email: payload.email ?? '',
      website: payload.website ?? '',
      siret: payload.siret,
      vatNumber: payload.vatNumber ?? '',
      legalNotes: payload.legalNotes ?? '',
      documentHeaderTitle: payload.documentHeaderTitle,
      documentHeaderSubtitle: payload.documentHeaderSubtitle,
      documentHeaderNote: payload.documentHeaderNote,
      vatEnabled: payload.vatEnabled ?? true,
      isDefault: payload.isDefault ?? false,
      defaultSignatureId: payload.defaultSignatureId ?? null,
      bankName: payload.bankName ?? '',
      bankAddress: payload.bankAddress ?? '',
      iban: payload.iban ?? '',
      bic: payload.bic ?? '',
      planningUser: payload.planningUser ?? null,
    };
    const newCompany: Company = { id: companyId, ...safePayload };
    let insertedCompany = newCompany;
    set((state) => {
      const shouldBeDefault = safePayload.isDefault || state.companies.length === 0;
      const baseCompanies = shouldBeDefault
        ? state.companies.map((company) => ({ ...company, isDefault: false }))
        : state.companies;
      const companyToInsert: Company = {
        ...newCompany,
        isDefault: shouldBeDefault,
      };
      insertedCompany = companyToInsert;
      const nextCompanies = [...baseCompanies, companyToInsert];
      const nextActive = shouldBeDefault
        ? companyToInsert.id
        : state.activeCompanyId ?? companyToInsert.id;
      persistVatSettings({
        rate: state.vatRate,
        perCompany: nextCompanies.reduce<Record<string, boolean>>((acc, company) => {
          acc[company.id] = company.vatEnabled;
          return acc;
        }, {}),
      });
      return {
        companies: nextCompanies,
        activeCompanyId: nextActive,
        vatEnabled:
          nextActive === companyToInsert.id ? companyToInsert.vatEnabled : state.vatEnabled,
      };
    });
    return insertedCompany;
  },
  updateCompany: (companyId, updates) => {
    let updated: Company | null = null;
    set((state) => {
      const promoteDefault = updates.isDefault === true;
      let nextCompanies = state.companies.map((company) => {
        if (company.id !== companyId) {
          return promoteDefault ? { ...company, isDefault: false } : company;
        }
        updated = {
          ...company,
          ...updates,
          name: updates.name ?? company.name,
          logoUrl: updates.logoUrl ?? company.logoUrl,
          invoiceLogoUrl: updates.invoiceLogoUrl ?? company.invoiceLogoUrl,
          address: updates.address ?? company.address,
          postalCode: updates.postalCode ?? company.postalCode,
          city: updates.city ?? company.city,
          country: updates.country ?? company.country,
          phone: updates.phone ?? company.phone,
          email: updates.email ?? company.email,
          website: updates.website ?? company.website,
          siret: updates.siret ?? company.siret,
          vatNumber: updates.vatNumber ?? company.vatNumber,
          legalNotes: updates.legalNotes ?? company.legalNotes,
          documentHeaderTitle:
            updates.documentHeaderTitle !== undefined
              ? updates.documentHeaderTitle
              : company.documentHeaderTitle,
          documentHeaderSubtitle:
            updates.documentHeaderSubtitle !== undefined
              ? updates.documentHeaderSubtitle
              : company.documentHeaderSubtitle,
          documentHeaderNote:
            updates.documentHeaderNote !== undefined ? updates.documentHeaderNote : company.documentHeaderNote,
          vatEnabled: updates.vatEnabled ?? company.vatEnabled,
          isDefault: promoteDefault ? true : updates.isDefault ?? company.isDefault,
          defaultSignatureId:
            updates.defaultSignatureId !== undefined ? updates.defaultSignatureId : company.defaultSignatureId,
          bankName: updates.bankName ?? company.bankName,
          bankAddress: updates.bankAddress ?? company.bankAddress,
          iban: updates.iban ?? company.iban,
          bic: updates.bic ?? company.bic,
        };
        return updated;
      });
      if (!updated) {
        return {};
      }
      if (!nextCompanies.some((company) => company.isDefault)) {
        nextCompanies = nextCompanies.map((company, index) => ({
          ...company,
          isDefault: index === 0,
        }));
        updated = nextCompanies.find((company) => company.id === updated!.id) ?? updated;
      }
      const nextActive = promoteDefault
        ? updated.id
        : state.activeCompanyId && nextCompanies.some((company) => company.id === state.activeCompanyId)
        ? state.activeCompanyId
        : nextCompanies.find((company) => company.isDefault)?.id ?? nextCompanies[0]?.id ?? null;
      persistVatSettings({
        rate: state.vatRate,
        perCompany: nextCompanies.reduce<Record<string, boolean>>((acc, company) => {
          acc[company.id] = company.vatEnabled;
          return acc;
        }, {}),
      });
      return {
        companies: nextCompanies,
        activeCompanyId: nextActive,
        vatEnabled:
          nextActive && updated && nextActive === updated.id
            ? updated.vatEnabled
            : nextActive
            ? nextCompanies.find((company) => company.id === nextActive)?.vatEnabled ?? state.vatEnabled
            : state.vatEnabled,
      };
    });
    return updated;
  },
  removeCompany: (companyId) => {
    set((state) => {
      let nextCompanies = state.companies.filter((company) => company.id !== companyId);
      if (nextCompanies.length && !nextCompanies.some((company) => company.isDefault)) {
        nextCompanies = nextCompanies.map((company, index) => ({
          ...company,
          isDefault: index === 0,
        }));
      }
      const defaultCompany = nextCompanies.find((company) => company.isDefault) ?? null;
      const nextActive = nextCompanies.length
        ? state.activeCompanyId === companyId
          ? defaultCompany?.id ?? nextCompanies[0].id
          : state.activeCompanyId && nextCompanies.some((company) => company.id === state.activeCompanyId)
          ? state.activeCompanyId
          : defaultCompany?.id ?? nextCompanies[0].id
        : null;
      persistVatSettings({
        rate: state.vatRate,
        perCompany: nextCompanies.reduce<Record<string, boolean>>((acc, company) => {
          acc[company.id] = company.vatEnabled;
          return acc;
        }, {}),
      });
      return {
        companies: nextCompanies,
        activeCompanyId: nextActive,
        vatEnabled: nextActive
          ? nextCompanies.find((company) => company.id === nextActive)?.vatEnabled ?? true
          : true,
      };
    });
  },
  setActiveCompany: (companyId) => {
    set((state) => {
      const target = state.companies.find((company) => company.id === companyId);
      return {
        activeCompanyId: companyId,
        vatEnabled: target?.vatEnabled ?? state.vatEnabled,
      };
    });
  },
  setPendingEngagementSeed: (seed) => {
    set(() => ({ pendingEngagementSeed: seed }));
  },
  setVatEnabled: (enabled) => {
    set((state) => {
      const targetId = state.activeCompanyId ?? state.companies[0]?.id ?? null;
      if (!targetId) {
        return { vatEnabled: enabled };
      }
      const nextCompanies = state.companies.map((company) =>
        company.id === targetId ? { ...company, vatEnabled: enabled } : company
      );
      persistVatSettings({
        rate: state.vatRate,
        perCompany: nextCompanies.reduce<Record<string, boolean>>((acc, company) => {
          acc[company.id] = company.vatEnabled;
          return acc;
        }, {}),
      });
      return {
        companies: nextCompanies,
        vatEnabled: enabled,
      };
    });
  },
  setVatRate: (rate) => {
    set((state) => {
      const safeRate = Number.isFinite(rate) ? Math.max(0, rate) : state.vatRate;
      persistVatSettings({
        rate: safeRate,
        perCompany: state.companies.reduce<Record<string, boolean>>((acc, company) => {
          acc[company.id] = company.vatEnabled;
          return acc;
        }, {}),
      });
      return { vatRate: safeRate };
    });
  },
  setTheme: (mode) => {
    set(() => {
      persistTheme(mode);
      return { theme: mode };
    });
  },
  toggleTheme: () => {
    set((state) => {
      const nextMode: ThemeMode = state.theme === 'light' ? 'dark' : 'light';
      persistTheme(nextMode);
      return { theme: nextMode };
    });
  },
  setSidebarTitlePreference: (updates) => {
    set((state) => {
      const next: SidebarTitlePreference = {
        text:
          updates.text !== undefined
            ? updates.text
            : state.sidebarTitlePreference.text,
        hidden:
          updates.hidden !== undefined
            ? Boolean(updates.hidden)
            : state.sidebarTitlePreference.hidden,
      };
      persistSidebarTitlePreference(next);
      return { sidebarTitlePreference: next };
    });
  },
  resetSidebarTitlePreference: () => {
    set(() => {
      persistSidebarTitlePreference(DEFAULT_SIDEBAR_TITLE_PREFERENCE);
      return { sidebarTitlePreference: DEFAULT_SIDEBAR_TITLE_PREFERENCE };
    });
  },
  createEmailSignature: ({ scope, companyId = null, userId = null, label, html, isDefault }) => {
    const id = generateSignatureId();
    const timestamp = new Date().toISOString();
    const signature: EmailSignature = {
      id,
      scope,
      companyId,
      userId,
      label,
      html,
      isDefault: Boolean(isDefault),
      updatedAt: timestamp,
    };
    set((state) => {
      const nextSignatures = [...state.emailSignatures, signature];
      let updatedCompanies = state.companies;
      if (scope === 'company' && signature.companyId && signature.isDefault) {
        updatedCompanies = state.companies.map((company) =>
          company.id === signature.companyId ? { ...company, defaultSignatureId: signature.id } : company
        );
      }
      const normalizedSignatures = signature.isDefault
        ? nextSignatures.map((item) => {
            if (item.id === signature.id) {
              return item;
            }
            if (item.scope !== scope) {
              return item;
            }
            if (scope === 'company' && item.companyId === signature.companyId) {
              return { ...item, isDefault: false };
            }
            if (scope === 'user' && item.userId === signature.userId) {
              return { ...item, isDefault: false };
            }
            return item;
          })
        : nextSignatures;
      return {
        emailSignatures: normalizedSignatures,
        companies: updatedCompanies,
      };
    });
    return signature;
  },
  updateEmailSignatureRecord: (signatureId, updates) => {
    let updatedSignature: EmailSignature | null = null;
    set((state) => {
      const nextSignatures = state.emailSignatures.map((signature) => {
        if (signature.id !== signatureId) {
          return signature;
        }
        updatedSignature = {
          ...signature,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        return updatedSignature;
      });
      if (!updatedSignature) {
        return {};
      }
      let nextCompanies = state.companies;
      if (updatedSignature.scope === 'company' && updatedSignature.isDefault) {
        nextCompanies = state.companies.map((company) =>
          company.id === updatedSignature?.companyId
            ? { ...company, defaultSignatureId: updatedSignature?.id }
            : company
        );
      }
      const normalizedSignatures = updatedSignature.isDefault
        ? nextSignatures.map((signature) => {
            if (signature.id === updatedSignature?.id) {
              return signature;
            }
            if (signature.scope !== updatedSignature?.scope) {
              return signature;
            }
            if (
              updatedSignature?.scope === 'company' &&
              signature.companyId === updatedSignature.companyId
            ) {
              return { ...signature, isDefault: false };
            }
            if (updatedSignature?.scope === 'user' && signature.userId === updatedSignature.userId) {
              return { ...signature, isDefault: false };
            }
            return signature;
          })
        : nextSignatures;
      return {
        emailSignatures: normalizedSignatures,
        companies: nextCompanies,
      };
    });
    return updatedSignature;
  },
  removeEmailSignature: (signatureId) => {
    set((state) => {
      const target = state.emailSignatures.find((signature) => signature.id === signatureId);
      const nextSignatures = state.emailSignatures.filter((signature) => signature.id !== signatureId);
      let nextCompanies = state.companies;
      if (target?.scope === 'company' && target.companyId) {
        const company = state.companies.find((item) => item.id === target.companyId);
        if (company?.defaultSignatureId === signatureId) {
          const replacement = nextSignatures.find(
            (signature) => signature.scope === 'company' && signature.companyId === target.companyId
          );
          nextCompanies = state.companies.map((item) =>
            item.id === target.companyId ? { ...item, defaultSignatureId: replacement?.id ?? null } : item
          );
          if (replacement && !replacement.isDefault) {
            const patchedSignatures = nextSignatures.map((signature) =>
              signature.id === replacement.id ? { ...signature, isDefault: true } : signature
            );
            return {
              emailSignatures: patchedSignatures,
              companies: nextCompanies,
            };
          }
        }
      }
      return {
        emailSignatures: nextSignatures,
        companies: nextCompanies,
      };
    });
  },
  setDefaultEmailSignature: (signatureId) => {
    set((state) => {
      const target = state.emailSignatures.find((signature) => signature.id === signatureId);
      if (!target) {
        return {};
      }
      const nextSignatures = state.emailSignatures.map((signature) => {
        if (signature.id === signatureId) {
          return { ...signature, isDefault: true };
        }
        if (signature.scope !== target.scope) {
          return signature;
        }
        if (target.scope === 'company' && signature.companyId === target.companyId) {
          return { ...signature, isDefault: false };
        }
        if (target.scope === 'user' && signature.userId === target.userId) {
          return { ...signature, isDefault: false };
        }
        return signature;
      });
      let nextCompanies = state.companies;
      if (target.scope === 'company' && target.companyId) {
        nextCompanies = state.companies.map((company) =>
          company.id === target.companyId ? { ...company, defaultSignatureId: target.id } : company
        );
      }
      return {
        emailSignatures: nextSignatures,
        companies: nextCompanies,
      };
    });
  },
  getDefaultSignatureForCompany: (companyId) => {
    if (!companyId) {
      return null;
    }
    const { emailSignatures } = get();
    return (
      emailSignatures.find(
        (signature) => signature.scope === 'company' && signature.companyId === companyId && signature.isDefault
      ) ?? null
    );
  },
  getDefaultSignatureForUser: (userId, companyId) => {
    if (!userId) {
      return null;
    }
    const { emailSignatures } = get();
    return (
      emailSignatures.find((signature) => {
        if (signature.scope !== 'user' || signature.userId !== userId) {
          return false;
        }
        if (companyId && signature.companyId && signature.companyId !== companyId) {
          return false;
        }
        return signature.isDefault;
      }) ?? null
    );
  },
  resolveSignatureHtml: (companyId, userId) => {
    const { emailSignatures } = get();
    if (companyId) {
      const companySignature = emailSignatures.find(
        (signature) => signature.scope === 'company' && signature.companyId === companyId && signature.isDefault
      );
      if (companySignature) {
        return companySignature.html;
      }
    }
    if (userId) {
      const userSignature = emailSignatures.find(
        (signature) => signature.scope === 'user' && signature.userId === userId && signature.isDefault
      );
      if (userSignature) {
        return userSignature.html;
      }
    }
    return undefined;
  },
  hasPageAccess: (page) => {
    const user = get().getCurrentUser();
    if (!user) {
      return false;
    }
    if (user.pages.includes('*')) {
      return true;
    }
    return user.pages.includes(page);
  },
  hasPermission: (permission) => {
    const user = get().getCurrentUser();
    if (!user) {
      return false;
    }
    if (user.permissions.includes('*')) {
      return true;
    }
    return user.permissions.includes(permission);
  },
  login: (username, password) => {
    const normalizedInput = username.trim();
    const normalizedUsername = normalizedInput.toLowerCase();
    const candidate = get().authUsers.find(
      (user) => user.username.toLowerCase() === normalizedUsername
    );
    if (candidate && candidate.active && verifyPassword(password.trim(), candidate.passwordHash)) {
      set((state) => {
        persistAuthState(state.authUsers, candidate.id);
        return {
          currentUserId: candidate.id,
          userProfile: { ...candidate.profile },
          notificationPreferences: { ...candidate.notificationPreferences },
        };
      });
      return true;
    }
    return false;
  },
  logout: () => {
    set((state) => {
      persistAuthState(state.authUsers, null);
      return {
        currentUserId: null,
        userProfile: { ...initialProfile },
        notificationPreferences: { ...initialNotificationPreferences },
      };
    });
  },
  createUserAccount: ({ username, password, role, pages, permissions }) => {
    const actor = get().getCurrentUser();
    if (!actor || actor.role !== 'superAdmin') {
      return { success: false, error: 'Action non autorisée.' };
    }

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!trimmedUsername || !trimmedPassword) {
      return { success: false, error: 'Identifiant et mot de passe requis.' };
    }

    const normalizedUsername = trimmedUsername.toLowerCase();
    const exists = get().authUsers.some(
      (user) => user.username.toLowerCase() === normalizedUsername
    );
    if (exists) {
      return { success: false, error: 'Cet identifiant existe déjà.' };
    }

    const resolvedPages: (AppPageKey | '*')[] = pages.includes('*')
      ? ['*']
      : normalizePages(pages);
    const resolvedPermissions: (PermissionKey | '*')[] = permissions.includes('*')
      ? ['*']
      : normalizePermissions(permissions);

    const timestamp = Date.now();
    const newProfile: UserProfile = {
      id: `user-${timestamp}`,
      firstName: trimmedUsername,
      lastName: '',
      email: '',
      phone: '',
      role: USER_ROLE_LABELS[role],
      avatarUrl: undefined,
      password: '',
      emailSignatureHtml: '',
      emailSignatureUseDefault: true,
      emailSignatureUpdatedAt: new Date().toISOString(),
    };

    const newUser = sanitizeAuthUser({
      id: `auth-${timestamp}`,
      username: trimmedUsername,
      fullName: trimmedUsername,
      passwordHash: hashPassword(trimmedPassword),
      role,
      pages: resolvedPages,
      permissions: resolvedPermissions,
      active: true,
      profile: newProfile,
      notificationPreferences: { ...initialNotificationPreferences },
    });

    set((state) => {
      const nextUsers = [...state.authUsers, newUser];
      persistAuthState(nextUsers, state.currentUserId);
      return {
        authUsers: nextUsers,
      };
    });

    return { success: true };
  },
  updateUserAccount: (userId, updates) => {
    const actor = get().getCurrentUser();
    if (!actor || actor.role !== 'superAdmin') {
      return { success: false, error: 'Action non autorisée.' };
    }
    let didUpdate = false;
    set((state) => {
      let updatedUser: AuthUser | null = null;
      const nextUsers = state.authUsers.map((user) => {
        if (user.id !== userId) {
          return user;
        }
        didUpdate = true;
        const nextRole = updates.role ?? user.role;
        const nextPages: (AppPageKey | '*')[] = updates.pages
          ? updates.pages.includes('*')
            ? ['*']
            : normalizePages(updates.pages)
          : user.pages;
        const nextPermissions: (PermissionKey | '*')[] = updates.permissions
          ? updates.permissions.includes('*')
            ? ['*']
            : normalizePermissions(updates.permissions)
          : user.permissions;
        const mergedProfile = {
          ...user.profile,
          role: USER_ROLE_LABELS[nextRole] ?? user.profile.role,
        };
        const sanitized = sanitizeAuthUser({
          ...user,
          role: nextRole,
          pages: nextPages,
          permissions: nextPermissions,
          profile: mergedProfile,
        });
        updatedUser = sanitized;
        return sanitized;
      });
      if (!didUpdate || !updatedUser) {
        return {};
      }
      const ensuredUser = updatedUser as AuthUser;
      persistAuthState(nextUsers, state.currentUserId);
      const nextState: Partial<AppState> = {
        authUsers: nextUsers,
      };
      if (ensuredUser.id === state.currentUserId) {
        nextState.userProfile = { ...ensuredUser.profile };
        nextState.notificationPreferences = { ...ensuredUser.notificationPreferences };
      }
      return nextState;
    });
    if (!didUpdate) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }
    return { success: true };
  },
  setUserActiveState: (userId, active) => {
    const actor = get().getCurrentUser();
    if (!actor || actor.role !== 'superAdmin') {
      return { success: false, error: 'Action non autorisée.' };
    }
    let didUpdate = false;
    set((state) => {
      let updatedUser: AuthUser | null = null;
      const nextUsers = state.authUsers.map((user) => {
        if (user.id !== userId) {
          return user;
        }
        didUpdate = true;
        const sanitized = sanitizeAuthUser({
          ...user,
          active,
        });
        updatedUser = sanitized;
        return sanitized;
      });
      if (!didUpdate || !updatedUser) {
        return {};
      }
      const ensuredUser = updatedUser as AuthUser;
      let nextCurrentUserId = state.currentUserId;
      let nextProfile = state.userProfile;
      let nextNotifications = state.notificationPreferences;
      if (!active && userId === state.currentUserId) {
        nextCurrentUserId = null;
        nextProfile = { ...initialProfile };
        nextNotifications = { ...initialNotificationPreferences };
      } else if (userId === state.currentUserId) {
        nextProfile = { ...ensuredUser.profile };
        nextNotifications = { ...ensuredUser.notificationPreferences };
      }
      persistAuthState(nextUsers, nextCurrentUserId);
      return {
        authUsers: nextUsers,
        currentUserId: nextCurrentUserId,
        userProfile: nextProfile,
        notificationPreferences: nextNotifications,
      };
    });
    if (!didUpdate) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }
    return { success: true };
  },
  resetUserPassword: (userId, password) => {
    const actor = get().getCurrentUser();
    if (!actor || actor.role !== 'superAdmin') {
      return { success: false, error: 'Action non autorisée.' };
    }
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      return { success: false, error: 'Le mot de passe est requis.' };
    }
    let didUpdate = false;
    set((state) => {
      let updatedUser: AuthUser | null = null;
      const nextUsers = state.authUsers.map((user) => {
        if (user.id !== userId) {
          return user;
        }
        didUpdate = true;
        const sanitized = sanitizeAuthUser({
          ...user,
          passwordHash: hashPassword(trimmedPassword),
        });
        updatedUser = sanitized;
        return sanitized;
      });
      if (!didUpdate || !updatedUser) {
        return {};
      }
      const ensuredUser = updatedUser as AuthUser;
      persistAuthState(nextUsers, state.currentUserId);
      const nextState: Partial<AppState> = {
        authUsers: nextUsers,
      };
      if (userId === state.currentUserId) {
        nextState.userProfile = { ...ensuredUser.profile };
        nextState.notificationPreferences = { ...ensuredUser.notificationPreferences };
      }
      return nextState;
    });
    if (!didUpdate) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }
    return { success: true };
  },
}));
