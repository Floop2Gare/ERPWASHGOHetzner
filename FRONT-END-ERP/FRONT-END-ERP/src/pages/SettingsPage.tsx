import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { RowActionButton } from '../components/RowActionButton';
import SignatureEditor from '../components/settings/SignatureEditor';
// import { SupabaseSyncTest } from '../components/SupabaseSyncTest'; // Supprimé - Architecture Backend
import {
  AuthUser,
  Company,
  EmailSignature,
  EmailSignatureScope,
  Service,
  ServiceOption,
  ServiceCategory,
  SidebarTitlePreference,
  UserProfile,
  useAppData,
} from '../store/useAppData';
import { IconDuplicate, IconEdit, IconPlus, IconTrash } from '../components/icons';
import { BRAND_BASELINE, BRAND_FULL_TITLE, BRAND_NAME } from '../lib/branding';
import { formatCurrency } from '../lib/format';
import { APP_PAGE_OPTIONS, PERMISSION_OPTIONS } from '../lib/rbac';

const sections = [
  { id: 'profile', label: 'Profil utilisateur' },
  { id: 'companies', label: 'Entreprises' },
  { id: 'signatures', label: 'Signatures e-mail' },
  { id: 'catalog', label: 'Services & Produits' },
  { id: 'users', label: 'Utilisateurs' },
  { id: 'sidebarTitle', label: 'Titre Sidebar' },
] as const;

type SectionId = (typeof sections)[number]['id'];

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl: string;
};

type CompanyFormState = {
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
  invoiceLogoUrl: string; // Logo spécifique pour les factures (120x50)
  // Informations bancaires
  bankName: string;
  bankAddress: string;
  iban: string;
  bic: string;
  // Planning
  planningUser: string | null; // 'clement', 'adrien', ou null pour tous
};

type SignatureFormState = {
  id: string | null;
  scope: EmailSignatureScope;
  companyId: string | null;
  userId: string | null;
  label: string;
  html: string;
  isDefault: boolean;
};

type SidebarTitleFormState = {
  text: string;
  hidden: boolean;
};

type UserFormState = {
  username: string;
  password: string;
  role: 'superAdmin' | 'admin' | 'manager' | 'agent' | 'lecture';
  pages: ('dashboard' | 'clients' | 'leads' | 'service' | 'achats' | 'documents' | 'planning' | 'stats' | 'parametres' | 'parametres.utilisateurs' | '*')[];
  permissions: ('service.create' | 'service.edit' | 'service.duplicate' | 'service.invoice' | 'service.print' | 'service.email' | 'service.archive' | 'lead.edit' | 'lead.contact' | 'lead.convert' | 'lead.delete' | 'client.edit' | 'client.contact.add' | 'client.invoice' | 'client.quote' | 'client.email' | 'client.archive' | 'documents.view' | 'documents.edit' | 'documents.send' | 'settings.profile' | 'settings.companies' | 'settings.signatures' | 'settings.catalog' | 'settings.users' | 'settings.sidebar' | '*')[];
  active: boolean;
  resetPassword: string;
};

type CatalogServiceFormState = {
  id: string | null;
  name: string;
  category: ServiceCategory;
  description: string;
  active: boolean;
};

type CatalogItemFormState = {
  id: string | null;
  serviceId: string;
  label: string;
  description: string;
  defaultDurationMin: string;
  unitPriceHT: string;
  tvaPct: string;
  active: boolean;
};

const SIGNATURE_VARIABLES = [
  { token: '{nom}', label: 'Nom complet' },
  { token: '{fonction}', label: 'Fonction' },
  { token: '{téléphone}', label: 'Téléphone' },
  { token: '{email}', label: 'E-mail' },
  { token: '{entreprise}', label: 'Entreprise' },
  { token: '{site}', label: 'Site web' },
];

const CATALOG_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'Voiture', label: 'Voiture' },
  { value: 'Canapé', label: 'Canapé' },
  { value: 'Textile', label: 'Textile' },
  { value: 'Autre', label: 'Autre' },
];

const fieldLabelClass =
  'flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500';
const inputClass =
  'rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30';
const textareaClass =
  'min-h-[120px] rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30';
const detailFormGridClass = 'grid gap-4 sm:grid-cols-2';

const formatSignatureDate = (iso: string | undefined) => {
  if (!iso) {
    return '—';
  }
  try {
    return format(new Date(iso), "dd MMM yyyy à HH'h'mm", { locale: fr });
  } catch (error) {
    return '—';
  }
};

const buildProfileForm = (profile: UserProfile | null): ProfileFormState => ({
  firstName: profile?.firstName ?? '',
  lastName: profile?.lastName ?? '',
  email: profile?.email ?? '',
  phone: profile?.phone ?? '',
  role: profile?.role ?? '',
  avatarUrl: profile?.avatarUrl ?? '',
});

