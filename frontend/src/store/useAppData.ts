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
import {
  ClientService,
  ServiceService,
  AppointmentService,
  CompanyService,
  UserService,
  SubscriptionService,
} from '../api';

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
  pricingGrid?: ClientPricingGrid;
  city: string;
  status: 'Actif' | 'Non actif' | 'À appeler' | 'À contacter';
  tags: string[];
  lastService: string;
  contacts: ClientContact[];
  nextActionDate: string | null;
  nextActionNote: string;
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

export type ServiceCategory = string; // Catégories dynamiques

export type Service = {
  id: string;
  category: ServiceCategory;
  name: string;
  description?: string;
  options: ServiceOption[];
  active: boolean;
};

export type ClientPricingItem = {
  serviceId: string;
  serviceOptionId: string;
  defaultPriceHT: number;
  customPriceHT: number | null;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  comment?: string | null;
};

export type ClientPricingGrid = {
  pricingItems: ClientPricingItem[];
  lastModifiedAt?: string;
  lastModifiedBy?: string;
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
  quoteName?: string | null; // Nom du devis
  optionOverrides?: Record<string, EngagementOptionOverride>;
  mobileDurationMinutes?: number | null;
  mobileCompletionComment?: string | null;
  // Planning
  planningUser?: string | null; // 'clement', 'adrien', ou null pour tous
  startTime?: string; // Heure de début (ex: "09:00")
  // Services multiples pour devis avec plusieurs prestations
  services?: Array<{
    serviceId: string;
    optionIds: string[];
    optionOverrides?: Record<string, EngagementOptionOverride>;
    supportType: SupportType;
    supportDetail: string;
    mainCategoryId?: string;
    subCategoryId?: string;
    additionalCharge?: number;
    quantity?: number; // Quantité de la prestation
  }>;
};

export type SubscriptionStatus = 'actif' | 'suspendu' | 'terminé' | 'annulé';

export type SubscriptionFrequency = 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel';

