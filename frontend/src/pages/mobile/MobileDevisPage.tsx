import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Send,
  Pencil,
  Printer,
  Trash2,
  Tag,
  Users,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  UserPlus,
  Mail,
  Phone,
  Search,
  Check,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { IconConvert, IconDuplicate } from '../../components/icons';
import { ClientLeadSearch } from '../../components/ClientLeadSearch';
import { useAppData, EngagementOptionOverride, SupportType } from '../../store/useAppData';
import type { Engagement, CommercialDocumentStatus, Client, Company, Service, Lead, ServiceCategory } from '../../store/useAppData';
import { formatCurrency, formatDate, formatDuration } from '../../lib/format';
import { useEntityMaps } from '../../hooks/useEntityMaps';
import { AppointmentService } from '../../api';
import { generateQuotePdfWithMultipleServices, type QuoteServiceItem, generateQuoteFileName } from '../../lib/invoice';
import { computeVatMultiplier, sanitizeVatRate, getNextQuoteNumber } from '../service/utils';
import { ensureClientFromLead } from '../../lib/clientUtils';
import { buildInitialDraft } from '../service/utils';
import '../mobile.css';
import '../../styles/apple-mobile.css';

const ITEMS_PER_PAGE = 10;

const getStatusStyle = (status: CommercialDocumentStatus | null) => {
  if (!status) return { bg: 'rgba(148, 163, 184, 0.15)', color: '#64748b', border: 'rgba(148, 163, 184, 0.3)' };
  
  const styles: Record<CommercialDocumentStatus, { bg: string; color: string; border: string }> = {
    'brouillon': { bg: 'rgba(148, 163, 184, 0.15)', color: '#64748b', border: 'rgba(148, 163, 184, 0.3)' },
    'envoyé': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
    'accepté': { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
    'refusé': { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
    'payé': { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  };
  
  return styles[status] || styles.brouillon;
};

const getStatusIcon = (status: CommercialDocumentStatus | null) => {
  switch (status) {
    case 'brouillon':
      return <Clock size={14} />;
    case 'envoyé':
      return <Send size={14} />;
    case 'accepté':
      return <CheckCircle2 size={14} />;
    case 'refusé':
      return <XCircle size={14} />;
    default:
      return <Clock size={14} />;
  }
};

const MobileDevisPage: React.FC = () => {
  console.log('🔵 [MobileDevisPage] RENDER', {
    timestamp: new Date().toISOString(),
    stack: new Error().stack?.split('\n').slice(1, 3).join('\n')
  });
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    engagements,
    clients,
    services,
    companies,
    categories,
    leads,
    activeCompanyId,
    computeEngagementTotals,
    updateEngagement,
    removeEngagement,
    addEngagement,
    addClient,
    addClientContact,
    addLead,
    vatEnabled,
    vatRate,
    hasPermission,
    userProfile,
    projectMembers,
    authUsers,
  } = useAppData();
  
  console.log('🔵 [MobileDevisPage] État', {
    engagementsCount: engagements.length,
    clientsCount: clients.length,
    servicesCount: services.length,
    categoriesCount: categories.length
  });

  const clientsById = useEntityMaps(clients);
  const servicesById = useEntityMaps(services);
  const companiesById = useEntityMaps(companies);

  const [statusFilter, setStatusFilter] = useState<CommercialDocumentStatus | 'Tous'>('Tous');
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Contexte, 2: Prestations, 3: Planification
  const [creationDraft, setCreationDraft] = useState<any>(null);
  const [selectedClientOrLeadType, setSelectedClientOrLeadType] = useState<'client' | 'lead' | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<Array<{
    serviceId: string;
    optionIds: string[];
    optionOverrides: Record<string, EngagementOptionOverride>;
    supportType: SupportType;
    supportDetail: string;
    mainCategoryId?: string;
    subCategoryId?: string;
    quantity?: number;
  }>>([]);
  const [showServiceSelectionModal, setShowServiceSelectionModal] = useState(false);
  const [modalSelectedMainCategoryId, setModalSelectedMainCategoryId] = useState<string>('');
  const [modalSelectedSubCategoryId, setModalSelectedSubCategoryId] = useState<string>('');
  const [modalSelectedServiceId, setModalSelectedServiceId] = useState<string>('');
  const [modalSelectedSupportDetail, setModalSelectedSupportDetail] = useState<string>('');
  const [modalSelectedOptionIds, setModalSelectedOptionIds] = useState<string[]>([]);
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');
  const [editingDurationIndex, setEditingDurationIndex] = useState<number | null>(null);
  const [editingDurationValue, setEditingDurationValue] = useState<string>('');
  const [createQuoteError, setCreateQuoteError] = useState<string | null>(null);
  // États pour l'étape 2 : sélection de prestations
  const [step2SelectedCategory, setStep2SelectedCategory] = useState<string>('');
  const [step2SelectedSubCategoryId, setStep2SelectedSubCategoryId] = useState<string>('');
  const [step2SelectedServiceId, setStep2SelectedServiceId] = useState<string>('');
  const [step2SelectedOptionIds, setStep2SelectedOptionIds] = useState<string[]>([]);
  const [step2SupportDetail, setStep2SupportDetail] = useState<string>('');
  const hasLoadedRef = useRef(false);
  const servicesLoadedRef = useRef(false);
  const categoriesLoadedRef = useRef(false);
  const engagementIdProcessedRef = useRef<string | null>(null);
  const step2DataLoadedRef = useRef(false);

  // Calculer vatMultiplier exactement comme DevisPage.tsx
  const vatMultiplier = useMemo(() => {
    const rate = vatRate ?? 0;
    return rate / 100; // Ex: 20% = 0.20
  }, [vatRate]);

  // Filtrer les devis EXACTEMENT comme DevisPage.tsx (mais sans filtrer "brouillon")
  const filteredQuotes = useMemo(() => {
    const quotes = engagements.filter((engagement) => {
      if (engagement.kind !== 'devis') return false;
      const matchesStatus = statusFilter === 'Tous' || engagement.quoteStatus === statusFilter;
      const matchesCompany = !activeCompanyId || !engagement.companyId || engagement.companyId === activeCompanyId;
      return matchesStatus && matchesCompany;
    });
    
    // Trier comme DevisPage.tsx (par nom du devis, puis numéro)
    return quotes.sort((a, b) => {
      const nameA = (a.quoteName || '').toLowerCase();
      const nameB = (b.quoteName || '').toLowerCase();
      if (nameA && nameB) {
        return nameA.localeCompare(nameB);
      }
      if (nameA) return -1;
      if (nameB) return 1;
      const numA = a.quoteNumber || '';
      const numB = b.quoteNumber || '';
      return numB.localeCompare(numA);
    });
  }, [engagements, statusFilter, activeCompanyId]);

  // Pagination
  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuotes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuotes, currentPage]);

  const totalPages = Math.ceil(filteredQuotes.length / ITEMS_PER_PAGE);

  // Reset page quand filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Gérer le paramètre engagementId de l'URL pour ouvrir automatiquement la fiche du devis
  // Utiliser un ref pour éviter les re-renders infinis (comme MobileClientsPage)
  useEffect(() => {
    const engagementIdFromUrl = searchParams.get('engagementId');
    
    // Ne traiter qu'une seule fois par engagementId
    if (!engagementIdFromUrl || engagementIdProcessedRef.current === engagementIdFromUrl) {
      return;
    }
    
    if (filteredQuotes.length > 0) {
      const engagement = filteredQuotes.find((e) => e.id === engagementIdFromUrl);
      if (engagement) {
        engagementIdProcessedRef.current = engagementIdFromUrl;
        
        // Trouver sur quelle page se trouve ce devis
        const engagementIndex = filteredQuotes.findIndex((e) => e.id === engagementIdFromUrl);
        if (engagementIndex >= 0) {
          const targetPage = Math.floor(engagementIndex / ITEMS_PER_PAGE) + 1;
          if (targetPage !== currentPage) {
            setCurrentPage(targetPage);
          }
          // Attendre que la page soit mise à jour avant d'expandre
          setTimeout(() => {
            setExpandedQuoteId(engagementIdFromUrl);
            // Nettoyer l'URL pour éviter de réouvrir à chaque fois
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('engagementId');
            setSearchParams(newParams, { replace: true });
            engagementIdProcessedRef.current = null; // Réinitialiser après traitement
          }, 100);
        } else {
          // Engagement trouvé mais pas dans filteredQuotes (filtre ?), l'expander quand même
          engagementIdProcessedRef.current = engagementIdFromUrl;
          setExpandedQuoteId(engagementIdFromUrl);
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('engagementId');
          setSearchParams(newParams, { replace: true });
          engagementIdProcessedRef.current = null; // Réinitialiser après traitement
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, filteredQuotes.length]); // Ne dépendre que de la longueur, pas de l'array complet

  // Charger les services et engagements depuis le backend (une seule fois)
  useEffect(() => {
    console.log('🔵 [MobileDevisPage] useEffect loadFromBackend déclenché', {
      hasLoadedRef: hasLoadedRef.current,
      engagementsCount: engagements.length,
      __mobileDevisLoaded: (window as any).__mobileDevisLoaded,
      __loadingDevis: (window as any).__loadingDevis,
      stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
    
    // Protection globale pour éviter les chargements multiples (comme MobileClientsPage)
    if (hasLoadedRef.current || (window as any).__mobileDevisLoaded) {
      console.log('🟢 [MobileDevisPage] DÉJÀ CHARGÉ - IGNORÉ');
      hasLoadedRef.current = true;
      return;
    }
    
    // Si on a déjà des engagements, marquer comme chargé et ne rien faire
    if (engagements.length > 0) {
      console.log('🟢 [MobileDevisPage] Engagements DÉJÀ DANS LE STORE - IGNORÉ', { count: engagements.length });
      hasLoadedRef.current = true;
      (window as any).__mobileDevisLoaded = true;
      (window as any).__loadingDevis = false;
      return;
    }

    const loadFromBackend = async () => {
      // Protection globale pour éviter les appels multiples
      if (hasLoadedRef.current || (window as any).__mobileDevisLoaded || (window as any).__loadingDevis) {
        console.log('⚠️ [MobileDevisPage] loadFromBackend déjà exécuté - IGNORÉ');
        return;
      }
      console.log('🔴 [MobileDevisPage] DÉMARRAGE loadFromBackend');
      hasLoadedRef.current = true;
      (window as any).__loadingDevis = true;
      (window as any).__mobileDevisLoaded = false;

      try {
        setBackendLoading(true);
        setBackendError(null);
        
        // Charger les services seulement s'ils ne sont pas déjà chargés
        if (services.length === 0 && !servicesLoadedRef.current) {
          servicesLoadedRef.current = true;
          const { ServiceService } = await import('../../api');
          const servicesResult = await ServiceService.getServices();
          if (servicesResult.success && Array.isArray(servicesResult.data)) {
            useAppData.setState({ services: servicesResult.data });
          }
        }
        
        // Charger les catégories seulement si nécessaire
        if (activeCompanyId && categories.length === 0 && !categoriesLoadedRef.current) {
          categoriesLoadedRef.current = true;
          const { CategoryService } = await import('../../api');
          const categoriesResult = await CategoryService.getCategories();
          if (categoriesResult.success && Array.isArray(categoriesResult.data)) {
            useAppData.setState({ categories: categoriesResult.data });
          }
        }

        // Charger les clients seulement s'ils ne sont pas déjà chargés
        if (clients.length === 0) {
          const { ClientService } = await import('../../api');
          const clientsResult = await ClientService.getAll();
          if (clientsResult.success && Array.isArray(clientsResult.data)) {
            const mapped: Client[] = clientsResult.data.map((c: any) => ({
              id: c.id,
              name: c.name || c.companyName || '',
              type: c.type || 'individual',
              companyName: c.companyName ?? null,
              firstName: c.firstName ?? null,
              lastName: c.lastName ?? null,
              siret: c.siret ?? '',
              email: c.email ?? '',
              phone: c.phone ?? '',
              address: c.address ?? '',
              city: c.city ?? '',
              status: c.status ?? 'Actif',
              tags: Array.isArray(c.tags) ? c.tags : [],
              lastService: c.lastService ?? null,
              contacts: Array.isArray(c.contacts) ? c.contacts : [],
            }));
            useAppData.setState({ clients: mapped });
          }
        }

        // Charger les entreprises seulement si elles ne sont pas déjà chargées
        if (companies.length === 0) {
          const { CompanyService } = await import('../../api');
          const companiesResult = await CompanyService.getAll();
          if (companiesResult.success && Array.isArray(companiesResult.data)) {
            useAppData.setState({ companies: companiesResult.data });
          }
        }
        
        // Charger les engagements seulement si pas déjà chargés
        const currentEngagements = useAppData.getState().engagements || [];
        // Protection globale - ne charger que si pas déjà chargé ailleurs
        if (currentEngagements.length === 0 && !(window as any).__loadingAppointments && !(window as any).__appointmentsLoaded) {
          (window as any).__loadingAppointments = true;
          const result = await AppointmentService.getAll();
          if (result.success && Array.isArray(result.data)) {
            (window as any).__appointmentsLoaded = true;
          }
          (window as any).__loadingAppointments = false;
          if (!result.success) {
            setBackendError(result.error || 'Erreur lors du chargement des devis.');
          }
        }
      } catch (error: any) {
        console.error('❌ [MobileDevisPage] Erreur lors du chargement:', error);
        setBackendError(error?.message || 'Erreur lors du chargement des devis.');
        hasLoadedRef.current = false; // Permettre de réessayer en cas d'erreur
        (window as any).__mobileDevisLoaded = false;
      } finally {
        setBackendLoading(false);
        (window as any).__loadingDevis = false;
        // Marquer comme chargé seulement après succès
        if (!backendError) {
          (window as any).__mobileDevisLoaded = true;
        }
      }
    };
    
    loadFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Tableau vide = une seule fois au montage (comme MobileClientsPage)

  // Actions
  const handleDelete = useCallback((engagement: Engagement) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) {
      removeEngagement(engagement.id);
    }
  }, [removeEngagement]);

  const handleUpdateQuoteStatus = useCallback((engagement: Engagement, newStatus: CommercialDocumentStatus) => {
    updateEngagement(engagement.id, { quoteStatus: newStatus });
  }, [updateEngagement]);

  // Fonction pour convertir un lead en client
  const ensureClientFromLeadWrapper = useCallback((lead: Lead): Client => {
    try {
      return ensureClientFromLead(lead, {
        clients,
        addClient,
        addClientContact,
        setClientBillingContact: undefined,
        restoreClientContact: undefined,
        getClient: undefined,
      });
    } catch (error) {
      console.error('Erreur lors de la conversion du lead en client:', error);
      throw error; // Re-lancer l'erreur pour qu'elle soit gérée par handleClientOrLeadSelect
    }
  }, [clients, addClient, addClientContact]);

  // Gestion du modal de création
  const openCreateModal = async () => {
    console.log('🔵 [MobileDevisPage] openCreateModal appelé');
    // S'assurer que les services et catégories sont chargés avant d'ouvrir le modal
    if (services.length === 0) {
      const { ServiceService } = await import('../../api');
      const servicesResult = await ServiceService.getServices();
      if (servicesResult.success && Array.isArray(servicesResult.data)) {
        useAppData.setState({ services: servicesResult.data });
      }
    }
    
    if (activeCompanyId && categories.length === 0) {
      const { CategoryService } = await import('../../api');
      const categoriesResult = await CategoryService.getCategories();
      if (categoriesResult.success && Array.isArray(categoriesResult.data)) {
        useAppData.setState({ categories: categoriesResult.data });
      }
    }

    // Récupérer les données à jour du store après le chargement
    const currentState = useAppData.getState();
    const currentServices = currentState.services || services;
    const currentCategories = currentState.categories || categories;
    const currentClients = currentState.clients || clients;
    const currentCompanies = currentState.companies || companies;

    const draft = buildInitialDraft(currentClients, currentServices, currentCompanies, activeCompanyId);
    draft.kind = 'devis';
    draft.status = 'brouillon';
    draft.clientId = '';
    draft.serviceId = '';
    draft.contactIds = [];
    draft.assignedUserIds = [];
    setCreationDraft(draft);
    setSelectedServices([]);
    setSelectedClientOrLeadType(null);
    setSelectedLeadId(null);
    setCreateQuoteError(null);
    setCurrentStep(1);
    // Réinitialiser les états de l'étape 2
    setStep2SelectedCategory('');
    setStep2SelectedSubCategoryId('');
    setStep2SelectedServiceId('');
    setStep2SelectedOptionIds([]);
    setStep2SupportDetail('');
    console.log('🔴 [MobileDevisPage] setShowCreateModal(true) appelé');
    setShowCreateModal(true);
    console.log('✅ [MobileDevisPage] Modal devrait être ouvert maintenant');
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateQuoteError(null);
    setCurrentStep(1);
    setCreationDraft(null);
    setSelectedServices([]);
    setSelectedClientOrLeadType(null);
    setSelectedLeadId(null);
  };

  const handleClientOrLeadSelect = useCallback((result: { id: string; type: 'client' | 'lead'; data: Client | Lead }) => {
    try {
      console.log('[MobileDevisPage] Sélection client/prospect:', result.type, result.id);
      if (result.type === 'lead') {
        const lead = result.data as Lead;
        console.log('[MobileDevisPage] Conversion du lead en client:', lead);
        const client = ensureClientFromLeadWrapper(lead);
        console.log('[MobileDevisPage] Client créé/trouvé:', client.id, client.name);
        setSelectedClientOrLeadType('lead');
        setSelectedLeadId(lead.id);
        setCreationDraft((draft) => {
          if (!draft) {
            console.error('[MobileDevisPage] creationDraft est null lors de la sélection du lead');
            return null;
          }
          console.log('[MobileDevisPage] Mise à jour creationDraft avec clientId:', client.id);
          return {
            ...draft,
            clientId: client.id,
          };
        });
      } else {
        const client = result.data as Client;
        setSelectedClientOrLeadType('client');
        setSelectedLeadId(null);
        setCreationDraft((draft) => {
          if (!draft) {
            console.error('[MobileDevisPage] creationDraft est null lors de la sélection du client');
            return null;
          }
          return {
            ...draft,
            clientId: client.id,
          };
        });
      }
      // Réinitialiser l'erreur en cas de succès
      setCreateQuoteError(null);
    } catch (error) {
      console.error('[MobileDevisPage] Erreur lors de la sélection du client/prospect:', error);
      setCreateQuoteError(`Erreur lors de la sélection: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      // Ne pas fermer le modal en cas d'erreur
    }
  }, [ensureClientFromLeadWrapper]);

  const nextStep = () => {
    // Validation de l'étape 1
    if (currentStep === 1) {
      if (!creationDraft?.clientId) {
        setCreateQuoteError('Veuillez sélectionner un client ou un prospect.');
        return;
      }
      if (!creationDraft?.companyId) {
        setCreateQuoteError('Veuillez sélectionner une entreprise.');
        return;
      }
    }
    
    // Validation de l'étape 2
    if (currentStep === 2) {
      if (selectedServices.length === 0) {
        setCreateQuoteError('Veuillez ajouter au moins une prestation.');
        return;
      }
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      setCreateQuoteError(null);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setCreateQuoteError(null);
    }
  };

  // Fonctions pour gérer les prestations dans l'étape 2
  const handleAddServiceToStep2 = () => {
    if (!step2SelectedServiceId) {
      setCreateQuoteError('Veuillez sélectionner une prestation.');
      return;
    }

    const service = services.find((s) => s.id === step2SelectedServiceId);
    if (!service) {
      setCreateQuoteError('Prestation introuvable.');
      return;
    }

    // Vérifier si la prestation n'est pas déjà dans la liste
    if (selectedServices.some(s => s.serviceId === step2SelectedServiceId)) {
      setCreateQuoteError('Cette prestation est déjà dans la liste.');
      return;
    }

    // Trouver la catégorie principale (mainCategoryId) à partir de step2SelectedCategory
    let mainCategoryId: string | undefined = undefined;
    if (step2SelectedCategory) {
      const mainCategory = categories.find((cat) => cat.name === step2SelectedCategory && !cat.parentId);
      if (mainCategory) {
        mainCategoryId = mainCategory.id;
      }
    }

    const autoSupportType = (service.category === 'Autre' ? 'Textile' : service.category) as SupportType;

    const newService = {
      serviceId: step2SelectedServiceId,
      optionIds: [...step2SelectedOptionIds],
      optionOverrides: {},
      supportType: autoSupportType,
      supportDetail: step2SupportDetail.trim(),
      mainCategoryId: mainCategoryId,
      subCategoryId: step2SelectedSubCategoryId || undefined,
    };

    setSelectedServices([...selectedServices, newService]);
    setCreateQuoteError(null);
    
    // Réinitialiser les champs de sélection pour permettre d'ajouter une autre prestation
    setStep2SelectedCategory('');
    setStep2SelectedSubCategoryId('');
    setStep2SelectedServiceId('');
    setStep2SelectedOptionIds([]);
    setStep2SupportDetail('');
  };

  const handleRemoveServiceFromStep2 = (index: number) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  // S'assurer que les services et catégories sont chargés quand on arrive à l'étape 2
  // Protection avec ref pour éviter les chargements multiples (comme MobileClientsPage)
  React.useEffect(() => {
    // Ne charger qu'une seule fois quand on arrive à l'étape 2
    if (currentStep === 2 && showCreateModal && !step2DataLoadedRef.current) {
      step2DataLoadedRef.current = true;
      const loadDataForStep2 = async () => {
        const currentState = useAppData.getState();
        const currentServices = currentState.services || [];
        const currentCategories = currentState.categories || [];

        if (currentServices.length === 0) {
          const { ServiceService } = await import('../../api');
          const servicesResult = await ServiceService.getServices();
          if (servicesResult.success && Array.isArray(servicesResult.data)) {
            useAppData.setState({ services: servicesResult.data });
          }
        }
        
        if (activeCompanyId && currentCategories.length === 0) {
          const { CategoryService } = await import('../../api');
          const categoriesResult = await CategoryService.getCategories();
          if (categoriesResult.success && Array.isArray(categoriesResult.data)) {
            useAppData.setState({ categories: categoriesResult.data });
          }
        }
      };
      loadDataForStep2();
    }
    
    // Réinitialiser le ref quand on ferme le modal ou qu'on change d'étape
    if (!showCreateModal || currentStep !== 2) {
      step2DataLoadedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, showCreateModal, activeCompanyId]);

  // Sélection automatique des options actives quand un service est sélectionné dans l'étape 2
  React.useEffect(() => {
    if (step2SelectedServiceId) {
      const service = services.find((s) => s.id === step2SelectedServiceId);
      if (service) {
        const activeOptionIds = service.options
          .filter(opt => opt.active)
          .map(opt => opt.id);
        if (activeOptionIds.length > 0 && JSON.stringify(step2SelectedOptionIds) !== JSON.stringify(activeOptionIds)) {
          setStep2SelectedOptionIds(activeOptionIds);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step2SelectedServiceId]);

  // Gérer le paramètre ?create=true pour ouvrir automatiquement le modal de création
  const createParamProcessedRef = useRef(false);
  useEffect(() => {
    const createParam = searchParams.get('create');
    console.log('🔵 [MobileDevisPage] useEffect createParam:', {
      createParam,
      showCreateModal,
      locationSearch: location.search,
      shouldOpen: createParam === 'true' && !showCreateModal && !createParamProcessedRef.current
    });
    
    if (createParam === 'true' && !showCreateModal && !createParamProcessedRef.current) {
      createParamProcessedRef.current = true; // Empêcher le retraitement
      console.log('🔴 [MobileDevisPage] Ouverture du modal de création...');
      openCreateModal().then(() => {
        console.log('✅ [MobileDevisPage] Modal de création ouvert');
        // Nettoyer le paramètre de l'URL après ouverture
        setTimeout(() => {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('create');
          setSearchParams(newParams, { replace: true });
          createParamProcessedRef.current = false; // Réinitialiser après nettoyage
        }, 100);
      }).catch((error) => {
        console.error('❌ [MobileDevisPage] Erreur lors de l\'ouverture du modal:', error);
        createParamProcessedRef.current = false; // Réinitialiser en cas d'erreur
      });
    }
    
    // Réinitialiser le flag si le paramètre n'est plus dans l'URL
    if (!createParam) {
      createParamProcessedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, showCreateModal]);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateQuoteError(null);

    if (!creationDraft) {
      setCreateQuoteError('Erreur: données du devis manquantes.');
      return;
    }

    if (!creationDraft.clientId) {
      setCreateQuoteError('Veuillez sélectionner un client ou un prospect.');
      return;
    }

    if (selectedServices.length === 0) {
      setCreateQuoteError('Veuillez ajouter au moins une prestation.');
      return;
    }

    try {
      const client = clientsById.get(creationDraft.clientId);
      if (!client) {
        setCreateQuoteError('Client introuvable.');
        return;
      }

      // Déterminer l'entreprise
      const companyId = creationDraft.companyId || activeCompanyId;
      if (!companyId) {
        setCreateQuoteError('Aucune entreprise sélectionnée.');
        return;
      }

      const company = companiesById.get(companyId);
      if (!company) {
        setCreateQuoteError('Entreprise introuvable.');
        return;
      }

      // Préparer les services avec quantités (si disponibles)
      let engagementServices: any[] = [];
      let firstService: any = null;
      let firstServiceObj: Service | undefined = undefined;

      if (selectedServices.length > 0) {
        engagementServices = selectedServices
          .filter((sel) => !(sel as any).isSubCategoryRow)
          .map((sel) => {
            const service = servicesById.get(sel.serviceId);
            const supportType = sel.supportType || (service?.category === 'Autre' ? 'Textile' : service?.category) || 'Voiture';
            
            return {
              serviceId: sel.serviceId,
              optionIds: sel.optionIds || [],
              optionOverrides: sel.optionOverrides || {},
              supportType: supportType as SupportType,
              supportDetail: (sel.supportDetail || '').trim(),
              mainCategoryId: sel.mainCategoryId,
              subCategoryId: sel.subCategoryId,
              quantity: sel.quantity ?? 1,
            };
          });

        if (engagementServices.length > 0) {
          firstService = engagementServices[0];
          firstServiceObj = servicesById.get(firstService.serviceId);
        }
      }

      // Si pas de services, utiliser un service par défaut (temporaire)
      if (!firstServiceObj && services.length > 0) {
        const defaultService = services[0];
        firstServiceObj = defaultService;
        firstService = {
          serviceId: defaultService.id,
          optionIds: [],
          optionOverrides: {},
          supportType: 'Voiture' as SupportType,
          supportDetail: '',
          quantity: 1,
        };
      }

      if (!firstServiceObj) {
        setCreateQuoteError('Aucun service disponible. Veuillez créer des services d\'abord.');
        return;
      }

      // Préparer les données communes
      const vatEnabledForQuote = company.vatEnabled ?? vatEnabled;
      
      // Si la planification n'est pas activée (scheduledAt vide), mettre planningUser et startTime à null
      const hasPlanning = creationDraft.scheduledAt && creationDraft.scheduledAt.trim() !== '';
      const planningUser = hasPlanning && creationDraft.planningUser && creationDraft.planningUser.trim() 
        ? creationDraft.planningUser 
        : null;
      const startTime = hasPlanning && creationDraft.startTime && creationDraft.startTime.trim() 
        ? creationDraft.startTime 
        : null;

      // Données de l'engagement
      const scheduledAtValue = hasPlanning && creationDraft.scheduledAt && creationDraft.scheduledAt.trim() !== ''
        ? creationDraft.scheduledAt
        : new Date().toISOString();

      const contactIds = client.contacts?.find(c => c.active && c.isBillingDefault) 
        ? [client.contacts.find(c => c.active && c.isBillingDefault)!.id]
        : [];

      // Créer le devis
      const baseQuoteNumber = getNextQuoteNumber(engagements.filter(e => e.kind === 'devis'), new Date());
      const newEngagement = addEngagement({
        kind: 'devis',
        status: 'brouillon',
        clientId: creationDraft.clientId,
        serviceId: firstService.serviceId,
        optionIds: firstService.optionIds || [],
        optionOverrides: firstService.optionOverrides || {},
        scheduledAt: scheduledAtValue,
        companyId: companyId,
        supportType: firstService.supportType || 'Voiture',
        supportDetail: firstService.supportDetail || '',
        contactIds: contactIds,
        assignedUserIds: creationDraft.assignedUserIds || [],
        planningUser: planningUser,
        startTime: startTime,
        invoiceVatEnabled: vatEnabledForQuote,
        quoteName: (creationDraft.quoteName?.trim()) || null,
        quoteStatus: 'brouillon',
        quoteNumber: baseQuoteNumber,
        services: engagementServices.length > 0 ? engagementServices : undefined,
      });

      // Synchroniser avec le backend
      try {
        await AppointmentService.create(newEngagement);
      } catch (error) {
        console.error('Erreur lors de la synchronisation avec le backend:', error);
        // On continue quand même, le devis est créé localement
      }

      closeCreateModal();
      // Optionnel : rediriger vers la version desktop pour compléter le devis
      // window.location.href = `/workspace/crm/devis?edit=${newEngagement.id}`;
    } catch (error: any) {
      setCreateQuoteError(error?.message || 'Erreur lors de la création du devis.');
    }
  };

  // Imprimer le devis ou l'offre de prix - MÊME CODE QUE LA VERSION DESKTOP
  const handlePrintQuote = useCallback((engagement: Engagement) => {
    const client = clientsById.get(engagement.clientId);
    // Utiliser l'entreprise du devis, ou l'entreprise active comme fallback
    const company = engagement.companyId 
      ? companiesById.get(engagement.companyId) 
      : (activeCompanyId ? companiesById.get(activeCompanyId) : null);
    const service = servicesById.get(engagement.serviceId);

    if (!client || !company) {
      setBackendError('Informations manquantes pour imprimer le document.');
      return;
    }

    try {
      const vatEnabledForQuote = company.vatEnabled ?? vatEnabled;
      const documentNumber = engagement.quoteNumber ?? getNextQuoteNumber(engagements, new Date());
      const issueDate = new Date();
      const serviceDate = new Date(engagement.scheduledAt);

      // Vérifier si le devis a plusieurs prestations
      const engagementServices = (engagement as any).services;
      
      if (engagementServices && Array.isArray(engagementServices) && engagementServices.length > 0) {
        // Utiliser la nouvelle fonction pour plusieurs prestations
        const quoteServices: QuoteServiceItem[] = engagementServices.map((serviceItem: any) => {
          const serviceObj = servicesById.get(serviceItem.serviceId);
          if (!serviceObj) {
            throw new Error(`Service introuvable: ${serviceItem.serviceId}`);
          }
          
          return {
            serviceId: serviceItem.serviceId,
            serviceName: serviceObj.name,
            serviceDescription: serviceObj.description || '', // Description de la prestation depuis le catalogue
            supportType: serviceItem.supportType || engagement.supportType,
            supportDetail: serviceItem.supportDetail || engagement.supportDetail || '',
            options: (serviceObj.options && Array.isArray(serviceObj.options))
              ? serviceObj.options.filter(opt => 
                  serviceItem.optionIds && serviceItem.optionIds.includes(opt.id)
                )
              : [],
            optionOverrides: serviceItem.optionOverrides || {},
            additionalCharge: serviceItem.additionalCharge || 0,
            mainCategoryId: serviceItem.mainCategoryId,
            subCategoryId: serviceItem.subCategoryId,
            base_price: (serviceObj as any).base_price,
            base_duration: (serviceObj as any).base_duration,
            quantity: serviceItem.quantity ?? 1, // Inclure la quantité
          };
        });

        // Récupérer le contact depuis engagement.contactIds
        const contact = engagement.contactIds && engagement.contactIds.length > 0
          ? client.contacts?.find(c => c.active && engagement.contactIds.includes(c.id))
          : null;

        const pdf = generateQuotePdfWithMultipleServices({
          documentNumber,
          issueDate,
          serviceDate,
          client,
          contact,
          company: {
            ...company,
            vatNumber: company.vatNumber || undefined,
            iban: company.iban || undefined,
            bic: company.bic || undefined,
            legalForm: (company as any).legalForm || undefined, // Forme juridique si disponible
            insuranceCompany: (company as any).insuranceCompany || undefined, // Nom de l'assureur si disponible
            invoiceLogoUrl: company.invoiceLogoUrl || undefined, // Logo de l'entreprise
          },
          services: quoteServices,
          vatRate: sanitizeVatRate(vatRate),
          vatEnabled: vatEnabledForQuote,
          validityNote: '30 jours',
          paymentMethod: 'Chèque, virement bancaire', // Par défaut, peut être personnalisé
          paymentTerms: 'À réception de facture', // Par défaut, peut être personnalisé
          deposit: 0, // Acompte par défaut à 0, peut être personnalisé
          categories: (categories && Array.isArray(categories)) ? categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            priceHT: (cat as any).priceHT,
            defaultDurationMin: (cat as any).defaultDurationMin,
          })) : [], // Passer les catégories pour inclure les prix et durées des sous-catégories
        });

        // Pour mobile : utiliser la même méthode que ServicePage pour l'impression
        if (typeof window !== 'undefined') {
          pdf.autoPrint?.();
          const blobUrl = pdf.output('bloburl');
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
        } else {
          // Fallback : télécharger le PDF comme sur desktop
          const fileName = generateQuoteFileName(documentNumber, client.name, issueDate);
          pdf.save(fileName);
        }
      } else {
        // Utiliser l'ancienne fonction pour un seul service (rétrocompatibilité)
        if (!service) {
          setBackendError('Service introuvable pour imprimer le document.');
          return;
        }

        // Convertir en format pour plusieurs prestations (même pour un seul service)
        const quoteService: QuoteServiceItem = {
          serviceId: service.id,
          serviceName: service.name,
          serviceDescription: service.description || '',
          supportType: engagement.supportType,
          supportDetail: engagement.supportDetail || '',
          options: (service.options && Array.isArray(service.options))
            ? service.options.filter(opt => engagement.optionIds.includes(opt.id))
            : [],
          optionOverrides: engagement.optionOverrides,
          additionalCharge: engagement.additionalCharge || 0,
          base_price: (service as any).base_price,
          base_duration: (service as any).base_duration,
          mainCategoryId: (engagement as any).services?.[0]?.mainCategoryId,
          subCategoryId: (engagement as any).services?.[0]?.subCategoryId,
        };

        // Récupérer le contact depuis engagement.contactIds
        const contact = engagement.contactIds && engagement.contactIds.length > 0
          ? client.contacts?.find(c => c.active && engagement.contactIds.includes(c.id))
          : null;

        const pdf = generateQuotePdfWithMultipleServices({
          documentNumber,
          issueDate,
          serviceDate,
          client,
          contact,
          company: {
            ...company,
            vatNumber: company.vatNumber || undefined,
            iban: company.iban || undefined,
            bic: company.bic || undefined,
            legalForm: (company as any).legalForm || undefined,
            insuranceCompany: (company as any).insuranceCompany || undefined,
            invoiceLogoUrl: company.invoiceLogoUrl || undefined,
          },
          services: [quoteService],
          vatRate: sanitizeVatRate(vatRate),
          vatEnabled: vatEnabledForQuote,
          validityNote: '30 jours',
          paymentMethod: 'Chèque, virement bancaire',
          paymentTerms: 'À réception de facture',
          deposit: 0,
          categories: (categories && Array.isArray(categories)) ? categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            priceHT: (cat as any).priceHT,
            defaultDurationMin: (cat as any).defaultDurationMin,
          })) : [],
        });

        // Pour mobile : utiliser la même méthode que ServicePage pour l'impression
        if (typeof window !== 'undefined') {
          pdf.autoPrint?.();
          const blobUrl = pdf.output('bloburl');
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
        } else {
          // Fallback : télécharger le PDF comme sur desktop
          const fileName = generateQuoteFileName(documentNumber, client.name, issueDate);
          pdf.save(fileName);
        }
      }
    } catch (error) {
      console.error('[Wash&Go] Erreur lors de l\'impression', error);
      setBackendError('Erreur lors de l\'impression du document.');
    }
  }, [clientsById, companiesById, engagements, servicesById, vatEnabled, vatRate, categories, activeCompanyId]);

  const handleSendQuote = useCallback((engagement: Engagement) => {
    window.location.href = `/workspace/crm/devis?send=${engagement.id}`;
  }, []);

  const handleDuplicateQuote = useCallback((engagement: Engagement) => {
    window.location.href = `/workspace/crm/devis?duplicate=${engagement.id}`;
  }, []);

  const handleConvertToService = useCallback((engagement: Engagement) => {
    window.location.href = `/workspace/crm/devis?convert=${engagement.id}`;
  }, []);

  return (
    <div style={{ padding: '0 var(--space-md)', width: '100%', maxWidth: '700px', margin: '0 auto', background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: 'var(--space-lg) 0', borderBottom: '1px solid rgba(var(--border-rgb), 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text)' }}>Devis</h1>
            <span className="text-caption" style={{ fontSize: '14px', color: 'var(--muted)' }}>
              {filteredQuotes.length} {filteredQuotes.length > 1 ? 'devis' : 'devis'}
            </span>
          </div>
          <button
            onClick={openCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
              padding: 'var(--space-xs) var(--space-md)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(var(--accent-rgb), 0.3)',
              transition: 'all 0.2s ease',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Plus size={18} />
            Créer
          </button>
        </div>

        {/* Filtres - Sans "brouillon" */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)', overflowX: 'auto', paddingBottom: 'var(--space-xs)' }}>
          {(['Tous', 'envoyé', 'accepté', 'refusé'] as const).map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: '1.5px solid',
                  borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      {backendError && (
        <div style={{ padding: 'var(--space-md)', marginTop: 'var(--space-md)', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '14px' }}>
          {backendError}
        </div>
      )}

      {/* Liste des devis */}
      {backendLoading ? (
        <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--muted)' }}>
          Chargement...
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: '16px', margin: 0, opacity: 0.7 }}>
            {statusFilter !== 'Tous' ? 'Aucun devis trouvé.' : 'Aucun devis dans l\'entreprise.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', marginTop: 'var(--space-md)' }}>
            {paginatedQuotes.map((engagement) => {
              const client = clientsById.get(engagement.clientId);
              const company = engagement.companyId ? companiesById.get(engagement.companyId) : null;
              
              // CALCUL EXACTEMENT comme DevisPage.tsx handleSendQuote ligne 1873-1877 (le calcul correct)
              const totals = computeEngagementTotals(engagement);
              const vatEnabledForQuote = company?.vatEnabled ?? vatEnabled;
              // Subtotal HT = Prix + Surcharge
              const subtotal = totals.price + totals.surcharge;
              // TVA calculée sur le subtotal HT (comme dans handleSendQuote ligne 1876)
              const vatAmount = vatEnabledForQuote ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
              // Total TTC = Subtotal + TVA (comme dans handleSendQuote ligne 1877)
              const totalTtc = vatEnabledForQuote ? subtotal + vatAmount : subtotal;
              
              // Debug seulement en développement (commenté pour production)
              // if (engagement.quoteNumber === '202.601.0.0.0.2') {
              //   console.log('[MobileDevis] 🔍 DEBUG devis:', { totals, vatAmount, totalTtc });
              // }
              
              // Ne pas utiliser 'brouillon' par défaut, laisser null ou undefined
              const status = engagement.quoteStatus || null;
              const statusStyle = getStatusStyle(status);
              const isExpanded = expandedQuoteId === engagement.id;

              // Services
              const engagementServices = (engagement as any).services && Array.isArray((engagement as any).services) && (engagement as any).services.length > 0
                ? (engagement as any).services
                : engagement.serviceId
                  ? [{ serviceId: engagement.serviceId, optionIds: engagement.optionIds || [], optionOverrides: engagement.optionOverrides || {} }]
                  : [];

              const primaryService = engagementServices.length > 0 
                ? servicesById.get(engagementServices[0].serviceId) 
                : null;

              const quoteInitials = (engagement.quoteNumber || 'DV').slice(0, 2).toUpperCase();

              return (
                <motion.div
                  key={engagement.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  layout
                  className="card-modern card-interactive"
                  style={{
                    padding: isExpanded ? 'var(--space-md)' : 'var(--space-sm) var(--space-md)',
                    display: 'flex',
                    flexDirection: isExpanded ? 'column' : 'row',
                    alignItems: isExpanded ? 'stretch' : 'center',
                    gap: isExpanded ? 'var(--space-md)' : 'var(--space-sm)',
                    minHeight: isExpanded ? 'auto' : '64px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                  onClick={() => setExpandedQuoteId(isExpanded ? null : engagement.id)}
                >
                  {/* Ligne principale */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', width: '100%' }}>
                    <div 
                      className="avatar" 
                      style={{
                        width: isExpanded ? '56px' : '40px',
                        height: isExpanded ? '56px' : '40px',
                        minWidth: isExpanded ? '56px' : '40px',
                        fontSize: isExpanded ? '18px' : '13px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {quoteInitials}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: isExpanded ? '18px' : '15px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isExpanded ? 'normal' : 'nowrap' }}>
                          {engagement.quoteNumber || '—'}
                        </h3>
                        {status && (
                          <span className="badge-modern" style={{ padding: '3px 8px', fontSize: '10px', background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`, fontWeight: '600', lineHeight: '1.2', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: 'var(--radius-sm)' }}>
                            {getStatusIcon(status)}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap', marginTop: '2px' }}>
                        <span className="text-caption" style={{ fontSize: '13px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
                          {client?.name || 'Client inconnu'}
                        </span>
                        {company && (
                          <span className="text-caption" style={{ fontSize: '11px', color: 'var(--muted)', opacity: 0.7 }}>
                            • {company.name}
                          </span>
                        )}
                      </div>
                      {engagement.quoteName && (
                        <span className="text-caption" style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600', fontStyle: 'italic', marginTop: '2px' }}>
                          {engagement.quoteName}
                        </span>
                      )}
                      <span className="text-body" style={{ fontSize: isExpanded ? '18px' : '16px', fontWeight: '700', color: 'var(--accent)', marginTop: '4px', letterSpacing: '-0.3px' }}>
                        {formatCurrency(totalTtc)}
                      </span>
                    </div>
                  </div>

                  {/* Détails expandus */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid rgba(var(--border-rgb), 0.1)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Détails financiers */}
                      <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid rgba(var(--border-rgb), 0.04)' }}>
                        <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                          <FileText size={18} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                          <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Détails financiers</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span className="text-caption" style={{ fontSize: '12px', color: 'var(--muted)' }}>Prix HT:</span>
                              <span className="text-body" style={{ fontSize: '13px', fontWeight: '600' }}>
                                {formatCurrency(totals.price)}
                              </span>
                            </div>
                            {totals.surcharge > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="text-caption" style={{ fontSize: '12px', color: 'var(--muted)' }}>Supplément:</span>
                                <span className="text-body" style={{ fontSize: '13px', fontWeight: '600' }}>
                                  {formatCurrency(totals.surcharge)}
                                </span>
                              </div>
                            )}
                            {vatEnabledForQuote && vatAmount > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="text-caption" style={{ fontSize: '12px', color: 'var(--muted)' }}>TVA ({vatRate ?? 0}%):</span>
                                <span className="text-body" style={{ fontSize: '13px', fontWeight: '600' }}>
                                  {formatCurrency(vatAmount)}
                                </span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(var(--border-rgb), 0.1)' }}>
                              <span className="text-body" style={{ fontSize: '14px', fontWeight: '600' }}>
                                Total {vatEnabledForQuote ? 'TTC' : 'HT'}:
                              </span>
                              <span className="text-body" style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent)' }}>
                                {formatCurrency(totalTtc)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Services */}
                      {engagementServices.length > 0 && (
                        <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid rgba(var(--border-rgb), 0.04)' }}>
                          <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                            <FileText size={18} style={{ color: 'var(--accent)' }} />
                          </div>
                          <div className="info-row-content" style={{ gap: 'var(--space-2xs)', flex: 1 }}>
                            <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>
                              {engagementServices.length > 1 ? 'Prestations' : 'Prestation'}
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                              {engagementServices.map((serviceItem: any, idx: number) => {
                                const service = servicesById.get(serviceItem.serviceId);
                                if (!service) return null;
                                return (
                                  <div key={idx} style={{ padding: 'var(--space-xs)', background: 'rgba(var(--bg-rgb), 0.5)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(var(--border-rgb), 0.1)' }}>
                                    <span className="info-row-value" style={{ fontSize: '14px', fontWeight: '600' }}>
                                      {service.name}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions rapides */}
                      <div 
                        className="mobile-actions-scrollable"
                        style={{ 
                          display: 'flex', 
                          gap: 'var(--space-sm)', 
                          marginTop: 'var(--space-md)',
                          overflowX: 'auto',
                          overflowY: 'hidden',
                          paddingBottom: 'var(--space-xs)',
                          WebkitOverflowScrolling: 'touch',
                        }}
                      >
                        {status === 'brouillon' && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/workspace/crm/devis?edit=${engagement.id}`;
                            }}
                            style={{
                              flexShrink: 0,
                              minWidth: '120px',
                              padding: '12px 16px',
                              borderRadius: 'var(--radius-lg)',
                              background: 'var(--accent)',
                              color: 'white',
                              border: 'none',
                              fontSize: '14px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              boxShadow: '0 2px 8px rgba(var(--accent-rgb), 0.3)',
                            }}
                          >
                            <Pencil size={16} />
                            Modifier
                          </motion.button>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintQuote(engagement);
                          }}
                          style={{
                            flexShrink: 0,
                            minWidth: '120px',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            border: '1.5px solid var(--border)',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                          }}
                        >
                          <Printer size={16} />
                          Imprimer
                        </motion.button>
                        {hasPermission('service.email') && status !== 'accepté' && status !== 'refusé' && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendQuote(engagement);
                            }}
                            style={{
                              flexShrink: 0,
                              minWidth: '120px',
                              padding: '12px 16px',
                              borderRadius: 'var(--radius-lg)',
                              background: 'var(--surface)',
                              color: 'var(--text)',
                              border: '1.5px solid var(--border)',
                              fontSize: '14px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                            }}
                          >
                            <Send size={16} />
                            Envoyer
                          </motion.button>
                        )}
                        {status === 'envoyé' && (
                          <>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQuoteStatus(engagement, 'accepté');
                              }}
                              style={{
                                flexShrink: 0,
                                minWidth: '120px',
                                padding: '12px 16px',
                                borderRadius: 'var(--radius-lg)',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                border: '1.5px solid rgba(16, 185, 129, 0.3)',
                                fontSize: '14px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                              }}
                            >
                              <CheckCircle2 size={16} />
                              Accepter
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateQuoteStatus(engagement, 'refusé');
                              }}
                              style={{
                                flexShrink: 0,
                                minWidth: '120px',
                                padding: '12px 16px',
                                borderRadius: 'var(--radius-lg)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1.5px solid rgba(239, 68, 68, 0.3)',
                                fontSize: '14px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                              }}
                            >
                              <XCircle size={16} />
                              Refuser
                            </motion.button>
                          </>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(engagement);
                          }}
                          style={{
                            flexShrink: 0,
                            minWidth: '120px',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--surface)',
                            color: '#ef4444',
                            border: '1.5px solid rgba(239, 68, 68, 0.3)',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                          }}
                        >
                          <Trash2 size={16} />
                          Supprimer
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-lg)', padding: 'var(--space-md) 0', borderTop: '1px solid rgba(var(--border-rgb), 0.1)' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: '1.5px solid var(--border)',
                  background: currentPage === 1 ? 'transparent' : 'var(--surface)',
                  color: currentPage === 1 ? 'var(--muted)' : 'var(--text)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ChevronLeft size={16} />
                Précédent
              </button>
              <span className="text-caption" style={{ fontSize: '14px', color: 'var(--muted)' }}>
                Page {currentPage} sur {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: '1.5px solid var(--border)',
                  background: currentPage === totalPages ? 'transparent' : 'var(--surface)',
                  color: currentPage === totalPages ? 'var(--muted)' : 'var(--text)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Suivant
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de création de devis */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: 0,
            }}
            onClick={(e) => {
              // Ne fermer que si on clique directement sur le backdrop, pas sur les enfants
              if (e.target === e.currentTarget) {
                closeCreateModal();
              }
            }}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--surface)',
                borderTopLeftRadius: 'var(--radius-xl)',
                borderTopRightRadius: 'var(--radius-xl)',
                width: '100%',
                maxHeight: '95vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Header fixe */}
              <div style={{
                padding: 'var(--space-lg)',
                paddingBottom: 'var(--space-md)',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>
                    Créer un devis
                  </h2>
                  <button
                    onClick={closeCreateModal}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '28px',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      padding: 0,
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)';
                      e.currentTarget.style.color = 'var(--text)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--muted)';
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Contenu scrollable */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'var(--space-lg)',
                paddingTop: 'var(--space-md)',
              }}>

                {createQuoteError && (
                  <div style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    marginBottom: 'var(--space-md)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    color: '#dc2626',
                    fontSize: '13px',
                  }}>
                    {createQuoteError}
                  </div>
                )}

                {/* Indicateur d'étapes */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-lg)', position: 'relative' }}>
                  {[1, 2, 3].map((step) => (
                    <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: currentStep >= step ? 'var(--accent)' : 'var(--bg-secondary)',
                        color: currentStep >= step ? 'white' : 'var(--muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '700',
                        zIndex: 2,
                      }}>
                        {currentStep > step ? '✓' : step}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        marginTop: '4px',
                        color: currentStep >= step ? 'var(--accent)' : 'var(--muted)',
                        fontWeight: currentStep === step ? '700' : '500',
                        textAlign: 'center',
                      }}>
                        {step === 1 ? 'Contexte' : step === 2 ? 'Prestations' : 'Planification'}
                      </div>
                      {step < 3 && (
                        <div style={{
                          position: 'absolute',
                          top: '16px',
                          left: '50%',
                          width: '100%',
                          height: '2px',
                          background: currentStep > step ? 'var(--accent)' : 'var(--bg-secondary)',
                          zIndex: 1,
                        }} />
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {/* Étape 1 : Contexte */}
                  {currentStep === 1 && creationDraft && (
                    <>
                      {/* Recherche client/prospect - EN PREMIER */}
                      <div>
                        <label style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: '5px', 
                          fontSize: '10px', 
                          fontWeight: '600', 
                          color: 'var(--muted)', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.5px' 
                        }}>
                          <Search size={12} />
                          Client / Prospect *
                        </label>
                        <ClientLeadSearch
                          clients={clients}
                          leads={leads}
                          value={creationDraft.clientId}
                          onChange={(value) => {
                            if (!value) {
                              setCreationDraft((draft) => draft ? ({ ...draft, clientId: '' }) : null);
                              setSelectedLeadId(null);
                              setSelectedClientOrLeadType(null);
                            } else {
                              setCreationDraft((draft) => draft ? ({ ...draft, clientId: value }) : null);
                            }
                          }}
                          onSelect={handleClientOrLeadSelect}
                          placeholder="Rechercher un client ou un prospect..."
                          required={!creationDraft.clientId}
                        />
                      </div>

                      {/* Entreprise rattachée */}
                      <div>
                        <label style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: '5px', 
                          fontSize: '10px', 
                          fontWeight: '600', 
                          color: 'var(--muted)', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.5px' 
                        }}>
                          <Building2 size={12} />
                          Entreprise *
                        </label>
                        <select
                          value={creationDraft.companyId || ''}
                          onChange={(e) => setCreationDraft((draft) => draft ? ({ ...draft, companyId: e.target.value }) : null)}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '13px',
                          }}
                        >
                          <option value="">Sélectionner une entreprise…</option>
                          {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                              {company.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Collaborateurs rattachés */}
                      <div>
                        <label style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: '5px', 
                          fontSize: '10px', 
                          fontWeight: '600', 
                          color: 'var(--muted)', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.5px' 
                        }}>
                          <Users size={12} />
                          Collaborateurs
                        </label>
                        {(() => {
                          const selectedCompanyId = creationDraft?.companyId || '';
                          const teamMembers = selectedCompanyId
                            ? projectMembers.filter((member) => member.companyId === selectedCompanyId)
                            : [];
                          
                          if (!selectedCompanyId) {
                            return (
                              <div style={{
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-md)',
                                border: '1.5px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: 'var(--muted)',
                                fontSize: '12px',
                              }}>
                                <Info size={14} />
                                <span>Sélectionnez d'abord une entreprise</span>
                              </div>
                            );
                          }
                          
                          if (teamMembers.length === 0) {
                            return (
                              <div style={{
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-md)',
                                border: '1.5px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: 'var(--muted)',
                                fontSize: '12px',
                              }}>
                                <Users size={14} />
                                <span>Aucun membre d'équipe</span>
                              </div>
                            );
                          }
                          
                          return (
                            <div style={{
                              maxHeight: '120px',
                              overflowY: 'auto',
                              borderRadius: 'var(--radius-md)',
                              border: '1.5px solid var(--border)',
                              background: 'var(--surface)',
                              padding: '6px',
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {teamMembers.map((member) => {
                                  const isSelected = (creationDraft?.assignedUserIds || []).includes(member.id);
                                  return (
                                    <label
                                      key={member.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                        border: isSelected ? '1.5px solid var(--accent)' : '1px solid transparent',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          const currentIds = creationDraft?.assignedUserIds || [];
                                          const newIds = e.target.checked
                                            ? [...currentIds, member.id]
                                            : currentIds.filter((id) => id !== member.id);
                                          setCreationDraft((draft) => draft ? ({ ...draft, assignedUserIds: newIds }) : null);
                                        }}
                                        style={{
                                          width: '14px',
                                          height: '14px',
                                          accentColor: 'var(--accent)',
                                        }}
                                      />
                                      <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text)' }}>
                                        {member.firstName} {member.lastName}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                        {(creationDraft?.assignedUserIds || []).length > 0 && (
                          <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px' }}>
                            {(creationDraft?.assignedUserIds || []).length} sélectionné{(creationDraft?.assignedUserIds || []).length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>

                      {/* Nom du devis */}
                      <div>
                        <label style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: '5px', 
                          fontSize: '10px', 
                          fontWeight: '600', 
                          color: 'var(--muted)', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.5px' 
                        }}>
                          <FileText size={12} />
                          Nom du devis
                        </label>
                        <input
                          type="text"
                          value={creationDraft?.quoteName || ''}
                          onChange={(e) => setCreationDraft((draft) => draft ? ({ ...draft, quoteName: e.target.value }) : null)}
                          placeholder="Ex: Nettoyage bureau..."
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '13px',
                          }}
                        />
                      </div>

                      {/* Fiche de renseignement client/prospect */}
                      {creationDraft?.clientId && (() => {
                        const selectedClientId = creationDraft.clientId;
                        const client = clientsById.get(selectedClientId);
                        if (!client) return null;

                        // Déterminer le type réel
                        const clientInList = clients.find(c => c.id === client.id);
                        const actualType = clientInList ? 'client' : (selectedLeadId ? 'lead' : 'client');
                        
                        const primaryContact = client.contacts?.find((c) => c.active && c.isBillingDefault) 
                          || client.contacts?.find((c) => c.active) 
                          || null;

                        const clientEngagements = engagements.filter(eng => eng.clientId === selectedClientId);
                        const clientQuotes = clientEngagements.filter(eng => eng.kind === 'devis');
                        const clientServices = clientEngagements.filter(eng => eng.kind !== 'devis');

                        return (
                          <div style={{
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--border)',
                            background: 'var(--surface)',
                            padding: '10px',
                            marginTop: '8px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {actualType === 'lead' ? (
                                  <UserPlus size={12} style={{ color: '#9333ea' }} />
                                ) : (
                                  <Users size={12} style={{ color: '#2563eb' }} />
                                )}
                                <h3 style={{ margin: 0, fontSize: '11px', fontWeight: '700', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {actualType === 'lead' ? 'Prospect' : 'Client'}
                                </h3>
                              </div>
                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '9px',
                                  fontWeight: '600',
                                  background: (client.status === 'Actif' || client.status === 'Prospect') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                                  color: (client.status === 'Actif' || client.status === 'Prospect') ? '#10b981' : '#f97316',
                                }}>
                                  {client.status === 'Prospect' ? 'Actif' : client.status}
                                </span>
                                <span style={{ fontSize: '9px', color: 'var(--muted)' }}>
                                  {client.type === 'company' ? 'Pro' : 'Part'}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {/* Nom */}
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                                {client.name || client.companyName || '—'}
                              </p>

                              {/* Contact compact */}
                              {(primaryContact || client.email || client.phone) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  {primaryContact && (
                                    <p style={{ margin: 0, fontSize: '11px', fontWeight: '600', color: 'var(--text)' }}>
                                      {primaryContact.firstName} {primaryContact.lastName}
                                    </p>
                                  )}
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {(primaryContact?.email || client.email) && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Mail size={10} style={{ color: 'var(--muted)' }} />
                                        <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                                          {primaryContact?.email || client.email}
                                        </span>
                                      </div>
                                    )}
                                    {(primaryContact?.mobile || client.phone) && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Phone size={10} style={{ color: 'var(--muted)' }} />
                                        <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                                          {primaryContact?.mobile || client.phone}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Statistiques compactes */}
                              <div style={{ display: 'flex', gap: '12px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                                <div>
                                  <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Devis: </span>
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)' }}>
                                    {clientQuotes.length}
                                  </span>
                                </div>
                                <div>
                                  <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Services: </span>
                                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)' }}>
                                    {clientServices.length}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {/* Étape 2 : Prestations */}
                  {currentStep === 2 && (() => {
                    const step2SelectedService = services.find((s) => s.id === step2SelectedServiceId);
                    return (
                      <>
                        {/* Liste des prestations sélectionnées */}
                        {selectedServices.length > 0 && (
                          <div>
                            <label style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginBottom: '6px', 
                              fontSize: '10px', 
                              fontWeight: '600', 
                              color: 'var(--muted)', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.5px' 
                            }}>
                              Prestations sélectionnées ({selectedServices.length})
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                              {selectedServices.map((serviceItem, index) => {
                                const service = servicesById.get(serviceItem.serviceId);
                                
                                // Récupérer la catégorie principale et la sous-catégorie
                                const mainCategory = serviceItem.mainCategoryId
                                  ? categories.find((cat) => cat.id === serviceItem.mainCategoryId)
                                  : null;
                                const subCategory = serviceItem.subCategoryId
                                  ? categories.find((cat) => cat.id === serviceItem.subCategoryId)
                                  : null;
                                
                                // Calculer le prix et la durée de la prestation (même logique que desktop)
                                let servicePrice = 0;
                                let serviceDuration = 0;
                                
                                if (service) {
                                  // Prix : priorité au base_price
                                  if ((service as any).base_price !== undefined && (service as any).base_price !== null) {
                                    servicePrice = (service as any).base_price;
                                  } else if (service.options && Array.isArray(service.options) && serviceItem.optionIds.length > 0) {
                                    // Sinon, calculer depuis les options sélectionnées
                                    servicePrice = service.options
                                      .filter(opt => serviceItem.optionIds.includes(opt.id))
                                      .reduce((sum, opt) => {
                                        const override = serviceItem.optionOverrides[opt.id];
                                        const price = override?.unitPriceHT ?? opt.unitPriceHT;
                                        const qty = override?.quantity ?? 1;
                                        return sum + (price * qty);
                                      }, 0);
                                  }
                                  
                                  // Durée : priorité au base_duration
                                  if ((service as any).base_duration !== undefined && (service as any).base_duration !== null) {
                                    serviceDuration = (service as any).base_duration;
                                  } else if (service.options && Array.isArray(service.options) && serviceItem.optionIds.length > 0) {
                                    // Sinon, calculer depuis les options sélectionnées
                                    serviceDuration = service.options
                                      .filter(opt => serviceItem.optionIds.includes(opt.id))
                                      .reduce((sum, opt) => {
                                        const override = serviceItem.optionOverrides[opt.id];
                                        const duration = override?.durationMin ?? opt.defaultDurationMin ?? 0;
                                        const qty = override?.quantity ?? 1;
                                        return sum + (duration * qty);
                                      }, 0);
                                  }
                                }
                                
                                // Ajouter le prix et la durée de la sous-catégorie si elle existe
                                const subCategoryPrice = subCategory?.priceHT || 0;
                                const subCategoryDuration = (subCategory as any)?.defaultDurationMin || 0;
                                
                                // Calculer les totaux (service + sous-catégorie) multipliés par la quantité
                                const serviceQuantity = serviceItem.quantity ?? 1;
                                const totalPrice = (servicePrice + subCategoryPrice) * serviceQuantity;
                                const totalDuration = (serviceDuration + subCategoryDuration) * serviceQuantity;
                                
                                return (
                                  <div
                                    key={index}
                                    style={{
                                      padding: '12px',
                                      background: '#f8fafc',
                                      borderRadius: '8px',
                                      border: '1px solid #e2e8f0',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px',
                                    }}
                                  >
                                    {/* En-tête avec nom du service et bouton supprimer */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                                          {service?.name || 'Service inconnu'}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveServiceFromStep2(index)}
                                        style={{
                                          padding: '6px 10px',
                                          background: 'transparent',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: '6px',
                                          color: '#ef4444',
                                          cursor: 'pointer',
                                          fontSize: '14px',
                                          fontWeight: '600',
                                          flexShrink: 0,
                                          minWidth: '32px',
                                          height: '32px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        ×
                                      </button>
                                    </div>

                                    {/* Catégories */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                      {mainCategory && (
                                        <div style={{
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          background: 'rgba(37, 99, 235, 0.1)',
                                          border: '1px solid rgba(37, 99, 235, 0.2)',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          color: '#2563eb',
                                        }}>
                                          {mainCategory.name}
                                        </div>
                                      )}
                                      {subCategory && (
                                        <div style={{
                                          padding: '4px 8px',
                                          borderRadius: '4px',
                                          background: 'rgba(147, 51, 234, 0.1)',
                                          border: '1px solid rgba(147, 51, 234, 0.2)',
                                          fontSize: '11px',
                                          fontWeight: '600',
                                          color: '#9333ea',
                                        }}>
                                          {subCategory.name}
                                        </div>
                                      )}
                                    </div>

                                    {/* Support */}
                                    {serviceItem.supportDetail && (
                                      <div style={{
                                        padding: '8px',
                                        background: 'white',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                      }}>
                                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                                          Support
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#0f172a' }}>
                                          {serviceItem.supportDetail}
                                        </div>
                                      </div>
                                    )}

                                    {/* Description */}
                                    {service?.description && (
                                      <div style={{
                                        padding: '8px',
                                        background: 'white',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                      }}>
                                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                                          Description
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                                          {service.description}
                                        </div>
                                      </div>
                                    )}

                                    {/* Prix et Durée */}
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '10px',
                                      background: 'white',
                                      borderRadius: '6px',
                                      border: '1px solid #e2e8f0',
                                    }}>
                                      <div>
                                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', marginBottom: '2px', textTransform: 'uppercase' }}>
                                          Prix
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                                          {formatCurrency(totalPrice)}
                                        </div>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', marginBottom: '2px', textTransform: 'uppercase' }}>
                                          Durée
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                                          {formatDuration(totalDuration)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Sélection de prestation */}
                        <div>
                          <label style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginBottom: '5px', 
                            fontSize: '10px', 
                            fontWeight: '600', 
                            color: 'var(--muted)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px' 
                          }}>
                            Catégorie
                          </label>
                          <select
                            value={step2SelectedCategory || ''}
                            onChange={(e) => {
                              const categoryName = e.target.value;
                              setStep2SelectedCategory(categoryName);
                              // Réinitialiser la sous-catégorie et le service quand on change de catégorie principale
                              setStep2SelectedSubCategoryId('');
                              setStep2SelectedServiceId('');
                              setStep2SelectedOptionIds([]);
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-md)',
                              border: '1.5px solid var(--border)',
                              background: 'var(--surface)',
                              color: 'var(--text)',
                              fontSize: '13px',
                            }}
                          >
                            <option value="">Sélectionner une catégorie</option>
                            {categories && Array.isArray(categories) && categories.length > 0 ? (
                              categories
                                .filter((cat) => cat.active !== false && !cat.parentId)
                                .map((category) => (
                                  <option key={category.id} value={category.name}>
                                    {category.name}
                                  </option>
                                ))
                            ) : (
                              <option value="" disabled>Aucune catégorie disponible</option>
                            )}
                          </select>
                        </div>

                        {/* Sélecteur de sous-catégorie - Affiché uniquement si une catégorie principale est sélectionnée */}
                        {step2SelectedCategory && (() => {
                          const selectedMainCategory = categories.find((cat) => cat.name === step2SelectedCategory && !cat.parentId);
                          const subCategories = selectedMainCategory 
                            ? categories.filter((cat) => cat.active !== false && cat.parentId === selectedMainCategory.id)
                            : [];
                          
                          if (subCategories.length > 0) {
                            return (
                              <div>
                                <label style={{ 
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginBottom: '5px', 
                                  fontSize: '10px', 
                                  fontWeight: '600', 
                                  color: 'var(--muted)', 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '0.5px' 
                                }}>
                                  Sous-catégorie
                                </label>
                                <select
                                  value={step2SelectedSubCategoryId}
                                  onChange={(e) => {
                                    setStep2SelectedSubCategoryId(e.target.value);
                                    // Réinitialiser le service quand on change de sous-catégorie
                                    setStep2SelectedServiceId('');
                                    setStep2SelectedOptionIds([]);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1.5px solid var(--border)',
                                    background: 'var(--surface)',
                                    color: 'var(--text)',
                                    fontSize: '13px',
                                  }}
                                >
                                  <option value="">Toutes les sous-catégories</option>
                                  {subCategories.map((subCategory) => (
                                    <option key={subCategory.id} value={subCategory.id}>
                                      {subCategory.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        <div>
                          <label style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginBottom: '5px', 
                            fontSize: '10px', 
                            fontWeight: '600', 
                            color: 'var(--muted)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px' 
                          }}>
                            Produits et services
                          </label>
                          <select
                            value={step2SelectedServiceId}
                            onChange={(e) => {
                              const service = services.find((s) => s.id === e.target.value);
                              if (service) {
                                setStep2SelectedServiceId(e.target.value);
                                const activeOptionIds = service.options
                                  .filter(opt => opt.active)
                                  .map(opt => opt.id);
                                setStep2SelectedOptionIds(activeOptionIds);
                              } else {
                                setStep2SelectedServiceId(e.target.value);
                                setStep2SelectedOptionIds([]);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-md)',
                              border: '1.5px solid var(--border)',
                              background: 'var(--surface)',
                              color: 'var(--text)',
                              fontSize: '13px',
                            }}
                          >
                            <option value="">Sélectionner une prestation</option>
                            {services && Array.isArray(services) && categories && Array.isArray(categories) && services.length > 0 ? (
                              (() => {
                                // Utiliser la même logique que la version desktop
                                if (!step2SelectedCategory) {
                                  // Si aucune catégorie n'est sélectionnée, afficher tous les services actifs
                                  const allActiveServices = services.filter((s) => s.active !== false);
                                  return allActiveServices.length > 0 ? (
                                    allActiveServices.map((service) => (
                                      <option key={service.id} value={service.id}>
                                        {service.name}
                                      </option>
                                    ))
                                  ) : (
                                    <option value="" disabled>Aucune prestation disponible</option>
                                  );
                                }
                                
                                const selectedMainCategory = categories.find((cat) => cat.name === step2SelectedCategory && !cat.parentId);
                                if (!selectedMainCategory) {
                                  return <option value="" disabled>Aucune prestation disponible</option>;
                                }
                                
                                // Fonction pour trouver la catégorie principale d'un service (même logique que desktop)
                                const getServiceMainCategory = (service: typeof services[0]): typeof categories[0] | null => {
                                  if (!service.category) return null;
                                  
                                  const serviceCategoryLower = service.category.toLowerCase().trim();
                                  
                                  // Chercher si le service correspond directement à une catégorie principale
                                  const directMatch = categories.find(
                                    (cat) => !cat.parentId && cat.name.toLowerCase().trim() === serviceCategoryLower
                                  );
                                  if (directMatch) return directMatch;
                                  
                                  // Chercher si le service correspond à une sous-catégorie
                                  const subCategoryMatch = categories.find(
                                    (cat) => cat.parentId && cat.name.toLowerCase().trim() === serviceCategoryLower
                                  );
                                  if (subCategoryMatch && subCategoryMatch.parentId) {
                                    // Trouver la catégorie principale parente
                                    const mainCategory = categories.find((cat) => cat.id === subCategoryMatch.parentId);
                                    return mainCategory || null;
                                  }
                                  
                                  return null;
                                };
                                
                                // Filtrer les services par catégorie principale uniquement
                                // La sous-catégorie est un contexte complémentaire qui ne filtre PAS les prestations
                                const filteredServices = services.filter((s) => {
                                  if (!s.active) return false;
                                  
                                  // Trouver la catégorie principale du service
                                  const serviceMainCategory = getServiceMainCategory(s);
                                  
                                  // Si le service n'a pas de catégorie principale, ne pas l'afficher
                                  if (!serviceMainCategory) return false;
                                  
                                  // Le service doit appartenir à la catégorie principale sélectionnée
                                  return serviceMainCategory.id === selectedMainCategory.id;
                                });
                                
                                return filteredServices.length > 0 ? (
                                  filteredServices.map((service) => (
                                    <option key={service.id} value={service.id}>
                                      {service.name}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>Aucune prestation disponible dans cette catégorie</option>
                                );
                              })()
                            ) : (
                              <option value="" disabled>Aucune prestation disponible</option>
                            )}
                          </select>
                        </div>

                        {step2SelectedService && (
                          <div>
                            <label style={{ 
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginBottom: '5px', 
                              fontSize: '10px', 
                              fontWeight: '600', 
                              color: 'var(--muted)', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.5px' 
                            }}>
                              Détail du support
                            </label>
                            <input
                              type="text"
                              value={step2SupportDetail}
                              onChange={(e) => setStep2SupportDetail(e.target.value)}
                              placeholder="Ex: Modèle, dimensions, couleur, état..."
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1.5px solid var(--border)',
                                background: 'var(--surface)',
                                color: 'var(--text)',
                                fontSize: '13px',
                              }}
                            />
                          </div>
                        )}

                        {step2SelectedService && (
                          <button
                            type="button"
                            onClick={handleAddServiceToStep2}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              background: 'var(--accent)',
                              color: 'white',
                              border: 'none',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <Plus size={16} />
                            Ajouter cette prestation
                          </button>
                        )}
                      </>
                    );
                  })()}

                  {/* Étape 3 : Planification */}
                  {currentStep === 3 && creationDraft && (
                    <>
                      <div>
                        <label style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '8px', 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          color: 'var(--muted)', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.5px' 
                        }}>
                          Date d'intervention
                        </label>
                        <input
                          type="date"
                          value={creationDraft.scheduledAt || ''}
                          onChange={(e) => setCreationDraft((draft) => draft ? ({ ...draft, scheduledAt: e.target.value }) : null)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '14px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '8px', 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          color: 'var(--muted)', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.5px' 
                        }}>
                          Heure de début
                        </label>
                        <input
                          type="time"
                          value={creationDraft.startTime || ''}
                          onChange={(e) => setCreationDraft((draft) => draft ? ({ ...draft, startTime: e.target.value }) : null)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text)',
                            fontSize: '14px',
                          }}
                        />
                      </div>

                      {(creationDraft?.assignedUserIds || []).length > 0 && (
                        <div>
                          <label style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '8px', 
                            fontSize: '11px', 
                            fontWeight: '600', 
                            color: 'var(--muted)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px' 
                          }}>
                            <Users size={14} />
                            Intervenants assignés
                          </label>
                          <div style={{
                            padding: '12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--border)',
                            background: 'var(--bg-secondary)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                          }}>
                            {(creationDraft?.assignedUserIds || []).map((userId) => {
                              const user = authUsers.find(u => u.id === userId);
                              if (!user) return null;
                              return (
                                <span
                                  key={userId}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    background: 'var(--accent)',
                                    color: 'white',
                                  }}
                                >
                                  {user.profile.firstName} {user.profile.lastName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Footer fixe avec boutons */}
              <div style={{
                padding: 'var(--space-lg)',
                paddingTop: 'var(--space-md)',
                borderTop: '1px solid var(--border)',
                background: 'var(--surface)',
                position: 'sticky',
                bottom: 0,
                zIndex: 10,
                flexShrink: 0,
                boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
              }}>
                <form onSubmit={currentStep === 3 ? handleCreateQuote : (e) => { e.preventDefault(); nextStep(); }}>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    {currentStep > 1 ? (
                      <button
                        type="button"
                        onClick={previousStep}
                        style={{
                          flex: 1,
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <ChevronLeft size={18} />
                        Précédent
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={closeCreateModal}
                        style={{
                          flex: 1,
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Annuler
                      </button>
                    )}
                    {currentStep < 3 ? (
                      <button
                        type="submit"
                        style={{
                          flex: 1,
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          background: 'var(--accent)',
                          color: 'white',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        Suivant
                        <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        style={{
                          flex: 1,
                          padding: '14px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: 'none',
                          background: 'var(--accent)',
                          color: 'white',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Créer le devis
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileDevisPage;