const buildCompanyForm = (company: Company | null): CompanyFormState => ({
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

const buildSignatureForm = (
  signature: EmailSignature | null,
  scope: EmailSignatureScope,
  companyId: string | null,
  userId: string | null
): SignatureFormState => ({
  id: signature?.id ?? null,
  scope: signature?.scope ?? scope,
  companyId: signature?.companyId ?? companyId,
  userId: signature?.userId ?? userId,
  label: signature?.label ?? '',
  html: signature?.html ?? '',
  isDefault: signature?.isDefault ?? false,
});

const buildSidebarTitleForm = (preference: SidebarTitlePreference | null): SidebarTitleFormState => ({
  text: preference?.text ?? '',
  hidden: preference?.hidden ?? false,
});

const buildCatalogServiceForm = (service: Service | null): CatalogServiceFormState => ({
  id: service?.id ?? null,
  name: service?.name ?? '',
  category: service?.category ?? 'Voiture',
  description: service?.description ?? '',
  active: service?.active ?? true,
});

const buildCatalogItemForm = (serviceId: string, option: ServiceOption | null): CatalogItemFormState => ({
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

const getInitials = (firstName: string, lastName: string) => {
  const first = firstName?.trim().charAt(0).toUpperCase() ?? '';
  const last = lastName?.trim().charAt(0).toUpperCase() ?? '';
  return `${first}${last}`.trim() || '👤';
};

type DetailState =
  | { section: 'profile'; mode: 'edit' }
  | { section: 'companies'; mode: 'create' | 'edit'; companyId: string | null }
  | { section: 'signatures'; mode: 'create' | 'edit'; signatureId: string | null }
  | { section: 'catalog'; mode: 'create-service' }
  | { section: 'catalog'; mode: 'edit-service'; serviceId: string }
  | { section: 'catalog'; mode: 'create-item'; serviceId: string }
  | { section: 'catalog'; mode: 'edit-item'; serviceId: string; itemId: string }
  | { section: 'users'; mode: 'create' | 'edit' | 'password-reset'; userId?: string }
  | { section: 'sidebarTitle'; mode: 'edit' };

const detailAnchors: Record<DetailState['section'], string> = {
  profile: 'profil',
  companies: 'entreprise',
  signatures: 'signature',
  catalog: 'catalogue',
  users: 'utilisateurs',
  sidebarTitle: 'sidebar-title',
};

const SettingsPage = () => {
  const {
    userProfile,
    updateUserProfile,
    updateUserAvatar,
    getCurrentUser,
    authUsers,
    currentUserId,
    companies,
    addCompany,
    updateCompany,
    removeCompany,
    services,
    addService,
    updateService,
    removeService,
    addServiceOption,
    updateServiceOption,
    removeServiceOption,
    activeCompanyId,
    setActiveCompany,
    setVatEnabled,
    vatRate,
    setVatRate,
    emailSignatures,
    createEmailSignature,
    updateEmailSignatureRecord,
    removeEmailSignature,
    setDefaultEmailSignature,
    sidebarTitlePreference,
    setSidebarTitlePreference,
    resetSidebarTitlePreference,
    // Fonctions de gestion des utilisateurs
    createUserAccount,
    updateUserAccount,
    setUserActiveState,
    resetUserPassword,
  } = useAppData();

  const currentUser = getCurrentUser();

  // Fonction pour vérifier l'accès aux onglets Paramètres
  const hasSettingsPermission = (sectionId: SectionId): boolean => {
    if (!currentUser) return false;
    
    // Super admin a accès à tout
    if (currentUser.role === 'superAdmin') return true;
    
    // Vérifier les permissions spécifiques
    switch (sectionId) {
      case 'profile':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.profile');
      case 'companies':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.companies');
      case 'signatures':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.signatures');
      case 'catalog':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.catalog');
      case 'users':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.users');
      case 'sidebarTitle':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.sidebar');
      default:
        return false;
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filtrer les sections selon les permissions de l'utilisateur
  const availableSections = sections.filter(section => hasSettingsPermission(section.id));
  
  const initialTab = (searchParams.get('tab') as SectionId) ?? 'profile';
  const [activeSection, setActiveSection] = useState<SectionId>(
    availableSections.some((section) => section.id === initialTab) ? initialTab : availableSections[0]?.id || 'profile'
  );

  useEffect(() => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set('tab', activeSection);
      return next;
    });
  }, [activeSection, setSearchParams]);

  const brandBaseline = BRAND_BASELINE.trim();
  const showBrandBaseline = brandBaseline.length > 0;

  const profileSectionRef = useRef<HTMLDivElement | null>(null);
  const companiesSectionRef = useRef<HTMLDivElement | null>(null);
  const signaturesSectionRef = useRef<HTMLDivElement | null>(null);
  const catalogSectionRef = useRef<HTMLDivElement | null>(null);
  const usersSectionRef = useRef<HTMLDivElement | null>(null);
  const sidebarTitleSectionRef = useRef<HTMLDivElement | null>(null);
  const detailContainerRef = useRef<HTMLDivElement | null>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const hasAppliedHashRef = useRef(false);

  const [detailState, setDetailState] = useState<DetailState | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => buildProfileForm(userProfile));
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(() =>
    buildCompanyForm(companies.find((company) => company.id === activeCompanyId) ?? companies[0] ?? null)
  );
  const companyLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const companyInvoiceLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [signatureForm, setSignatureForm] = useState<SignatureFormState>(() =>
    buildSignatureForm(null, 'company', activeCompanyId ?? companies[0]?.id ?? null, currentUserId)
  );
  const [sidebarTitleForm, setSidebarTitleForm] = useState<SidebarTitleFormState>(() =>
    buildSidebarTitleForm(sidebarTitlePreference)
  );
  const [catalogServiceForm, setCatalogServiceForm] = useState<CatalogServiceFormState>(() =>
    buildCatalogServiceForm(null)
  );
  const [catalogItemForm, setCatalogItemForm] = useState<CatalogItemFormState>(() =>
    buildCatalogItemForm(services[0]?.id ?? '', null)
  );
  const [selectedCatalogServiceId, setSelectedCatalogServiceId] = useState<string | null>(
    services[0]?.id ?? null
  );
  const [catalogServiceQuery, setCatalogServiceQuery] = useState('');
  const [catalogItemQuery, setCatalogItemQuery] = useState('');
  const [catalogServiceSort, setCatalogServiceSort] = useState<{
    key: 'name' | 'category' | 'active' | 'count';
    direction: 'asc' | 'desc';
  }>({ key: 'name', direction: 'asc' });
  
  // États pour la gestion des utilisateurs
  const [userForm, setUserForm] = useState<UserFormState>(() => ({
    username: '',
    password: '',
    role: 'agent',
    pages: ['*'],
    permissions: ['*'],
    active: true,
    resetPassword: '',
  }));
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [catalogItemSort, setCatalogItemSort] = useState<{
    key: 'label' | 'duration' | 'price' | 'active' | 'tva';
    direction: 'asc' | 'desc';
  }>({ key: 'label', direction: 'asc' });
  useEffect(() => {
    setProfileForm(buildProfileForm(userProfile));
  }, [userProfile]);

  useEffect(() => {
    if (!services.length) {
      setSelectedCatalogServiceId(null);
      return;
    }
    setSelectedCatalogServiceId((current) => {
      if (current && services.some((service) => service.id === current)) {
        return current;
      }
      return services[0].id;
    });
  }, [services]);

  useEffect(() => {
    if (detailState?.section !== 'profile' && avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
    if (detailState?.section !== 'companies' && companyLogoFileInputRef.current) {
      companyLogoFileInputRef.current.value = '';
    }
    if (detailState?.section !== 'companies' && companyInvoiceLogoFileInputRef.current) {
      companyInvoiceLogoFileInputRef.current.value = '';
    }
  }, [detailState]);

  useEffect(() => {
    if (detailState?.section !== 'sidebarTitle') {
      setSidebarTitleForm(buildSidebarTitleForm(sidebarTitlePreference));
    }
  }, [detailState, sidebarTitlePreference]);

  const selectedCatalogService = useMemo(() => {
    if (!services.length) {
      return null;
    }
    if (selectedCatalogServiceId) {
      return services.find((service) => service.id === selectedCatalogServiceId) ?? services[0];
    }
    return services[0];
  }, [selectedCatalogServiceId, services]);

  useEffect(() => {
    if (detailState?.section !== 'catalog') {
      setCatalogServiceForm(buildCatalogServiceForm(null));
      if (selectedCatalogService) {
        setCatalogItemForm((form) => ({
          ...buildCatalogItemForm(selectedCatalogService.id, null),
          serviceId: selectedCatalogService.id,
        }));
      }
      return;
    }

    if (detailState.mode === 'create-service') {
      setCatalogServiceForm(buildCatalogServiceForm(null));
    } else if (detailState.mode === 'edit-service') {
      const targetService = services.find((service) => service.id === detailState.serviceId) ?? null;
      setCatalogServiceForm(buildCatalogServiceForm(targetService));
    }

    if (detailState.mode === 'create-item') {
      setCatalogItemForm(buildCatalogItemForm(detailState.serviceId, null));
    } else if (detailState.mode === 'edit-item') {
      const parentService = services.find((service) => service.id === detailState.serviceId) ?? null;
      const targetOption = parentService?.options.find((option) => option.id === detailState.itemId) ?? null;
      setCatalogItemForm(buildCatalogItemForm(detailState.serviceId, targetOption));
    }
  }, [detailState, services, selectedCatalogService]);

  const vatGloballyEnabled = useMemo(
    () => companies.some((company) => company.vatEnabled),
    [companies]
  );

  const normalizedServiceQuery = catalogServiceQuery.trim().toLowerCase();
  const normalizedItemQuery = catalogItemQuery.trim().toLowerCase();

  const sortedCatalogServices = useMemo(() => {
    const filtered = services.filter((service) => {
      if (!normalizedServiceQuery) {
        return true;
      }
      const haystack = [
        service.name,
        service.description ?? '',
        service.category,
      ]
        .map((value) => value.toLowerCase());
      return haystack.some((value) => value.includes(normalizedServiceQuery));
    });
    const factor = catalogServiceSort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (catalogServiceSort.key) {
        case 'name':
          return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }) * factor;
        case 'category':
          return a.category.localeCompare(b.category, 'fr', { sensitivity: 'base' }) * factor;
        case 'active': {
          const aVal = a.active ? 1 : 0;
          const bVal = b.active ? 1 : 0;
          return (bVal - aVal) * factor;
        }
        case 'count':
          return (a.options.length - b.options.length) * factor;
        default:
          return 0;
      }
    });
  }, [services, normalizedServiceQuery, catalogServiceSort]);

  const sortedCatalogItems = useMemo(() => {
    if (!selectedCatalogService) {
      return [] as ServiceOption[];
    }
    const base = selectedCatalogService.options.filter((option) => {
      if (!normalizedItemQuery) {
        return true;
      }
      const haystack = [option.label, option.description ?? ''].map((value) => value.toLowerCase());
      return haystack.some((value) => value.includes(normalizedItemQuery));
    });
    const factor = catalogItemSort.direction === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      switch (catalogItemSort.key) {
        case 'label':
          return a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }) * factor;
        case 'duration':
          return ((a.defaultDurationMin ?? 0) - (b.defaultDurationMin ?? 0)) * factor;
        case 'price':
          return (a.unitPriceHT - b.unitPriceHT) * factor;
        case 'active': {
          const aVal = a.active ? 1 : 0;
          const bVal = b.active ? 1 : 0;
          return (bVal - aVal) * factor;
        }
        case 'tva': {
          const aVal = a.tvaPct ?? -1;
          const bVal = b.tvaPct ?? -1;
          return (aVal - bVal) * factor;
        }
        default:
          return 0;
      }
    });
  }, [selectedCatalogService, normalizedItemQuery, catalogItemSort]);

  const toggleCatalogServiceSort = (key: typeof catalogServiceSort.key) => {
    setCatalogServiceSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleCatalogItemSort = (key: typeof catalogItemSort.key) => {
    setCatalogItemSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getListSectionRef = (section: SectionId) => {
    switch (section) {
      case 'profile':
        return profileSectionRef;
      case 'companies':
        return companiesSectionRef;
      case 'signatures':
        return signaturesSectionRef;
      case 'catalog':
        return catalogSectionRef;
      case 'sidebarTitle':
        return sidebarTitleSectionRef;
      default:
        return profileSectionRef;
    }
  };

  useEffect(() => {
    if (selectedCatalogService) {
      setCatalogItemForm((form) => ({
        ...form,
        serviceId: selectedCatalogService.id,
      }));
    }
  }, [selectedCatalogService?.id]);

  const scrollToSection = (section: SectionId) => {
    const ref = getListSectionRef(section);
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        ref.current.focus({ preventScroll: true });
      }
    });
  };

  const updateHash = useCallback((hash: string | null) => {
    const url = new URL(window.location.href);
    url.hash = hash ? `#${hash}` : '';
    window.history.replaceState(null, '', url.toString());
  }, []);

  const closeDetail = (section: DetailState['section']) => {
    if (section === 'catalog') {
      const fallbackServiceId = (() => {
        if (detailState?.section === 'catalog') {
          if (detailState.mode === 'create-item' || detailState.mode === 'edit-item') {
            return detailState.serviceId;
          }
        }
        return selectedCatalogService?.id ?? services[0]?.id ?? '';
      })();
      setCatalogServiceForm(buildCatalogServiceForm(null));
      setCatalogItemForm(buildCatalogItemForm(fallbackServiceId, null));
    }
    setDetailState(null);
    updateHash(null);
    const listSection: SectionId = section;
    scrollToSection(listSection);
  };

  useEffect(() => {
    if (detailState) {
      updateHash(detailAnchors[detailState.section]);
      requestAnimationFrame(() => {
        if (detailContainerRef.current) {
          detailContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        detailHeadingRef.current?.focus({ preventScroll: true });
      });
    } else if (window.location.hash) {
      updateHash(null);
    }
  }, [detailState, updateHash]);

  useEffect(() => {
    if (hasAppliedHashRef.current) {
      return;
    }
    const currentHash = window.location.hash.replace('#', '');
    if (!currentHash) {
      hasAppliedHashRef.current = true;
      return;
    }

    if (currentHash === detailAnchors.profile) {
      setProfileForm(buildProfileForm(userProfile));
      setDetailState({ section: 'profile', mode: 'edit' });
    } else if (currentHash === detailAnchors.companies) {
      const targetCompany = companies.find((company) => company.id === activeCompanyId) ?? companies[0] ?? null;
      setCompanyForm(buildCompanyForm(targetCompany));
      setDetailState({
        section: 'companies',
        mode: targetCompany ? 'edit' : 'create',
        companyId: targetCompany?.id ?? null,
      });
    } else if (currentHash === detailAnchors.signatures) {
      const targetSignature = emailSignatures[0] ?? null;
      const scope = targetSignature?.scope ?? 'company';
      const defaultCompanyId =
        scope === 'company'
          ? targetSignature?.companyId ?? activeCompanyId ?? companies[0]?.id ?? null
          : targetSignature?.companyId ?? activeCompanyId ?? companies[0]?.id ?? null;
      const defaultUserId =
        scope === 'user'
          ? targetSignature?.userId ?? currentUserId ?? authUsers[0]?.id ?? null
          : currentUserId ?? authUsers[0]?.id ?? null;
      setEditingSignature(targetSignature);
      setSignatureForm(buildSignatureForm(targetSignature, scope, defaultCompanyId, defaultUserId));
      setDetailState({
        section: 'signatures',
        mode: targetSignature ? 'edit' : 'create',
        signatureId: targetSignature?.id ?? null,
      });
    } else if (currentHash === detailAnchors.sidebarTitle) {
      setSidebarTitleForm(buildSidebarTitleForm(sidebarTitlePreference));
      setDetailState({ section: 'sidebarTitle', mode: 'edit' });
    }

    hasAppliedHashRef.current = true;
  }, [
    activeCompanyId,
    authUsers,
    companies,
    currentUserId,
    emailSignatures,
    setCompanyForm,
    setProfileForm,
    setSignatureForm,
    setSidebarTitleForm,
    sidebarTitlePreference,
    userProfile,
  ]);

  const handleProfileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileForm((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClear = () => {
    setProfileForm((prev) => ({ ...prev, avatarUrl: '' }));
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
  };

  const handleAvatarSelect = () => {
    avatarFileInputRef.current?.click();
  };

  const openProfileDetail = () => {
    setProfileForm(buildProfileForm(userProfile));
    setDetailState({ section: 'profile', mode: 'edit' });
  };

  const handleProfileCancel = () => {
    setProfileForm(buildProfileForm(userProfile));
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateUserProfile({
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim(),
      role: profileForm.role.trim(),
    });
    updateUserAvatar(profileForm.avatarUrl.trim());
    closeDetail('profile');
  };

  useEffect(() => {
    if (detailState?.section !== 'companies') {
      setCompanyForm(
        buildCompanyForm(companies.find((company) => company.id === activeCompanyId) ?? companies[0] ?? null)
      );
    }
  }, [detailState, companies, activeCompanyId]);

  // Gestion de l'initialisation du formulaire utilisateur
  useEffect(() => {
    if (detailState?.section === 'users') {
      if (detailState.mode === 'create') {
        setUserForm({
          username: '',
          password: '',
          role: 'agent',
          pages: ['*'],
          permissions: ['*'],
          active: true,
          resetPassword: '',
        });
      } else if (detailState.mode === 'edit' && detailState.userId) {
        const user = authUsers.find(u => u.id === detailState.userId);
        if (user) {
          setUserForm({
            username: user.username,
            password: '',
            role: user.role,
            pages: user.pages.includes('*') ? ['*'] : [...user.pages],
            permissions: user.permissions.includes('*') ? ['*'] : [...user.permissions],
            active: user.active,
            resetPassword: '',
          });
        }
      } else if (detailState.mode === 'password-reset' && detailState.userId) {
        const user = authUsers.find(u => u.id === detailState.userId);
        if (user) {
          setUserForm({
            username: user.username,
            password: '',
            role: user.role,
            pages: user.pages.includes('*') ? ['*'] : [...user.pages],
            permissions: user.permissions.includes('*') ? ['*'] : [...user.permissions],
            active: user.active,
            resetPassword: '',
          });
        }
      }
      setUserFormError(null);
    }
  }, [detailState, authUsers]);

  const openCompanyDetail = (company: Company | null = null) => {
    if (company) {
      setCompanyForm(buildCompanyForm(company));
    } else {
      setCompanyForm(() => ({ ...buildCompanyForm(null), isDefault: companies.length === 0 }));
    }
    setDetailState({ section: 'companies', mode: company ? 'edit' : 'create', companyId: company?.id ?? null });
  };

  const handleCompanyCancel = () => {
    const target =
      (detailState?.section === 'companies' && detailState.companyId
        ? companies.find((company) => company.id === detailState.companyId) ?? null
        : null) ?? null;
    setCompanyForm(buildCompanyForm(target));
  };

  const handleCompanyFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setCompanyForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCompanyLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompanyForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCompanyLogoClear = () => {
    setCompanyForm((prev) => ({ ...prev, logoUrl: '' }));
    if (companyLogoFileInputRef.current) {
      companyLogoFileInputRef.current.value = '';
    }
  };

  const handleCompanyLogoSelect = () => {
    companyLogoFileInputRef.current?.click();
  };

  const handleCompanyInvoiceLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompanyForm((prev) => ({ ...prev, invoiceLogoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCompanyInvoiceLogoClear = () => {
    setCompanyForm((prev) => ({ ...prev, invoiceLogoUrl: '' }));
    if (companyInvoiceLogoFileInputRef.current) {
      companyInvoiceLogoFileInputRef.current.value = '';
    }
  };

  const handleCompanyInvoiceLogoSelect = () => {
    companyInvoiceLogoFileInputRef.current?.click();
  };

  const handleCompanySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedLogo = companyForm.logoUrl.startsWith('data:image')
      ? companyForm.logoUrl
      : companyForm.logoUrl.trim();
    const payload = {
      name: companyForm.name.trim(),
      email: companyForm.email.trim(),
      phone: companyForm.phone.trim(),
      website: companyForm.website.trim(),
      address: companyForm.address.trim(),
      postalCode: companyForm.postalCode.trim(),
      city: companyForm.city.trim(),
      country: companyForm.country.trim(),
      siret: companyForm.siret.trim(),
      vatNumber: companyForm.vatNumber.trim(),
      legalNotes: companyForm.legalNotes.trim(),
      documentHeaderTitle: companyForm.documentHeaderTitle.trim(),
      documentHeaderSubtitle: companyForm.documentHeaderSubtitle.trim(),
      documentHeaderNote: companyForm.documentHeaderNote.trim(),
      logoUrl: normalizedLogo,
      invoiceLogoUrl: companyForm.invoiceLogoUrl.startsWith('data:image')
        ? companyForm.invoiceLogoUrl
        : companyForm.invoiceLogoUrl.trim(),
      vatEnabled: companyForm.vatEnabled,
      isDefault: companyForm.isDefault,
      bankName: companyForm.bankName.trim(),
      bankAddress: companyForm.bankAddress.trim(),
      iban: companyForm.iban.trim(),
      bic: companyForm.bic.trim(),
      planningUser: companyForm.planningUser,
    };
    if (companyForm.id) {
      const updatedCompany = updateCompany(companyForm.id, payload);
      if (updatedCompany) {
        if (updatedCompany.id === activeCompanyId || payload.isDefault) {
          setActiveCompany(updatedCompany.id);
          setVatEnabled(updatedCompany.vatEnabled);
        }
      }
    } else {
      const created = addCompany(payload);
      setActiveCompany(created.id);
      setVatEnabled(created.vatEnabled);
    }
    closeDetail('companies');
  };

  const openSidebarTitleDetail = () => {
    setSidebarTitleForm(buildSidebarTitleForm(sidebarTitlePreference));
    setDetailState({ section: 'sidebarTitle', mode: 'edit' });
  };

  const handleSidebarTitleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setSidebarTitleForm((prev) => ({ ...prev, text: value }));
  };

  const handleSidebarTitleVisibilityChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSidebarTitleForm((prev) => ({ ...prev, hidden: event.target.checked }));
  };

  const handleSidebarTitleCancel = () => {
    setSidebarTitleForm(buildSidebarTitleForm(sidebarTitlePreference));
  };

  const handleSidebarTitleReset = () => {
    resetSidebarTitlePreference();
    setSidebarTitleForm(buildSidebarTitleForm({ text: BRAND_FULL_TITLE, hidden: false }));
  };

  const handleSidebarTitleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSidebarTitlePreference({
      text: sidebarTitleForm.text.trim(),
      hidden: sidebarTitleForm.hidden,
    });
    closeDetail('sidebarTitle');
  };

  // Gestionnaires pour les utilisateurs
  const handleUserFormChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setUserForm((prev) => {
      const newForm = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
      
      // Appliquer des permissions par défaut selon le rôle
      if (name === 'role') {
        const role = value as 'superAdmin' | 'admin' | 'manager' | 'agent' | 'lecture';
        switch (role) {
          case 'superAdmin':
            newForm.pages = ['*'];
            newForm.permissions = ['*'];
            break;
          case 'admin':
            newForm.pages = ['dashboard', 'clients', 'leads', 'service', 'achats', 'documents', 'planning', 'stats', 'parametres'];
            newForm.permissions = ['*'];
            break;
          case 'manager':
            newForm.pages = ['dashboard', 'clients', 'leads', 'service', 'planning', 'stats'];
            newForm.permissions = [
              'service.create', 'service.edit', 'service.duplicate', 'service.invoice', 'service.print', 'service.email',
              'lead.edit', 'lead.contact', 'lead.convert',
              'client.edit', 'client.contact.add', 'client.invoice', 'client.quote', 'client.email',
              'documents.view', 'documents.edit', 'documents.send',
              'settings.profile', 'settings.companies', 'settings.signatures', 'settings.catalog'
            ];
            break;
          case 'agent':
            newForm.pages = ['dashboard', 'clients', 'service', 'planning'];
            newForm.permissions = [
              'service.create', 'service.edit', 'service.invoice', 'service.print', 'service.email',
              'client.edit', 'client.contact.add',
              'documents.view', 'documents.send',
              'settings.profile'
            ];
            break;
          case 'lecture':
            newForm.pages = ['dashboard', 'clients', 'service', 'stats'];
            newForm.permissions = ['documents.view'];
            break;
        }
      }
      
      return newForm;
    });
    setUserFormError(null);
  };

  const handleUserSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (detailState?.mode === 'create') {
        const result = createUserAccount({
          username: userForm.username.trim(),
          password: userForm.password.trim(),
          role: userForm.role,
          pages: userForm.pages,
          permissions: userForm.permissions,
        });
        if (result.success && !userForm.active) {
          // Désactiver l'utilisateur après création si nécessaire
          const newUser = authUsers.find(u => u.username === userForm.username.trim());
          if (newUser) {
            setUserActiveState(newUser.id, false);
          }
        }
      } else if (detailState?.mode === 'edit' && detailState.section === 'users' && detailState.userId) {
        updateUserAccount(detailState.userId, {
          role: userForm.role,
          pages: userForm.pages,
          permissions: userForm.permissions,
        });
        // Gérer l'état actif séparément
        setUserActiveState(detailState.userId, userForm.active);
      } else if (detailState?.mode === 'password-reset' && detailState.section === 'users' && detailState.userId) {
        resetUserPassword(detailState.userId, userForm.resetPassword.trim());
      }
      closeDetail('users');
    } catch (error) {
      setUserFormError(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  const handleUserCancel = () => {
    setUserForm({
      username: '',
      password: '',
      role: 'agent',
      pages: ['*'],
      permissions: ['*'],
      active: true,
      resetPassword: '',
    });
    setUserFormError(null);
    closeDetail('users');
  };

  const openUserDetail = (mode: 'create' | 'edit' | 'password-reset', userId?: string) => {
    setDetailState({ section: 'users', mode, userId });
  };

  const handleCompanyVatToggle = (company: Company, enabled: boolean) => {
    updateCompany(company.id, { vatEnabled: enabled });
    if (company.id === activeCompanyId) {
      setVatEnabled(enabled);
    }
  };

  const handleCatalogServiceChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setCatalogServiceForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const openCatalogServiceDetail = (service: Service | null = null) => {
    if (service) {
      setCatalogServiceForm(buildCatalogServiceForm(service));
      setDetailState({ section: 'catalog', mode: 'edit-service', serviceId: service.id });
    } else {
      setCatalogServiceForm(buildCatalogServiceForm(null));
      setDetailState({ section: 'catalog', mode: 'create-service' });
    }
  };

  const handleCatalogServiceCancel = () => {
    if (detailState?.section !== 'catalog') {
      return;
    }
    if (detailState.mode === 'edit-service') {
      const service = services.find((item) => item.id === detailState.serviceId) ?? null;
      setCatalogServiceForm(buildCatalogServiceForm(service));
    } else {
      setCatalogServiceForm(buildCatalogServiceForm(null));
    }
  };

  const handleCatalogServiceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: catalogServiceForm.name.trim(),
      category: catalogServiceForm.category,
      description: catalogServiceForm.description.trim(),
      active: catalogServiceForm.active,
    };
    if (catalogServiceForm.id) {
      const updated = updateService(catalogServiceForm.id, payload);
      if (updated) {
        setSelectedCatalogServiceId(updated.id);
        setCatalogServiceForm(buildCatalogServiceForm(updated));
        closeDetail('catalog');
      }
    } else {
      const created = addService({ ...payload, options: [] });
      setSelectedCatalogServiceId(created.id);
      setCatalogServiceForm(buildCatalogServiceForm(created));
      closeDetail('catalog');
    }
  };

  const handleCatalogServiceDelete = (serviceId: string) => {
    removeService(serviceId);
    if (detailState?.section === 'catalog') {
      closeDetail('catalog');
    }
  };

  const handleCatalogServiceDuplicate = (service: Service) => {
    const baseName = service.name.trim();
    const duplicateName = baseName ? `${baseName} (copie)` : 'Service copié';
    const created = addService({
      name: duplicateName,
      category: service.category,
      description: service.description ?? '',
      active: service.active,
      options: [],
    });
    service.options.forEach((option) => {
      addServiceOption(created.id, {
        label: option.label,
        description: option.description,
        defaultDurationMin: option.defaultDurationMin,
        unitPriceHT: option.unitPriceHT,
        tvaPct: option.tvaPct ?? undefined,
        active: option.active,
      });
    });
    setSelectedCatalogServiceId(created.id);
  };

  const openCatalogItemDetail = (serviceId: string, option: ServiceOption | null = null) => {
    setCatalogItemForm(buildCatalogItemForm(serviceId, option));
    if (option) {
      setDetailState({ section: 'catalog', mode: 'edit-item', serviceId, itemId: option.id });
    } else {
      setDetailState({ section: 'catalog', mode: 'create-item', serviceId });
    }
  };

  const handleCatalogItemChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setCatalogItemForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCatalogItemCancel = () => {
    if (detailState?.section !== 'catalog') {
      return;
    }
    if (detailState.mode === 'edit-item') {
      const service = services.find((item) => item.id === detailState.serviceId) ?? null;
      const option = service?.options.find((item) => item.id === detailState.itemId) ?? null;
      setCatalogItemForm(buildCatalogItemForm(detailState.serviceId, option));
    } else if (detailState.mode === 'create-item') {
      setCatalogItemForm(buildCatalogItemForm(detailState.serviceId, null));
    }
  };

  const handleCatalogItemSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetServiceId = catalogItemForm.serviceId;
    if (!targetServiceId) {
      return;
    }
    const durationValue = Number.parseFloat(catalogItemForm.defaultDurationMin);
    const unitPriceValue = Number.parseFloat(catalogItemForm.unitPriceHT);
    const tvaValue = catalogItemForm.tvaPct.trim().length
      ? Number.parseFloat(catalogItemForm.tvaPct)
      : NaN;
    const payload = {
      label: catalogItemForm.label.trim(),
      description: catalogItemForm.description.trim(),
      defaultDurationMin: Number.isNaN(durationValue) ? 0 : durationValue,
      unitPriceHT: Number.isNaN(unitPriceValue) ? 0 : unitPriceValue,
      tvaPct: Number.isNaN(tvaValue) ? undefined : tvaValue,
      active: catalogItemForm.active,
    };
    if (catalogItemForm.id) {
      const updated = updateServiceOption(targetServiceId, catalogItemForm.id, payload);
      if (updated) {
        setSelectedCatalogServiceId(targetServiceId);
        setCatalogItemForm(buildCatalogItemForm(targetServiceId, updated));
        closeDetail('catalog');
      }
    } else {
      const created = addServiceOption(targetServiceId, payload);
      if (created) {
        setSelectedCatalogServiceId(targetServiceId);
        setCatalogItemForm(buildCatalogItemForm(targetServiceId, created));
        closeDetail('catalog');
      }
    }
  };

  const handleCatalogItemDelete = (serviceId: string, itemId: string) => {
    removeServiceOption(serviceId, itemId);
    if (detailState?.section === 'catalog') {
      closeDetail('catalog');
    }
  };

  const handleCompanyRemove = (companyId: string) => {
    removeCompany(companyId);
  };

  const handleCompanySetDefault = (company: Company) => {
    const updated = updateCompany(company.id, { isDefault: true });
    if (updated) {
      setActiveCompany(updated.id);
      setVatEnabled(updated.vatEnabled);
    }
  };

  useEffect(() => {
    if (detailState?.section !== 'signatures') {
      setEditingSignature(null);
      setSignatureForm(buildSignatureForm(null, 'company', activeCompanyId ?? companies[0]?.id ?? null, currentUserId));
    }
  }, [detailState, activeCompanyId, companies, currentUserId]);

  const openSignatureDetail = (
    signature: EmailSignature | null,
    scope: EmailSignatureScope,
    companyId: string | null,
    userId: string | null
  ) => {
    setEditingSignature(signature);
    setSignatureForm(buildSignatureForm(signature, scope, companyId, userId));
    setDetailState({ section: 'signatures', mode: signature ? 'edit' : 'create', signatureId: signature?.id ?? null });
  };

  const handleSignatureCancel = () => {
    if (detailState?.section === 'signatures' && detailState.signatureId) {
      const original = emailSignatures.find((item) => item.id === detailState.signatureId) ?? null;
      const originalScope = original?.scope ?? signatureForm.scope;
      const companyId =
        originalScope === 'company'
          ? original?.companyId ?? signatureForm.companyId ?? activeCompanyId ?? companies[0]?.id ?? null
          : original?.companyId ?? signatureForm.companyId ?? activeCompanyId ?? companies[0]?.id ?? null;
      const userId =
        originalScope === 'user'
          ? original?.userId ?? signatureForm.userId ?? currentUserId ?? authUsers[0]?.id ?? null
          : null;
      setEditingSignature(original);
      setSignatureForm(buildSignatureForm(original, originalScope, companyId, userId));
    } else {
      setEditingSignature(null);
      setSignatureForm(buildSignatureForm(null, 'company', activeCompanyId ?? companies[0]?.id ?? null, currentUserId));
    }
  };

  const closeSignatureDetail = () => {
    setEditingSignature(null);
    closeDetail('signatures');
  };

  const handleSignatureScopeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const scope = event.target.value as EmailSignatureScope;
    setSignatureForm((prev) => ({
      ...prev,
      scope,
      companyId:
        scope === 'company'
          ? prev.companyId ?? activeCompanyId ?? companies[0]?.id ?? null
          : prev.companyId,
      userId: scope === 'user' ? prev.userId ?? currentUserId ?? authUsers[0]?.id ?? null : null,
    }));
  };

  const handleSignatureInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSignatureForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignatureCompanyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setSignatureForm((prev) => ({ ...prev, companyId: value || null }));
  };

  const handleSignatureUserChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setSignatureForm((prev) => ({ ...prev, userId: value || null }));
  };

  const handleSignatureHtmlChange = (html: string) => {
    setSignatureForm((prev) => ({ ...prev, html }));
  };

  const signaturePreviewHtml =
    signatureForm.html ||
    `<p>${userProfile.firstName} ${userProfile.lastName}<br/>${userProfile.role}<br/>${userProfile.email}</p>`;

  const handleSignatureSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signatureForm.label.trim()) {
      return;
    }
    if (signatureForm.scope === 'company' && !signatureForm.companyId) {
      return;
    }
    if (signatureForm.scope === 'user' && !signatureForm.userId) {
      return;
    }

    const targetCompanyId = signatureForm.scope === 'company' ? signatureForm.companyId : signatureForm.companyId ?? null;
    const targetUserId = signatureForm.scope === 'user' ? signatureForm.userId : signatureForm.userId ?? null;

    if (editingSignature) {
      const scopeChanged =
        signatureForm.scope !== editingSignature.scope ||
        (signatureForm.scope === 'company' && editingSignature.companyId !== targetCompanyId) ||
        (signatureForm.scope === 'user' && editingSignature.userId !== targetUserId);

      if (scopeChanged) {
        removeEmailSignature(editingSignature.id);
        const created = createEmailSignature({
          scope: signatureForm.scope,
          companyId: targetCompanyId,
          userId: targetUserId,
          label: signatureForm.label.trim(),
          html: signatureForm.html,
          isDefault: signatureForm.isDefault,
        });
        if (created.isDefault) {
          setDefaultEmailSignature(created.id);
        }
      } else {
        updateEmailSignatureRecord(editingSignature.id, {
          label: signatureForm.label.trim(),
          html: signatureForm.html,
          companyId: targetCompanyId,
          userId: targetUserId,
          isDefault: signatureForm.isDefault,
        });
        if (signatureForm.isDefault) {
          setDefaultEmailSignature(editingSignature.id);
        }
      }
    } else {
      const created = createEmailSignature({
        scope: signatureForm.scope,
        companyId: targetCompanyId,
        userId: targetUserId,
        label: signatureForm.label.trim(),
        html: signatureForm.html,
        isDefault: signatureForm.isDefault,
      });
      if (created.isDefault) {
        setDefaultEmailSignature(created.id);
      }
    }

    closeSignatureDetail();
  };

  const detailTitle = (() => {
    if (!detailState) {
      return '';
    }
    switch (detailState.section) {
      case 'profile':
        return 'Modifier mon profil';
      case 'companies':
        return detailState.mode === 'edit' ? "Modifier l’entreprise" : 'Ajouter une entreprise';
      case 'signatures':
        return detailState.mode === 'edit' ? 'Modifier la signature' : 'Créer une signature';
      case 'catalog':
        switch (detailState.mode) {
          case 'create-service':
            return 'Ajouter un service au catalogue';
          case 'edit-service':
            return 'Modifier le service du catalogue';
          case 'create-item':
            return 'Ajouter une prestation au service';
          case 'edit-item':
            return 'Modifier la prestation du service';
          default:
            return '';
        }
      case 'sidebarTitle':
        return 'Personnaliser le titre de la sidebar';
      default:
        return '';
    }
  })();

  const detailDescription = (() => {
    if (!detailState) {
      return '';
    }
    switch (detailState.section) {
      case 'profile':
        return 'Actualisez vos informations personnelles et votre photo de profil.';
      case 'companies':
        return 'Complétez les informations légales, TVA et visuels utilisés pour vos documents.';
      case 'signatures':
        return 'Définissez le contenu HTML et la portée de la signature jointe à vos e-mails.';
      case 'catalog':
        switch (detailState.mode) {
          case 'create-service':
            return 'Créez un service réutilisable pour accélérer la préparation de vos interventions.';
          case 'edit-service':
            return 'Mettez à jour les informations du service sans impacter les interventions existantes.';
          case 'create-item':
            return 'Ajoutez une prestation associée pour préparer rapidement les devis et ordres de mission.';
          case 'edit-item':
            return 'Ajustez la prestation sélectionnée tout en conservant l’historique des dossiers.';
          default:
            return '';
        }
      case 'sidebarTitle':
        return 'Adaptez le titre affiché dans la navigation latérale pour refléter votre identité.';
      default:
        return '';
    }
  })();

  const detailModeLabel = (() => {
    if (!detailState) {
      return '';
    }
    switch (detailState.section) {
      case 'profile':
        return 'Profil';
      case 'companies':
      case 'signatures':
      case 'sidebarTitle':
        return detailState.mode === 'edit' ? 'Modification' : 'Création';
      case 'catalog':
        return detailState.mode === 'create-service' || detailState.mode === 'create-item'
          ? 'Création'
          : 'Modification';
      default:
        return '';
    }
  })();
  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{BRAND_FULL_TITLE}</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Paramètres</h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          Configurez votre profil, vos entreprises, vos signatures e-mail et personnalisez le titre de la navigation pour offrir
          une expérience cohérente. Les factures reprennent automatiquement les informations de l’entreprise active.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        <nav className="lg:w-64">
          <div className="rounded-soft border border-slate-200/70 bg-white p-3 shadow-sm">
            <ul className="space-y-1 text-sm">
              {availableSections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-soft px-3 py-2 text-left font-medium transition',
                      activeSection === section.id
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700'
                    )}
                  >
                    <span>{section.label}</span>
                    {activeSection === section.id && (
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Actif</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="flex-1 space-y-12">
          {/* Message si aucun accès aux paramètres */}
          {availableSections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
                <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
                  Accès restreint
                </h3>
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                  Vous n'avez pas les permissions nécessaires pour accéder aux paramètres.
                </p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Contactez votre administrateur pour obtenir les permissions appropriées.
                </p>
              </div>
            </div>
          )}
          {activeSection === 'profile' && hasSettingsPermission('profile') && (
            <div
              ref={profileSectionRef}
              tabIndex={-1}
              className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Card
                padding="lg"
                className="space-y-6"
                title="Profil utilisateur"
                description="Gérez vos informations personnelles et assurez-vous qu’elles restent alignées avec vos communications."
                action={
                  <Button variant="secondary" size="sm" onClick={openProfileDetail}>
                    Modifier mon profil
                  </Button>
                }
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xl font-semibold text-slate-500 shadow-inner">
                      {userProfile.avatarUrl ? (
                        <img src={userProfile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span>{getInitials(userProfile.firstName, userProfile.lastName)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {userProfile.firstName} {userProfile.lastName}
                      </p>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                        {userProfile.role || 'Rôle non défini'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                    <div>
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-400">E-mail</span>
                      <p className="mt-1 font-medium text-slate-700">{userProfile.email || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-400">Téléphone</span>
                      <p className="mt-1 font-medium text-slate-700">{userProfile.phone || '—'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'companies' && hasSettingsPermission('companies') && (
            <div
              ref={companiesSectionRef}
              tabIndex={-1}
              className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Entreprises</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    Centralisez vos entités légales, ajustez vos préférences TVA et laissez {BRAND_NAME} générer automatiquement
                    les factures selon l’entreprise active.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    TVA (%)
                    <input
                      type="number"
                      value={vatRate}
                      min={0}
                      max={100}
                      onChange={(event) => setVatRate(Number(event.target.value) || 0)}
                      className={`${inputClass} h-9 w-24 text-right`}
                    />
                  </label>
                  <Button onClick={() => openCompanyDetail(null)}>
                    <IconPlus />
                    Ajouter une entreprise
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {companies.map((company) => {
                  const contactSummary = [company.email, company.phone, company.website].filter(Boolean).join(' · ');
                  const addressSummaryLines = [
                    company.address,
                    [company.postalCode, company.city].filter(Boolean).join(' ').trim(),
                    company.country,
                  ].filter((value) => value && value.length > 0);
                  
                  // Déterminer le planning associé
                  const planningLabel = company.planningUser === 'clement' ? 'Clément' : 
                                      company.planningUser === 'adrien' ? 'Adrien' : 'Tous';
                  
                  return (
                    <Card
                      key={company.id}
                      padding="lg"
                      className={clsx(
                        'group relative border transition-all duration-200',
                        activeCompanyId === company.id 
                          ? 'border-primary/30 bg-primary/5 shadow-md' 
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      )}
                    >
                      {/* Header avec logo et actions */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                            {company.logoUrl ? (
                              <img 
                                src={company.logoUrl} 
                                alt={`Logo ${company.name}`} 
                                className="h-full w-full object-contain" 
                              />
                            ) : (
                              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Logo
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-slate-900">{company.name}</h3>
                              {company.isDefault && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  Défaut
                                </span>
                              )}
                              {activeCompanyId === company.id && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">SIRET {company.siret}</p>
                            {company.website && (
                              <a 
                                href={company.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:text-primary/80 transition-colors"
                              >
                                {company.website}
                              </a>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <RowActionButton label="Modifier" onClick={() => openCompanyDetail(company)}>
                            <IconEdit />
                          </RowActionButton>
                          <RowActionButton label="Supprimer" tone="danger" onClick={() => handleCompanyRemove(company.id)}>
                            <IconTrash />
                          </RowActionButton>
                        </div>
                      </div>

                      {/* Informations principales */}
                      <div className="space-y-3 text-sm">
                        {/* Coordonnées */}
                        {contactSummary && (
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Coordonnées</span>
                            <span className="text-right text-slate-600">{contactSummary}</span>
                          </div>
                        )}

                        {/* Adresse */}
                        {addressSummaryLines.length > 0 && (
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Adresse</span>
                            <div className="text-right text-slate-600">
                              {addressSummaryLines.map((line, index) => (
                                <p key={`${company.id}-address-${index}`} className="text-sm">
                                  {line}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Planning */}
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Planning</span>
                          <span className="text-sm font-medium text-slate-700">{planningLabel}</span>
                        </div>

                        {/* TVA */}
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">TVA</span>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={company.vatEnabled}
                              onChange={(event) => handleCompanyVatToggle(company, event.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                            />
                            <span className={company.vatEnabled ? 'text-slate-700 font-medium' : 'text-slate-500'}>
                              {company.vatEnabled ? 'Activée' : 'Désactivée'}
                            </span>
                          </label>
                        </div>

                        {/* Mentions légales */}
                        {company.legalNotes && (
                          <div>
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Mentions légales</span>
                            <div className="mt-1 max-h-20 overflow-hidden rounded border border-slate-200 bg-slate-50 px-2 py-1">
                              <p className="whitespace-pre-line text-xs text-slate-600">{company.legalNotes}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions en bas */}
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            {!company.isDefault && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCompanySetDefault(company)}
                                className="text-xs"
                              >
                                Définir par défaut
                              </Button>
                            )}
                            {activeCompanyId !== company.id && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveCompany(company.id)}
                                className="text-xs"
                              >
                                Activer
                              </Button>
                            )}
                          </div>
                          
                          {activeCompanyId === company.id && (
                            <span className="text-xs font-medium text-slate-600">
                              Actuellement active
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {!companies.length && (
                  <div className="col-span-full flex flex-col items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <h3 className="mb-2 text-base font-semibold text-slate-900">Aucune entreprise</h3>
                    <p className="mb-4 text-sm text-slate-600 max-w-md">
                      Ajoutez votre première entreprise pour commencer à générer des documents officiels.
                    </p>
                    <Button onClick={() => openCompanyDetail(null)} className="inline-flex items-center gap-2">
                      <IconPlus />
                      Créer une entreprise
                    </Button>
                  </div>
                )}
              </div>

              {/* Composant de test Supabase */}
              <div className="mt-8">
                {/* <SupabaseSyncTest /> Supprimé - Architecture Backend */}
              </div>
            </div>
          )}

          {activeSection === 'signatures' && hasSettingsPermission('signatures') && (
            <div
              ref={signaturesSectionRef}
              tabIndex={-1}
              className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Signatures</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Centralisez vos signatures e-mail par entreprise ou par utilisateur et définissez celles à appliquer par défaut.
                  </p>
                </div>
                <Button onClick={() => openSignatureDetail(null, 'company', activeCompanyId ?? companies[0]?.id ?? null, currentUserId)}>
                  <IconPlus />
                  Créer une signature
                </Button>
              </div>

              <div className="space-y-4">
                {emailSignatures.map((signature) => {
                  const company = signature.companyId ? companies.find((item) => item.id === signature.companyId) : null;
                  const user = signature.userId ? authUsers.find((item) => item.id === signature.userId) : null;
                  const previewHtml = signature.html || signaturePreviewHtml;
                  return (
                    <Card key={signature.id} padding="lg" className="space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{signature.label}</span>
                            <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              {signature.scope === 'company' ? 'Entreprise' : signature.scope === 'user' ? 'Utilisateur' : 'Globale'}
                            </span>
                            {signature.isDefault && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                                Défaut
                              </span>
                            )}
                          </div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                            {signature.scope === 'company' && company ? company.name : null}
                            {signature.scope === 'user' && user ? user.fullName : null}
                          </p>
                          <p className="text-xs text-slate-500">Mis à jour {formatSignatureDate(signature.updatedAt)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant={signature.isDefault ? 'subtle' : 'ghost'}
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDefaultEmailSignature(signature.id);
                            }}
                          >
                            {signature.isDefault ? 'Par défaut' : 'Définir par défaut'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              openSignatureDetail(
                                signature,
                                signature.scope,
                                signature.scope === 'company'
                                  ? signature.companyId
                                  : signature.companyId ?? activeCompanyId ?? companies[0]?.id ?? null,
                                signature.scope === 'user' ? signature.userId : currentUserId
                              )
                            }
                          >
                            Modifier
                          </Button>
                          <RowActionButton label="Supprimer" tone="danger" onClick={() => removeEmailSignature(signature.id)}>
                            <IconTrash />
                          </RowActionButton>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-soft border border-slate-200 bg-white p-3">
                          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Aperçu clair</h4>
                          <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        </div>
                        <div className="rounded-soft border border-slate-800 bg-slate-900 p-3 text-slate-200">
                          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Aperçu sombre</h4>
                          <div className="prose prose-sm max-w-none text-slate-200" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {!emailSignatures.length && (
                  <div className="rounded-soft border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Créez votre première signature pour accélérer vos envois de documents.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'catalog' && hasSettingsPermission('catalog') && (
            <div
              ref={catalogSectionRef}
              tabIndex={-1}
              className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-base font-semibold text-slate-900">Services & Produits</h2>
                <p className="text-sm text-slate-500">
                  Constituez un catalogue unifié pour accélérer la création d’interventions, devis et factures.
                </p>
              </div>
              <div className="space-y-6">
                <Card
                  padding="lg"
                  title="Catalogue services"
                  description="Sélectionnez un service pour afficher ses prestations associées."
                  action={
                    <Button size="sm" onClick={() => openCatalogServiceDetail(null)}>
                      <IconPlus />
                      Nouveau service
                    </Button>
                  }
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      value={catalogServiceQuery}
                      onChange={(event) => setCatalogServiceQuery(event.target.value)}
                      placeholder="Rechercher un service…"
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="data-table__outer">
                    <div className="data-table__scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th className="data-table__header-cell">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('name')}
                                className="data-table__sort"
                              >
                                Nom
                                {catalogServiceSort.key === 'name' && (
                                  <span className="data-table__sort-indicator">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="data-table__header-cell">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('category')}
                                className="data-table__sort"
                              >
                                Catégorie
                                {catalogServiceSort.key === 'category' && (
                                  <span className="data-table__sort-indicator">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="data-table__header-cell">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('active')}
                                className="data-table__sort"
                              >
                                Statut
                                {catalogServiceSort.key === 'active' && (
                                  <span className="data-table__sort-indicator">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="data-table__header-cell data-table__header-cell--numeric data-table__header-cell--optional">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('count')}
                                className="data-table__sort"
                              >
                                Prestations
                                {catalogServiceSort.key === 'count' && (
                                  <span className="data-table__sort-indicator">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="data-table__header-cell data-table__header-cell--actions">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedCatalogServices.map((service) => (
                            <tr
                              key={service.id}
                              onClick={() => setSelectedCatalogServiceId(service.id)}
                              className={clsx(
                                'data-table__row',
                                'data-table__row--selectable',
                                selectedCatalogService?.id === service.id && 'data-table__row--active'
                              )}
                            >
                              <td className="data-table__cell data-table__cell--primary">
                                <div>
                                  <span>{service.name}</span>
                                  {service.description && (
                                    <span className="data-table__meta">{service.description}</span>
                                  )}
                                </div>
                              </td>
                              <td className="data-table__cell">{service.category}</td>
                              <td className="data-table__cell data-table__cell--status">
                                <span
                                  className={clsx('status-pill', !service.active && 'status-pill--inactive')}
                                >
                                  {service.active ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                              <td className="data-table__cell data-table__cell--numeric data-table__cell--optional">
                                {service.options.length}
                              </td>
                              <td className="data-table__cell data-table__cell--actions">
                                <div className="flex items-center justify-end gap-1.5">
                                  <RowActionButton
                                    label="Modifier"
                                    onClick={() => {
                                      openCatalogServiceDetail(service);
                                    }}
                                  >
                                    <IconEdit />
                                  </RowActionButton>
                                  <RowActionButton
                                    label="Dupliquer"
                                    onClick={() => {
                                      handleCatalogServiceDuplicate(service);
                                    }}
                                  >
                                    <IconDuplicate />
                                  </RowActionButton>
                                  <RowActionButton
                                    label="Supprimer"
                                    tone="danger"
                                    onClick={() => {
                                      handleCatalogServiceDelete(service.id);
                                    }}
                                  >
                                    <IconTrash />
                                  </RowActionButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!sortedCatalogServices.length && (
                            <tr>
                              <td colSpan={5} className="data-table__empty">
                                Aucun service enregistré pour le moment.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
                <Card
                  padding="lg"
                  title={selectedCatalogService ? selectedCatalogService.name : 'Prestations du service'}
                  description={
                    selectedCatalogService
                      ? 'Réglez les durées et tarifs par défaut de chaque prestation.'
                      : 'Sélectionnez un service dans le catalogue pour gérer ses prestations associées.'
                  }
                  action={
                    selectedCatalogService ? (
                      <Button size="sm" onClick={() => openCatalogItemDetail(selectedCatalogService.id)}>
                        <IconPlus />
                        Ajouter prestation
                      </Button>
                    ) : undefined
                  }
                  className="space-y-4"
                >
                  {selectedCatalogService ? (
                    <>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          value={catalogItemQuery}
                          onChange={(event) => setCatalogItemQuery(event.target.value)}
                          placeholder="Rechercher une prestation…"
                          className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                      <div className="data-table__outer">
                        <div className="data-table__scroll">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th className="data-table__header-cell">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('label')}
                                    className="data-table__sort"
                                  >
                                    Libellé
                                    {catalogItemSort.key === 'label' && (
                                      <span className="data-table__sort-indicator">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                <th className="data-table__header-cell data-table__header-cell--numeric">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('duration')}
                                    className="data-table__sort"
                                  >
                                    Durée
                                    {catalogItemSort.key === 'duration' && (
                                      <span className="data-table__sort-indicator">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                <th className="data-table__header-cell data-table__header-cell--numeric">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('price')}
                                    className="data-table__sort"
                                  >
                                    Prix HT
                                    {catalogItemSort.key === 'price' && (
                                      <span className="data-table__sort-indicator">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                {vatGloballyEnabled && (
                                  <th className="data-table__header-cell data-table__header-cell--numeric data-table__header-cell--optional">
                                    <button
                                      type="button"
                                      onClick={() => toggleCatalogItemSort('tva')}
                                      className="data-table__sort"
                                    >
                                      TVA %
                                      {catalogItemSort.key === 'tva' && (
                                        <span className="data-table__sort-indicator">
                                          {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                        </span>
                                      )}
                                    </button>
                                  </th>
                                )}
                                <th className="data-table__header-cell">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('active')}
                                    className="data-table__sort"
                                  >
                                    Actif
                                    {catalogItemSort.key === 'active' && (
                                      <span className="data-table__sort-indicator">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                <th className="data-table__header-cell data-table__header-cell--actions">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedCatalogItems.map((option) => (
                                <tr key={option.id} className="data-table__row">
                                  <td className="data-table__cell data-table__cell--primary">
                                    <div>
                                      <span>{option.label}</span>
                                      {option.description && (
                                        <span className="data-table__meta">{option.description}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="data-table__cell data-table__cell--numeric">
                                    {option.defaultDurationMin ? `${option.defaultDurationMin} min` : '—'}
                                  </td>
                                  <td className="data-table__cell data-table__cell--numeric">
                                    {formatCurrency(option.unitPriceHT)}
                                  </td>
                                  {vatGloballyEnabled && (
                                    <td className="data-table__cell data-table__cell--numeric data-table__cell--optional">
                                      {option.tvaPct !== undefined && option.tvaPct !== null ? `${option.tvaPct} %` : '—'}
                                    </td>
                                  )}
                                  <td className="data-table__cell data-table__cell--status">
                                    <span
                                      className={clsx('status-pill', !option.active && 'status-pill--inactive')}
                                    >
                                      {option.active ? 'Actif' : 'Inactif'}
                                    </span>
                                  </td>
                                  <td className="data-table__cell data-table__cell--actions">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <RowActionButton
                                        label="Modifier"
                                        onClick={() => {
                                          openCatalogItemDetail(selectedCatalogService.id, option);
                                        }}
                                      >
                                        <IconEdit />
                                      </RowActionButton>
                                      <RowActionButton
                                        label="Supprimer"
                                        tone="danger"
                                        onClick={() => {
                                          handleCatalogItemDelete(selectedCatalogService.id, option.id);
                                        }}
                                      >
                                        <IconTrash />
                                      </RowActionButton>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {!sortedCatalogItems.length && (
                                <tr>
                                  <td colSpan={vatGloballyEnabled ? 6 : 5} className="data-table__empty">
                                    Aucune prestation enregistrée pour ce service.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-soft border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
                      Ajoutez un service pour configurer vos prestations.
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {activeSection === 'sidebarTitle' && hasSettingsPermission('sidebarTitle') && (
            <div
              ref={sidebarTitleSectionRef}
              tabIndex={-1}
              className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Card padding="lg" className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">Titre de la sidebar</p>
                    <p className="text-xs text-slate-500">
                      Personnalisez l’en-tête affiché au-dessus de la navigation principale.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={openSidebarTitleDetail}>
                    Modifier
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-soft border border-slate-200 bg-white/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Texte affiché
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {sidebarTitlePreference.text.trim() || '—'}
                    </p>
                  </div>
                  <div className="rounded-soft border border-slate-200 bg-white/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Visibilité
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {sidebarTitlePreference.hidden ? 'Masquée' : 'Visible'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'users' && hasSettingsPermission('users') && (
            <div
              ref={usersSectionRef}
              tabIndex={-1}
              className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Card
                padding="lg"
                className="space-y-6"
                title="Gestion des utilisateurs"
                description="Créez, mettez à jour et contrôlez les accès des collaborateurs Wash&Go."
                action={
                  currentUser?.role === 'superAdmin' && (
                    <Button variant="secondary" size="sm" onClick={() => openUserDetail('create')}>
                      Nouvel utilisateur
                    </Button>
                  )
                }
              >
                <div className="space-y-4">
                  {currentUser?.role !== 'superAdmin' ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Seuls les super-administrateurs peuvent gérer les utilisateurs.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {authUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.username}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{user.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                              user.active 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              {user.active ? 'Actif' : 'Désactivé'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openUserDetail('edit', user.id)}
                            >
                              Modifier
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>
      {detailState && (
        <div
          ref={detailContainerRef}
          id={detailAnchors[detailState.section]}
          className="mt-12"
        >
          <div className="rounded-soft border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  ref={(node) => {
                    detailHeadingRef.current = node;
                  }}
                  tabIndex={-1}
                  className="text-base font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {detailTitle}
                </h2>
                <p className="text-sm text-slate-500">{detailDescription}</p>
              </div>
              <span className="self-start rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {detailModeLabel}
              </span>
            </div>
            {detailState.section === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="text-sm text-slate-600">
                <div className="space-y-5 px-6 py-6">
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>Prénom</span>
                      <input
                        name="firstName"
                        value={profileForm.firstName}
                        onChange={handleProfileChange}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Nom</span>
                      <input
                        name="lastName"
                        value={profileForm.lastName}
                        onChange={handleProfileChange}
                        className={inputClass}
                        required
                      />
                    </label>
                  </div>
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>E-mail</span>
                      <input
                        type="email"
                        name="email"
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Téléphone</span>
                      <input name="phone" value={profileForm.phone} onChange={handleProfileChange} className={inputClass} />
                    </label>
                  </div>
                  <label className={fieldLabelClass}>
                    <span>Rôle</span>
                    <input name="role" value={profileForm.role} onChange={handleProfileChange} className={inputClass} />
                  </label>
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Photo de profil</span>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-500 shadow-inner">
                        {profileForm.avatarUrl ? (
                          <img src={profileForm.avatarUrl} alt="Aperçu avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span>{getInitials(profileForm.firstName, profileForm.lastName)}</span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 text-xs text-slate-500">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={handleAvatarSelect}>
                            Choisir une image
                          </Button>
                          {profileForm.avatarUrl && (
                            <Button type="button" variant="ghost" size="sm" onClick={handleAvatarClear}>
                              Retirer
                            </Button>
                          )}
                        </div>
                        <input
                          ref={avatarFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                        <label className={fieldLabelClass}>
                          <span>Lien externe (optionnel)</span>
                          <input
                            name="avatarUrl"
                            value={profileForm.avatarUrl}
                            onChange={handleProfileChange}
                            className={inputClass}
                            placeholder="https://…"
                          />
                        </label>
                        <p className="text-[11px] text-slate-400">
                          Les fichiers importés sont convertis en data URL et conservés pour vos prochaines connexions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <Button type="button" variant="ghost" onClick={handleProfileCancel}>
                    Annuler
                  </Button>
                  <Button type="button" variant="outline" onClick={() => closeDetail('profile')}>
                    Fermer
                  </Button>
                  <Button type="submit">Enregistrer</Button>
                </div>
              </form>
            )}
            {detailState.section === 'companies' && (
              <form onSubmit={handleCompanySubmit} className="text-sm text-slate-600">
                <div className="space-y-5 px-6 py-6">
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>Nom de l’entreprise</span>
                      <input
                        name="name"
                        value={companyForm.name}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>SIRET</span>
                      <input
                        name="siret"
                        value={companyForm.siret}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        required
                      />
                    </label>
                  </div>
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>E-mail</span>
                      <input
                        type="email"
                        name="email"
                        value={companyForm.email}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        placeholder="contact@entreprise.fr"
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Téléphone</span>
                      <input
                        name="phone"
                        value={companyForm.phone}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        placeholder="+33 …"
                      />
                    </label>
                  </div>
                  <label className={fieldLabelClass}>
                    <span>Site web (optionnel)</span>
                    <input
                      type="url"
                      name="website"
                      value={companyForm.website}
                      onChange={handleCompanyFormChange}
                      className={inputClass}
                      placeholder="https://…"
                    />
                  </label>
                  <label className={fieldLabelClass}>
                    <span>Adresse complète</span>
                    <textarea
                      name="address"
                      value={companyForm.address}
                      onChange={handleCompanyFormChange}
                      rows={3}
                      className={textareaClass}
                      required
                    />
                  </label>
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>Code postal</span>
                      <input
                        name="postalCode"
                        value={companyForm.postalCode}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Ville</span>
                      <input
                        name="city"
                        value={companyForm.city}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        required
                      />
                    </label>
                  </div>
                  <label className={fieldLabelClass}>
                    <span>Pays</span>
                    <input
                      name="country"
                      value={companyForm.country}
                      onChange={handleCompanyFormChange}
                      className={inputClass}
                      required
                    />
                  </label>
                  <label className={fieldLabelClass}>
                    <span>Numéro de TVA intracommunautaire</span>
                    <input
                      name="vatNumber"
                      value={companyForm.vatNumber}
                      onChange={handleCompanyFormChange}
                      className={inputClass}
                      placeholder="FR…"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        name="vatEnabled"
                        checked={companyForm.vatEnabled}
                        onChange={handleCompanyFormChange}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                      />
                      <span>Activer la TVA pour cette entreprise</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        name="isDefault"
                        checked={companyForm.isDefault}
                        onChange={handleCompanyFormChange}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                      />
                      <span>Définir comme entreprise par défaut</span>
                    </label>
                  </div>
                  <label className={fieldLabelClass}>
                    <span>Mentions légales</span>
                    <textarea
                      name="legalNotes"
                      value={companyForm.legalNotes}
                      onChange={handleCompanyFormChange}
                      rows={4}
                      className={textareaClass}
                      placeholder="Mentions affichées sur vos devis et factures"
                    />
                  </label>
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Logo</span>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {companyForm.logoUrl ? (
                          <img src={companyForm.logoUrl} alt="Logo entreprise" className="h-full w-full object-contain" />
                        ) : (
                          <span>Logo</span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 text-xs text-slate-500">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={handleCompanyLogoSelect}>
                            Importer un fichier
                          </Button>
                          {companyForm.logoUrl && (
                            <Button type="button" variant="ghost" size="sm" onClick={handleCompanyLogoClear}>
                              Retirer
                            </Button>
                          )}
                        </div>
                        <input
                          ref={companyLogoFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml"
                          className="hidden"
                          onChange={handleCompanyLogoUpload}
                        />
                        <label className={fieldLabelClass}>
                          <span>Lien externe (optionnel)</span>
                          <input
                            name="logoUrl"
                            value={companyForm.logoUrl}
                            onChange={handleCompanyFormChange}
                            className={inputClass}
                            placeholder="https://…"
                          />
                        </label>
                        <p className="text-[11px] text-slate-400">Les logos importés sont stockés en local pour accélérer vos exports.</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Logo spécifique pour les factures */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Logo Factures</span>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex h-16 w-32 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {companyForm.invoiceLogoUrl ? (
                          <img src={companyForm.invoiceLogoUrl} alt="Logo factures" className="h-full w-full object-contain" />
                        ) : (
                          <span>120x50</span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 text-xs text-slate-500">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={handleCompanyInvoiceLogoSelect}>
                            Importer un fichier
                          </Button>
                          {companyForm.invoiceLogoUrl && (
                            <Button type="button" variant="ghost" size="sm" onClick={handleCompanyInvoiceLogoClear}>
                              Retirer
                            </Button>
                          )}
                        </div>
                        <input
                          ref={companyInvoiceLogoFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml"
                          className="hidden"
                          onChange={handleCompanyInvoiceLogoUpload}
                        />
                        <label className={fieldLabelClass}>
                          <span>Lien externe (optionnel)</span>
                          <input
                            name="invoiceLogoUrl"
                            value={companyForm.invoiceLogoUrl}
                            onChange={handleCompanyFormChange}
                            className={inputClass}
                            placeholder="https://…"
                          />
                        </label>
                        <p className="text-[11px] text-slate-400">
                          Logo spécifique pour les factures et devis. Dimensions recommandées : 120x50 pixels.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Informations bancaires */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Informations bancaires</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={fieldLabelClass}>
                        <span>Nom de la banque</span>
                        <input
                          name="bankName"
                          value={companyForm.bankName}
                          onChange={handleCompanyFormChange}
                          className={inputClass}
                          placeholder="Crédit Agricole, BNP Paribas..."
                        />
                      </label>
                      <label className={fieldLabelClass}>
                        <span>Adresse de la banque</span>
                        <input
                          name="bankAddress"
                          value={companyForm.bankAddress}
                          onChange={handleCompanyFormChange}
                          className={inputClass}
                          placeholder="123 Rue de la Paix, 75001 Paris"
                        />
                      </label>
                      <label className={fieldLabelClass}>
                        <span>IBAN</span>
                        <input
                          name="iban"
                          value={companyForm.iban}
                          onChange={handleCompanyFormChange}
                          className={inputClass}
                          placeholder="FR76 1234 5678 9012 3456 7890 123"
                        />
                      </label>
                      <label className={fieldLabelClass}>
                        <span>BIC</span>
                        <input
                          name="bic"
                          value={companyForm.bic}
                          onChange={handleCompanyFormChange}
                          className={inputClass}
                          placeholder="BNPAFRPPXXX"
                        />
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Ces informations apparaîtront automatiquement sur vos factures et devis dans la section "Conditions de paiement".
                    </p>
                  </div>
                  
                  {/* Planning */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Planning</span>
                    <div className="space-y-2">
                      <label className="block">
                        <span className="text-sm font-medium text-slate-700 mb-2 block">Planning associé</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setCompanyForm(prev => ({ ...prev, planningUser: null }))}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                              companyForm.planningUser === null
                                ? 'border-primary bg-primary text-white'
                                : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                            }`}
                          >
                            Tous les plannings
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompanyForm(prev => ({ ...prev, planningUser: 'clement' }))}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                              companyForm.planningUser === 'clement'
                                ? 'border-primary bg-primary text-white'
                                : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                            }`}
                          >
                            Planning Clément
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompanyForm(prev => ({ ...prev, planningUser: 'adrien' }))}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                              companyForm.planningUser === 'adrien'
                                ? 'border-primary bg-primary text-white'
                                : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                            }`}
                          >
                            Planning Adrien
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Choisissez le planning sur lequel cette société sera associée pour les rendez-vous.
                        </p>
                      </label>
                    </div>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className={fieldLabelClass}>
                      <span>Titre d’en-tête</span>
                      <input
                        name="documentHeaderTitle"
                        value={companyForm.documentHeaderTitle}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Sous-titre</span>
                      <input
                        name="documentHeaderSubtitle"
                        value={companyForm.documentHeaderSubtitle}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Note d’en-tête</span>
                      <input
                        name="documentHeaderNote"
                        value={companyForm.documentHeaderNote}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <Button type="button" variant="ghost" onClick={handleCompanyCancel}>
                    Annuler
                  </Button>
                  <Button type="button" variant="outline" onClick={() => closeDetail('companies')}>
                    Fermer
                  </Button>
                  <Button type="submit">Enregistrer</Button>
                </div>
              </form>
            )}
            {detailState.section === 'catalog' &&
              (detailState.mode === 'create-service' || detailState.mode === 'edit-service') && (
                <form onSubmit={handleCatalogServiceSubmit} className="text-sm text-slate-600">
                  <div className="space-y-5 px-6 py-6">
                    <div className={detailFormGridClass}>
                      <label className={fieldLabelClass}>
                        <span>Nom du service</span>
                        <input
                          name="name"
                          value={catalogServiceForm.name}
                          onChange={handleCatalogServiceChange}
                          className={inputClass}
                          required
                        />
                      </label>
                      <label className={fieldLabelClass}>
                        <span>Catégorie</span>
                        <select
                          name="category"
                          value={catalogServiceForm.category}
                          onChange={handleCatalogServiceChange}
                          className={inputClass}
                        >
                          {CATALOG_CATEGORIES.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className={fieldLabelClass}>
                      <span>Description courte</span>
                      <textarea
                        name="description"
                        value={catalogServiceForm.description}
                        onChange={handleCatalogServiceChange}
                        rows={3}
                        className={textareaClass}
                        placeholder="Décrivez en quelques mots l’intervention proposée"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        name="active"
                        checked={catalogServiceForm.active}
                        onChange={handleCatalogServiceChange}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                      />
                      <span>Service actif et sélectionnable dans la page Services</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <Button type="button" variant="ghost" onClick={handleCatalogServiceCancel}>
                      Annuler
                    </Button>
                    <Button type="button" variant="outline" onClick={() => closeDetail('catalog')}>
                      Fermer
                    </Button>
                    <Button type="submit">Enregistrer</Button>
                  </div>
                </form>
              )}
            {detailState.section === 'catalog' &&
              (detailState.mode === 'create-item' || detailState.mode === 'edit-item') &&
              (() => {
                const parentService =
                  services.find((service) => service.id === detailState.serviceId) ?? null;
                return (
                  <form onSubmit={handleCatalogItemSubmit} className="text-sm text-slate-600">
                    <div className="space-y-5 px-6 py-6">
                      <div className="rounded-soft border border-slate-200 bg-white/60 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Service rattaché
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-700">
                          {parentService ? parentService.name : 'Service introuvable'}
                        </p>
                      </div>
                      <label className={fieldLabelClass}>
                        <span>Libellé de la prestation</span>
                        <input
                          name="label"
                          value={catalogItemForm.label}
                          onChange={handleCatalogItemChange}
                          className={inputClass}
                          required
                        />
                      </label>
                      <label className={fieldLabelClass}>
                        <span>Description</span>
                        <textarea
                          name="description"
                          value={catalogItemForm.description}
                          onChange={handleCatalogItemChange}
                          rows={3}
                          className={textareaClass}
                          placeholder="Détails visibles lors du chiffrage"
                        />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label className={fieldLabelClass}>
                          <span>Durée par défaut (min)</span>
                          <input
                            type="number"
                            name="defaultDurationMin"
                            min={0}
                            step={5}
                            value={catalogItemForm.defaultDurationMin}
                            onChange={handleCatalogItemChange}
                            className={inputClass}
                          />
                        </label>
                        <label className={fieldLabelClass}>
                          <span>Prix unitaire HT (€)</span>
                          <input
                            type="number"
                            name="unitPriceHT"
                            min={0}
                            step={0.01}
                            value={catalogItemForm.unitPriceHT}
                            onChange={handleCatalogItemChange}
                            className={inputClass}
                          />
                        </label>
                        {vatGloballyEnabled && (
                          <label className={fieldLabelClass}>
                            <span>TVA %</span>
                            <input
                              type="number"
                              name="tvaPct"
                              min={0}
                              step={0.1}
                              value={catalogItemForm.tvaPct}
                              onChange={handleCatalogItemChange}
                              className={inputClass}
                            />
                          </label>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          name="active"
                          checked={catalogItemForm.active}
                          onChange={handleCatalogItemChange}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                        />
                        <span>Prestation active et suggérée lors de la sélection du service</span>
                      </label>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                      <Button type="button" variant="ghost" onClick={handleCatalogItemCancel}>
                        Annuler
                      </Button>
                      <Button type="button" variant="outline" onClick={() => closeDetail('catalog')}>
                        Fermer
                      </Button>
                      <Button type="submit">Enregistrer</Button>
                    </div>
                  </form>
                );
              })()}
            {detailState.section === 'signatures' && (
              <form onSubmit={handleSignatureSubmit} className="text-sm text-slate-600">
                <div className="space-y-5 px-6 py-6">
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>Libellé</span>
                      <input
                        name="label"
                        value={signatureForm.label}
                        onChange={handleSignatureInputChange}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Type</span>
                      <select value={signatureForm.scope} onChange={handleSignatureScopeChange} className={inputClass}>
                        <option value="company">Entreprise</option>
                        <option value="user">Utilisateur</option>
                      </select>
                    </label>
                  </div>
                  {signatureForm.scope === 'company' && (
                    <label className={fieldLabelClass}>
                      <span>Entreprise</span>
                      <select
                        value={signatureForm.companyId ?? ''}
                        onChange={handleSignatureCompanyChange}
                        className={inputClass}
                        required
                      >
                        <option value="" disabled>
                          Sélectionnez une entreprise
                        </option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {signatureForm.scope === 'user' && (
                    <label className={fieldLabelClass}>
                      <span>Utilisateur</span>
                      <select
                        value={signatureForm.userId ?? ''}
                        onChange={handleSignatureUserChange}
                        className={inputClass}
                        required
                      >
                        <option value="" disabled>
                          Sélectionnez un utilisateur
                        </option>
                        {authUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="rounded-soft border border-slate-200 bg-slate-50 p-4">
                    <SignatureEditor
                      value={signatureForm.html}
                      onChange={handleSignatureHtmlChange}
                      useDefault={signatureForm.isDefault}
                      onToggleDefault={(next) => setSignatureForm((prev) => ({ ...prev, isDefault: next }))}
                      variables={SIGNATURE_VARIABLES}
                      lightPreviewHtml={signaturePreviewHtml}
                      darkPreviewHtml={signaturePreviewHtml}
                      defaultLabel={`Définir comme signature par défaut pour les envois ${BRAND_NAME}`}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <Button type="button" variant="ghost" onClick={handleSignatureCancel}>
                    Annuler
                  </Button>
                  <Button type="button" variant="outline" onClick={closeSignatureDetail}>
                    Fermer
                  </Button>
                  <Button type="submit">Enregistrer</Button>
                </div>
              </form>
            )}
            {detailState.section === 'sidebarTitle' && (
              <form onSubmit={handleSidebarTitleSubmit} className="text-sm text-slate-600">
                <div className="space-y-5 px-6 py-6">
                  <label className={fieldLabelClass}>
                    <span>Titre affiché</span>
                    <input
                      value={sidebarTitleForm.text}
                      onChange={handleSidebarTitleTextChange}
                      className={inputClass}
                      placeholder={BRAND_FULL_TITLE}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Masquer complètement l’en-tête
                    </span>
                    <input
                      type="checkbox"
                      checked={sidebarTitleForm.hidden}
                      onChange={handleSidebarTitleVisibilityChange}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                    />
                  </label>
                  <div className="rounded-soft border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    <p className="font-semibold text-slate-600">Aperçu</p>
                    {!sidebarTitleForm.hidden ? (
                      <div className="mt-3 space-y-1 rounded-soft border border-slate-200 bg-white p-4 text-left">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">{BRAND_NAME}</p>
                        {sidebarTitleForm.text.trim() && (
                          <p className="text-base font-semibold text-slate-900">{sidebarTitleForm.text.trim()}</p>
                        )}
                        {showBrandBaseline && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{brandBaseline}</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-slate-400">Zone masquée</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <Button type="button" variant="ghost" onClick={handleSidebarTitleCancel}>
                    Annuler
                  </Button>
                  <Button type="button" variant="outline" onClick={() => closeDetail('sidebarTitle')}>
                    Fermer
                  </Button>
                  <Button type="button" variant="subtle" onClick={handleSidebarTitleReset}>
                    Réinitialiser
                  </Button>
                  <Button type="submit">Enregistrer</Button>
                </div>
              </form>
            )}

            {detailState.section === 'users' && (
              <form onSubmit={handleUserSubmit} className="text-sm text-slate-600">
                <div className="space-y-5 px-6 py-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={fieldLabelClass}>
                      <span>Nom d'utilisateur</span>
                      <input
                        name="username"
                        value={userForm.username}
                        onChange={handleUserFormChange}
                        className={inputClass}
                        required
                        disabled={detailState.mode === 'edit'}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Rôle</span>
                      <select
                        name="role"
                        value={userForm.role}
                        onChange={handleUserFormChange}
                        className={inputClass}
                        required
                      >
                        <option value="agent">Agent</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrateur</option>
                        <option value="superAdmin">Super Admin</option>
                        <option value="lecture">Lecture seule</option>
                      </select>
                    </label>
                  </div>
                  
                  {detailState.mode === 'create' && (
                    <label className={fieldLabelClass}>
                      <span>Mot de passe</span>
                      <input
                        type="password"
                        name="password"
                        value={userForm.password}
                        onChange={handleUserFormChange}
                        className={inputClass}
                        required
                      />
                    </label>
                  )}
                  
                  {detailState.mode === 'password-reset' && (
                    <label className={fieldLabelClass}>
                      <span>Nouveau mot de passe</span>
                      <input
                        type="password"
                        name="resetPassword"
                        value={userForm.resetPassword}
                        onChange={handleUserFormChange}
                        className={inputClass}
                        required
                      />
                    </label>
                  )}
                  
                  <div className="space-y-6">
                    {/* Accès aux pages */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Accès aux pages</h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {userForm.pages.includes('*') ? 'Toutes les pages' : `${userForm.pages.length} page(s) sélectionnée(s)`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                            Accès complet (toutes les pages)
                          </span>
                          <input
                            type="checkbox"
                            checked={userForm.pages.includes('*')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserForm(prev => ({ ...prev, pages: ['*'] }));
                              } else {
                                setUserForm(prev => ({ ...prev, pages: [] }));
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Appliquer les permissions par défaut pour le rôle sélectionné
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const role = userForm.role;
                              switch (role) {
                                case 'superAdmin':
                                  setUserForm(prev => ({ ...prev, pages: ['*'], permissions: ['*'] }));
                                  break;
                                case 'admin':
                                  setUserForm(prev => ({ 
                                    ...prev, 
                                    pages: ['dashboard', 'clients', 'leads', 'service', 'achats', 'documents', 'planning', 'stats', 'parametres'],
                                    permissions: ['*']
                                  }));
                                  break;
                                case 'manager':
                                  setUserForm(prev => ({ 
                                    ...prev, 
                                    pages: ['dashboard', 'clients', 'leads', 'service', 'planning', 'stats'],
                                    permissions: [
                                      'service.create', 'service.edit', 'service.duplicate', 'service.invoice', 'service.print', 'service.email',
                                      'lead.edit', 'lead.contact', 'lead.convert',
                                      'client.edit', 'client.contact.add', 'client.invoice', 'client.quote', 'client.email',
                                      'documents.view', 'documents.edit', 'documents.send',
                                      'settings.profile', 'settings.companies', 'settings.signatures', 'settings.catalog'
                                    ]
                                  }));
                                  break;
                                case 'agent':
                                  setUserForm(prev => ({ 
                                    ...prev, 
                                    pages: ['dashboard', 'clients', 'service', 'planning'],
                                    permissions: [
                                      'service.create', 'service.edit', 'service.invoice', 'service.print', 'service.email',
                                      'client.edit', 'client.contact.add',
                                      'documents.view', 'documents.send',
                                      'settings.profile'
                                    ]
                                  }));
                                  break;
                                case 'lecture':
                                  setUserForm(prev => ({ 
                                    ...prev, 
                                    pages: ['dashboard', 'clients', 'service', 'stats'],
                                    permissions: ['documents.view']
                                  }));
                                  break;
                              }
                            }}
                          >
                            Appliquer par défaut
                          </Button>
                        </div>
                        {!userForm.pages.includes('*') && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {APP_PAGE_OPTIONS.map((page) => (
                              <label key={page.key} className="flex items-center gap-2 rounded-soft border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={userForm.pages.includes(page.key)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setUserForm(prev => ({ 
                                        ...prev, 
                                        pages: [...prev.pages.filter(p => p !== '*'), page.key] 
                                      }));
                                    } else {
                                      setUserForm(prev => ({ 
                                        ...prev, 
                                        pages: prev.pages.filter(p => p !== page.key) 
                                      }));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                                />
                                <span className="text-xs">{page.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Permissions fonctionnelles */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Permissions fonctionnelles</h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {userForm.permissions.includes('*') ? 'Toutes les permissions' : `${userForm.permissions.length} permission(s) sélectionnée(s)`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                            Permissions complètes (toutes les fonctionnalités)
                          </span>
                          <input
                            type="checkbox"
                            checked={userForm.permissions.includes('*')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserForm(prev => ({ ...prev, permissions: ['*'] }));
                              } else {
                                setUserForm(prev => ({ ...prev, permissions: [] }));
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                          />
                        </label>
                        {!userForm.permissions.includes('*') && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {PERMISSION_OPTIONS.map((permission) => (
                              <label key={permission.key} className="flex items-center gap-2 rounded-soft border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={userForm.permissions.includes(permission.key)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setUserForm(prev => ({ 
                                        ...prev, 
                                        permissions: [...prev.permissions.filter(p => p !== '*'), permission.key] 
                                      }));
                                    } else {
                                      setUserForm(prev => ({ 
                                        ...prev, 
                                        permissions: prev.permissions.filter(p => p !== permission.key) 
                                      }));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                                />
                                <span className="text-xs">{permission.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Statut du compte */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Statut du compte</h4>
                      <label className="flex items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                          Compte actif
                        </span>
                        <input
                          type="checkbox"
                          name="active"
                          checked={userForm.active}
                          onChange={handleUserFormChange}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                        />
                      </label>
                    </div>
                  </div>
                  
                  {userFormError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                      <p className="text-sm text-red-800 dark:text-red-200">{userFormError}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <Button type="button" variant="ghost" onClick={handleUserCancel}>
                    Annuler
                  </Button>
                  <Button type="button" variant="outline" onClick={() => closeDetail('users')}>
                    Fermer
                  </Button>
                  <Button type="submit">
                    {detailState.mode === 'create' ? 'Créer' : detailState.mode === 'password-reset' ? 'Réinitialiser' : 'Enregistrer'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
