import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, Search, Filter, Building2, CheckCircle2, Circle } from 'lucide-react';

import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { RowActionButton } from '../components/RowActionButton';
import {
  AuthUser,
  Company,
  Service,
  ServiceOption,
  ServiceCategory,
  UserProfile,
  useAppData,
} from '../store/useAppData';
import { IconDuplicate, IconEdit, IconPlus, IconTrash } from '../components/icons';
import { BRAND_BASELINE, BRAND_FULL_TITLE, BRAND_NAME } from '../lib/branding';
import { formatCurrency } from '../lib/format';
import { APP_PAGE_OPTIONS, PERMISSION_OPTIONS, type AppPageKey } from '../lib/rbac';

const sections = [
  { id: 'profile', label: 'Profil utilisateur' },
  { id: 'companies', label: 'Entreprises' },
  { id: 'catalog', label: 'Services & Produits' },
  { id: 'users', label: 'Utilisateurs' },
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


type UserFormState = {
  username: string;
  password: string;
  role: 'superAdmin' | 'admin' | 'manager' | 'agent' | 'lecture';
  pages: (AppPageKey | '*')[];
  permissions: ('service.create' | 'service.edit' | 'service.duplicate' | 'service.invoice' | 'service.print' | 'service.email' | 'service.archive' | 'lead.edit' | 'lead.contact' | 'lead.convert' | 'lead.delete' | 'client.edit' | 'client.contact.add' | 'client.invoice' | 'client.quote' | 'client.email' | 'client.archive' | 'documents.view' | 'documents.edit' | 'documents.send' | 'settings.profile' | 'settings.companies' | 'settings.catalog' | 'settings.users' | '*')[];
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
  | { section: 'catalog'; mode: 'create-service' }
  | { section: 'catalog'; mode: 'edit-service'; serviceId: string }
  | { section: 'catalog'; mode: 'create-item'; serviceId: string }
  | { section: 'catalog'; mode: 'edit-item'; serviceId: string; itemId: string }
  | { section: 'users'; mode: 'create' | 'edit' | 'password-reset'; userId?: string };

const detailAnchors: Record<DetailState['section'], string> = {
  profile: 'profil',
  companies: 'entreprise',
  catalog: 'catalogue',
  users: 'utilisateurs',
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
      case 'catalog':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.catalog');
      case 'users':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.users');
      default:
        return false;
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filtrer les sections selon les permissions de l'utilisateur
  const availableSections = sections.filter(section => hasSettingsPermission(section.id));
  
  const tabParam = searchParams.get('tab');
  const fallbackSection: SectionId = availableSections[0]?.id ?? 'profile';
  const requestedSection = sections.find((section) => section.id === tabParam)?.id ?? null;
  const activeSection: SectionId = requestedSection ?? fallbackSection;

  useEffect(() => {
    if (tabParam && tabParam === activeSection) {
      return;
    }
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set('tab', activeSection);
      return next;
    });
  }, [tabParam, activeSection, setSearchParams]);

  const brandBaseline = BRAND_BASELINE.trim();
  const showBrandBaseline = brandBaseline.length > 0;

  const profileSectionRef = useRef<HTMLDivElement | null>(null);
  const companiesSectionRef = useRef<HTMLDivElement | null>(null);
  const catalogSectionRef = useRef<HTMLDivElement | null>(null);
  const usersSectionRef = useRef<HTMLDivElement | null>(null);
  const detailContainerRef = useRef<HTMLDivElement | null>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const hasAppliedHashRef = useRef(false);

  const [detailState, setDetailState] = useState<DetailState | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => buildProfileForm(userProfile));
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(() =>
    buildCompanyForm(companies.find((company) => company.id === activeCompanyId) ?? companies[0] ?? null)
  );
  const companyLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const companyInvoiceLogoFileInputRef = useRef<HTMLInputElement | null>(null);
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
  
  // États pour la recherche et filtres des entreprises
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [companyFilterActive, setCompanyFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [companyFilterVat, setCompanyFilterVat] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [companyFilterPlanning, setCompanyFilterPlanning] = useState<'all' | 'clement' | 'adrien' | 'tous'>('all');
  
  // États pour le modal d'édition d'entreprise
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  
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

  // Filtrage et recherche des entreprises
  const filteredCompanies = useMemo(() => {
    const normalizedQuery = companySearchQuery.trim().toLowerCase();
    
    return companies.filter((company) => {
      // Recherche par nom, SIRET, email, ville
      if (normalizedQuery) {
        const matchesSearch =
          company.name.toLowerCase().includes(normalizedQuery) ||
          company.siret.toLowerCase().includes(normalizedQuery) ||
          company.email.toLowerCase().includes(normalizedQuery) ||
          company.city.toLowerCase().includes(normalizedQuery);
        if (!matchesSearch) return false;
      }

      // Filtre par statut actif
      if (companyFilterActive === 'active' && activeCompanyId !== company.id) return false;
      if (companyFilterActive === 'inactive' && activeCompanyId === company.id) return false;

      // Filtre par TVA
      if (companyFilterVat === 'enabled' && !company.vatEnabled) return false;
      if (companyFilterVat === 'disabled' && company.vatEnabled) return false;

      // Filtre par planning
      if (companyFilterPlanning === 'clement' && company.planningUser !== 'clement') return false;
      if (companyFilterPlanning === 'adrien' && company.planningUser !== 'adrien') return false;
      if (companyFilterPlanning === 'tous' && company.planningUser !== null) return false;

      return true;
    });
  }, [companies, companySearchQuery, companyFilterActive, companyFilterVat, companyFilterPlanning, activeCompanyId]);

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
      case 'catalog':
        return catalogSectionRef;
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
      setShowProfileModal(true);
    } else if (currentHash === detailAnchors.companies) {
      const targetCompany = companies.find((company) => company.id === activeCompanyId) ?? companies[0] ?? null;
      setCompanyForm(buildCompanyForm(targetCompany));
      setDetailState({
        section: 'companies',
        mode: targetCompany ? 'edit' : 'create',
        companyId: targetCompany?.id ?? null,
      });
    }

    hasAppliedHashRef.current = true;
  }, [
    activeCompanyId,
    companies,
    setCompanyForm,
    setProfileForm,
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
    setShowProfileModal(true);
  };

  const closeProfileModal = useCallback(() => {
    setShowProfileModal(false);
    setProfileForm(buildProfileForm(userProfile));
  }, [userProfile]);

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
    closeProfileModal();
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
            newForm.pages = [
              'dashboard',
              'clients',
              'leads',
              'service',
              'comptabilite.achats',
              'planning',
              'stats',
              'parametres',
              'administratif',
              'administratif.overview',
              'comptabilite.documents',
            ];
            newForm.permissions = ['*'];
            break;
          case 'manager':
            newForm.pages = [
              'dashboard',
              'clients',
              'leads',
              'service',
              'planning',
              'stats',
              'administratif',
              'administratif.overview',
              'comptabilite.documents',
            ];
            newForm.permissions = [
              'service.create', 'service.edit', 'service.duplicate', 'service.invoice', 'service.print', 'service.email',
              'lead.edit', 'lead.contact', 'lead.convert',
              'client.edit', 'client.contact.add', 'client.invoice', 'client.quote', 'client.email',
              'documents.view', 'documents.edit', 'documents.send',
              'settings.profile', 'settings.companies', 'settings.catalog'
            ];
            break;
          case 'agent':
            newForm.pages = [
              'dashboard',
              'clients',
              'service',
              'planning',
              'administratif',
              'administratif.overview',
              'comptabilite.documents',
            ];
            newForm.permissions = [
              'service.create', 'service.edit', 'service.invoice', 'service.print', 'service.email',
              'client.edit', 'client.contact.add',
              'documents.view', 'documents.send',
              'settings.profile'
            ];
            break;
          case 'lecture':
            newForm.pages = [
              'dashboard',
              'clients',
              'service',
              'stats',
              'administratif',
              'administratif.overview',
              'comptabilite.documents',
            ];
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


  const detailTitle = (() => {
    if (!detailState) {
      return '';
    }
    switch (detailState.section) {
      case 'profile':
        return 'Modifier mon profil';
      case 'companies':
        return detailState.mode === 'edit' ? "Modifier l’entreprise" : 'Ajouter une entreprise';
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
          Configurez votre profil, vos entreprises et personnalisez le titre de la navigation pour offrir
          une expérience cohérente. Les factures reprennent automatiquement les informations de l’entreprise active.
        </p>
      </header>

      <div className="space-y-12">
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
          {availableSections.length > 0 && !hasSettingsPermission(activeSection) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-700 shadow-sm dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-100">Accès restreint</h3>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                Vous n&apos;avez pas les permissions nécessaires pour consulter cette section.
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Contactez votre administrateur pour obtenir les accès appropriés.
              </p>
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
              {/* Header */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Entreprises</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Centralisez vos entités légales, ajustez vos préférences TVA et laissez {BRAND_NAME} générer automatiquement
                    les factures selon l'entreprise active.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
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

              {/* Barre de recherche et filtres */}
              <Card padding="md" className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {/* Recherche */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={companySearchQuery}
                      onChange={(e) => setCompanySearchQuery(e.target.value)}
                      placeholder="Rechercher par nom, SIRET, email, ville..."
                      className="w-full rounded-soft border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Filtres */}
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Filtres
                    </span>
                  </div>
                  
                  {/* Filtre statut actif */}
                  <select
                    value={companyFilterActive}
                    onChange={(e) => setCompanyFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
                    className="rounded-soft border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  {/* Filtre TVA */}
                  <select
                    value={companyFilterVat}
                    onChange={(e) => setCompanyFilterVat(e.target.value as 'all' | 'enabled' | 'disabled')}
                    className="rounded-soft border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="all">TVA : Toutes</option>
                    <option value="enabled">TVA : Activée</option>
                    <option value="disabled">TVA : Désactivée</option>
                  </select>

                  {/* Filtre planning */}
                  <select
                    value={companyFilterPlanning}
                    onChange={(e) => setCompanyFilterPlanning(e.target.value as 'all' | 'clement' | 'adrien' | 'tous')}
                    className="rounded-soft border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="all">Planning : Tous</option>
                    <option value="clement">Planning : Clément</option>
                    <option value="adrien">Planning : Adrien</option>
                    <option value="tous">Planning : Tous</option>
                  </select>

                  {/* Reset filtres */}
                  {(companySearchQuery || companyFilterActive !== 'all' || companyFilterVat !== 'all' || companyFilterPlanning !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCompanySearchQuery('');
                        setCompanyFilterActive('all');
                        setCompanyFilterVat('all');
                        setCompanyFilterPlanning('all');
                      }}
                      className="ml-auto text-xs"
                    >
                      Réinitialiser
                    </Button>
                  )}
                </div>
              </Card>

              {/* Tableau des entreprises */}
              {filteredCompanies.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Entreprise
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Contact
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Localisation
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Statut
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            TVA
                          </th>
                          <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Planning
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredCompanies.map((company) => {
                          const planningLabel = company.planningUser === 'clement' ? 'Clément' : 
                                              company.planningUser === 'adrien' ? 'Adrien' : 'Tous';
                          const isActive = activeCompanyId === company.id;
                          
                          return (
                            <tr
                              key={company.id}
                              onClick={() => {
                                setEditingCompanyId(company.id);
                                setCompanyForm(buildCompanyForm(company));
                                setShowCompanyModal(true);
                              }}
                              className={clsx(
                                'group cursor-pointer transition-colors',
                                isActive 
                                  ? 'bg-primary/5 hover:bg-primary/10' 
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              )}
                            >
                              {/* Entreprise */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                                    {company.logoUrl ? (
                                      <img 
                                        src={company.logoUrl} 
                                        alt={`Logo ${company.name}`} 
                                        className="h-full w-full object-contain" 
                                      />
                                    ) : (
                                      <Building2 className="h-5 w-5 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {company.name}
                                      </p>
                                      {company.isDefault && (
                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                          Défaut
                                        </span>
                                      )}
                                      {isActive && (
                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary dark:bg-primary/20">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                      SIRET {company.siret}
                                    </p>
                                    {company.website && (
                                      <a 
                                        href={company.website} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-1 block text-xs text-primary hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {company.website}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Contact */}
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  {company.email && (
                                    <p className="text-xs text-slate-700 dark:text-slate-300">{company.email}</p>
                                  )}
                                  {company.phone && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{company.phone}</p>
                                  )}
                                </div>
                              </td>

                              {/* Localisation */}
                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  {company.address && (
                                    <p className="text-xs text-slate-700 dark:text-slate-300">{company.address}</p>
                                  )}
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {[company.postalCode, company.city].filter(Boolean).join(' ')}
                                    {company.country && `, ${company.country}`}
                                  </p>
                                </div>
                              </td>

                              {/* Statut */}
                              <td className="px-6 py-4 text-center">
                                {isActive ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary/20">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    <Circle className="h-3.5 w-3.5" />
                                    Inactive
                                  </span>
                                )}
                              </td>

                              {/* TVA */}
                              <td className="px-6 py-4 text-center">
                                <label className="flex items-center justify-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={company.vatEnabled}
                                    onChange={(event) => {
                                      event.stopPropagation();
                                      handleCompanyVatToggle(company, event.target.checked);
                                    }}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                                  />
                                  <span className={clsx(
                                    'text-xs',
                                    company.vatEnabled 
                                      ? 'font-medium text-slate-700 dark:text-slate-300' 
                                      : 'text-slate-500 dark:text-slate-400'
                                  )}>
                                    {company.vatEnabled ? 'Oui' : 'Non'}
                                  </span>
                                </label>
                              </td>

                              {/* Planning */}
                              <td className="px-6 py-4 text-center">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  {planningLabel}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  {!company.isDefault && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCompanySetDefault(company);
                                      }}
                                      className="text-xs"
                                    >
                                      Défaut
                                    </Button>
                                  )}
                                  {!isActive && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveCompany(company.id);
                                      }}
                                      className="text-xs"
                                    >
                                      Activer
                                    </Button>
                                  )}
                                  <RowActionButton 
                                    label="Modifier" 
                                    onClick={() => openCompanyDetail(company)}
                                  >
                                    <IconEdit />
                                  </RowActionButton>
                                  <RowActionButton 
                                    label="Supprimer" 
                                    tone="danger" 
                                    onClick={() => handleCompanyRemove(company.id)}
                                  >
                                    <IconTrash />
                                  </RowActionButton>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <Card padding="lg" className="text-center">
                  {companies.length === 0 ? (
                    <>
                      <Building2 className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                        Aucune entreprise
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                        Ajoutez votre première entreprise pour commencer à générer des documents officiels.
                      </p>
                      <Button onClick={() => openCompanyDetail(null)} className="mt-4">
                        <IconPlus />
                        Créer une entreprise
                      </Button>
                    </>
                  ) : (
                    <>
                      <Search className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">
                        Aucun résultat
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Aucune entreprise ne correspond à vos critères de recherche.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCompanySearchQuery('');
                          setCompanyFilterActive('all');
                          setCompanyFilterVat('all');
                          setCompanyFilterPlanning('all');
                        }}
                        className="mt-4"
                      >
                        Réinitialiser les filtres
                      </Button>
                    </>
                  )}
                </Card>
              )}

              {/* Modal d'édition d'entreprise */}
              {showCompanyModal &&
                editingCompanyId &&
                typeof document !== 'undefined' &&
                createPortal(
                  <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4 py-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-company-title"
                    onClick={() => {
                      setShowCompanyModal(false);
                      setEditingCompanyId(null);
                    }}
                  >
                    <div
                      className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 transition dark:border-slate-700 dark:bg-slate-900"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">MODIFIER L'ENTREPRISE</span>
                            <h2 id="edit-company-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                              {companies.find((c) => c.id === editingCompanyId)?.name ?? 'Entreprise'}
                            </h2>
                            <p className="max-w-lg text-xs text-slate-500 dark:text-slate-400">
                              Consultez et modifiez les informations de l'entreprise.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCompanyModal(false);
                              setEditingCompanyId(null);
                            }}
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            aria-label="Fermer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              Nom de l'entreprise
                            </label>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {companyForm.name || '—'}
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              SIRET
                            </label>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {companyForm.siret || '—'}
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              Email
                            </label>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {companyForm.email || '—'}
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              Téléphone
                            </label>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {companyForm.phone || '—'}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              Adresse
                            </label>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {[companyForm.address, [companyForm.postalCode, companyForm.city].filter(Boolean).join(' '), companyForm.country]
                                .filter(Boolean)
                                .join(', ') || '—'}
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              Site web
                            </label>
                            {companyForm.website ? (
                              <a
                                href={companyForm.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                              >
                                {companyForm.website}
                              </a>
                            ) : (
                              <p className="text-sm text-slate-500 dark:text-slate-400">—</p>
                            )}
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              Planning
                            </label>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {companyForm.planningUser === 'clement' ? 'Clément' : companyForm.planningUser === 'adrien' ? 'Adrien' : 'Tous'}
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              TVA
                            </label>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {companyForm.vatEnabled ? 'Activée' : 'Désactivée'}
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                              Statut
                            </label>
                            <div className="flex items-center gap-2">
                              {activeCompanyId === editingCompanyId && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary/20">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Active
                                </span>
                              )}
                              {companies.find((c) => c.id === editingCompanyId)?.isDefault && (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                  Défaut
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              setShowCompanyModal(false);
                              setEditingCompanyId(null);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            Fermer
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const company = companies.find((c) => c.id === editingCompanyId);
                              if (company) {
                                setShowCompanyModal(false);
                                setEditingCompanyId(null);
                                openCompanyDetail(company);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600"
                          >
                            <IconEdit />
                            Modifier en détail
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
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
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)] lg:block">
                    <div className="overflow-x-auto rounded-2xl">
                      <table className="w-full">
                        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                          <tr>
                            <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('name')}
                                className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100"
                              >
                                Nom
                                {catalogServiceSort.key === 'name' && (
                                  <span className="text-xs">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('category')}
                                className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100"
                              >
                                Catégorie
                                {catalogServiceSort.key === 'category' && (
                                  <span className="text-xs">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('active')}
                                className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100"
                              >
                                Statut
                                {catalogServiceSort.key === 'active' && (
                                  <span className="text-xs">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('count')}
                                className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100"
                              >
                                Prestations
                                {catalogServiceSort.key === 'count' && (
                                  <span className="text-xs">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedCatalogServices.map((service) => (
                            <tr
                              key={service.id}
                              onClick={() => setSelectedCatalogServiceId(service.id)}
                              className={clsx(
                                'group cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/5',
                                selectedCatalogService?.id === service.id && 'bg-blue-50/50 dark:bg-blue-500/10'
                              )}
                            >
                              <td className="px-6 py-6 align-middle">
                                <div className="flex items-center gap-3">
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                      {service.name}
                                    </p>
                                    {service.description && (
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{service.description}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-6 align-middle">
                                <span className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                                  {service.category}
                                </span>
                              </td>
                              <td className="px-6 py-6 align-middle">
                                <span
                                  className={clsx(
                                    'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border shadow-[0_1px_0_rgba(16,185,129,0.35)]',
                                    service.active
                                      ? 'bg-emerald-200 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700'
                                      : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
                                  )}
                                >
                                  {service.active ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                              <td className="px-6 py-6 align-middle">
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {service.options.length}
                                </p>
                              </td>
                              <td className="px-6 py-6 align-middle">
                                <div className="flex items-center justify-start gap-2 opacity-100 transition group-hover:translate-x-[1px] group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openCatalogServiceDetail(service);
                                    }}
                                    className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                    title="Modifier"
                                  >
                                    <IconEdit />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCatalogServiceDuplicate(service);
                                    }}
                                    className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                                    title="Dupliquer"
                                  >
                                    <IconDuplicate />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCatalogServiceDelete(service.id);
                                    }}
                                    className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                                    title="Supprimer"
                                  >
                                    <IconTrash />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {sortedCatalogServices.length === 0 && (
                    <div className="hidden lg:block rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Aucun service enregistré</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Créez votre premier service pour commencer.
                      </p>
                    </div>
                  )}
                  <div className="space-y-4 lg:hidden">
                    {sortedCatalogServices.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => setSelectedCatalogServiceId(service.id)}
                        className={clsx(
                          'cursor-pointer space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)]',
                          selectedCatalogService?.id === service.id && 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                              {service.name}
                            </h3>
                            {service.description && (
                              <p className="text-sm text-slate-500 dark:text-slate-400">{service.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                                {service.category}
                              </span>
                              <span
                                className={clsx(
                                  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                                  service.active
                                    ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                )}
                              >
                                {service.active ? 'Actif' : 'Inactif'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                          <div className="flex items-center justify-between">
                            <span>Prestations</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {service.options.length}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCatalogServiceDetail(service);
                            }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            <IconEdit />
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCatalogServiceDuplicate(service);
                            }}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/40"
                          >
                            <IconDuplicate />
                            Dupliquer
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCatalogServiceDelete(service.id);
                            }}
                            className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/40"
                            title="Supprimer"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                    {sortedCatalogServices.length === 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Aucun service enregistré</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Créez votre premier service pour commencer.
                        </p>
                      </div>
                    )}
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
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)] lg:block">
                        <div className="overflow-x-auto rounded-2xl">
                          <table className="w-full">
                            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                              <tr>
                                <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('label')}
                                    className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100"
                                  >
                                    Libellé
                                    {catalogItemSort.key === 'label' && (
                                      <span className="text-xs">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('duration')}
                                    className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100"
                                  >
                                    Durée
                                    {catalogItemSort.key === 'duration' && (
                                      <span className="text-xs">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('price')}
                                    className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100"
                                  >
                                    Prix HT
                                    {catalogItemSort.key === 'price' && (
                                      <span className="text-xs">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                {vatGloballyEnabled && (
                                  <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                    <button
                                      type="button"
                                      onClick={() => toggleCatalogItemSort('tva')}
                                      className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100"
                                    >
                                      TVA %
                                      {catalogItemSort.key === 'tva' && (
                                        <span className="text-xs">
                                          {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                        </span>
                                      )}
                                    </button>
                                  </th>
                                )}
                                <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('active')}
                                    className="flex items-center gap-2 hover:text-slate-900 dark:hover:text-slate-100"
                                  >
                                    Statut
                                    {catalogItemSort.key === 'active' && (
                                      <span className="text-xs">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sortedCatalogItems.map((option) => (
                                <tr
                                  key={option.id}
                                  className="group cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/5"
                                >
                                  <td className="px-6 py-6 align-middle">
                                    <div className="flex items-center gap-3">
                                      <div className="space-y-1">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                          {option.label}
                                        </p>
                                        {option.description && (
                                          <p className="text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-6 align-middle">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {option.defaultDurationMin ? `${option.defaultDurationMin} min` : '—'}
                                    </p>
                                  </td>
                                  <td className="px-6 py-6 align-middle">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                      {formatCurrency(option.unitPriceHT)}
                                    </p>
                                  </td>
                                  {vatGloballyEnabled && (
                                    <td className="px-6 py-6 align-middle">
                                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {option.tvaPct !== undefined && option.tvaPct !== null ? `${option.tvaPct} %` : '—'}
                                      </p>
                                    </td>
                                  )}
                                  <td className="px-6 py-6 align-middle">
                                    <span
                                      className={clsx(
                                        'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border shadow-[0_1px_0_rgba(16,185,129,0.35)]',
                                        option.active
                                          ? 'bg-emerald-200 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700'
                                          : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
                                      )}
                                    >
                                      {option.active ? 'Actif' : 'Inactif'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-6 align-middle">
                                    <div className="flex items-center justify-start gap-2 opacity-100 transition group-hover:translate-x-[1px] group-hover:opacity-100">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          openCatalogItemDetail(selectedCatalogService.id, option);
                                        }}
                                        className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                        title="Modifier"
                                      >
                                        <IconEdit />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleCatalogItemDelete(selectedCatalogService.id, option.id);
                                        }}
                                        className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                                        title="Supprimer"
                                      >
                                        <IconTrash />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {sortedCatalogItems.length === 0 && (
                        <div className="hidden lg:block rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Aucune prestation enregistrée</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Ajoutez votre première prestation pour ce service.
                          </p>
                        </div>
                      )}
                      <div className="space-y-4 lg:hidden">
                        {sortedCatalogItems.map((option) => (
                          <div
                            key={option.id}
                            className="cursor-pointer space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                  {option.label}
                                </h3>
                                {option.description && (
                                  <p className="text-sm text-slate-500 dark:text-slate-400">{option.description}</p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span
                                    className={clsx(
                                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                                      option.active
                                        ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    )}
                                  >
                                    {option.active ? 'Actif' : 'Inactif'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                              <div className="flex items-center justify-between">
                                <span>Durée</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {option.defaultDurationMin ? `${option.defaultDurationMin} min` : '—'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Prix HT</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {formatCurrency(option.unitPriceHT)}
                                </span>
                              </div>
                              {vatGloballyEnabled && (
                                <div className="flex items-center justify-between">
                                  <span>TVA</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                                    {option.tvaPct !== undefined && option.tvaPct !== null ? `${option.tvaPct} %` : '—'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => {
                                  openCatalogItemDetail(selectedCatalogService.id, option);
                                }}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <IconEdit />
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleCatalogItemDelete(selectedCatalogService.id, option.id);
                                }}
                                className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/40"
                                title="Supprimer"
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </div>
                        ))}
                        {sortedCatalogItems.length === 0 && (
                          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Aucune prestation enregistrée</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Ajoutez votre première prestation pour ce service.
                            </p>
                          </div>
                        )}
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
                                    pages: [
                                      'dashboard',
                                      'clients',
                                      'leads',
                                      'service',
                                  'comptabilite.achats',
                                      'planning',
                                      'stats',
                                      'parametres',
                                      'administratif',
                                      'administratif.overview',
                                      'administratif.documents',
                                    ],
                                    permissions: ['*']
                                  }));
                                  break;
                                case 'manager':
                                  setUserForm(prev => ({ 
                                    ...prev, 
                                    pages: [
                                      'dashboard',
                                      'clients',
                                      'leads',
                                      'service',
                                      'planning',
                                      'stats',
                                      'administratif',
                                      'administratif.overview',
                                      'administratif.documents',
                                    ],
                                    permissions: [
                                      'service.create', 'service.edit', 'service.duplicate', 'service.invoice', 'service.print', 'service.email',
                                      'lead.edit', 'lead.contact', 'lead.convert',
                                      'client.edit', 'client.contact.add', 'client.invoice', 'client.quote', 'client.email',
                                      'documents.view', 'documents.edit', 'documents.send',
                                      'settings.profile', 'settings.companies', 'settings.catalog'
                                    ]
                                  }));
                                  break;
                                case 'agent':
                                  setUserForm(prev => ({ 
                                    ...prev, 
                                    pages: [
                                      'dashboard',
                                      'clients',
                                      'service',
                                      'planning',
                                      'administratif',
                                      'administratif.overview',
                                      'administratif.documents',
                                    ],
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
                                    pages: [
                                      'dashboard',
                                      'clients',
                                      'service',
                                      'stats',
                                      'administratif',
                                      'administratif.overview',
                                      'administratif.documents',
                                    ],
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

      {showProfileModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4 py-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            onClick={closeProfileModal}
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 transition dark:border-slate-700 dark:bg-slate-900"
              onClick={(event) => event.stopPropagation()}
            >
              <form
                onSubmit={handleProfileSubmit}
                className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">MODIFIER MON PROFIL</span>
                    <h2 id="edit-profile-title" className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {userProfile.firstName} {userProfile.lastName}
                    </h2>
                    <p className="max-w-lg text-xs text-slate-500 dark:text-slate-400">
                      Mettez à jour vos informations personnelles et votre photo de profil.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    aria-label="Fermer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="profile-first-name">
                        Prénom *
                      </label>
                      <input
                        id="profile-first-name"
                        name="firstName"
                        type="text"
                        value={profileForm.firstName}
                        onChange={handleProfileChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="profile-last-name">
                        Nom *
                      </label>
                      <input
                        id="profile-last-name"
                        name="lastName"
                        type="text"
                        value={profileForm.lastName}
                        onChange={handleProfileChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="profile-email">
                        E-mail *
                      </label>
                      <input
                        id="profile-email"
                        name="email"
                        type="email"
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="profile-phone">
                        Téléphone
                      </label>
                      <input
                        id="profile-phone"
                        name="phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="profile-role">
                      Rôle
                    </label>
                    <input
                      id="profile-role"
                      name="role"
                      type="text"
                      value={profileForm.role}
                      onChange={handleProfileChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Photo de profil</span>
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
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                          <span>Lien externe (optionnel)</span>
                          <input
                            name="avatarUrl"
                            type="text"
                            value={profileForm.avatarUrl}
                            onChange={handleProfileChange}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            placeholder="https://…"
                          />
                        </label>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Les fichiers importés sont convertis en data URL et conservés pour vos prochaines connexions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={closeProfileModal}
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

export default SettingsPage;