export type Subscription = {
  id: string;
  clientId: string;
  vehicleInfo: string; // Informations sur la voiture (marque, modèle, immatriculation)
  startDate: string; // Date de début de l'abonnement
  endDate: string | null; // Date de fin (null si actif indéfiniment)
  status: SubscriptionStatus;
  frequency: SubscriptionFrequency;
  priceHT: number; // Prix HT de l'abonnement
  vatEnabled: boolean;
  documentId: string | null; // ID du document/contrat signé
  notes?: string; // Notes additionnelles
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionTemplate = {
  id: string;
  serviceId: string;
  optionId: string;
  name: string;
  basePriceHT: number; // Prix de la prestation d'origine
  subscriptionPriceHT: number; // Prix de l'abonnement
  frequency: SubscriptionFrequency;
  vatEnabled: boolean;
  reductionPercent: number; // Pourcentage de réduction calculé
  active: boolean;
  createdAt: string;
  updatedAt: string;
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
  companyId?: string | null;
  profileId?: string | null; // ID de l'utilisateur (authUser) associé à ce collaborateur
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

const mapApiCompanyToStoreCompany = (company: any): Company => ({
  id: company.id,
  name: company.name ?? '',
  logoUrl: company.logoUrl ?? '',
  invoiceLogoUrl: company.invoiceLogoUrl ?? '',
  address: company.address ?? '',
  postalCode: company.postalCode ?? '',
  city: company.city ?? '',
  country: company.country ?? 'France',
  phone: company.phone ?? '',
  email: company.email ?? '',
  website: company.website ?? '',
  siret: company.siret ?? '',
  vatNumber: company.vatNumber ?? '',
  legalNotes: company.legalNotes ?? '',
  documentHeaderTitle: company.documentHeaderTitle,
  documentHeaderSubtitle: company.documentHeaderSubtitle,
  documentHeaderNote: company.documentHeaderNote,
  vatEnabled: company.vatEnabled ?? true,
  isDefault: company.isDefault ?? false,
  defaultSignatureId: company.defaultSignatureId ?? null,
  bankName: company.bankName ?? '',
  bankAddress: company.bankAddress ?? '',
  iban: company.iban ?? '',
  bic: company.bic ?? '',
  planningUser: company.planningUser ?? null,
});

const buildVatPerCompanyMap = (companies: Company[]) =>
  companies.reduce<Record<string, boolean>>((acc, company) => {
    acc[company.id] = company.vatEnabled;
    return acc;
  }, {});

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
  companyId?: string | null;
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
  siret?: string;
  clientType?: 'company' | 'individual';
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

type BackendUserSnapshot = {
  id: string;
  username: string;
  fullName?: string;
  role?: string;
  companyId?: string | null;
  pages?: (AppPageKey | string | '*')[];
  permissions?: (PermissionKey | string | '*')[];
  active?: boolean;
  profile?: Partial<UserProfile>;
  notificationPreferences?: Partial<NotificationPreferences>;
};

type BackendCompanySnapshot = Partial<Company> & { id?: string };

type BackpackHydrationPayload = {
  user: BackendUserSnapshot;
  company?: BackendCompanySnapshot | null;
  companies?: BackendCompanySnapshot[] | null;
  settings: {
    vatEnabled?: boolean;
    vatRate?: number;
  };
};

type AppState = {
  clients: Client[];
  leads: Lead[];
  services: Service[];
  engagements: Engagement[];
  subscriptions: Subscription[];
  categories: Category[];
  subscriptionTemplates: SubscriptionTemplate[];
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
  getClientPricingGrid: (clientId: string) => ClientPricingGrid | undefined;
  getApplicablePrice: (clientId: string, serviceId: string, optionId: string, defaultPrice: number) => number;
  updateClientPricingGrid: (clientId: string, pricingGrid: ClientPricingGrid) => Promise<{ success: boolean; error?: string; data?: Client }>;
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
  removeLeadActivity: (leadId: string, activityId: string) => boolean;
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
  addSubscription: (payload: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => Subscription;
  updateSubscription: (subscriptionId: string, updates: Partial<Omit<Subscription, 'id' | 'createdAt'>>) => Subscription | null;
  removeSubscription: (subscriptionId: string) => void;
  getClientRevenue: (clientId: string) => number;
  getClientEngagements: (clientId: string) => Engagement[];
  getClientSubscriptions: (clientId: string) => Subscription[];
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
  addCategory: (payload: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Category;
  updateCategory: (categoryId: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>) => Category | null;
  removeCategory: (categoryId: string) => void;
  addSubscriptionTemplate: (payload: Omit<SubscriptionTemplate, 'id' | 'createdAt' | 'updatedAt' | 'reductionPercent'>) => SubscriptionTemplate;
  updateSubscriptionTemplate: (templateId: string, updates: Partial<Omit<SubscriptionTemplate, 'id' | 'createdAt'>>) => SubscriptionTemplate | null;
  removeSubscriptionTemplate: (templateId: string) => void;
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
  addProject: (payload: Omit<Project, 'id' | 'tasks'> & { tasks?: ProjectTask[] }) => Project;
  updateProject: (projectId: string, updates: Partial<Omit<Project, 'id'>>) => Project | null;
  removeProject: (projectId: string) => void;
  addProjectMember: (payload: Omit<ProjectMember, 'id' | 'avatarColor'> & { avatarColor?: string }) => ProjectMember;
  updateProjectMember: (memberId: string, updates: Partial<Omit<ProjectMember, 'id'>>) => ProjectMember | null;
  removeProjectMember: (memberId: string) => void;
  hydrateFromBackpack: (payload: BackpackHydrationPayload) => void;
  updateUserProfile: (updates: Partial<Omit<UserProfile, 'id'>> & { companyId?: string | null }) => void;
  updateNotificationPreferences: (updates: Partial<NotificationPreferences>) => void;
  updateUserAvatar: (avatarUrl: string) => void;
  addCompany: (payload: Omit<Company, 'id'>) => Company;
  updateCompany: (companyId: string, updates: Partial<Omit<Company, 'id'>>) => Company | null;
  removeCompany: (companyId: string) => void;
  setActiveCompany: (companyId: string | null) => Promise<void>;
  clearCompanyData: () => void;
  loadCompanyBackpack: (companyId: string) => Promise<void>;
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
      companyId?: string | null;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  updateUserAccount: (
    userId: string,
    updates: {
      role?: UserRole;
      pages?: (AppPageKey | '*')[];
      permissions?: (PermissionKey | '*')[];
      companyId?: string | null;
    }
  ) => { success: boolean; error?: string };
  setUserActiveState: (userId: string, active: boolean) => { success: boolean; error?: string };
  resetUserPassword: (userId: string, password: string) => { success: boolean; error?: string };
  deleteUser: (userId: string) => { success: boolean; error?: string };
};

const buildCompanyStateFromBackend = (
  state: AppState,
  backendCompanies: any[]
): Partial<AppState> => {
  console.log('🟡🟡🟡 [buildCompanyStateFromBackend] DÉBUT');
  console.log('🟡🟡🟡 [buildCompanyStateFromBackend] backendCompanies reçues:', backendCompanies);
  console.log('🟡🟡🟡 [buildCompanyStateFromBackend] Nombre d\'entreprises:', backendCompanies.length);
  console.log('🟡🟡🟡 [buildCompanyStateFromBackend] State actuel - companies:', state.companies);
  console.log('🟡🟡🟡 [buildCompanyStateFromBackend] State actuel - activeCompanyId:', state.activeCompanyId);
  
  const mapped = backendCompanies.map(mapApiCompanyToStoreCompany);
  console.log('🟡🟡🟡 [buildCompanyStateFromBackend] Entreprises mappées:', mapped);
  
  const nextActive =
    state.activeCompanyId && mapped.some((company) => company.id === state.activeCompanyId)
      ? state.activeCompanyId
      : mapped.find((company) => company.isDefault)?.id ?? mapped[0]?.id ?? null;
  console.log('🟡🟡🟡 [buildCompanyStateFromBackend] nextActive:', nextActive);
  
  const nextVatEnabled = nextActive
    ? mapped.find((company) => company.id === nextActive)?.vatEnabled ?? state.vatEnabled
    : true;

  persistVatSettings({
    rate: state.vatRate,
    perCompany: buildVatPerCompanyMap(mapped),
  });

  const finalState = {
    companies: mapped,
    activeCompanyId: nextActive,
    vatEnabled: nextVatEnabled,
  };
  
  console.log('🟡🟡🟡 [buildCompanyStateFromBackend] ÉTAT FINAL retourné:', finalState);
  console.log('🟡🟡🟡 [buildCompanyStateFromBackend] Nombre d\'entreprises dans finalState:', finalState.companies.length);
  console.log('🟡🟡🟡 [buildCompanyStateFromBackend] FIN');
  
  return finalState;
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

// Profil initial neutre - utilisé quand aucun utilisateur n'est connecté
const initialProfile: UserProfile = {
  id: 'user-default',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: '',
  avatarUrl: undefined,
  password: '',
  emailSignatureHtml: '',
  emailSignatureUseDefault: true,
  emailSignatureUpdatedAt: undefined,
};

const initialNotificationPreferences: NotificationPreferences = {
  emailAlerts: true,
  internalAlerts: true,
  smsAlerts: false,
};

const nowIso = new Date().toISOString();

const initialEmailSignatures: EmailSignature[] = [];

const initialCompanies: Company[] = [];

const initialVehicles: Vehicle[] = [];

const initialDocumentWorkspace: DocumentWorkspace = {
  driveRootUrl: '',
  lastSync: new Date().toISOString(),
  contact: '',
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

// Utilisateur admin minimal par défaut pour permettre la première connexion
// Identifiant: admin / Mot de passe: admin
// Profil neutre sans informations personnelles
const initialAuthUsers: AuthUser[] = [
  {
    id: 'auth-admin',
    username: 'admin',
    fullName: 'Administrateur',
    passwordHash: hashPassword('admin'),
    role: 'superAdmin',
    pages: ['*'],
    permissions: ['*'],
    active: true,
    profile: {
      id: 'user-admin',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'Administrateur',
      avatarUrl: undefined,
      password: '',
      emailSignatureHtml: '',
      emailSignatureUseDefault: true,
      emailSignatureUpdatedAt: undefined,
    },
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

  const companyId = user.companyId !== undefined ? user.companyId : null;

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
    companyId,
  };
};

const generateCompanyId = () => `co-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeCompanySnapshot = (company: BackendCompanySnapshot): Company => ({
  id: company.id ?? generateCompanyId(),
  name: company.name ?? '',
  logoUrl: company.logoUrl ?? '',
  invoiceLogoUrl: company.invoiceLogoUrl ?? '',
  address: company.address ?? '',
  postalCode: company.postalCode ?? '',
  city: company.city ?? '',
  country: company.country ?? '',
  phone: company.phone ?? '',
  email: company.email ?? '',
  website: company.website ?? '',
  siret: company.siret ?? '',
  vatNumber: company.vatNumber ?? '',
  legalNotes: company.legalNotes ?? '',
  documentHeaderTitle: company.documentHeaderTitle ?? '',
  documentHeaderSubtitle: company.documentHeaderSubtitle ?? '',
  documentHeaderNote: company.documentHeaderNote ?? '',
  vatEnabled: typeof company.vatEnabled === 'boolean' ? company.vatEnabled : true,
  isDefault: typeof company.isDefault === 'boolean' ? company.isDefault : false,
  defaultSignatureId: company.defaultSignatureId ?? null,
  bankName: company.bankName ?? '',
  bankAddress: company.bankAddress ?? '',
  iban: company.iban ?? '',
  bic: company.bic ?? '',
  planningUser: company.planningUser ?? null,
});

const dedupeCompanies = (companies: Company[]): Company[] => {
  const seen = new Set<string>();
  const next: Company[] = [];
  for (const company of companies) {
    if (!company.id) {
      continue;
    }
    if (seen.has(company.id)) {
      continue;
    }
    seen.add(company.id);
    next.push(company);
  }
  return next;
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
    
    // En production, on peut vouloir nettoyer les anciens utilisateurs
    // Pour l'instant, on retourne les données telles quelles
    // Les utilisateurs seront gérés via l'interface d'administration
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

const initialDocuments: DocumentRecord[] = [];

const persistedVatSettings = loadPersistedVatSettings();

const initialVatSettings: PersistedVatSettings = {
  perCompany: {},
  rate: persistedVatSettings?.rate ?? 0.2,
};

// Plus besoin de boucler sur initialCompanies car il est vide

const initialClients: Client[] = [];

const initialLeads: Lead[] = [];

const initialServices: Service[] = [];

const initialEngagements: Engagement[] = [];

const initialCategories: Category[] = [];

const initialPurchases: Purchase[] = [];

const kpis: Kpi[] = [
  { label: 'Prestations', day: 0, week: 0 },
  { label: "Chiffre d'affaires estimé", day: 0, week: 0 },
  { label: 'Durée totale', day: 0, week: 0 },
];

const baseStats = {
  revenueSeries: [],
  volumeSeries: [],
  topServices: [],
  averageDuration: 0,
  cities: [],
};

const notes: Note[] = [];

const projectMembers: ProjectMember[] = [];

const projects: Project[] = [];

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
  
  // Utiliser base_duration comme fallback si optionIds est vide ou si aucune option n'est trouvée
  const serviceBaseDuration = (service as any).base_duration;
  
  const overrides = sanitizeOptionOverrides(engagement.optionIds, engagement.optionOverrides);
  const selectedOptions = service.options.filter((option) => engagement.optionIds.includes(option.id));
  
  // Si aucune option n'est trouvée, utiliser base_duration si disponible
  if (selectedOptions.length === 0) {
    if (serviceBaseDuration !== undefined && serviceBaseDuration !== null) {
      return serviceBaseDuration;
    }
    return 0;
  }
  
  return selectedOptions.reduce((acc, option) => {
    const override = overrides[option.id];
    const quantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
    const durationValue = override?.durationMin ?? option.defaultDurationMin;
    return acc + durationValue * quantity;
  }, 0);
};

const computeTotals = (engagement: Engagement, catalogue: Service[] = initialServices, categories: Category[] = []) => {
  // Si l'engagement a un champ services (plusieurs prestations), utiliser celui-ci
  const engagementServices = (engagement as any).services;
  
  if (engagementServices && Array.isArray(engagementServices) && engagementServices.length > 0) {
    // Calculer le total depuis toutes les prestations avec leurs quantités
    let totalPrice = 0;
    let totalDuration = 0;
    
    engagementServices.forEach((serviceItem: any) => {
      const service = catalogue.find((item) => item.id === serviceItem.serviceId);
      if (!service) return;
      
      const serviceQuantity = serviceItem.quantity ?? 1;
      
      // Prix du service
      let servicePrice = 0;
      // Priorité au base_price si disponible
      if ((service as any).base_price !== undefined && (service as any).base_price !== null) {
        servicePrice = (service as any).base_price;
      } else if (service.options && Array.isArray(service.options) && serviceItem.optionIds && serviceItem.optionIds.length > 0) {
        // Sinon, calculer depuis les options sélectionnées
        const overrides = sanitizeOptionOverrides(serviceItem.optionIds, serviceItem.optionOverrides || {});
        servicePrice = service.options
          .filter((option) => serviceItem.optionIds.includes(option.id))
          .reduce((acc, option) => {
            const override = overrides[option.id];
            const optionQuantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
            const unitPrice = override?.unitPriceHT ?? option.unitPriceHT;
            return acc + unitPrice * optionQuantity;
          }, 0);
      }
      
      // Ajouter le prix de la sous-catégorie si elle existe
      const subCategory = serviceItem.subCategoryId 
        ? categories.find((cat) => cat.id === serviceItem.subCategoryId)
        : null;
      const subCategoryPrice = subCategory?.priceHT || 0;
      
      // Multiplier par la quantité du service
      totalPrice += (servicePrice + subCategoryPrice) * serviceQuantity;
      
      // Durée du service
      let serviceDuration = 0;
      // Priorité au base_duration si disponible
      if ((service as any).base_duration !== undefined && (service as any).base_duration !== null) {
        serviceDuration = (service as any).base_duration;
      } else if (service.options && Array.isArray(service.options) && serviceItem.optionIds && serviceItem.optionIds.length > 0) {
        // Sinon, calculer depuis les options sélectionnées
        const overrides = sanitizeOptionOverrides(serviceItem.optionIds, serviceItem.optionOverrides || {});
        serviceDuration = service.options
          .filter((option) => serviceItem.optionIds.includes(option.id))
          .reduce((acc, option) => {
            const override = overrides[option.id];
            const optionQuantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
            const durationValue = override?.durationMin ?? option.defaultDurationMin ?? 0;
            return acc + durationValue * optionQuantity;
          }, 0);
      }
      
      // Ajouter la durée de la sous-catégorie si définie
      const subCategoryDuration = (subCategory as any)?.defaultDurationMin || 0;
      
      // Multiplier par la quantité du service
      totalDuration += (serviceDuration + subCategoryDuration) * serviceQuantity;
    });
    
    const surcharge = engagement.additionalCharge ?? 0;
    return { price: totalPrice, duration: totalDuration, surcharge };
  }
  
  // Rétrocompatibilité : utiliser l'ancien système (serviceId unique)
  const service = catalogue.find((item) => item.id === engagement.serviceId);
  if (!service) {
    console.warn('[computeTotals] Service non trouvé:', {
      engagementId: engagement.id,
      serviceId: engagement.serviceId,
      catalogueLength: catalogue.length,
      availableServiceIds: catalogue.slice(0, 5).map(s => s.id)
    });
    return { price: 0, duration: 0, surcharge: 0 };
  }
  
  // Utiliser base_price et base_duration comme fallback si optionIds est vide ou si aucune option n'est trouvée
  const serviceBasePrice = (service as any).base_price;
  const serviceBaseDuration = (service as any).base_duration;
  
  const overrides = sanitizeOptionOverrides(engagement.optionIds, engagement.optionOverrides);
  const selectedOptions = service.options.filter((option) => engagement.optionIds.includes(option.id));
  
  // Debug : vérifier si les optionIds sont présents
  if (selectedOptions.length === 0 && engagement.optionIds && engagement.optionIds.length > 0) {
    console.warn('[computeTotals] Aucune option trouvée:', {
      engagementId: engagement.id,
      serviceId: engagement.serviceId,
      serviceName: service.name,
      optionIds: engagement.optionIds,
      availableOptionIds: service.options.map(o => o.id),
      serviceOptionsCount: service.options?.length || 0
    });
  }
  
  // Calculer le prix : utiliser base_price si optionIds est vide ou si aucune option n'est trouvée
  let price: number;
  if (selectedOptions.length === 0) {
    // Aucune option sélectionnée ou trouvée : utiliser base_price si disponible
    if (serviceBasePrice !== undefined && serviceBasePrice !== null) {
      price = serviceBasePrice;
    } else {
      // Fallback : calculer depuis les options si possible, sinon 0
      price = 0;
    }
  } else {
    // Options trouvées : calculer depuis les options
    price = selectedOptions.reduce((acc, option) => {
      const override = overrides[option.id];
      const quantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
      const unitPrice = override?.unitPriceHT ?? option.unitPriceHT;
      return acc + unitPrice * quantity;
    }, 0);
  }
  
  // Ajouter le prix et la durée de la sous-catégorie si elle existe
  const subCategoryId = (engagement as any).subCategoryId;
  const subCategory = subCategoryId 
    ? categories.find((cat) => cat.id === subCategoryId)
    : null;
  const subCategoryPrice = subCategory?.priceHT || 0;
  const subCategoryDuration = (subCategory as any)?.defaultDurationMin || 0;
  
  // Ajouter le prix de la sous-catégorie au prix total
  price = price + subCategoryPrice;
  
  // Utiliser la durée réelle si le service est réalisé et qu'une durée mobile est enregistrée
  let duration: number;
  if (engagement.status === 'réalisé' && engagement.mobileDurationMinutes && engagement.mobileDurationMinutes > 0) {
    duration = engagement.mobileDurationMinutes;
  } else {
    // Sinon, utiliser la durée estimée du devis + durée de la sous-catégorie
    const estimatedDuration = computeEstimatedDuration(engagement, catalogue);
    duration = estimatedDuration + subCategoryDuration;
  }
  
  const surcharge = engagement.additionalCharge ?? 0;
  return { price, duration, surcharge };
};

const buildSlots = (currentEngagements: Engagement[], currentServices: Service[], currentCategories: Category[] = []): Slot[] =>
  currentEngagements.map((engagement) => {
    const startDate = new Date(engagement.scheduledAt);
    const { duration } = computeTotals(engagement, currentServices, currentCategories);
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
// Fusionner les utilisateurs persistés avec les utilisateurs initiaux
// S'assurer que l'utilisateur admin est toujours présent
let rawAuthUsers: AuthUser[] = [];
if (persistedAuthState && persistedAuthState.authUsers.length > 0) {
  // Si on a des utilisateurs persistés, les utiliser
  rawAuthUsers = persistedAuthState.authUsers;
  // Mais s'assurer que l'utilisateur admin existe (au cas où il aurait été supprimé)
  const adminExists = rawAuthUsers.some((user) => user.username.toLowerCase() === 'admin');
  if (!adminExists) {
    rawAuthUsers = [...initialAuthUsers, ...rawAuthUsers];
  }
} else {
  // Sinon, utiliser les utilisateurs initiaux
  rawAuthUsers = initialAuthUsers;
}

// Filtrer pour supprimer "Adrien Martin" s'il existe
const filteredRawAuthUsers = rawAuthUsers.filter((user) => {
  const username = (user.username || '').toLowerCase();
  const fullName = (user.fullName || '').toLowerCase();
  const isAdrienMartin = 
    username.includes('adrien') || 
    fullName.includes('adrien martin') ||
    (fullName.includes('adrien') && fullName.includes('martin'));
  
  if (isAdrienMartin) {
    console.log('[AppData] 🗑️ Suppression automatique de l\'utilisateur:', user.username || user.fullName || user.id);
  }
  
  return !isAdrienMartin;
});

const seedAuthUsers = filteredRawAuthUsers.map((user) => {
  const sanitized = sanitizeAuthUser(user);
  // S'assurer que l'utilisateur admin garde son hash de mot de passe original
  if (user.username.toLowerCase() === 'admin' && user.passwordHash) {
    sanitized.passwordHash = user.passwordHash;
  }
  return sanitized;
});

// Debug: afficher les utilisateurs chargés au démarrage
console.log('[AppData] Utilisateurs chargés au démarrage:', seedAuthUsers.map(u => ({ 
  username: u.username, 
  active: u.active, 
  hasPasswordHash: !!u.passwordHash,
  passwordHashLength: u.passwordHash?.length || 0
})));
// Déterminer l'utilisateur connecté initial depuis le state persisté (remember me)
let initialCurrentUserId: string | null = null;
if (persistedAuthState && typeof persistedAuthState.currentUserId === 'string') {
  const existsAndActive = seedAuthUsers.some(
    (u) => u.id === persistedAuthState.currentUserId && u.active
  );
  initialCurrentUserId = existsAndActive ? persistedAuthState.currentUserId : null;
}

// Rétrocompat: variables historiques non utilisées mais gardées pour clarté
const seedCurrentUserId = initialCurrentUserId;
const resolvedCurrentUser = null;
// Utiliser le profil initial par défaut
const seedProfileSource = initialProfile;
const seedNotificationSource = initialNotificationPreferences;
const initialTheme = resolveInitialTheme();
const initialSidebarTitlePreference = resolveInitialSidebarTitlePreference();
export const useAppData = create<AppState>((set, get) => ({
  clients: initialClients,
  leads: initialLeads,
  services: initialServices,
  engagements: initialEngagements,
  subscriptions: [],
  categories: [],
  subscriptionTemplates: [],
  purchases: initialPurchases,
  vehicles: initialVehicles,
  notes,
  slots: buildSlots(initialEngagements, initialServices, initialCategories),
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
  activeCompanyId: (() => {
    // Charger activeCompanyId depuis localStorage si disponible
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('erp_active_company_id');
        return stored || null;
      } catch {
        return null;
      }
    }
    return null;
  })(),
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
  vatEnabled: true, // Par défaut, TVA activée
  vatRate: initialVatSettings.rate,
  theme: initialTheme,
  sidebarTitlePreference: initialSidebarTitlePreference,
  getCurrentUser: () => {
    const { authUsers, currentUserId } = get();
    const user = authUsers.find((candidate) => candidate.id === currentUserId);
    return user && user.active ? user : null;
  },
  getClient: (id) => get().clients.find((client) => client.id === id) ?? undefined,
  getClientPricingGrid: (clientId: string) => {
    const client = get().clients.find((c) => c.id === clientId);
    return client?.pricingGrid;
  },
  getApplicablePrice: (clientId: string, serviceId: string, optionId: string, defaultPrice: number) => {
    const client = get().clients.find((c) => c.id === clientId);
    if (!client?.pricingGrid) {
      return defaultPrice;
    }
    const pricingItem = client.pricingGrid.pricingItems.find(
      (item) => item.serviceId === serviceId && item.serviceOptionId === optionId
    );
    return pricingItem?.customPriceHT ?? defaultPrice;
  },
  updateClientPricingGrid: async (clientId: string, pricingGrid: ClientPricingGrid) => {
    const { ClientService } = await import('../api/services/clients');
    const result = await ClientService.updatePricingGrid(clientId, pricingGrid);
    
    if (result.success && result.data) {
      set((state) => ({
        clients: state.clients.map((client) =>
          client.id === clientId
            ? { ...client, pricingGrid: result.data?.pricingGrid ?? pricingGrid }
            : client
        ),
      }));
      return { success: true, data: result.data };
    }
    
    return { success: false, error: result.error };
  },
  getService: (id) => get().services.find((service) => service.id === id) ?? undefined,
  getCompany: (id) => get().companies.find((company) => company.id === id) ?? undefined,
  getProjectMember: (id) => get().projectMembers.find((member) => member.id === id),
  computeEngagementTotals: (engagement) => {
    const { services, categories } = get();
    return computeTotals(engagement, services, categories);
  },
  computeDurationPerformance: () => {
    const { engagements, services } = get();
    return computeDurationPerformance(engagements, services);
  },
  addLead: (payload) => {
    // Générer un ID unique avec timestamp + random pour éviter les collisions
    const uniqueId = `l${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newLead: Lead = {
      ...payload,
      id: uniqueId,
      createdAt: new Date().toISOString(),
      lastContact: payload.lastContact ?? null,
      activities: [],
    };
    set((state) => ({
      leads: [newLead, ...state.leads],
    }));
    
    // Synchroniser avec le backend
    const leadToSync = { ...newLead };
    Promise.resolve()
      .then(() => import('../api').then(m => m.LeadService.create(leadToSync)))
      .then(async (result) => {
        if (result?.success && result.data) {
          // Mettre à jour uniquement ce lead au lieu de recharger toute la liste
          const backendLead = result.data;
          const originalId = newLead.id;
          const backendId = backendLead.id || originalId;
          
          set((state) => ({
            leads: state.leads.map((lead) => {
              if (lead.id === originalId) {
                // Mettre à jour avec les données du backend
                return {
                  ...lead,
                  ...backendLead,
                  id: backendId,
                  activities: Array.isArray((backendLead as any).activities) 
                    ? (backendLead as any).activities 
                    : lead.activities,
                };
              }
              return lead;
            }),
          }));
          
          console.log('[Store] ✅ Lead créé et synchronisé:', backendId);
        } else {
          console.error('[Store] ❌ Erreur synchronisation lead:', result?.error);
        }
      })
      .catch((error) => {
        console.error('[Store] ❌ Erreur création lead:', error);
      });
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
    if (updated) {
      Promise.resolve()
        .then(() => import('../api').then(m => m.LeadService.update(leadId, updated!)))
        .then(async (result) => {
          if (result?.success) {
            const refreshed = await import('../api').then(m => m.LeadService.getAll());
            if (refreshed.success && refreshed.data) {
              set({ leads: refreshed.data as any });
            }
          }
        })
        .catch(() => {});
    }
    return updated;
  },
  removeLead: (leadId) => {
    set((state) => ({
      leads: state.leads.filter((lead) => lead.id !== leadId),
    }));
    Promise.resolve()
      .then(() => import('../api').then(m => m.LeadService.delete(leadId)))
      .then(async () => {
        const refreshed = await import('../api').then(m => m.LeadService.getAll());
        if (refreshed.success && refreshed.data) {
          set({ leads: refreshed.data as any });
        }
      })
      .catch(() => {});
  },
  recordLeadActivity: (leadId, activity) => {
    let recorded: LeadActivity | null = null;
    let updatedLead: Lead | null = null;
    set((state) => ({
      leads: state.leads.map((lead) => {
        if (lead.id !== leadId) {
          return lead;
        }
        recorded = {
          id: `la${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          ...activity,
        };
        const nextActivities = [recorded, ...lead.activities];
        updatedLead = {
          ...lead,
          activities: nextActivities,
          lastContact: activity.type === 'call' ? recorded.createdAt : lead.lastContact,
        };
        return updatedLead;
      }),
    }));
    
    // Synchroniser avec le backend
    if (updatedLead && recorded) {
      const leadToSync = { ...updatedLead };
      Promise.resolve()
        .then(() => import('../api').then(m => m.LeadService.update(leadId, leadToSync)))
        .then(async (result) => {
          if (result?.success && result.data) {
            // Le backend renvoie le lead avec toutes les activités
            // On met à jour uniquement ce lead dans la liste
            const backendLead = result.data;
            set((state) => ({
              leads: state.leads.map((lead) => {
                if (lead.id !== leadId) {
                  return lead;
                }
                // Préserver les activités du backend (qui incluent la nouvelle activité)
                return {
                  ...lead,
                  ...backendLead,
                  activities: Array.isArray((backendLead as any).activities) 
                    ? (backendLead as any).activities 
                    : updatedLead.activities,
                };
              }),
            }));
            console.log('[Store] ✅ Activité lead synchronisée:', recorded.id);
          } else {
            console.error('[Store] ❌ Erreur synchronisation activité lead:', result?.error);
          }
        })
        .catch((error) => {
          console.error('[Store] ❌ Erreur synchronisation activité lead:', error);
        });
    }
    
    return recorded;
  },
  removeLeadActivity: (leadId, activityId) => {
    let removed = false;
    set((state) => ({
      leads: state.leads.map((lead) => {
        if (lead.id !== leadId) {
          return lead;
        }
        const nextActivities = lead.activities.filter((activity) => activity.id !== activityId);
        removed = nextActivities.length < lead.activities.length;
        return {
          ...lead,
          activities: nextActivities,
        };
      }),
    }));
    return removed;
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
    
    // Préparer les données pour le backend
    const clientDataForBackend = {
      type,
      name,
      companyName: type === 'company' ? companyName : null,
      firstName: type === 'individual' ? firstName : null,
      lastName: type === 'individual' ? lastName : null,
      siret,
      email,
      phone,
      address,
      city,
      status: payload.status || 'Actif',
      tags,
      contacts: baseContacts,
    };
    set((state) => {
      // Générer un ID unique avec timestamp + random pour éviter les collisions
      const uniqueId = `c${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newClient: Client = {
        id: uniqueId,
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
      const originalId = created.id;
      ClientService.createClient(created)
        .then(async (result) => {
        if (result.success && result.data) {
            // Mettre à jour uniquement le client créé avec les données du backend
            const backendClient = result.data;
            const backendId = backendClient.id || originalId;
            const mappedClient: Client = {
              id: backendId,
              type: backendClient.type || created.type,
              name: backendClient.name || created.name,
              companyName: backendClient.type === 'company' ? (backendClient.companyName ?? backendClient.name ?? created.companyName ?? null) : (created.companyName ?? null),
              firstName: backendClient.type === 'individual' ? (backendClient.firstName ?? created.firstName ?? null) : (created.firstName ?? null),
              lastName: backendClient.type === 'individual' ? (backendClient.lastName ?? created.lastName ?? null) : (created.lastName ?? null),
              siret: (backendClient as any).siret || created.siret || '',
              email: backendClient.email || created.email || '',
              phone: backendClient.phone || created.phone || '',
              address: (backendClient as any).address || created.address || '',
              city: (backendClient as any).city || created.city || '',
              status: (backendClient.status as 'Actif' | 'Prospect') || created.status || 'Actif',
              tags: Array.isArray((backendClient as any).tags) ? (backendClient as any).tags : created.tags || [],
              lastService: (backendClient as any).lastService || created.lastService || null,
              contacts: Array.isArray((backendClient as any).contacts) && (backendClient as any).contacts.length > 0 
                ? (backendClient as any).contacts 
                : (created.contacts && created.contacts.length > 0 ? created.contacts : []),
            };
            
            // Mettre à jour uniquement ce client dans la liste au lieu de tout recharger
            set((state) => {
              // Si l'ID a changé, trouver le client par l'ID original et le remplacer
              const existingIndex = state.clients.findIndex((client) => client.id === originalId);
              if (existingIndex >= 0) {
                // Si l'ID a changé, remplacer le client à l'index trouvé
                const updatedClients = [...state.clients];
                updatedClients[existingIndex] = mappedClient;
                return { clients: updatedClients };
              } else {
                // Si le client n'est pas trouvé, l'ajouter à la liste (ne devrait pas arriver)
                return { clients: [mappedClient, ...state.clients] };
              }
            });
            
            console.log('[Store] ✅ Client créé et synchronisé:', mappedClient.id);
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
          contacts: (updates as any).contacts !== undefined 
            ? ensureBillingDefault(cloneContacts((updates as any).contacts))
            : ensureBillingDefault(cloneContacts(client.contacts)),
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
            if (refreshed.success && refreshed.data) {
              // Mapper les données de l'API vers le format du store
              const mappedClients: Client[] = refreshed.data.map((apiClient) => ({
                id: apiClient.id || `client-${Date.now()}`,
                type: apiClient.type || 'company',
                name: apiClient.name || '',
                companyName: apiClient.type === 'company' ? apiClient.name : null,
                firstName: apiClient.type === 'individual' ? apiClient.name.split(' ')[0] || null : null,
                lastName: apiClient.type === 'individual' ? apiClient.name.split(' ').slice(1).join(' ') || null : null,
                siret: (apiClient as any).siret || '',
                email: apiClient.email || '',
                phone: apiClient.phone || '',
                address: (apiClient as any).address || '',
                city: (apiClient as any).city || '',
                status: (apiClient.status as 'Actif' | 'Prospect') || 'Actif',
                tags: (apiClient as any).tags || [],
                lastService: (apiClient as any).lastService || '',
                contacts: (apiClient as any).contacts || [],
              }));
              set({ clients: mappedClients });
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
        slots: buildSlots(nextEngagements, state.services, state.categories),
      };
    });
    // Synchroniser backend puis re-fetch la liste
    ClientService.deleteClient(clientId)
      .then(async (result) => {
        const refreshed = await ClientService.getClients();
        if (refreshed.success && refreshed.data) {
          // Mapper les données de l'API vers le format du store
          const mappedClients: Client[] = refreshed.data.map((apiClient) => ({
            id: apiClient.id || `client-${Date.now()}`,
            type: apiClient.type || 'company',
            name: apiClient.name || '',
            companyName: apiClient.type === 'company' ? apiClient.name : null,
            firstName: apiClient.type === 'individual' ? apiClient.name.split(' ')[0] || null : null,
            lastName: apiClient.type === 'individual' ? apiClient.name.split(' ').slice(1).join(' ') || null : null,
            siret: (apiClient as any).siret || '',
            email: apiClient.email || '',
            phone: apiClient.phone || '',
            address: (apiClient as any).address || '',
            city: (apiClient as any).city || '',
            status: (apiClient.status as 'Actif' | 'Prospect') || 'Actif',
            tags: (apiClient as any).tags || [],
            lastService: (apiClient as any).lastService || '',
            contacts: (apiClient as any).contacts || [],
          }));
          set({ clients: mappedClients });
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
        slots: buildSlots(nextEngagements, state.services, state.categories),
      };
    });
  },
  addEngagement: (payload) => {
    console.log('📝 [Store] ========== DÉBUT addEngagement ==========');
    console.log('📝 [Store] Payload reçu:', {
      kind: payload.kind,
      clientId: payload.clientId,
      serviceId: payload.serviceId,
      optionIds: payload.optionIds?.length || 0,
      optionIdsArray: payload.optionIds,
      services: (payload as any).services ? `Array(${(payload as any).services.length})` : 'undefined',
      mainCategoryId: (payload as any).mainCategoryId || 'absent',
      subCategoryId: (payload as any).subCategoryId || 'absent',
      additionalCharge: payload.additionalCharge,
    });
    
    const optionIds = payload.optionIds ? [...payload.optionIds] : [];
    const overrides = sanitizeOptionOverrides(optionIds, payload.optionOverrides);
    let created: Engagement | null = null;
    
    // Créer l'engagement avec TOUS les champs explicitement définis
    const newEngagement: Engagement = {
      id: `e${Date.now()}`,
      clientId: payload.clientId,
      companyId: (payload.companyId && payload.companyId !== '') ? payload.companyId : null,
      serviceId: payload.serviceId,
      scheduledAt: payload.scheduledAt,
      status: payload.status || 'brouillon',
      kind: payload.kind || 'service',
      supportType: payload.supportType || 'Voiture',
      supportDetail: payload.supportDetail || '',
      additionalCharge: payload.additionalCharge ?? 0,
      contactIds: payload.contactIds ?? [],
      assignedUserIds: payload.assignedUserIds ? [...payload.assignedUserIds] : [],
      sendHistory: payload.sendHistory ?? [],
      invoiceNumber: payload.invoiceNumber ?? null,
      invoiceVatEnabled: payload.invoiceVatEnabled ?? null,
      quoteNumber: payload.quoteNumber ?? null,
      quoteStatus: payload.quoteStatus ?? (payload.kind === 'devis' ? 'brouillon' : null),
      quoteName: (payload as any).quoteName ?? null,
      optionIds,
      optionOverrides: overrides,
      planningUser: payload.planningUser ?? null,
      startTime: payload.startTime ?? null,
      services: (payload as any).services || undefined,
      mobileDurationMinutes: payload.mobileDurationMinutes ?? null,
      mobileCompletionComment: payload.mobileCompletionComment ?? null,
    };
    
    // Inclure les catégories si disponibles
    if ((payload as any).mainCategoryId) {
      (newEngagement as any).mainCategoryId = (payload as any).mainCategoryId;
    }
    if ((payload as any).subCategoryId) {
      (newEngagement as any).subCategoryId = (payload as any).subCategoryId;
    }
    
    console.log('📝 [Store] Engagement créé:', {
      id: newEngagement.id,
      kind: newEngagement.kind,
      optionIds: newEngagement.optionIds.length,
      services: (newEngagement as any).services ? `Array(${(newEngagement as any).services.length})` : 'undefined',
      mainCategoryId: (newEngagement as any).mainCategoryId || 'absent',
      subCategoryId: (newEngagement as any).subCategoryId || 'absent',
    });
    
    set((state) => {
      const nextEngagements = [newEngagement, ...state.engagements];
      return {
        engagements: nextEngagements,
        slots: buildSlots(nextEngagements, state.services, state.categories),
      };
    });
    
    created = newEngagement;
    
    // Créer automatiquement une facture si un service est créé avec le statut "réalisé"
    if (created && 
        created.kind === 'service' && 
        created.status === 'réalisé' && 
        !created.invoiceNumber) {
      
      // Vérifier qu'il n'existe pas déjà une facture pour ce service (avec une comparaison de dates plus souple)
      const existingInvoice = get().engagements.find(
        (e) => e.kind === 'facture' && 
               e.clientId === created.clientId && 
               e.serviceId === created.serviceId &&
               ((e.scheduledAt && created.scheduledAt && e.scheduledAt.split('T')[0] === created.scheduledAt.split('T')[0]) || e.scheduledAt === created.scheduledAt)
      );
      
      if (!existingInvoice) {
        // Générer un numéro de facture
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(4, '0');
        const invoiceNumber = `FAC-${year}${month}${day}-${random}`;
        
        // Créer la facture automatiquement
        const invoicePayload = {
          kind: 'facture' as const,
          status: 'réalisé' as const,
          clientId: created.clientId,
          serviceId: created.serviceId,
          optionIds: created.optionIds,
          optionOverrides: created.optionOverrides,
          scheduledAt: created.scheduledAt || new Date().toISOString(),
          companyId: created.companyId,
          supportType: created.supportType,
          supportDetail: created.supportDetail,
          additionalCharge: created.additionalCharge,
          contactIds: created.contactIds,
          assignedUserIds: created.assignedUserIds,
          invoiceNumber,
          invoiceVatEnabled: created.invoiceVatEnabled,
          quoteNumber: created.quoteNumber,
          quoteName: (created as any).quoteName || null,
          planningUser: created.planningUser,
          startTime: created.startTime,
          mobileDurationMinutes: created.mobileDurationMinutes,
          mobileCompletionComment: created.mobileCompletionComment,
        };
        
        console.log('[Store] 🧾 Création automatique de facture pour service créé réalisé:', {
          serviceId: created.id,
          invoiceNumber,
          clientId: created.clientId,
        });
        
        // Créer directement la facture dans le store (sans passer par addEngagement pour éviter la récursion)
        const invoiceEngagement: Engagement = {
          id: `e${Date.now() + 1}`, // ID différent du service
          clientId: invoicePayload.clientId,
          companyId: invoicePayload.companyId || null,
          serviceId: invoicePayload.serviceId,
          scheduledAt: invoicePayload.scheduledAt,
          status: invoicePayload.status,
          kind: invoicePayload.kind,
          supportType: invoicePayload.supportType,
          supportDetail: invoicePayload.supportDetail,
          additionalCharge: invoicePayload.additionalCharge,
          contactIds: invoicePayload.contactIds,
          assignedUserIds: invoicePayload.assignedUserIds,
          sendHistory: [],
          invoiceNumber,
          invoiceVatEnabled: invoicePayload.invoiceVatEnabled,
          quoteNumber: invoicePayload.quoteNumber,
          quoteStatus: null,
          quoteName: invoicePayload.quoteName,
          optionIds: invoicePayload.optionIds,
          optionOverrides: invoicePayload.optionOverrides,
          planningUser: invoicePayload.planningUser,
          startTime: invoicePayload.startTime,
          mobileDurationMinutes: invoicePayload.mobileDurationMinutes,
          mobileCompletionComment: invoicePayload.mobileCompletionComment,
        };
        
        // Ajouter la facture au store
        set((state) => ({
          engagements: [invoiceEngagement, ...state.engagements],
          slots: buildSlots([invoiceEngagement, ...state.engagements], state.services, state.categories),
        }));
        
        // Synchroniser avec le backend
        const invoiceAppointmentData: any = {
          id: invoiceEngagement.id,
          client_id: invoiceEngagement.clientId,
          service_id: invoiceEngagement.serviceId,
          date: invoiceEngagement.scheduledAt,
          start_time: invoiceEngagement.startTime || null,
          status: invoiceEngagement.status,
          kind: invoiceEngagement.kind,
          company_id: invoiceEngagement.companyId || null,
          option_ids: invoiceEngagement.optionIds,
          option_overrides: invoiceEngagement.optionOverrides,
          additional_charge: invoiceEngagement.additionalCharge,
          contact_ids: invoiceEngagement.contactIds,
          assigned_user_ids: invoiceEngagement.assignedUserIds,
          invoice_number: invoiceEngagement.invoiceNumber,
          invoice_vat_enabled: invoiceEngagement.invoiceVatEnabled,
          mobile_duration_minutes: invoiceEngagement.mobileDurationMinutes,
          mobile_completion_comment: invoiceEngagement.mobileCompletionComment,
        };
        
        AppointmentService.createAppointment(invoiceAppointmentData)
          .then((result) => {
            if (result.success) {
              console.log('[Store] ✅ Facture automatique sauvegardée dans le backend:', invoiceEngagement.id);
            } else {
              console.error('[Store] ❌ Erreur lors de la sauvegarde de la facture:', result.error);
            }
          })
          .catch((error) => {
            console.error('[Store] ❌ Erreur lors de la sauvegarde de la facture:', error);
          });
      }
    }
    
      // Synchroniser immédiatement avec le backend
      if (created) {
        const originalId = created.id;
        // Mapper l'engagement vers le format API
        const appointmentData: any = {
          id: originalId,
          client_id: created.clientId,
          service_id: created.serviceId,
          date: created.scheduledAt,
          start_time: created.startTime || null,
          status: created.status,
          kind: created.kind,
          company_id: created.companyId || null,
          option_ids: created.optionIds,
          option_overrides: created.optionOverrides,
          additional_charge: created.additionalCharge,
          contact_ids: created.contactIds,
          assigned_user_ids: created.assignedUserIds,
          invoice_number: created.invoiceNumber,
          invoice_vat_enabled: created.invoiceVatEnabled,
          quote_number: created.quoteNumber,
          quote_status: created.quoteStatus,
          quote_name: (created as any).quoteName || null,
          support_type: created.supportType,
          support_detail: created.supportDetail,
          planning_user: created.planningUser || null,
          mobile_duration_minutes: created.mobileDurationMinutes,
          mobile_completion_comment: created.mobileCompletionComment,
          send_history: created.sendHistory,
          services: (created as any).services || (payload as any).services || undefined,
        };
        
        // Inclure les catégories si disponibles
        if ((created as any).mainCategoryId) {
          appointmentData.main_category_id = (created as any).mainCategoryId;
        }
        if ((created as any).subCategoryId) {
          appointmentData.sub_category_id = (created as any).subCategoryId;
        }
      
        console.log('📤 [Store] Envoi au backend:', {
          id: appointmentData.id,
          kind: appointmentData.kind,
          option_ids: appointmentData.option_ids?.length || 0,
          services: appointmentData.services ? `Array(${appointmentData.services.length})` : 'undefined',
          main_category_id: appointmentData.main_category_id || 'absent',
          sub_category_id: appointmentData.sub_category_id || 'absent',
          additional_charge: appointmentData.additional_charge,
        });
        
        // Debug: vérifier que services contient bien toutes les données
        if (appointmentData.services) {
          console.log('📤 [Store] Services détaillés à sauvegarder:', JSON.stringify(appointmentData.services, null, 2));
        }
      
      AppointmentService.createAppointment(appointmentData)
        .then(async (result) => {
          if (result.success && result.data) {
            // Mettre à jour l'engagement avec les données du backend si nécessaire
            const backendAppointment = result.data;
            const backendId = backendAppointment.id || originalId;
            
            console.log('✅ [Store] Engagement sauvegardé dans le backend:', {
              id: backendId,
              kind: backendAppointment.kind,
              option_ids: backendAppointment.option_ids?.length || 0,
              services: backendAppointment.services ? `Array(${backendAppointment.services.length})` : 'undefined',
              main_category_id: backendAppointment.main_category_id || 'absent',
              sub_category_id: backendAppointment.sub_category_id || 'absent',
            });
            
            set((state) => {
              const nextEngagements = state.engagements.map((e) => {
                if (e.id === originalId) {
                  return {
                    ...e,
                    id: backendId,
                  };
                }
                return e;
              });
              return {
                engagements: nextEngagements,
                slots: buildSlots(nextEngagements, state.services, state.categories),
              };
            });
            
            console.log('📝 [Store] ========== FIN addEngagement ==========');
          } else {
            console.error('❌ [Store] Erreur lors de la sauvegarde de l\'engagement:', result.error);
            console.log('📝 [Store] ========== FIN addEngagement (ERREUR) ==========');
          }
        })
        .catch((error) => {
          console.error('❌ [Store] Erreur lors de la sauvegarde de l\'engagement:', error);
          console.log('📝 [Store] ========== FIN addEngagement (ERREUR) ==========');
        });
    } else {
      console.log('📝 [Store] ========== FIN addEngagement (pas de sync) ==========');
    }
    
    return newEngagement;
  },
  updateEngagement: (engagementId, updates) => {
    let updated: Engagement | null = null;
    let originalEngagement: Engagement | null = null;
    
    set((state) => {
      const nextEngagements = state.engagements.map((engagement) => {
        if (engagement.id !== engagementId) {
          return engagement;
        }
        originalEngagement = engagement;
        
        // Préparer les options
        const optionIds = updates.optionIds !== undefined ? [...updates.optionIds] : engagement.optionIds;
        const overrides = sanitizeOptionOverrides(optionIds, updates.optionOverrides ?? engagement.optionOverrides);
        
        // Créer l'engagement mis à jour - TOUS les champs explicitement définis
        const next: Engagement = {
          ...engagement,
          clientId: updates.clientId !== undefined ? updates.clientId : engagement.clientId,
          companyId: updates.companyId !== undefined ? (updates.companyId || null) : engagement.companyId,
          serviceId: updates.serviceId !== undefined ? updates.serviceId : engagement.serviceId,
          scheduledAt: updates.scheduledAt !== undefined ? updates.scheduledAt : engagement.scheduledAt,
          status: updates.status !== undefined ? updates.status : engagement.status,
          kind: updates.kind !== undefined ? updates.kind : engagement.kind,
          supportType: updates.supportType !== undefined ? updates.supportType : engagement.supportType,
          supportDetail: updates.supportDetail !== undefined ? updates.supportDetail : engagement.supportDetail,
          additionalCharge: updates.additionalCharge !== undefined ? updates.additionalCharge : engagement.additionalCharge,
          contactIds: updates.contactIds !== undefined ? [...updates.contactIds] : engagement.contactIds,
          assignedUserIds: updates.assignedUserIds !== undefined ? [...updates.assignedUserIds] : engagement.assignedUserIds,
          sendHistory: updates.sendHistory !== undefined ? [...updates.sendHistory] : engagement.sendHistory,
          invoiceNumber: updates.invoiceNumber !== undefined ? updates.invoiceNumber : engagement.invoiceNumber,
          invoiceVatEnabled: updates.invoiceVatEnabled !== undefined ? updates.invoiceVatEnabled : engagement.invoiceVatEnabled,
          quoteNumber: updates.quoteNumber !== undefined ? updates.quoteNumber : engagement.quoteNumber,
          quoteStatus: updates.quoteStatus !== undefined ? updates.quoteStatus : engagement.quoteStatus,
          quoteName: (updates as any).quoteName !== undefined ? ((updates as any).quoteName || null) : ((engagement as any).quoteName || null),
          optionIds,
          optionOverrides: overrides,
          planningUser: updates.planningUser !== undefined ? (updates.planningUser || null) : engagement.planningUser,
          startTime: updates.startTime !== undefined ? (updates.startTime || null) : engagement.startTime,
          services: (updates as any).services !== undefined ? (updates as any).services : engagement.services,
          mobileDurationMinutes: updates.mobileDurationMinutes !== undefined ? updates.mobileDurationMinutes : engagement.mobileDurationMinutes,
          mobileCompletionComment: updates.mobileCompletionComment !== undefined ? updates.mobileCompletionComment : engagement.mobileCompletionComment,
        };
        updated = next;
        return next;
      });
      return {
        engagements: nextEngagements,
        slots: buildSlots(nextEngagements, state.services, state.categories),
      };
    });
    
    // Créer automatiquement une facture si un service est marqué comme "réalisé"
    if (updated && originalEngagement && 
        updated.kind === 'service' && 
        updated.status === 'réalisé' && 
        originalEngagement.status !== 'réalisé' &&
        !updated.invoiceNumber) {
      
      // Vérifier qu'il n'existe pas déjà une facture pour ce service (avec une comparaison de dates plus souple)
      const existingInvoice = get().engagements.find(
        (e) => e.kind === 'facture' && 
               e.clientId === updated.clientId && 
               e.serviceId === updated.serviceId &&
               ((e.scheduledAt && updated.scheduledAt && e.scheduledAt.split('T')[0] === updated.scheduledAt.split('T')[0]) || e.scheduledAt === updated.scheduledAt)
      );
      
      if (!existingInvoice) {
        // Générer un numéro de facture
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(4, '0');
        const invoiceNumber = `FAC-${year}${month}${day}-${random}`;
        
        // Créer la facture automatiquement
        const invoicePayload = {
          kind: 'facture' as const,
          status: 'réalisé' as const,
          clientId: updated.clientId,
          serviceId: updated.serviceId,
          optionIds: updated.optionIds,
          optionOverrides: updated.optionOverrides,
          scheduledAt: updated.scheduledAt || new Date().toISOString(),
          companyId: updated.companyId,
          supportType: updated.supportType,
          supportDetail: updated.supportDetail,
          additionalCharge: updated.additionalCharge,
          contactIds: updated.contactIds,
          assignedUserIds: updated.assignedUserIds,
          invoiceNumber,
          invoiceVatEnabled: updated.invoiceVatEnabled,
          quoteNumber: updated.quoteNumber,
          quoteName: (updated as any).quoteName || null,
          planningUser: updated.planningUser,
          startTime: updated.startTime,
          mobileDurationMinutes: updated.mobileDurationMinutes,
          mobileCompletionComment: updated.mobileCompletionComment,
        };
        
        console.log('[Store] 🧾 Création automatique de facture pour service réalisé:', {
          serviceId: updated.id,
          invoiceNumber,
          clientId: updated.clientId,
        });
        
        // Créer directement la facture dans le store (sans passer par addEngagement pour éviter la récursion)
        const invoiceEngagement: Engagement = {
          id: `e${Date.now() + 1}`, // ID différent du service
          clientId: invoicePayload.clientId,
          companyId: invoicePayload.companyId || null,
          serviceId: invoicePayload.serviceId,
          scheduledAt: invoicePayload.scheduledAt,
          status: invoicePayload.status,
          kind: invoicePayload.kind,
          supportType: invoicePayload.supportType,
          supportDetail: invoicePayload.supportDetail,
          additionalCharge: invoicePayload.additionalCharge,
          contactIds: invoicePayload.contactIds,
          assignedUserIds: invoicePayload.assignedUserIds,
          sendHistory: [],
          invoiceNumber,
          invoiceVatEnabled: invoicePayload.invoiceVatEnabled,
          quoteNumber: invoicePayload.quoteNumber,
          quoteStatus: null,
          quoteName: invoicePayload.quoteName,
          optionIds: invoicePayload.optionIds,
          optionOverrides: invoicePayload.optionOverrides,
          planningUser: invoicePayload.planningUser,
          startTime: invoicePayload.startTime,
          mobileDurationMinutes: invoicePayload.mobileDurationMinutes,
          mobileCompletionComment: invoicePayload.mobileCompletionComment,
        };
        
        // Ajouter la facture au store
        set((state) => ({
          engagements: [invoiceEngagement, ...state.engagements],
          slots: buildSlots([invoiceEngagement, ...state.engagements], state.services, state.categories),
        }));
        
        // Synchroniser avec le backend
        const invoiceAppointmentData: any = {
          id: invoiceEngagement.id,
          client_id: invoiceEngagement.clientId,
          service_id: invoiceEngagement.serviceId,
          date: invoiceEngagement.scheduledAt,
          start_time: invoiceEngagement.startTime || null,
          status: invoiceEngagement.status,
          kind: invoiceEngagement.kind,
          company_id: invoiceEngagement.companyId || null,
          option_ids: invoiceEngagement.optionIds,
          option_overrides: invoiceEngagement.optionOverrides,
          additional_charge: invoiceEngagement.additionalCharge,
          contact_ids: invoiceEngagement.contactIds,
          assigned_user_ids: invoiceEngagement.assignedUserIds,
          invoice_number: invoiceEngagement.invoiceNumber,
          invoice_vat_enabled: invoiceEngagement.invoiceVatEnabled,
          mobile_duration_minutes: invoiceEngagement.mobileDurationMinutes,
          mobile_completion_comment: invoiceEngagement.mobileCompletionComment,
        };
        
        AppointmentService.createAppointment(invoiceAppointmentData)
          .then((result) => {
            if (result.success) {
              console.log('[Store] ✅ Facture automatique sauvegardée dans le backend:', invoiceEngagement.id);
            } else {
              console.error('[Store] ❌ Erreur lors de la sauvegarde de la facture:', result.error);
            }
          })
          .catch((error) => {
            console.error('[Store] ❌ Erreur lors de la sauvegarde de la facture:', error);
          });
      }
    }
    
    // Synchroniser avec le backend
    if (updated && originalEngagement) {
      const appointmentData = {
        id: updated.id,
        client_id: updated.clientId,
        service_id: updated.serviceId,
        date: updated.scheduledAt,
        start_time: updated.startTime || null,
        status: updated.status,
        kind: updated.kind,
        company_id: updated.companyId || null,
        option_ids: updated.optionIds,
        option_overrides: updated.optionOverrides,
        additional_charge: updated.additionalCharge,
        contact_ids: updated.contactIds,
        assigned_user_ids: updated.assignedUserIds,
        invoice_number: updated.invoiceNumber,
        invoice_vat_enabled: updated.invoiceVatEnabled,
        quote_number: updated.quoteNumber,
        quote_status: updated.quoteStatus,
        quote_name: (updated as any).quoteName || null,
        support_type: updated.supportType,
        support_detail: updated.supportDetail,
        planning_user: updated.planningUser || null,
        mobile_duration_minutes: updated.mobileDurationMinutes,
        mobile_completion_comment: updated.mobileCompletionComment,
        send_history: updated.sendHistory,
        services: (updated as any).services || undefined,
      };
      
      AppointmentService.updateAppointment(engagementId, appointmentData)
        .then((result) => {
          if (result.success) {
            console.log('[Store] ✅ Engagement mis à jour dans le backend:', engagementId);
          } else {
            console.error('[Store] ❌ Erreur:', result.error);
          }
        })
        .catch((error) => {
          console.error('[Store] ❌ Erreur:', error);
        });
    }
    
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
    // Supprimer du store local immédiatement
    set((state) => {
      const nextEngagements = state.engagements.filter((engagement) => engagement.id !== engagementId);
      return {
        engagements: nextEngagements,
        slots: buildSlots(nextEngagements, state.services, state.categories),
      };
    });
    
    // Supprimer dans le backend (même si le devis n'existe pas encore dans le backend, on essaie quand même)
    AppointmentService.deleteAppointment(engagementId)
      .then((result) => {
        if (result.success) {
          console.log('[Store] ✅ Engagement supprimé du backend:', engagementId);
        } else {
          // Si l'engagement n'existe pas dans le backend (créé localement mais pas encore synchronisé), c'est OK
          if (result.error?.includes('404') || result.error?.includes('not found')) {
            console.log('[Store] ℹ️ Engagement non trouvé dans le backend (probablement créé localement):', engagementId);
          } else {
            console.error('[Store] ❌ Erreur lors de la suppression de l\'engagement:', result.error);
          }
        }
      })
      .catch((error) => {
        // Ignorer les erreurs 404 (engagement non trouvé dans le backend)
        if (error?.message?.includes('404') || error?.message?.includes('not found')) {
          console.log('[Store] ℹ️ Engagement non trouvé dans le backend (probablement créé localement):', engagementId);
        } else {
          console.error('[Store] ❌ Erreur lors de la suppression de l\'engagement:', error);
        }
    });
  },
  addSubscription: (payload) => {
    const now = new Date().toISOString();
    const tempId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const newSubscription: Subscription = {
      id: tempId,
      clientId: payload.clientId,
      vehicleInfo: payload.vehicleInfo,
      startDate: payload.startDate,
      endDate: payload.endDate ?? null,
      status: payload.status,
      frequency: payload.frequency,
      priceHT: payload.priceHT,
      vatEnabled: payload.vatEnabled,
      documentId: payload.documentId ?? null,
      notes: payload.notes ?? '',
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      subscriptions: [...state.subscriptions, newSubscription],
    }));

    // Synchroniser immédiatement avec le backend
    Promise.resolve()
      .then(() =>
        SubscriptionService.create({
          ...newSubscription,
          id: undefined,
        } as any)
      )
      .then(async (result) => {
        if (result.success && result.data) {
          // Recharger la liste complète depuis le backend pour garantir la cohérence
          const refreshed = await SubscriptionService.getSubscriptions();
          if (refreshed.success && Array.isArray(refreshed.data)) {
            set({
              subscriptions: refreshed.data.map((s: any) => ({
                id: s.id,
                clientId: s.clientId ?? '',
                vehicleInfo: s.vehicleInfo ?? '',
                startDate: s.startDate ?? now,
                endDate: s.endDate ?? null,
                status: (s.status ?? 'actif') as SubscriptionStatus,
                frequency: (s.frequency ?? 'mensuel') as SubscriptionFrequency,
                priceHT: s.priceHT ?? 0,
                vatEnabled: s.vatEnabled ?? true,
                documentId: s.documentId ?? null,
                notes: s.notes ?? '',
                createdAt: s.createdAt ?? now,
                updatedAt: s.updatedAt ?? now,
              })),
            });
          }
        } else if (!result.success) {
          console.error('[Store] ❌ Erreur synchronisation abonnement:', result.error);
        }
      })
      .catch((error) => {
        console.error('[Store] ❌ Erreur création abonnement:', error);
      });

    return newSubscription;
  },
  updateSubscription: (subscriptionId, updates) => {
    let updated: Subscription | null = null;
    set((state) => {
      const nextSubscriptions = state.subscriptions.map((sub) => {
        if (sub.id === subscriptionId) {
          updated = {
            ...sub,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          return updated;
        }
        return sub;
      });
      return {
        subscriptions: nextSubscriptions,
      };
    });

    // Synchroniser backend puis recharger la liste
    if (updated) {
      SubscriptionService.update(subscriptionId, {
        clientId: updated.clientId,
        vehicleInfo: updated.vehicleInfo,
        startDate: updated.startDate,
        endDate: updated.endDate,
        status: updated.status,
        frequency: updated.frequency,
        priceHT: updated.priceHT,
        vatEnabled: updated.vatEnabled,
        documentId: updated.documentId,
        notes: updated.notes,
      } as any)
        .then(async (result) => {
          if (result.success) {
            const refreshed = await SubscriptionService.getSubscriptions();
            if (refreshed.success && Array.isArray(refreshed.data)) {
              const now = new Date().toISOString();
              set({
                subscriptions: refreshed.data.map((s: any) => ({
                  id: s.id,
                  clientId: s.clientId ?? '',
                  vehicleInfo: s.vehicleInfo ?? '',
                  startDate: s.startDate ?? now,
                  endDate: s.endDate ?? null,
                  status: (s.status ?? 'actif') as SubscriptionStatus,
                  frequency: (s.frequency ?? 'mensuel') as SubscriptionFrequency,
                  priceHT: s.priceHT ?? 0,
                  vatEnabled: s.vatEnabled ?? true,
                  documentId: s.documentId ?? null,
                  notes: s.notes ?? '',
                  createdAt: s.createdAt ?? now,
                  updatedAt: s.updatedAt ?? now,
                })),
              });
            }
          } else {
            console.error('[Store] ❌ Erreur synchronisation abonnement (update):', result.error);
          }
        })
        .catch((error) => {
          console.error('[Store] ❌ Erreur mise à jour abonnement:', error);
        });
    }

    return updated;
  },
  removeSubscription: (subscriptionId) => {
    // Suppression optimiste côté frontend
    set((state) => ({
      subscriptions: state.subscriptions.filter((sub) => sub.id !== subscriptionId),
    }));

    // Synchroniser la suppression avec le backend
    Promise.resolve()
      .then(() => SubscriptionService.delete(subscriptionId))
      .then((result) => {
        if (!result.success) {
          console.error('[Store] ❌ Erreur suppression abonnement:', result.error);
        }
      })
      .catch((error) => {
        console.error('[Store] ❌ Erreur suppression abonnement:', error);
      });
  },
  getClientSubscriptions: (clientId) => {
    const { subscriptions } = get();
    return subscriptions.filter((sub) => sub.clientId === clientId);
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
        slots: buildSlots(state.engagements, nextServices, state.categories),
      };
    });

    // Synchroniser backend puis re-fetch liste
    ServiceService.createService(newService)
      .then(async (result) => {
        if (result.success) {
          const refreshed = await ServiceService.getServices();
          if (refreshed.success && refreshed.data) {
            set({ services: refreshed.data as any });
          }
        } else {
          console.error('[Store] ❌ Erreur synchronisation service:', result.error);
        }
      })
      .catch((error) => {
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
      
      // Synchroniser backend puis re-fetch liste
      if (updated) {
        ServiceService.updateService(serviceId, updated)
          .then(async (result) => {
            if (result.success) {
              const refreshed = await ServiceService.getServices();
              if (refreshed.success && refreshed.data) {
                set({ services: refreshed.data as any });
              }
            } else {
              console.error('[Store] ❌ Erreur synchronisation service:', result.error);
            }
          })
          .catch((error) => {
            console.error('[Store] ❌ Erreur mise à jour service:', error);
          });
      }
      
      return {
        services: nextServices,
        slots: buildSlots(state.engagements, nextServices, state.categories),
      };
    });

    if (updated) {
      ServiceService.updateService(serviceId, updated)
        .then(async (result) => {
          if (result.success) {
            const refreshed = await ServiceService.getServices();
            if (refreshed.success && refreshed.data) {
              set({ services: refreshed.data as any });
            }
          } else {
            console.error('[Store] ❌ Erreur mise à jour service:', result.error);
          }
        })
        .catch((error) => {
          console.error('[Store] ❌ Erreur mise à jour service:', error);
        });
    }

    return updated;
  },
  removeService: (serviceId) => {
    set((state) => {
      const nextServices = state.services.filter((service) => service.id !== serviceId);
      const nextEngagements = state.engagements.filter((engagement) => engagement.serviceId !== serviceId);
      return {
        services: nextServices,
        engagements: nextEngagements,
        slots: buildSlots(nextEngagements, nextServices, state.categories),
      };
    });

    ServiceService.deleteService(serviceId)
      .then(async (result) => {
        if (!result.success) return;
        const refreshed = await ServiceService.getServices();
        if (refreshed.success && refreshed.data) {
          set({ services: refreshed.data as any });
        }
      })
      .catch((error) => {
        console.error('[Store] ❌ Erreur suppression service:', error);
      });
  },
  addServiceOption: (serviceId, payload) => {
    let created: ServiceOption | null = null;
    let updatedService: Service | null = null;
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
        updatedService = {
          ...service,
          options: [...service.options, created!],
        };
        return updatedService;
      });
      
      // Synchroniser backend puis re-fetch liste
      if (updatedService) {
        ServiceService.updateService(serviceId, updatedService)
          .then(async (result) => {
            if (result.success) {
              const refreshed = await ServiceService.getServices();
              if (refreshed.success && refreshed.data) {
                set({ services: refreshed.data as any });
              }
            } else {
              console.error('[Store] ❌ Erreur synchronisation option service:', result.error);
            }
          })
          .catch((error) => {
            console.error('[Store] ❌ Erreur ajout option service:', error);
          });
      }
      
      return {
        services: nextServices,
        slots: buildSlots(state.engagements, nextServices, state.categories),
      };
    });
    return created;
  },
  updateServiceOption: (serviceId, optionId, updates) => {
    let updated: ServiceOption | null = null;
    let updatedService: Service | null = null;
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
        updatedService = {
          ...service,
          options: nextOptions,
        };
        return updatedService;
      });
      
      // Synchroniser backend puis re-fetch liste
      if (updatedService) {
        ServiceService.updateService(serviceId, updatedService)
          .then(async (result) => {
            if (result.success) {
              const refreshed = await ServiceService.getServices();
              if (refreshed.success && refreshed.data) {
                set({ services: refreshed.data as any });
              }
            } else {
              console.error('[Store] ❌ Erreur synchronisation option service:', result.error);
            }
          })
          .catch((error) => {
            console.error('[Store] ❌ Erreur mise à jour option service:', error);
          });
      }
      
      return {
        services: nextServices,
        slots: buildSlots(state.engagements, nextServices, state.categories),
      };
    });
    return updated;
  },
  removeServiceOption: (serviceId, optionId) => {
    let updatedService: Service | null = null;
    set((state) => {
      const nextServices = state.services.map((service) => {
        if (service.id !== serviceId) {
          return service;
        }
        updatedService = {
          ...service,
          options: service.options.filter((option) => option.id !== optionId),
        };
        return updatedService;
      });
      
      // Synchroniser backend puis re-fetch liste
      if (updatedService) {
        ServiceService.updateService(serviceId, updatedService)
          .then(async (result) => {
            if (result.success) {
              const refreshed = await ServiceService.getServices();
              if (refreshed.success && refreshed.data) {
                set({ services: refreshed.data as any });
              }
            } else {
              console.error('[Store] ❌ Erreur synchronisation suppression option service:', result.error);
            }
          })
          .catch((error) => {
            console.error('[Store] ❌ Erreur suppression option service:', error);
          });
      }
      
      return {
        services: nextServices,
        slots: buildSlots(state.engagements, nextServices, state.categories),
      };
    });
  },
  addCategory: (payload) => {
    const now = new Date().toISOString();
    const newCategory: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: payload.name.trim(),
      description: payload.description?.trim(),
      active: payload.active ?? true,
      parentId: payload.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      categories: [...state.categories, newCategory],
    }));
    return newCategory;
  },
  updateCategory: (categoryId, updates) => {
    let updatedCategory: Category | null = null;
    set((state) => {
      const nextCategories = state.categories.map((category) => {
        if (category.id !== categoryId) {
          return category;
        }
        updatedCategory = {
          ...category,
          ...updates,
          name: updates.name?.trim() ?? category.name,
          description: updates.description !== undefined ? updates.description?.trim() : category.description,
          updatedAt: new Date().toISOString(),
        };
        return updatedCategory;
      });
      return {
        categories: nextCategories,
      };
    });
    return updatedCategory;
  },
  removeCategory: (categoryId) => {
    set((state) => ({
      categories: state.categories.filter((category) => category.id !== categoryId),
      // Mettre à jour les services pour utiliser une catégorie par défaut si nécessaire
      services: state.services.map((service) => {
        const category = state.categories.find((c) => c.id === categoryId);
        if (category && service.category === category.name) {
          const defaultCategory = state.categories.find((c) => c.id !== categoryId && c.active);
          return {
            ...service,
            category: defaultCategory?.name ?? 'Autre',
          };
        }
        return service;
      }),
    }));
  },
  addSubscriptionTemplate: (payload) => {
    const now = new Date().toISOString();
    const basePrice = payload.basePriceHT;
    const subscriptionPrice = payload.subscriptionPriceHT;
    const reductionPercent = basePrice > 0 ? ((basePrice - subscriptionPrice) / basePrice) * 100 : 0;
    
    const newTemplate: SubscriptionTemplate = {
      id: `sub-tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      serviceId: payload.serviceId,
      optionId: payload.optionId,
      name: payload.name.trim(),
      basePriceHT: basePrice,
      subscriptionPriceHT: subscriptionPrice,
      frequency: payload.frequency,
      vatEnabled: payload.vatEnabled ?? true,
      reductionPercent: Math.round(reductionPercent * 100) / 100,
      active: payload.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      subscriptionTemplates: [...state.subscriptionTemplates, newTemplate],
    }));
    return newTemplate;
  },
  updateSubscriptionTemplate: (templateId, updates) => {
    let updatedTemplate: SubscriptionTemplate | null = null;
    set((state) => {
      const nextTemplates = state.subscriptionTemplates.map((template) => {
        if (template.id !== templateId) {
          return template;
        }
        const basePrice = updates.basePriceHT ?? template.basePriceHT;
        const subscriptionPrice = updates.subscriptionPriceHT ?? template.subscriptionPriceHT;
        const reductionPercent = basePrice > 0 ? ((basePrice - subscriptionPrice) / basePrice) * 100 : 0;
        
        updatedTemplate = {
          ...template,
          ...updates,
          name: updates.name?.trim() ?? template.name,
          basePriceHT: basePrice,
          subscriptionPriceHT: subscriptionPrice,
          reductionPercent: Math.round(reductionPercent * 100) / 100,
          updatedAt: new Date().toISOString(),
        };
        return updatedTemplate;
      });
      return {
        subscriptionTemplates: nextTemplates,
      };
    });
    return updatedTemplate;
  },
  removeSubscriptionTemplate: (templateId) => {
    set((state) => ({
      subscriptionTemplates: state.subscriptionTemplates.filter((template) => template.id !== templateId),
    }));
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
  addProject: (payload) => {
    const projectId = `p${Date.now()}`;
    const newProject: Project = {
      id: projectId,
      name: payload.name,
      clientId: payload.clientId,
      manager: payload.manager,
      start: payload.start,
      end: payload.end,
      status: payload.status,
      memberIds: payload.memberIds ?? [],
      tasks: payload.tasks ?? [],
    };
    set((state) => ({
      projects: [...state.projects, newProject],
      stats: {
        ...state.stats,
        projectVelocity: deriveVelocity([...state.projects, newProject]),
      },
    }));
    return newProject;
  },
  updateProject: (projectId, updates) => {
    let updated: Project | null = null;
    set((state) => {
      const projects = state.projects.map((project) => {
        if (project.id !== projectId) {
          return project;
        }
        const nextProject: Project = { ...project, ...updates };
        updated = nextProject;
        return nextProject;
      });

      return {
        projects,
        stats: {
          ...state.stats,
          projectVelocity: deriveVelocity(projects),
        },
      };
    });
    return updated;
  },
  removeProject: (projectId) => {
    set((state) => {
      const projects = state.projects.filter((project) => project.id !== projectId);
      return {
        projects,
        stats: {
          ...state.stats,
          projectVelocity: deriveVelocity(projects),
        },
      };
    });
  },
  addProjectMember: (payload) => {
    const memberId = `member-${Date.now()}`;
    const avatarColors = [
      '#0f172a',
      '#2563eb',
      '#0f766e',
      '#7c3aed',
      '#1d4ed8',
      '#be123c',
      '#0ea5e9',
      '#dc2626',
      '#16a34a',
      '#ca8a04',
    ];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const newMember: ProjectMember = {
      id: memberId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      email: payload.email,
      phone: payload.phone,
      avatarUrl: payload.avatarUrl,
      avatarColor: payload.avatarColor ?? randomColor,
      capacity: payload.capacity,
      companyId: payload.companyId ?? null,
    };
    set((state) => ({
      projectMembers: [...state.projectMembers, newMember],
    }));
    return newMember;
  },
  updateProjectMember: (memberId, updates) => {
    let updated: ProjectMember | null = null;
    set((state) => {
      const projectMembers = state.projectMembers.map((member) => {
        if (member.id !== memberId) {
          return member;
        }
        const nextMember: ProjectMember = { ...member, ...updates };
        updated = nextMember;
        return nextMember;
      });
      return { projectMembers };
    });
    return updated;
  },
  removeProjectMember: (memberId) => {
    set((state) => {
      const projectMembers = state.projectMembers.filter((member) => member.id !== memberId);
      const projects = state.projects.map((project) => ({
        ...project,
        memberIds: project.memberIds.filter((id) => id !== memberId),
      }));
      return { projectMembers, projects };
    });
  },
  hydrateFromBackpack: (payload) => {
    console.log('🔵🔵🔵 [hydrateFromBackpack] DÉBUT - Payload complet:', JSON.stringify(payload, null, 2));
    console.log('🔵🔵🔵 [hydrateFromBackpack] payload.companies:', payload.companies);
    console.log('🔵🔵🔵 [hydrateFromBackpack] Type de payload.companies:', typeof payload.companies);
    console.log('🔵🔵🔵 [hydrateFromBackpack] Est un array?:', Array.isArray(payload.companies));
    console.log('🔵🔵🔵 [hydrateFromBackpack] Nombre d\'entreprises:', Array.isArray(payload.companies) ? payload.companies.length : 'N/A');
    
    set((state) => {
      console.log('🔵🔵🔵 [hydrateFromBackpack] State actuel - companies:', state.companies);
      console.log('🔵🔵🔵 [hydrateFromBackpack] State actuel - nombre companies:', state.companies.length);
      
      const backendUser = payload.user;
      if (!backendUser || !backendUser.id) {
        console.warn('⚠️⚠️⚠️ [hydrateFromBackpack] Pas de données utilisateur dans le payload');
        return {};
      }

      console.log('🔵🔵🔵 [hydrateFromBackpack] Données utilisateur:', {
        userId: backendUser.id,
        username: backendUser.username,
        pages: backendUser.pages,
        permissions: backendUser.permissions,
        companyId: backendUser.companyId,
      });

      const existingUser = state.authUsers.find((user) => user.id === backendUser.id) ?? null;

      const mergedProfile: UserProfile = {
        ...state.userProfile,
        ...(backendUser.profile ?? {}),
      };

      const mergedNotifications: NotificationPreferences = {
        ...state.notificationPreferences,
        ...(backendUser.notificationPreferences ?? {}),
      };

      const rawPages = Array.isArray(backendUser.pages) ? (backendUser.pages as (AppPageKey | '*' | string)[]) : [];
      const hasWildcardPages = rawPages.includes('*');
      const finalPages: (AppPageKey | '*')[] = hasWildcardPages
        ? ['*']
        : (rawPages.filter((p): p is AppPageKey | '*' => p === '*' || typeof p === 'string') as (AppPageKey | '*')[]);

      const rawPermissions = Array.isArray(backendUser.permissions) ? (backendUser.permissions as (PermissionKey | '*' | string)[]) : [];
      const hasWildcardPermissions = rawPermissions.includes('*');
      const finalPermissions: (PermissionKey | '*')[] = hasWildcardPermissions
        ? ['*']
        : (rawPermissions.filter((p): p is PermissionKey | '*' => p === '*' || typeof p === 'string') as (PermissionKey | '*')[]);

      console.log('[hydrateFromBackpack] Pages finales:', {
        fromBackend: backendUser.pages,
        fromExisting: existingUser?.pages,
        final: finalPages,
      });

      const sanitizedUser = sanitizeAuthUser({
        ...(existingUser ?? {}),
        id: backendUser.id,
        username: backendUser.username ?? existingUser?.username ?? '',
        fullName:
          backendUser.fullName ??
          existingUser?.fullName ??
          backendUser.username ??
          existingUser?.username ??
          '',
        role: (backendUser.role as UserRole) ?? existingUser?.role ?? 'agent',
        pages: finalPages.length > 0 ? finalPages : (existingUser?.pages ?? []),
        permissions: finalPermissions.length > 0 ? finalPermissions : (existingUser?.permissions ?? []),
        active: backendUser.active ?? existingUser?.active ?? true,
        profile: mergedProfile,
        notificationPreferences: mergedNotifications,
        companyId: backendUser.companyId ?? existingUser?.companyId ?? payload.company?.id ?? null,
        passwordHash: existingUser?.passwordHash,
      });

      const nextUsers = existingUser
        ? state.authUsers.map((user) => (user.id === sanitizedUser.id ? sanitizedUser : user))
        : [...state.authUsers, sanitizedUser];

      persistAuthState(nextUsers, sanitizedUser.id);

      console.log('🔵🔵🔵 [hydrateFromBackpack] AVANT mapping - payload.companies:', payload.companies);
      console.log('🔵🔵🔵 [hydrateFromBackpack] AVANT mapping - state.companies:', state.companies);
      
      let mappedCompanies = Array.isArray(payload.companies)
        ? payload.companies.map((company) => normalizeCompanySnapshot(company))
        : state.companies;
      
      console.log('🔵🔵🔵 [hydrateFromBackpack] APRÈS mapping initial - mappedCompanies:', mappedCompanies);
      console.log('🔵🔵🔵 [hydrateFromBackpack] Source utilisée:', Array.isArray(payload.companies) ? 'payload.companies' : 'state.companies (FALLBACK)');

      if (payload.company) {
        console.log('🔵🔵🔵 [hydrateFromBackpack] payload.company existe, ajout en premier:', payload.company);
        mappedCompanies = [normalizeCompanySnapshot(payload.company), ...mappedCompanies];
      }

      console.log('🔵🔵🔵 [hydrateFromBackpack] AVANT dedupe - mappedCompanies:', mappedCompanies);
      mappedCompanies = dedupeCompanies(mappedCompanies);
      console.log('🔵🔵🔵 [hydrateFromBackpack] APRÈS dedupe - mappedCompanies:', mappedCompanies);
      console.log('🔵🔵🔵 [hydrateFromBackpack] Nombre final d\'entreprises:', mappedCompanies.length);

      // Priorité : 1) activeCompanyId depuis localStorage, 2) companyId de l'utilisateur, 3) company du payload, 4) entreprise par défaut, 5) première entreprise, 6) state actuel
      const storedActiveCompanyId = typeof window !== 'undefined' 
        ? (() => {
            try {
              const stored = localStorage.getItem('erp_active_company_id');
              return stored || null;
            } catch {
              return null;
            }
          })()
        : null;
      
      const resolvedActiveCompanyId =
        storedActiveCompanyId ??
        sanitizedUser.companyId ??
        payload.company?.id ??
        mappedCompanies.find((company) => company.isDefault)?.id ??
        mappedCompanies[0]?.id ??
        state.activeCompanyId;

      const vatEnabled =
        typeof payload.settings?.vatEnabled === 'boolean'
          ? payload.settings?.vatEnabled
          : payload.company?.vatEnabled ?? state.vatEnabled;

      const vatRate =
        typeof payload.settings?.vatRate === 'number'
          ? payload.settings?.vatRate
          : state.vatRate;

      // Persister activeCompanyId dans localStorage si défini
      if (resolvedActiveCompanyId && typeof window !== 'undefined') {
        try {
          localStorage.setItem('erp_active_company_id', resolvedActiveCompanyId);
        } catch (error) {
          console.warn('Impossible de sauvegarder activeCompanyId:', error);
        }
      }
      
      const nextState: Partial<AppState> = {
        authUsers: nextUsers,
        currentUserId: sanitizedUser.id,
        userProfile: { ...sanitizedUser.profile },
        notificationPreferences: { ...sanitizedUser.notificationPreferences },
        companies: mappedCompanies,
        activeCompanyId: resolvedActiveCompanyId ?? null,
        vatEnabled,
        vatRate,
      };
      
      console.log('🔵🔵🔵 [hydrateFromBackpack] ÉTAT FINAL - companies:', nextState.companies);
      console.log('🔵🔵🔵 [hydrateFromBackpack] ÉTAT FINAL - nombre companies:', nextState.companies?.length || 0);
      console.log('🔵🔵🔵 [hydrateFromBackpack] ÉTAT FINAL - activeCompanyId:', nextState.activeCompanyId);
      console.log('🔵🔵🔵 [hydrateFromBackpack] FIN');
      
      // Si une entreprise est définie, charger son backpack
      // Protection globale pour éviter les appels multiples
      if (resolvedActiveCompanyId) {
        const loadingKey = `__loadingCompanyBackpack_${resolvedActiveCompanyId}`;
        const alreadyLoadedKey = `__companyBackpackLoaded_${resolvedActiveCompanyId}`;
        
        // Ne charger que si pas déjà chargé ou en cours de chargement
        if ((window as any)[loadingKey] || (window as any)[alreadyLoadedKey]) {
          return nextState;
        }
        
        // Vérifier que l'entreprise existe dans la liste
        const companyExists = mappedCompanies.some((c) => c.id === resolvedActiveCompanyId);
        
        // Si l'entreprise n'existe pas dans la liste, charger toutes les entreprises depuis l'API
        if (!companyExists) {
          (async () => {
            try {
              const { CompanyService } = await import('../api/services/companies');
              const companiesResult = await CompanyService.getCompanies();
              if (companiesResult.success && companiesResult.data) {
                const allCompanies = companiesResult.data.map((c) => normalizeCompanySnapshot(c));
                set((state) => {
                  const updatedCompanies = dedupeCompanies([...allCompanies, ...state.companies]);
                  // Vérifier à nouveau si l'entreprise existe maintenant
                  const companyNowExists = updatedCompanies.some((c) => c.id === resolvedActiveCompanyId);
                  if (companyNowExists && !(window as any)[loadingKey] && !(window as any)[alreadyLoadedKey]) {
                    // Charger le Company Backpack maintenant que l'entreprise est disponible
                    get().loadCompanyBackpack(resolvedActiveCompanyId).catch((error) => {
                      console.error('Erreur lors du chargement du Company Backpack:', error);
                    });
                  }
                  return { companies: updatedCompanies };
                });
              }
            } catch (error) {
              console.error('Erreur lors du chargement des entreprises:', error);
            }
          })();
        } else {
          // Charger le Company Backpack de manière asynchrone avec protection
          // Vérifier si déjà chargé pour cette entreprise
          if (!(window as any)[alreadyLoadedKey] && !(window as any)[loadingKey]) {
            (window as any)[loadingKey] = true;
            get().loadCompanyBackpack(resolvedActiveCompanyId)
              .then(() => {
                (window as any)[alreadyLoadedKey] = true;
                (window as any)[loadingKey] = false;
              })
              .catch((error) => {
                console.error('Erreur lors du chargement du Company Backpack:', error);
                (window as any)[loadingKey] = false;
              });
          }
        }
      }
      
      return nextState;
    });
  },
  updateUserProfile: (updates) => {
    set((state) => {
      const { companyId, ...profileUpdates } = updates;
      const nextProfile = {
        ...state.userProfile,
        ...profileUpdates,
      };

      const nextUsers = state.authUsers.map((user) => {
        if (user.id !== state.currentUserId) {
          return user;
        }
        const mergedProfile = {
          ...user.profile,
          ...profileUpdates,
          password: '',
        };
        const sanitized = sanitizeAuthUser({
          ...user,
          fullName: `${mergedProfile.firstName} ${mergedProfile.lastName}`.trim() || user.fullName,
          profile: mergedProfile,
          companyId: companyId !== undefined ? companyId : user.companyId,
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
    console.log('🟢🟢🟢 [addCompany] DÉBUT - Payload reçu:', payload);
    const companyId = `co${Date.now()}`;
    console.log('🟢🟢🟢 [addCompany] ID généré:', companyId);
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
    console.log('🟢🟢🟢 [addCompany] Nouvelle entreprise créée localement:', newCompany);
    let insertedCompany = newCompany;
    set((state) => {
      console.log('🟢🟢🟢 [addCompany] State actuel - companies:', state.companies);
      console.log('🟢🟢🟢 [addCompany] State actuel - nombre companies:', state.companies.length);
      
      const shouldBeDefault = safePayload.isDefault || state.companies.length === 0;
      console.log('🟢🟢🟢 [addCompany] shouldBeDefault:', shouldBeDefault);
      
      const baseCompanies = shouldBeDefault
        ? state.companies.map((company) => ({ ...company, isDefault: false }))
        : state.companies;
      const companyToInsert: Company = {
        ...newCompany,
        isDefault: shouldBeDefault,
      };
      insertedCompany = companyToInsert;
      const nextCompanies = [...baseCompanies, companyToInsert];
      console.log('🟢🟢🟢 [addCompany] APRÈS ajout local - nextCompanies:', nextCompanies);
      console.log('🟢🟢🟢 [addCompany] Nombre d\'entreprises après ajout local:', nextCompanies.length);
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
    console.log('🟢🟢🟢 [addCompany] Appel API CompanyService.createCompany...');
    CompanyService.createCompany({
      ...safePayload,
      id: companyId,
      isDefault: insertedCompany.isDefault,
    })
      .then(async (result) => {
        console.log('🟢🟢🟢 [addCompany] Réponse API createCompany:', result);
        if (!result.success) {
          console.error('❌❌❌ [addCompany] Erreur création entreprise:', result.error);
          return;
        }
        console.log('🟢🟢🟢 [addCompany] Entreprise créée avec succès, rechargement de toutes les entreprises...');
        const companiesResult = await CompanyService.getCompanies();
        console.log('🟢🟢🟢 [addCompany] Réponse getCompanies:', companiesResult);
        console.log('🟢🟢🟢 [addCompany] Nombre d\'entreprises récupérées:', companiesResult.data?.length || 0);
        if (companiesResult.success && Array.isArray(companiesResult.data)) {
          console.log('🟢🟢🟢 [addCompany] Mise à jour du state avec buildCompanyStateFromBackend...');
          set((state) => {
            const newState = buildCompanyStateFromBackend(state, companiesResult.data);
            console.log('🟢🟢🟢 [addCompany] Nouveau state après buildCompanyStateFromBackend:', newState);
            console.log('🟢🟢🟢 [addCompany] Nombre d\'entreprises dans nouveau state:', newState.companies?.length || 0);
            return newState;
          });
        } else {
          console.error('❌❌❌ [addCompany] getCompanies n\'a pas retourné un array valide');
        }
      })
      .catch((error) => {
        console.error('❌❌❌ [addCompany] Erreur création entreprise:', error);
      });
    console.log('🟢🟢🟢 [addCompany] FIN - Entreprise retournée:', insertedCompany);
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
    if (updated) {
      CompanyService.updateCompany(companyId, updated)
        .then(async (result) => {
          if (!result.success) {
            console.error('[Store] ❌ Erreur mise à jour entreprise:', result.error);
            return;
          }
          const companiesResult = await CompanyService.getCompanies();
          if (companiesResult.success && Array.isArray(companiesResult.data)) {
            set((state) => buildCompanyStateFromBackend(state, companiesResult.data));
          }
        })
        .catch((error) => {
          console.error('[Store] ❌ Erreur mise à jour entreprise:', error);
        });
    }
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
    CompanyService.deleteCompany(companyId)
      .then(async (result) => {
        if (!result.success) {
          console.error('[Store] ❌ Erreur suppression entreprise:', result.error);
          return;
        }
        const companiesResult = await CompanyService.getCompanies();
        if (companiesResult.success && Array.isArray(companiesResult.data)) {
          set((state) => buildCompanyStateFromBackend(state, companiesResult.data));
        }
      })
      .catch((error) => {
        console.error('[Store] ❌ Erreur suppression entreprise:', error);
      });
  },
  clearCompanyData: () => {
    set((state) => ({
      clients: [],
      leads: [],
      services: [],
      categories: [],
      engagements: [],
      appointments: [],
      calendarEvents: [],
      clientInvoices: [],
      vendorInvoices: [],
      purchases: [],
      subscriptions: [],
      documents: [],
      projectMembers: [],
      emailSignatures: [],
      stats: {
        revenueSeries: [],
        volumeSeries: [],
        topServices: [],
        averageDuration: 0,
        projectVelocity: state.stats.projectVelocity || { velocity: 0, trend: 'stable' },
      },
    }));
  },
  loadCompanyBackpack: async (companyId: string) => {
    // Protection globale pour éviter les appels multiples
    const loadingKey = `__loadingCompanyBackpack_${companyId}`;
    const alreadyLoadedKey = `__companyBackpackLoaded_${companyId}`;
    
    // Si déjà chargé, ne pas recharger
    if ((window as any)[alreadyLoadedKey]) {
      return;
    }
    
    // Si en cours de chargement, attendre
    if ((window as any)[loadingKey]) {
      // Attendre que le chargement se termine
      let attempts = 0;
      while ((window as any)[loadingKey] && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      // Si maintenant chargé, retourner
      if ((window as any)[alreadyLoadedKey]) {
        return;
      }
    }
    
    (window as any)[loadingKey] = true;
    
    try {
      const { CompanyService } = await import('../api/services/companies');
      const result = await CompanyService.getBackpack(companyId);
      
      if (result.success && result.data) {
        set((state) => {
          const target = state.companies.find((company) => company.id === companyId);
          // Ne pas changer activeCompanyId si déjà défini (évite les re-renders)
          const newActiveCompanyId = state.activeCompanyId || companyId;
          return {
            activeCompanyId: newActiveCompanyId,
            vatEnabled: result.data.settings?.vatEnabled ?? target?.vatEnabled ?? state.vatEnabled,
            vatRate: result.data.settings?.vatRate ?? target?.vatRate ?? state.vatRate,
            stats: {
              ...state.stats,
              ...result.data.stats,
            },
          };
        });
        (window as any)[alreadyLoadedKey] = true;
      }
    } catch (error) {
      console.error('Erreur lors du chargement du Company Backpack:', error);
    } finally {
      // Libérer le verrou après un court délai
      setTimeout(() => {
        (window as any)[loadingKey] = false;
      }, 1000);
    }
  },
  setActiveCompany: async (companyId: string | null) => {
    // 1. Vider toutes les données
    get().clearCompanyData();
    
    // 2. Mettre à jour l'entreprise active et persister immédiatement
    set((state) => {
      const target = state.companies.find((company) => company.id === companyId);
      const newState = {
        activeCompanyId: companyId,
        vatEnabled: target?.vatEnabled ?? state.vatEnabled,
      };
      
      // Persister activeCompanyId dans localStorage immédiatement (déjà fait dans handleCompanySelect, mais on le refait ici pour être sûr)
      if (typeof window !== 'undefined') {
        try {
          if (companyId) {
            localStorage.setItem('erp_active_company_id', companyId);
          } else {
            localStorage.removeItem('erp_active_company_id');
          }
        } catch (error) {
          console.warn('Impossible de sauvegarder activeCompanyId:', error);
        }
      }
      
      return newState;
    });
    
    // 3. Si une entreprise est sélectionnée, charger son backpack
    if (companyId) {
      await get().loadCompanyBackpack(companyId);
    }
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
      console.warn('[hasPageAccess] Aucun utilisateur connecté pour la page:', page);
      return false;
    }
    const hasWildcard = user.pages.includes('*');
    const hasPage = user.pages.includes(page);
    const result = hasWildcard || hasPage;
    if (!result) {
      console.warn('[hasPageAccess] Accès refusé:', {
        page,
        userPages: user.pages,
        hasWildcard,
        hasPage,
      });
    }
    return result;
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
    const { authUsers } = get();
    
    // Debug: afficher les utilisateurs disponibles
    console.log('[Login] Utilisateurs disponibles:', authUsers.map(u => ({ username: u.username, active: u.active })));
    
    const candidate = authUsers.find(
      (user) => user.username.toLowerCase() === normalizedUsername
    );
    
    if (!candidate) {
      console.log('[Login] Utilisateur non trouvé:', normalizedUsername);
      return false;
    }
    
    if (!candidate.active) {
      console.log('[Login] Utilisateur inactif:', normalizedUsername);
      return false;
    }
    
    const passwordMatch = verifyPassword(password.trim(), candidate.passwordHash);
    console.log('[Login] Vérification mot de passe:', { username: normalizedUsername, match: passwordMatch, hash: candidate.passwordHash });
    
    if (passwordMatch) {
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
  createUserAccount: async ({ username, password, role, pages, permissions, companyId }) => {
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
    const uniqueId = `auth-${timestamp}`;
    
    // Préparer les données pour le backend (avec mot de passe en clair)
    const userDataForBackend = {
      id: uniqueId,
      username: trimmedUsername,
      fullName: trimmedUsername,
      password: trimmedPassword, // Envoyer le mot de passe en clair, le backend le hashera
      role,
      pages: resolvedPages,
      permissions: resolvedPermissions,
      active: true,
      profile: {
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
      },
      notificationPreferences: { ...initialNotificationPreferences },
      companyId: companyId ?? null,
    };

    // Créer l'utilisateur via le backend (qui hash le mot de passe)
    try {
      const result = await UserService.createUser(userDataForBackend);
      
      if (!result.success || !result.data) {
        // Gérer spécifiquement l'erreur 409 (utilisateur déjà existant)
        const errorMessage = result.error || "Impossible de créer l'utilisateur.";
        if (errorMessage.includes("déjà utilisé") || errorMessage.includes("409") || errorMessage.includes("Conflict")) {
          return { success: false, error: "Ce nom d'utilisateur est déjà utilisé. Veuillez en choisir un autre." };
        }
        return { success: false, error: errorMessage };
      }
      
      // Le backend a créé l'utilisateur et hashé le mot de passe
      const backendUser = result.data;
      const backendId = backendUser.id || uniqueId;
      
      // Créer l'objet utilisateur pour le store (sans le mot de passe)
      // S'assurer que le profil n'hérite pas de l'avatarUrl d'un autre utilisateur
      const backendProfile = backendUser.profile || {};
      const newUserProfile = {
        ...userDataForBackend.profile,
        // FORCER avatarUrl à undefined pour un nouvel utilisateur
        // Chaque utilisateur doit avoir sa propre photo de profil
        avatarUrl: undefined,
        // S'assurer que tous les autres champs du profil viennent du backend s'ils existent
        firstName: backendProfile.firstName || userDataForBackend.profile.firstName,
        lastName: backendProfile.lastName || userDataForBackend.profile.lastName,
        email: backendProfile.email || userDataForBackend.profile.email,
        phone: backendProfile.phone || userDataForBackend.profile.phone,
        role: backendProfile.role || userDataForBackend.profile.role,
      };
      
      const newUser = sanitizeAuthUser({
        id: backendId,
        username: backendUser.username || trimmedUsername,
        fullName: backendUser.fullName || trimmedUsername,
        passwordHash: backendUser.passwordHash || '', // Le backend a hashé le mot de passe
        role: (backendUser.role as UserRole) || role,
        pages: (backendUser.pages as (AppPageKey | '*')[]) || resolvedPages,
        permissions: (backendUser.permissions as (PermissionKey | '*')[]) || resolvedPermissions,
        active: backendUser.active !== undefined ? backendUser.active : true,
        profile: newUserProfile,
        notificationPreferences: backendUser.notificationPreferences || { ...initialNotificationPreferences },
        companyId: backendUser.companyId ?? companyId ?? null,
      });

      // Ajouter l'utilisateur au store
      set((state) => {
        const nextUsers = [...state.authUsers, newUser];
        persistAuthState(nextUsers, state.currentUserId);
        return {
          authUsers: nextUsers,
        };
      });

      return { success: true };
    } catch (error) {
      console.error('[createUserAccount] Erreur:', error);
      return { success: false, error: error instanceof Error ? error.message : "Erreur lors de la création de l'utilisateur." };
    }
  },
  updateUserAccount: (userId, updates) => {
    const actor = get().getCurrentUser();
    if (!actor || actor.role !== 'superAdmin') {
      return { success: false, error: 'Action non autorisée.' };
    }
    let didUpdate = false;
    let updatedUser: AuthUser | null = null;
    set((state) => {
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
          companyId: updates.companyId !== undefined ? updates.companyId : user.companyId,
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

    // Synchroniser avec le backend
    if (didUpdate && updatedUser) {
      const ensuredUser = updatedUser as AuthUser;
      UserService.updateUser(userId, ensuredUser)
        .then(async (result) => {
          if (result.success) {
            // Recharger la liste depuis le backend
            const refreshed = await UserService.getUsers();
            if (refreshed.success && refreshed.data) {
              const mappedUsers: AuthUser[] = refreshed.data.map((apiUser) => ({
                id: apiUser.id || `auth-${Date.now()}`,
                username: apiUser.username || '',
                fullName: apiUser.fullName || apiUser.username || '',
                passwordHash: apiUser.passwordHash || '',
                role: (apiUser.role as UserRole) || 'agent',
                pages: (apiUser.pages as (AppPageKey | '*')[]) || [],
                permissions: (apiUser.permissions as (PermissionKey | '*')[]) || [],
                active: apiUser.active !== undefined ? apiUser.active : true,
                profile: apiUser.profile || { ...initialProfile },
                notificationPreferences: apiUser.notificationPreferences || { ...initialNotificationPreferences },
                companyId: apiUser.companyId !== undefined ? apiUser.companyId : null,
              }));
              set((state) => {
                persistAuthState(mappedUsers, state.currentUserId);
                const nextState: Partial<AppState> = {
                  authUsers: mappedUsers,
                };
                const currentUser = mappedUsers.find((u) => u.id === state.currentUserId);
                if (currentUser) {
                  nextState.userProfile = { ...currentUser.profile };
                  nextState.notificationPreferences = { ...currentUser.notificationPreferences };
                }
                return nextState;
              });
            }
          }
        })
        .catch((error) => {
          console.error('[Store] ❌ Erreur mise à jour utilisateur:', error);
        });
    }

    if (!didUpdate) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }
    return { success: true };
  },
  deleteUser: (userId) => {
    const actor = get().getCurrentUser();
    if (!actor || actor.role !== 'superAdmin') {
      return { success: false, error: 'Action non autorisée.' };
    }
    
    // Ne pas permettre de supprimer l'utilisateur actuellement connecté
    if (userId === actor.id) {
      return { success: false, error: 'Vous ne pouvez pas supprimer votre propre compte.' };
    }
    
    // Ne pas permettre de supprimer l'utilisateur admin par défaut
    const userToDelete = get().authUsers.find((u) => u.id === userId);
    if (userToDelete && userToDelete.username.toLowerCase() === 'admin' && userToDelete.id === 'auth-admin') {
      return { success: false, error: 'L\'utilisateur admin par défaut ne peut pas être supprimé.' };
    }
    
    let didDelete = false;
    set((state) => {
      const nextUsers = state.authUsers.filter((user) => {
        if (user.id === userId) {
          didDelete = true;
          return false;
        }
        return true;
      });
      
      if (!didDelete) {
        return {};
      }
      
      // Si l'utilisateur supprimé était connecté, déconnecter
      const nextCurrentUserId = state.currentUserId === userId ? null : state.currentUserId;
      persistAuthState(nextUsers, nextCurrentUserId);
      
      return {
        authUsers: nextUsers,
        currentUserId: nextCurrentUserId,
        userProfile: nextCurrentUserId === null ? { ...initialProfile } : state.userProfile,
        notificationPreferences: nextCurrentUserId === null ? { ...initialNotificationPreferences } : state.notificationPreferences,
      };
    });
    
    if (!didDelete) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }

    // Synchroniser avec le backend
    UserService.deleteUser(userId)
      .then((result) => {
        if (result.success) {
          console.log('[Store] ✅ Utilisateur supprimé et synchronisé:', userId);
        } else {
          console.error('[Store] ❌ Erreur suppression utilisateur:', result.error);
        }
      })
      .catch((error) => {
        console.error('[Store] ❌ Erreur suppression utilisateur:', error);
      });
    
    return { success: true };
  },
  setUserActiveState: (userId, active) => {
    const actor = get().getCurrentUser();
    if (!actor || actor.role !== 'superAdmin') {
      return { success: false, error: 'Action non autorisée.' };
    }
    let didUpdate = false;
    let updatedUser: AuthUser | null = null;
    set((state) => {
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

    // Synchroniser avec le backend
    if (didUpdate && updatedUser) {
      const ensuredUser = updatedUser as AuthUser;
      UserService.updateUser(userId, ensuredUser)
        .then(async (result) => {
          if (result.success) {
            // Recharger la liste depuis le backend
            const refreshed = await UserService.getUsers();
            if (refreshed.success && refreshed.data) {
              const mappedUsers: AuthUser[] = refreshed.data.map((apiUser) => ({
                id: apiUser.id || `auth-${Date.now()}`,
                username: apiUser.username || '',
                fullName: apiUser.fullName || apiUser.username || '',
                passwordHash: apiUser.passwordHash || '',
                role: (apiUser.role as UserRole) || 'agent',
                pages: (apiUser.pages as (AppPageKey | '*')[]) || [],
                permissions: (apiUser.permissions as (PermissionKey | '*')[]) || [],
                active: apiUser.active !== undefined ? apiUser.active : true,
                profile: apiUser.profile || { ...initialProfile },
                notificationPreferences: apiUser.notificationPreferences || { ...initialNotificationPreferences },
                companyId: apiUser.companyId !== undefined ? apiUser.companyId : null,
              }));
              set((state) => {
                persistAuthState(mappedUsers, state.currentUserId);
                const nextState: Partial<AppState> = {
                  authUsers: mappedUsers,
                };
                const currentUser = mappedUsers.find((u) => u.id === state.currentUserId);
                if (currentUser) {
                  nextState.userProfile = { ...currentUser.profile };
                  nextState.notificationPreferences = { ...currentUser.notificationPreferences };
                }
                return nextState;
              });
            }
          }
        })
        .catch((error) => {
          console.error('[Store] ❌ Erreur mise à jour utilisateur:', error);
        });
    }

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
    let updatedUser: AuthUser | null = null;
    set((state) => {
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

    // Synchroniser avec le backend
    if (didUpdate && updatedUser) {
      const ensuredUser = updatedUser as AuthUser;
      UserService.updateUser(userId, ensuredUser)
        .then(async (result) => {
          if (result.success) {
            // Recharger la liste depuis le backend
            const refreshed = await UserService.getUsers();
            if (refreshed.success && refreshed.data) {
              const mappedUsers: AuthUser[] = refreshed.data.map((apiUser) => ({
                id: apiUser.id || `auth-${Date.now()}`,
                username: apiUser.username || '',
                fullName: apiUser.fullName || apiUser.username || '',
                passwordHash: apiUser.passwordHash || '',
                role: (apiUser.role as UserRole) || 'agent',
                pages: (apiUser.pages as (AppPageKey | '*')[]) || [],
                permissions: (apiUser.permissions as (PermissionKey | '*')[]) || [],
                active: apiUser.active !== undefined ? apiUser.active : true,
                profile: apiUser.profile || { ...initialProfile },
                notificationPreferences: apiUser.notificationPreferences || { ...initialNotificationPreferences },
                companyId: apiUser.companyId !== undefined ? apiUser.companyId : null,
              }));
              set((state) => {
                persistAuthState(mappedUsers, state.currentUserId);
                const nextState: Partial<AppState> = {
                  authUsers: mappedUsers,
                };
                const currentUser = mappedUsers.find((u) => u.id === state.currentUserId);
                if (currentUser) {
                  nextState.userProfile = { ...currentUser.profile };
                  nextState.notificationPreferences = { ...currentUser.notificationPreferences };
                }
                return nextState;
              });
            }
          }
        })
        .catch((error) => {
          console.error('[Store] ❌ Erreur mise à jour utilisateur:', error);
        });
    }

    if (!didUpdate) {
      return { success: false, error: 'Utilisateur introuvable.' };
    }
    return { success: true };
  },
}));
