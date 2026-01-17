import type { AppPageKey } from '../../lib/rbac';
import type { Service, ServiceCategory, ServiceOption, UserProfile, Company } from '../../store/useAppData';

export type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl: string;
  companyId: string;
};

export type CompanyFormState = {
  id: string | null;
  name: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  siret: string;
  vatNumber: string;
  legalNotes: string;
  vatEnabled: boolean;
  website: string;
  isDefault: boolean;
  documentHeaderTitle: string;
  documentHeaderSubtitle: string;
  documentHeaderNote: string;
  logoUrl: string;
  invoiceLogoUrl: string;
  bankName: string;
  bankAddress: string;
  iban: string;
  bic: string;
  planningUser: string | null;
};

export type UserFormState = {
  username: string;
  password: string;
  role: 'superAdmin' | 'admin' | 'manager' | 'agent' | 'lecture';
  pages: (AppPageKey | '*')[];
  permissions: (
    | 'service.create'
    | 'service.edit'
    | 'service.duplicate'
    | 'service.invoice'
    | 'service.print'
    | 'service.email'
    | 'service.archive'
    | 'lead.edit'
    | 'lead.contact'
    | 'lead.convert'
    | 'lead.delete'
    | 'client.edit'
    | 'client.contact.add'
    | 'client.invoice'
    | 'client.quote'
    | 'client.email'
    | 'client.archive'
    | 'documents.view'
    | 'documents.edit'
    | 'documents.send'
    | 'settings.profile'
    | 'settings.companies'
    | 'settings.catalog'
    | 'settings.users'
    | '*'
  )[];
  active: boolean;
  resetPassword: string;
  companyId?: string;
};

export type CatalogServiceFormState = {
  id: string | null;
  name: string;
  category: ServiceCategory;
  description: string;
  priceHT: string;
  priceTTC: string;
  active: boolean;
};

export type CatalogItemFormState = {
  id: string | null;
  serviceId: string;
  label: string;
  description: string;
  defaultDurationMin: string;
  unitPriceHT: string;
  tvaPct: string;
  active: boolean;
};

export const DEFAULT_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'Voiture', label: 'Voiture' },
  { value: 'Canapé', label: 'Canapé' },
  { value: 'Textile', label: 'Textile' },
  { value: 'Autre', label: 'Autre' },
];

export const getAllCategories = (services: Service[]): { value: ServiceCategory; label: string }[] => {
  const defaultCategories = new Map(DEFAULT_CATEGORIES.map((cat) => [cat.value, cat]));
  const serviceCategories = new Set(services.map((service) => service.category));

  serviceCategories.forEach((category) => {
    if (!defaultCategories.has(category)) {
      defaultCategories.set(category, { value: category, label: category });
    }
  });

  return Array.from(defaultCategories.values());
};

export const buildCategoryOptions = (
  services: Service[],
  currentValue?: ServiceCategory
): { value: ServiceCategory; label: string }[] => {
  const categories = getAllCategories(services);
  if (!currentValue || categories.some((category) => category.value === currentValue)) {
    return categories;
  }
  return [{ value: currentValue, label: currentValue }, ...categories];
};

export const buildProfileForm = (profile: UserProfile | null, currentUserCompanyId?: string | null): ProfileFormState => ({
  firstName: profile?.firstName ?? '',
  lastName: profile?.lastName ?? '',
  email: profile?.email ?? '',
  phone: profile?.phone ?? '',
  role: profile?.role ?? '',
  avatarUrl: profile?.avatarUrl ?? '',
  companyId: currentUserCompanyId ?? '',
});

export const buildCompanyForm = (company: Company | null): CompanyFormState => ({
  id: company?.id ?? null,
  name: company?.name ?? '',
  email: company?.email ?? '',
  phone: company?.phone ?? '',
  address: company?.address ?? '',
  postalCode: company?.postalCode ?? '',
  city: company?.city ?? '',
  country: company?.country ?? '',
  siret: company?.siret ?? '',
  vatNumber: company?.vatNumber ?? '',
  legalNotes: company?.legalNotes ?? '',
  vatEnabled: company?.vatEnabled ?? true,
  website: company?.website ?? '',
  isDefault: company?.isDefault ?? false,
  documentHeaderTitle: company?.documentHeaderTitle ?? '',
  documentHeaderSubtitle: company?.documentHeaderSubtitle ?? '',
  documentHeaderNote: company?.documentHeaderNote ?? '',
  logoUrl: company?.logoUrl ?? '',
  invoiceLogoUrl: company?.invoiceLogoUrl ?? '',
  bankName: company?.bankName ?? '',
  bankAddress: company?.bankAddress ?? '',
  iban: company?.iban ?? '',
  bic: company?.bic ?? '',
  planningUser: company?.planningUser ?? null,
});

export const buildCatalogServiceForm = (service: Service | null, vatEnabled: boolean = false): CatalogServiceFormState => {
  const firstOption = service?.options?.[0];
  const priceHT = firstOption?.unitPriceHT !== undefined && firstOption?.unitPriceHT !== null ? firstOption.unitPriceHT : 0;
  const tvaPct = firstOption?.tvaPct || (vatEnabled ? 20 : 0);
  const priceTTC = priceHT > 0 && tvaPct > 0 ? priceHT * (1 + tvaPct / 100) : priceHT;
  
  return {
    id: service?.id ?? null,
    name: service?.name ?? '',
    category: service?.category ?? 'Voiture',
    description: service?.description ?? '',
    priceHT: priceHT > 0 ? String(priceHT) : '',
    priceTTC: priceTTC > 0 ? String(priceTTC.toFixed(2)) : '',
    active: service?.active ?? true,
  };
};

export const buildCatalogItemForm = (serviceId: string, option: ServiceOption | null): CatalogItemFormState => ({
  id: option?.id ?? null,
  serviceId,
  label: option?.label ?? '',
  description: option?.description ?? '',
  defaultDurationMin:
    option?.defaultDurationMin !== undefined && option?.defaultDurationMin !== null
      ? String(option.defaultDurationMin)
      : '',
  unitPriceHT:
    option?.unitPriceHT !== undefined && option?.unitPriceHT !== null ? String(option.unitPriceHT) : '',
  tvaPct:
    option?.tvaPct !== undefined && option?.tvaPct !== null ? String(option.tvaPct) : '',
  active: option?.active ?? true,
});

