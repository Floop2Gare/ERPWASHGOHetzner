import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, addDays, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  PlayArrow, 
  CalendarToday,
  AccessTime,
  CheckCircle,
  Receipt,
  DateRange,
  Today,
  Add,
  Person,
  Phone,
  Email,
  LocationOn,
  Description,
  Info,
  AttachMoney,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { useAppData } from '../../store/useAppData';
import type { Engagement, Client, Service, ServiceCategory, SupportType, Company, CommercialDocumentStatus } from '../../store/useAppData';
import { formatCurrency, formatDuration } from '../../lib/format';
import { buildPreviewEngagement, getNextInvoiceNumber } from '../service/utils';
import type { EngagementDraft } from '../service/types';
import ServiceTimer from '../../components/mobile/ServiceTimer';
import CreateInvoiceFromService from '../../components/mobile/CreateInvoiceFromService';
import { requestNotificationPermission } from '../../utils/notifications';
import { AppointmentService, ServiceService, CategoryService, ProjectMemberService, ClientService } from '../../api';
import { useEntityMaps } from '../../hooks/useEntityMaps';
import '../mobile.css';
import '../../styles/apple-mobile.css';

const MobilePrestationsPage: React.FC = () => {
  console.log('🔵 [MobilePrestationsPage] RENDER', {
    timestamp: new Date().toISOString(),
    stack: new Error().stack?.split('\n').slice(1, 3).join('\n')
  });
  
  const navigate = useNavigate();
  const {
    engagements: allEngagements,
    clients,
    services,
    categories,
    companies,
    currentUserId,
    projectMembers,
    addEngagement,
    updateEngagement,
    computeEngagementTotals,
  } = useAppData();
  
  console.log('🔵 [MobilePrestationsPage] État', {
    engagementsCount: allEngagements.length,
    clientsCount: clients.length,
    servicesCount: services.length,
    categoriesCount: categories.length,
    projectMembersCount: projectMembers.length,
    currentUserId
  });
  
  const clientsById = useEntityMaps(clients);
  const servicesById = useEntityMaps(services);
  
  // Déclarer activeCompanyId avant son utilisation
  const activeCompanyId = useAppData((state) => state.activeCompanyId);
  
  // Créer un mapping entre les IDs de projectMembers et leurs profileIds
  const memberIdToProfileId = useMemo(() => {
    const map = new Map<string, string>();
    projectMembers.forEach((member) => {
      if (member.profileId) {
        map.set(member.id, member.profileId);
      }
    });
    return map;
  }, [projectMembers]);
  
  // Créer une map des IDs de projectMembers pour vérification rapide
  const memberIdsSet = useMemo(() => {
    return new Set(projectMembers.map(m => m.id));
  }, [projectMembers]);
  
  // Récupérer le companyId de l'utilisateur connecté
  const getCurrentUser = useAppData((state) => state.getCurrentUser);
  const currentUserCompanyId = useMemo(() => {
    const currentUser = getCurrentUser();
    return currentUser?.companyId || activeCompanyId;
  }, [activeCompanyId, getCurrentUser]);

  // Filtrer les services réalisés, services planifiés ET les devis planifiés assignés au collaborateur
  // Utiliser useMemo pour éviter de recréer le tableau à chaque render
  const engagements = useMemo(() => {
    // Fonction helper pour vérifier si un engagement est assigné au collaborateur connecté
    const isAssignedToCurrentUser = (e: Engagement): boolean => {
      if (!currentUserId || !e.assignedUserIds || e.assignedUserIds.length === 0) return false;
      
      return e.assignedUserIds.some((assignedId) => {
        // Cas 1: assignedId est directement l'ID de l'utilisateur
        if (assignedId === currentUserId) {
          return true;
        }
        // Cas 2: assignedId est l'ID d'un projectMember, vérifier si son profileId correspond
        const profileId = memberIdToProfileId.get(assignedId);
        if (profileId === currentUserId) {
          return true;
        }
        // Cas 3: assignedId est un ID de projectMember existant (accepté si le member existe)
        // Cela permet de fonctionner même si le projectMember n'a pas de profileId
        if (memberIdsSet.has(assignedId)) {
          return true;
        }
        return false;
      });
    };

    // Fonction helper pour vérifier si un devis planifié est visible pour l'utilisateur connecté
    const isPlannedQuoteVisible = (e: Engagement): boolean => {
      // Si le devis n'est pas planifié, il est visible pour toute l'équipe de la même entreprise
      if (e.status !== 'planifié') {
        // Vérifier que le devis appartient à la même entreprise
        return e.companyId === currentUserCompanyId;
      }
      
      // Si le devis est planifié, il doit avoir un collaborateur assigné
      if (!e.assignedUserIds || e.assignedUserIds.length === 0) {
        return false;
      }
      
      // Vérifier que le collaborateur assigné appartient à la même entreprise que l'utilisateur connecté
      const assignedMemberId = e.assignedUserIds[0];
      const assignedMember = projectMembers.find(m => m.id === assignedMemberId);
      
      if (!assignedMember) {
        // Si le collaborateur n'est pas trouvé, vérifier par profileId
        const profileId = memberIdToProfileId.get(assignedMemberId);
        if (profileId === currentUserId) {
          return true;
        }
        return false;
      }
      
      // Le devis est visible uniquement si le collaborateur assigné a le même companyId que l'utilisateur connecté
      return assignedMember.companyId === currentUserCompanyId;
    };

    return allEngagements.filter((e) => {
      // Services réalisés assignés au collaborateur connecté
      if (e.kind === 'service' && e.status === 'réalisé') {
        return isAssignedToCurrentUser(e);
      }
      
      // Services planifiés assignés au collaborateur connecté
      if (e.kind === 'service' && e.status === 'planifié') {
        if (!e.scheduledAt) return false;
        return isAssignedToCurrentUser(e);
      }
      
      // Devis planifiés ou brouillons
      // IMPORTANT: Un devis doit avoir une date planifiée (scheduledAt) pour apparaître dans le calendrier
      // Exclure les devis terminés (acceptés ou refusés) du planning
      if (e.kind === 'devis' && (e.status === 'planifié' || e.status === 'brouillon')) {
        // Exclure les devis terminés (acceptés ou refusés)
        if (e.quoteStatus === 'accepté' || e.quoteStatus === 'refusé') {
          return false;
        }
        // Vérifier que le devis a une date planifiée
        if (!e.scheduledAt) return false;
        
        // Si le devis est planifié, utiliser la logique de filtrage par entreprise du collaborateur
        if (e.status === 'planifié') {
          return isPlannedQuoteVisible(e);
        }
        
        // Si le devis n'est pas planifié (brouillon), il est visible pour toute l'équipe de la même entreprise
        return e.companyId === currentUserCompanyId;
      }
      
      return false;
    });
  }, [allEngagements, currentUserId, memberIdToProfileId, memberIdsSet, projectMembers, currentUserCompanyId]);
  
  // Debug désactivé pour éviter les re-renders multiples
  // Réactiver uniquement si nécessaire pour le debug
  // React.useEffect(() => {
  //   // Debug code removed to prevent infinite re-renders
  // }, [allEngagements, currentUserId, engagements.length, memberIdToProfileId, projectMembers]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTimer, setActiveTimer] = useState<Engagement | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState<Engagement | null>(null);
  // État pour gérer la sélection de prestation pour les devis multiples
  const [showServiceSelectionModal, setShowServiceSelectionModal] = useState<Engagement | null>(null);
  // État pour suivre les prestations terminées d'un devis (Map<quoteId, Map<serviceIndex, {duration, comment}>>)
  const [completedServicesForQuote, setCompletedServicesForQuote] = useState<Map<string, Map<number, { duration: number; comment?: string }>>>(new Map());
  // État pour proposer la prestation suivante
  const [showNextServicePrompt, setShowNextServicePrompt] = useState<{ engagement: Engagement; nextIndex: number } | null>(null);
  // État pour le commentaire global à la fin
  const [showGlobalCommentModal, setShowGlobalCommentModal] = useState<{ engagement: Engagement; completedServices: Map<number, { duration: number; comment?: string; majoration?: number; pourboire?: number }> } | null>(null);
  const [globalComment, setGlobalComment] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedEngagementId, setExpandedEngagementId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, { devis: boolean; client: boolean; prestation: boolean; collaborateur: boolean }>>({});
  
  // États pour le chargement des données
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const servicesLoadedRef = useRef(false);
  const categoriesLoadedRef = useRef(false);
  const clientsLoadedRef = useRef(false);

  // Fonction pour charger les services
  const loadServices = React.useCallback(async () => {
    console.log('🔵 [MobilePrestations] loadServices appelé', {
      loadingServices,
      servicesLoadedRef: servicesLoadedRef.current,
      currentServicesCount: useAppData.getState().services?.length || 0,
      __servicesLoaded: (window as any).__servicesLoaded,
      __loadingServices: (window as any).__loadingServices
    });
    
    // Protection globale
    if ((window as any).__servicesLoaded || (window as any).__loadingServices) {
      console.log('⚠️ [MobilePrestations] loadServices IGNORÉ (chargement global en cours ou terminé)');
      return;
    }
    
    if (loadingServices || servicesLoadedRef.current) {
      console.log('⚠️ [MobilePrestations] loadServices IGNORÉ (déjà en cours ou chargé)');
      return;
    }
    
    const currentServices = useAppData.getState().services || [];
    if (currentServices.length > 0) {
      console.log('🟢 [MobilePrestations] Services DÉJÀ DANS LE STORE', { count: currentServices.length });
      servicesLoadedRef.current = true;
      (window as any).__servicesLoaded = true;
      return;
    }

    console.log('🔴 [MobilePrestations] DÉMARRAGE CHARGEMENT SERVICES');
    (window as any).__loadingServices = true;
    servicesLoadedRef.current = true;
    setLoadingServices(true);

    try {
      console.log('📡 [MobilePrestations] Appel API ServiceService.getServices()');
      const result = await ServiceService.getServices();
      console.log('📥 [MobilePrestations] Réponse services reçue', { success: result.success, count: result.data?.length || 0 });
      
      if (result.success && Array.isArray(result.data)) {
        (useAppData as any).setState({ services: result.data });
        (window as any).__servicesLoaded = true;
      } else if (!result.success) {
        console.error('[MobilePrestations] ❌ Erreur lors du chargement des services:', result.error);
        servicesLoadedRef.current = false;
        (window as any).__servicesLoaded = false;
      }
    } catch (error: any) {
      console.error('[MobilePrestations] ❌ Erreur lors du chargement des services:', error);
      servicesLoadedRef.current = false;
      (window as any).__servicesLoaded = false;
    } finally {
      setLoadingServices(false);
      (window as any).__loadingServices = false;
    }
  }, [loadingServices]);

  // Fonction pour charger les catégories
  const loadCategories = React.useCallback(async () => {
    console.log('🔵 [MobilePrestations] loadCategories appelé', {
      activeCompanyId,
      loadingCategories,
      categoriesLoadedRef: categoriesLoadedRef.current,
      currentCategoriesCount: useAppData.getState().categories?.length || 0,
      __categoriesLoaded: (window as any).__categoriesLoaded,
      __loadingCategories: (window as any).__loadingCategories
    });
    
    // Protection globale
    if ((window as any).__categoriesLoaded || (window as any).__loadingCategories) {
      console.log('⚠️ [MobilePrestations] loadCategories IGNORÉ (chargement global en cours ou terminé)');
      return;
    }
    
    if (!activeCompanyId || loadingCategories || categoriesLoadedRef.current) {
      console.log('⚠️ [MobilePrestations] loadCategories IGNORÉ', {
        reason: !activeCompanyId ? 'pas d\'activeCompanyId' : loadingCategories ? 'en cours' : 'déjà chargé'
      });
      return;
    }
    
    const currentCategories = useAppData.getState().categories || [];
    if (currentCategories.length > 0) {
      console.log('🟢 [MobilePrestations] Catégories DÉJÀ DANS LE STORE', { count: currentCategories.length });
      categoriesLoadedRef.current = true;
      (window as any).__categoriesLoaded = true;
      return;
    }

    console.log('🔴 [MobilePrestations] DÉMARRAGE CHARGEMENT CATÉGORIES');
    (window as any).__loadingCategories = true;
    categoriesLoadedRef.current = true;
    setLoadingCategories(true);

    try {
      console.log('📡 [MobilePrestations] Appel API CategoryService.getCategories()');
      const result = await CategoryService.getCategories();
      console.log('📥 [MobilePrestations] Réponse catégories reçue', { success: result.success, count: result.data?.length || 0 });
      
      if (result.success && Array.isArray(result.data)) {
        (useAppData as any).setState({ categories: result.data });
        (window as any).__categoriesLoaded = true;
      } else if (!result.success) {
        console.error('[MobilePrestations] ❌ Erreur lors du chargement des catégories:', result.error);
        categoriesLoadedRef.current = false;
        (window as any).__categoriesLoaded = false;
      }
    } catch (error: any) {
      console.error('[MobilePrestations] ❌ Erreur lors du chargement des catégories:', error);
      categoriesLoadedRef.current = false;
      (window as any).__categoriesLoaded = false;
    } finally {
      setLoadingCategories(false);
      (window as any).__loadingCategories = false;
    }
  }, [activeCompanyId, loadingCategories]);

  // Fonction pour charger les clients
  const loadClients = React.useCallback(async () => {
    console.log('🔵 [MobilePrestations] loadClients appelé', {
      loadingClients,
      clientsLoadedRef: clientsLoadedRef.current,
      currentClientsCount: useAppData.getState().clients?.length || 0,
      __mobileClientsLoaded: (window as any).__mobileClientsLoaded,
      __loadingClients: (window as any).__loadingClients
    });
    
    // Vérifier d'abord si les clients sont déjà chargés dans le store
    const currentClients = useAppData.getState().clients || [];
    if (currentClients.length > 0) {
      console.log('🟢 [MobilePrestations] Clients DÉJÀ DANS LE STORE', { count: currentClients.length });
      clientsLoadedRef.current = true;
      return;
    }
    
    // Protection globale
    if ((window as any).__mobileClientsLoaded || (window as any).__loadingClients) {
      console.log('⚠️ [MobilePrestations] loadClients IGNORÉ (chargement global en cours ou terminé)');
      return;
    }
    
    // Éviter les appels multiples simultanés
    if (loadingClients || clientsLoadedRef.current) {
      console.log('⚠️ [MobilePrestations] loadClients IGNORÉ (déjà en cours ou chargé)');
      return;
    }

    console.log('🔴 [MobilePrestations] DÉMARRAGE CHARGEMENT CLIENTS');
    clientsLoadedRef.current = true;
    (window as any).__loadingClients = true;
    setLoadingClients(true);

    try {
      console.log('📡 [MobilePrestations] Appel API ClientService.getAll()');
      const result = await ClientService.getAll();
      console.log('📥 [MobilePrestations] Réponse clients reçue', { success: result.success, count: result.data?.length || 0 });
      
      if (result.success && Array.isArray(result.data)) {
        const mapped: Client[] = result.data.map((c: any) => ({
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
      } else if (!result.success) {
        console.error('[MobilePrestations] ❌ Erreur lors du chargement des clients:', result.error);
        clientsLoadedRef.current = false;
      }
    } catch (error: any) {
      console.error('[MobilePrestations] ❌ Erreur lors du chargement des clients:', error);
      clientsLoadedRef.current = false;
    } finally {
      setLoadingClients(false);
    }
  }, [loadingClients]);

  // Charger les services, catégories et clients au montage (nécessaires pour afficher les données)
  // Protection globale pour éviter les chargements multiples
  const hasInitializedDataRef = useRef(false);
  
  useEffect(() => {
    console.log('🔵 [MobilePrestations] useEffect services/catégories/clients déclenché', {
      activeCompanyId,
      hasInitializedDataRef: hasInitializedDataRef.current,
      servicesCount: useAppData.getState().services?.length || 0,
      categoriesCount: useAppData.getState().categories?.length || 0,
      clientsCount: useAppData.getState().clients?.length || 0,
      __servicesLoaded: (window as any).__servicesLoaded,
      __categoriesLoaded: (window as any).__categoriesLoaded,
      stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
    
    // Protection globale - ne charger qu'une seule fois pour toute l'application
    if (hasInitializedDataRef.current) {
      console.log('🟢 [MobilePrestations] Données DÉJÀ INITIALISÉES - IGNORÉ');
      return;
    }
    
    // Protection globale au niveau window
    if ((window as any).__mobilePrestationsDataInitialized) {
      console.log('🟢 [MobilePrestations] Données DÉJÀ INITIALISÉES (global) - IGNORÉ');
      hasInitializedDataRef.current = true;
      return;
    }
    
    console.log('🔴 [MobilePrestations] INITIALISATION DES DONNÉES');
    (window as any).__mobilePrestationsDataInitialized = true;
    hasInitializedDataRef.current = true;
    
    // Charger les services en PRIORITÉ
    const currentServices = useAppData.getState().services || [];
    if (currentServices.length === 0 && !(window as any).__servicesLoaded && !(window as any).__loadingServices) {
      console.log('🔴 [MobilePrestations] CHARGEMENT SERVICES');
      loadServices();
    } else {
      console.log('🟢 [MobilePrestations] Services DÉJÀ CHARGÉS', { count: currentServices.length });
    }
    
    // Charger les catégories - attendre activeCompanyId si nécessaire
    const currentCategories = useAppData.getState().categories || [];
    if (activeCompanyId && currentCategories.length === 0 && !(window as any).__categoriesLoaded && !(window as any).__loadingCategories) {
      console.log('🔴 [MobilePrestations] CHARGEMENT CATÉGORIES');
      loadCategories();
    } else if (!activeCompanyId) {
      console.log('🟡 [MobilePrestations] Attente activeCompanyId pour charger catégories');
      // Attendre un peu que activeCompanyId soit défini
      const timeout = setTimeout(() => {
        const newActiveCompanyId = useAppData.getState().activeCompanyId;
        const newCategories = useAppData.getState().categories || [];
        if (newActiveCompanyId && newCategories.length === 0 && !(window as any).__categoriesLoaded && !(window as any).__loadingCategories) {
          console.log('🔴 [MobilePrestations] CHARGEMENT CATÉGORIES (après timeout)');
          loadCategories();
        }
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      console.log('🟢 [MobilePrestations] Catégories DÉJÀ CHARGÉES', { count: currentCategories.length });
    }
    
    // Charger les clients
    const currentClients = useAppData.getState().clients || [];
    if (currentClients.length === 0 && !(window as any).__mobileClientsLoaded && !(window as any).__loadingClients) {
      console.log('🔴 [MobilePrestations] CHARGEMENT CLIENTS');
      loadClients();
    } else {
      console.log('🟢 [MobilePrestations] Clients DÉJÀ CHARGÉS', { count: currentClients.length });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Charger UNE SEULE FOIS au montage, pas à chaque changement de activeCompanyId

  // Calculer la semaine actuelle (mémorisé)
  const { weekStart, weekEnd, weekDays } = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    return { weekStart: start, weekEnd: end, weekDays: days };
  }, [selectedDate]);

  // Filtrer les engagements de la semaine assignés au collaborateur connecté
  // Services réalisés ET devis planifiés (mémorisé)
  const weekEngagements = useMemo(() => {
    return engagements.filter((eng) => {
      if (!eng.scheduledAt) return false;
      
      try {
        const engDate = parseISO(eng.scheduledAt);
        // Normaliser les dates pour comparer seulement les jours (sans heures)
        const engDateOnly = new Date(engDate.getFullYear(), engDate.getMonth(), engDate.getDate());
        const weekStartOnly = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        const weekEndOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
        
        const isInWeek = engDateOnly >= weekStartOnly && engDateOnly <= weekEndOnly;
        
        // Services réalisés : vérifier l'assignation
        if (eng.kind === 'service' && eng.status === 'réalisé') {
          if (currentUserId && eng.assignedUserIds && eng.assignedUserIds.length > 0) {
            // Vérifier si l'un des collaborateurs assignés correspond au profil de l'utilisateur connecté
            const isAssignedToUser = eng.assignedUserIds.some((assignedId) => {
              // Cas 1: assignedId est directement l'ID de l'utilisateur
              if (assignedId === currentUserId) {
                return true;
              }
              // Cas 2: assignedId est l'ID d'un projectMember, vérifier si son profileId correspond
              const profileId = memberIdToProfileId.get(assignedId);
              if (profileId === currentUserId) {
                return true;
              }
              return false;
            });
            return isInWeek && isAssignedToUser;
          }
          return false;
        }
        
        // Devis planifiés : déjà filtrés dans engagements (assignés au collaborateur)
        if (eng.kind === 'devis' && (eng.status === 'planifié' || eng.status === 'brouillon')) {
          return isInWeek;
        }
        
        return false;
      } catch (error) {
        console.error('[MobilePrestations] Erreur lors du parsing de la date:', eng.scheduledAt, error);
        return false;
      }
    });
  }, [engagements, weekStart, weekEnd, currentUserId, memberIdToProfileId]);

  useEffect(() => {
    // Demander la permission pour les notifications au chargement
    requestNotificationPermission();
  }, []);

  // Garde pour éviter les chargements multiples
  const hasLoadedEngagementsRef = useRef(false);
  const hasLoadedProjectMembersRef = useRef(false);
  
  // Charger les projectMembers depuis le backend au montage (une seule fois)
  useEffect(() => {
    console.log('🔵 [MobilePrestations] useEffect projectMembers déclenché', {
      hasLoadedProjectMembersRef: hasLoadedProjectMembersRef.current,
      __projectMembersLoaded: (window as any).__projectMembersLoaded,
      __loadingProjectMembers: (window as any).__loadingProjectMembers,
      projectMembersCount: projectMembers.length,
      stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
    
    // Protection globale STRICTE - ne charger qu'une seule fois pour toute l'application
    if ((window as any).__projectMembersLoaded) {
      console.log('🟢 [MobilePrestations] ProjectMembers DÉJÀ CHARGÉS - IGNORÉ');
      hasLoadedProjectMembersRef.current = true;
      return;
    }
    
    if ((window as any).__loadingProjectMembers) {
      console.log('🟡 [MobilePrestations] ProjectMembers EN COURS DE CHARGEMENT - IGNORÉ');
      hasLoadedProjectMembersRef.current = true;
      return;
    }
    
    // Si on a déjà des project members, ne pas recharger
    if (projectMembers.length > 0) {
      console.log('🟢 [MobilePrestations] ProjectMembers DÉJÀ DANS LE STORE - IGNORÉ', { count: projectMembers.length });
      hasLoadedProjectMembersRef.current = true;
      (window as any).__projectMembersLoaded = true;
      return;
    }
    
    console.log('🔴 [MobilePrestations] DÉMARRAGE CHARGEMENT PROJECT MEMBERS');
    // Marquer comme en cours de chargement AVANT de charger
    (window as any).__loadingProjectMembers = true;
    hasLoadedProjectMembersRef.current = true;
    
    const loadProjectMembersFromBackend = async () => {
      console.log('🚀 [MobilePrestations] loadProjectMembersFromBackend appelé');
      try {
        console.log('📡 [MobilePrestations] Appel API ProjectMemberService.getMembers()');
        const response = await ProjectMemberService.getMembers();
        console.log('📥 [MobilePrestations] Réponse projectMembers reçue', { success: response.success, count: response.data?.length || 0 });
        if (response.success && Array.isArray(response.data)) {
          useAppData.setState({ projectMembers: response.data });
          (window as any).__projectMembersLoaded = true;
        }
      } catch (error: any) {
        console.error('[MobilePrestations] ❌ Erreur lors du chargement des collaborateurs:', error);
        hasLoadedProjectMembersRef.current = false;
        (window as any).__projectMembersLoaded = false;
      } finally {
        (window as any).__loadingProjectMembers = false;
      }
    };
    
    loadProjectMembersFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Charger une seule fois au montage
  
  // Charger les engagements depuis le backend au montage (une seule fois)
  useEffect(() => {
    console.log('🔵 [MobilePrestations] useEffect engagements déclenché', {
      hasLoadedEngagementsRef: hasLoadedEngagementsRef.current,
      __appointmentsLoaded: (window as any).__appointmentsLoaded,
      __loadingAppointments: (window as any).__loadingAppointments,
      engagementsCount: useAppData.getState().engagements?.length || 0,
      stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
    
    // Protection globale STRICTE - ne charger qu'une seule fois pour toute l'application
    if ((window as any).__appointmentsLoaded) {
      console.log('🟢 [MobilePrestations] Engagements DÉJÀ CHARGÉS - IGNORÉ');
      hasLoadedEngagementsRef.current = true;
      return;
    }
    
    if ((window as any).__loadingAppointments) {
      console.log('🟡 [MobilePrestations] Engagements EN COURS DE CHARGEMENT - IGNORÉ');
      hasLoadedEngagementsRef.current = true;
      return;
    }
    
    // Si on a déjà des engagements dans le store, ne pas recharger
    const currentEngagements = useAppData.getState().engagements || [];
    if (currentEngagements.length > 0) {
      console.log('🟢 [MobilePrestations] Engagements DÉJÀ DANS LE STORE - IGNORÉ', { count: currentEngagements.length });
      hasLoadedEngagementsRef.current = true;
      (window as any).__appointmentsLoaded = true;
      return;
    }
    
    console.log('🔴 [MobilePrestations] DÉMARRAGE CHARGEMENT ENGAGEMENTS');
    // Marquer comme en cours de chargement AVANT de charger
    (window as any).__loadingAppointments = true;
    
    const loadEngagementsFromBackend = async () => {
      console.log('🚀 [MobilePrestations] loadEngagementsFromBackend appelé');
      // Marquer comme chargé avant de commencer pour éviter les appels simultanés
      hasLoadedEngagementsRef.current = true;
      
      try {
        console.log('📡 [MobilePrestations] Appel API AppointmentService.getAll()');
        const result = await AppointmentService.getAll();
        console.log('📥 [MobilePrestations] Réponse reçue', { success: result.success, count: result.data?.length || 0 });
        if (result.success && Array.isArray(result.data)) {
          // Mapper les données du backend vers le format Engagement
          const mappedEngagements = result.data.map((appointment: any) => {
            const scheduledAt = appointment.scheduled_at || appointment.date || new Date().toISOString();
            
            const mapped = {
              id: appointment.id,
              clientId: appointment.client_id || appointment.clientId,
              serviceId: appointment.service_id || appointment.serviceId,
              scheduledAt: scheduledAt,
              status: appointment.status || 'brouillon',
              companyId: appointment.company_id || null,
              kind: appointment.kind || 'devis',
              supportType: appointment.support_type || appointment.supportType || 'Voiture',
              supportDetail: appointment.support_detail || appointment.supportDetail || '',
              additionalCharge: appointment.additional_charge || appointment.additionalCharge || 0,
              contactIds: appointment.contact_ids || appointment.contactIds || [],
              assignedUserIds: appointment.assigned_user_ids || appointment.assignedUserIds || [],
              sendHistory: appointment.send_history || appointment.sendHistory || [],
              invoiceNumber: appointment.invoice_number || appointment.invoiceNumber || null,
              invoiceVatEnabled: appointment.invoice_vat_enabled ?? appointment.invoiceVatEnabled ?? null,
              quoteNumber: appointment.quote_number || appointment.quoteNumber || null,
              quoteStatus: appointment.quote_status || appointment.quoteStatus || null,
              quoteName: appointment.quote_name || appointment.quoteName || null,
              optionIds: appointment.option_ids || appointment.optionIds || [],
              optionOverrides: appointment.option_overrides || appointment.optionOverrides || {},
              planningUser: appointment.planning_user || appointment.planningUser || null,
              startTime: appointment.start_time || appointment.startTime || null,
              mobileDurationMinutes: appointment.mobile_duration_minutes ?? appointment.mobileDurationMinutes ?? null,
              mobileCompletionComment: appointment.mobile_completion_comment || appointment.mobileCompletionComment || null,
              mobileMajoration: appointment.mobile_majoration ?? appointment.mobileMajoration ?? null,
              mobilePourboire: appointment.mobile_pourboire ?? appointment.mobilePourboire ?? null,
              services: appointment.services || undefined,
              // Inclure les catégories si disponibles
              ...(appointment.main_category_id && { mainCategoryId: appointment.main_category_id }),
              ...(appointment.sub_category_id && { subCategoryId: appointment.sub_category_id }),
            } as any;
            
            // Log détaillé pour les devis avec services
            if (mapped.kind === 'devis' && mapped.services && Array.isArray(mapped.services) && mapped.services.length > 0) {
              console.log('📥 [MobilePrestations] Devis avec services chargé:', {
                id: mapped.id,
                quoteNumber: mapped.quoteNumber,
                quoteName: mapped.quoteName,
                servicesCount: mapped.services.length,
                services: mapped.services.map((s: any, idx: number) => ({
                  index: idx,
                  serviceId: s.serviceId,
                  optionIds: s.optionIds?.length || 0,
                  optionIdsArray: s.optionIds,
                  additionalCharge: s.additionalCharge,
                  mainCategoryId: s.mainCategoryId || 'absent',
                  subCategoryId: s.subCategoryId || 'absent',
                })),
              });
            }
            
            return mapped;
          });
          
          // Fusionner avec les engagements existants
          const currentEngagements = useAppData.getState().engagements || [];
          const backendIds = new Set(mappedEngagements.map(e => e.id));
          const localOnlyEngagements = currentEngagements.filter(e => !backendIds.has(e.id));
          const mergedEngagements = [...mappedEngagements, ...localOnlyEngagements];
          
          // Mettre à jour le store seulement si les données ont changé
          const currentEngagementsIds = new Set(currentEngagements.map(e => e.id));
          const hasChanged = mergedEngagements.length !== currentEngagements.length || 
            mergedEngagements.some(e => !currentEngagementsIds.has(e.id));
          
          if (hasChanged) {
            useAppData.setState({ engagements: mergedEngagements });
          }
          // Marquer comme chargé seulement après succès
          (window as any).__appointmentsLoaded = true;
          (window as any).__loadingAppointments = false;
        } else {
          console.error('[MobilePrestations] ❌ Erreur lors du chargement:', result.error);
          hasLoadedEngagementsRef.current = false; // Permettre de réessayer en cas d'erreur
          (window as any).__loadingAppointments = false;
        }
      } catch (error: any) {
        console.error('[MobilePrestations] ❌ Erreur lors du chargement des engagements:', error);
        hasLoadedEngagementsRef.current = false; // Permettre de réessayer en cas d'erreur
        (window as any).__loadingAppointments = false;
      }
    };
    
    loadEngagementsFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Charger une seule fois au montage

  // Réinitialiser le commentaire global quand la modale s'ouvre
  useEffect(() => {
    if (showGlobalCommentModal) {
      setGlobalComment('');
    }
  }, [showGlobalCommentModal]);

  const handleStartService = (engagement: Engagement) => {
    console.log('🚀 [MobilePrestations] ========== DÉBUT DÉMARRAGE PRESTATION ==========');
    console.log('🚀 [MobilePrestations] Engagement reçu:', {
      id: engagement.id,
      kind: engagement.kind,
      status: engagement.status,
      quoteNumber: engagement.quoteNumber,
      quoteName: (engagement as any).quoteName,
      services: engagement.services ? `Array(${engagement.services.length})` : 'undefined',
      servicesDetails: engagement.services ? engagement.services.map((s: any, idx: number) => ({
        index: idx,
        serviceId: s.serviceId,
        optionIds: s.optionIds?.length || 0,
        optionIdsArray: s.optionIds,
        additionalCharge: s.additionalCharge,
        mainCategoryId: s.mainCategoryId || 'absent',
        subCategoryId: s.subCategoryId || 'absent',
      })) : [],
    });
    
    // Si c'est un devis avec plusieurs prestations, demander quelle prestation démarrer
    if (engagement.kind === 'devis' && engagement.services && Array.isArray(engagement.services) && engagement.services.length > 1) {
      console.log('🚀 [MobilePrestations] Devis multi-services - Ouverture modale de sélection');
      setShowServiceSelectionModal(engagement);
      return;
    }
    
    // Si c'est un devis avec une seule prestation, utiliser la même approche que les devis multi-services
    if (engagement.kind === 'devis') {
      console.log('🚀 [MobilePrestations] Devis simple - Création engagement temporaire et démarrage');
      // Pour un devis simple, créer un engagement temporaire comme pour les devis multi-services
      // Ne pas modifier le devis parent pour qu'il reste visible
      const tempEngagement: Engagement = {
        ...engagement,
        id: `${engagement.id}_service_0`,
        kind: 'service',
        status: 'planifié',
        // Stocker l'ID du devis parent
        quoteParentId: engagement.id,
        quoteServiceIndex: 0,
      } as any;
      console.log('🚀 [MobilePrestations] Engagement temporaire créé:', {
        id: tempEngagement.id,
        serviceId: tempEngagement.serviceId,
        quoteParentId: (tempEngagement as any).quoteParentId,
        quoteServiceIndex: (tempEngagement as any).quoteServiceIndex,
      });
      setActiveTimer(tempEngagement);
    } else {
      console.log('🚀 [MobilePrestations] Service normal - Démarrage direct');
      setActiveTimer(engagement);
    }
    console.log('🚀 [MobilePrestations] ========== FIN DÉMARRAGE PRESTATION ==========');
  };

  // Démarrer une prestation spécifique d'un devis
  const handleStartSpecificService = (engagement: Engagement, serviceIndex: number) => {
    console.log('🎯 [MobilePrestations] ========== DÉMARRAGE PRESTATION SPÉCIFIQUE ==========');
    console.log('🎯 [MobilePrestations] Engagement parent:', {
      id: engagement.id,
      quoteNumber: engagement.quoteNumber,
      servicesCount: engagement.services?.length || 0,
    });
    console.log('🎯 [MobilePrestations] Index prestation:', serviceIndex);
    
    setShowServiceSelectionModal(null);
    
    // Créer un engagement temporaire pour cette prestation spécifique
    const serviceItem = engagement.services![serviceIndex];
    console.log('🎯 [MobilePrestations] ServiceItem sélectionné:', {
      serviceId: serviceItem.serviceId,
      optionIds: serviceItem.optionIds?.length || 0,
      optionIdsArray: serviceItem.optionIds,
      optionOverrides: Object.keys(serviceItem.optionOverrides || {}).length,
      additionalCharge: serviceItem.additionalCharge,
      mainCategoryId: serviceItem.mainCategoryId || 'absent',
      subCategoryId: serviceItem.subCategoryId || 'absent',
      supportType: serviceItem.supportType,
      supportDetail: serviceItem.supportDetail,
    });
    
    const service = servicesById.get(serviceItem.serviceId);
    
    if (!service) {
      console.error('❌ [MobilePrestations] Service introuvable:', serviceItem.serviceId);
      return;
    }
    
    console.log('✅ [MobilePrestations] Service trouvé:', {
      id: service.id,
      name: service.name,
      optionsCount: service.options?.length || 0,
    });

    // Créer un engagement temporaire pour cette prestation
    const tempEngagement: Engagement = {
      ...engagement,
      id: `${engagement.id}_service_${serviceIndex}`,
      serviceId: serviceItem.serviceId,
      optionIds: serviceItem.optionIds || [],
      optionOverrides: serviceItem.optionOverrides || {},
      supportType: serviceItem.supportType || engagement.supportType,
      supportDetail: serviceItem.supportDetail || engagement.supportDetail || '',
      kind: 'service',
      status: 'planifié',
      // Stocker l'index de la prestation et l'ID du devis parent
      quoteParentId: engagement.id,
      quoteServiceIndex: serviceIndex,
    } as any;

    console.log('🎯 [MobilePrestations] Engagement temporaire créé:', {
      id: tempEngagement.id,
      serviceId: tempEngagement.serviceId,
      optionIds: tempEngagement.optionIds.length,
      quoteParentId: (tempEngagement as any).quoteParentId,
      quoteServiceIndex: (tempEngagement as any).quoteServiceIndex,
    });
    console.log('🎯 [MobilePrestations] ========== FIN DÉMARRAGE PRESTATION SPÉCIFIQUE ==========');

    setActiveTimer(tempEngagement);
  };

  const handleStopTimer = (engagementId: string, durationMinutes: number, comment?: string, majoration?: number, pourboire?: number) => {
    console.log('⏹️ [MobilePrestations] ========== ARRÊT TIMER ==========');
    console.log('⏹️ [MobilePrestations] Paramètres:', {
      engagementId,
      durationMinutes,
      hasComment: !!comment,
      commentLength: comment?.length || 0,
    });
    
    const activeEngagement = activeTimer;
    if (!activeEngagement) {
      console.error('❌ [MobilePrestations] Aucun engagement actif');
      return;
    }
    
    console.log('⏹️ [MobilePrestations] Engagement actif:', {
      id: activeEngagement.id,
      kind: activeEngagement.kind,
      quoteParentId: (activeEngagement as any).quoteParentId || 'absent',
      quoteServiceIndex: (activeEngagement as any).quoteServiceIndex ?? 'absent',
    });

    // Si c'est une prestation d'un devis multiple
    if ((activeEngagement as any).quoteParentId && typeof (activeEngagement as any).quoteServiceIndex === 'number') {
      const parentId = (activeEngagement as any).quoteParentId;
      const serviceIndex = (activeEngagement as any).quoteServiceIndex;
      
      console.log('⏹️ [MobilePrestations] Prestation d\'un devis multiple:', {
        parentId,
        serviceIndex,
      });
      
      // Stocker les informations de cette prestation terminée
      const completedData = completedServicesForQuote.get(parentId) || new Map<number, { duration: number; comment?: string; majoration?: number; pourboire?: number }>();
      completedData.set(serviceIndex, { duration: durationMinutes, comment, majoration, pourboire });
      console.log('⏹️ [MobilePrestations] Données complétées stockées:', {
        serviceIndex,
        duration: durationMinutes,
        hasComment: !!comment,
        totalCompleted: completedData.size,
      });
      setCompletedServicesForQuote(new Map(completedServicesForQuote.set(parentId, completedData)));
      
      // Récupérer le devis parent
      const parentEngagement = allEngagements.find(e => e.id === parentId);
      if (!parentEngagement) {
        console.error('❌ [MobilePrestations] Devis parent introuvable');
        setActiveTimer(null);
        return;
      }
      
      // Si c'est un devis simple (sans tableau services), créer directement le service
      if (!parentEngagement.services || parentEngagement.services.length === 0) {
        console.log('⏹️ [MobilePrestations] Devis simple - Création directe du service');
        // Créer directement le service réalisé depuis le devis
        const serviceEngagementPayload = {
          kind: 'service',
          status: 'réalisé',
          clientId: parentEngagement.clientId,
          serviceId: parentEngagement.serviceId,
          optionIds: parentEngagement.optionIds || [],
          optionOverrides: parentEngagement.optionOverrides || {},
          scheduledAt: parentEngagement.scheduledAt,
          companyId: parentEngagement.companyId,
          supportType: parentEngagement.supportType,
          supportDetail: parentEngagement.supportDetail || '',
          additionalCharge: parentEngagement.additionalCharge ?? 0,
          contactIds: parentEngagement.contactIds || [],
          assignedUserIds: parentEngagement.assignedUserIds || [],
          planningUser: parentEngagement.planningUser,
          startTime: parentEngagement.startTime,
          quoteNumber: parentEngagement.quoteNumber || null,
          quoteName: (parentEngagement as any).quoteName || null,
          mobileDurationMinutes: durationMinutes,
          mobileCompletionComment: comment || null,
          mobileMajoration: majoration ?? null,
          mobilePourboire: pourboire ?? null,
        } as any;
        
        addEngagement(serviceEngagementPayload);
        
        // Marquer le devis comme accepté
        updateEngagement(parentId, {
          quoteStatus: 'accepté',
        });
        
        setActiveTimer(null);
        return;
      }
      
      // Si c'est un devis multi-services, utiliser la logique existante
      if (parentEngagement.services) {
        const allServicesCompleted = parentEngagement.services.every((_, idx) => completedData.has(idx));
        console.log('⏹️ [MobilePrestations] État des prestations:', {
          totalServices: parentEngagement.services.length,
          completed: completedData.size,
          allCompleted: allServicesCompleted,
        });
        
        if (allServicesCompleted) {
          // Toutes les prestations sont terminées, demander le commentaire global
          console.log('✅ [MobilePrestations] Toutes les prestations terminées - Ouverture modale commentaire global');
          setActiveTimer(null);
          setShowGlobalCommentModal({ engagement: parentEngagement, completedServices: completedData });
        } else {
          // Afficher la modale de sélection pour choisir la prestation suivante
          console.log('⏹️ [MobilePrestations] Ouverture modale de sélection pour choisir la prestation suivante');
          setActiveTimer(null);
          // Utiliser setTimeout pour s'assurer que le timer précédent est bien fermé avant d'afficher la modale
          setTimeout(() => {
            setShowServiceSelectionModal(parentEngagement);
          }, 100);
        }
      }
    } else {
      // Comportement normal pour un service unique
      console.log('⏹️ [MobilePrestations] Service unique - Mise à jour directe');
      updateEngagement(engagementId, {
        mobileDurationMinutes: durationMinutes,
        mobileCompletionComment: comment || null,
        mobileMajoration: majoration ?? null,
        mobilePourboire: pourboire ?? null,
        status: 'réalisé',
        kind: 'service',
      });
      console.log('✅ [MobilePrestations] Service mis à jour:', {
        engagementId,
        durationMinutes,
        hasComment: !!comment,
      });
      setActiveTimer(null);
    }
    console.log('⏹️ [MobilePrestations] ========== FIN ARRÊT TIMER ==========');
  };

  // Créer les services dans la page Prestations quand toutes les prestations d'un devis sont terminées
  const createServicesFromQuote = async (quoteEngagement: Engagement, completedServices: Map<number, { duration: number; comment?: string; majoration?: number; pourboire?: number }>, globalComment?: string) => {
    console.log('🚀 [MobilePrestations] ========== DÉBUT createServicesFromQuote ==========');
    console.log('🚀 [MobilePrestations] Devis parent:', {
      id: quoteEngagement.id,
      quoteNumber: quoteEngagement.quoteNumber,
      quoteName: (quoteEngagement as any).quoteName,
      servicesCount: quoteEngagement.services?.length || 0,
      clientId: quoteEngagement.clientId,
    });
    
    if (!quoteEngagement.services) {
      console.error('❌ [MobilePrestations] Pas de services dans le devis');
      return;
    }

    try {
      // Créer un service pour chaque prestation terminée
      for (const [serviceIndex, completionData] of completedServices.entries()) {
        console.log(`🔄 [MobilePrestations] Traitement service ${serviceIndex + 1}/${completedServices.size}`);
        
        const serviceItem = quoteEngagement.services[serviceIndex];
        console.log('🔄 [MobilePrestations] ServiceItem du devis:', {
          serviceId: serviceItem.serviceId,
          optionIds: serviceItem.optionIds?.length || 0,
          optionIdsArray: serviceItem.optionIds,
          optionOverrides: Object.keys(serviceItem.optionOverrides || {}).length,
          additionalCharge: serviceItem.additionalCharge,
          mainCategoryId: serviceItem.mainCategoryId || 'absent',
          subCategoryId: serviceItem.subCategoryId || 'absent',
          supportType: serviceItem.supportType,
          supportDetail: serviceItem.supportDetail,
        });
        
        const service = servicesById.get(serviceItem.serviceId);
        
        if (!service) {
          console.error(`❌ [MobilePrestations] Service introuvable: ${serviceItem.serviceId}`);
          continue;
        }
        
        console.log('✅ [MobilePrestations] Service trouvé:', {
          id: service.id,
          name: service.name,
          optionsCount: service.options?.length || 0,
        });

        // Combiner le commentaire de la prestation avec le commentaire global
        // Format : commentaire de la prestation, puis séparateur, puis commentaire global
        let finalComment = completionData.comment || '';
        if (globalComment && globalComment.trim()) {
          if (finalComment) {
            finalComment = `${finalComment}\n\n━━━━━━━━━━━━━━━━━━━━\n💬 COMMENTAIRE GLOBAL DU DEVIS\n━━━━━━━━━━━━━━━━━━━━\n${globalComment}`;
          } else {
            finalComment = `━━━━━━━━━━━━━━━━━━━━\n💬 COMMENTAIRE GLOBAL DU DEVIS\n━━━━━━━━━━━━━━━━━━━━\n${globalComment}`;
          }
        }

        // Créer un engagement de type service pour cette prestation
        // Transférer TOUS les éléments de la prestation du devis
        const serviceEngagementPayload = {
          kind: 'service',
          status: 'réalisé',
          clientId: quoteEngagement.clientId,
          serviceId: serviceItem.serviceId,
          optionIds: serviceItem.optionIds || [],
          optionOverrides: serviceItem.optionOverrides || {},
          scheduledAt: quoteEngagement.scheduledAt,
          companyId: quoteEngagement.companyId,
          supportType: serviceItem.supportType || quoteEngagement.supportType,
          supportDetail: serviceItem.supportDetail || quoteEngagement.supportDetail || '',
          additionalCharge: serviceItem.additionalCharge ?? quoteEngagement.additionalCharge ?? 0,
          contactIds: quoteEngagement.contactIds || [],
          assignedUserIds: quoteEngagement.assignedUserIds || [],
          planningUser: quoteEngagement.planningUser,
          startTime: quoteEngagement.startTime,
          // Conserver les informations du devis d'origine
          quoteNumber: quoteEngagement.quoteNumber || null,
          quoteName: (quoteEngagement as any).quoteName || null,
          // Utiliser les informations de durée et commentaire de cette prestation
          mobileDurationMinutes: completionData.duration,
          mobileCompletionComment: finalComment || null,
          mobileMajoration: completionData.majoration ?? null,
          mobilePourboire: completionData.pourboire ?? null,
          // Conserver les informations de catégories si disponibles
          ...(serviceItem.mainCategoryId && { mainCategoryId: serviceItem.mainCategoryId }),
          ...(serviceItem.subCategoryId && { subCategoryId: serviceItem.subCategoryId }),
        } as any;
        
        console.log('📤 [MobilePrestations] Payload pour addEngagement:', {
          kind: serviceEngagementPayload.kind,
          serviceId: serviceEngagementPayload.serviceId,
          optionIds: serviceEngagementPayload.optionIds.length,
          optionIdsArray: serviceEngagementPayload.optionIds,
          additionalCharge: serviceEngagementPayload.additionalCharge,
          mainCategoryId: serviceEngagementPayload.mainCategoryId || 'absent',
          subCategoryId: serviceEngagementPayload.subCategoryId || 'absent',
          mobileDurationMinutes: serviceEngagementPayload.mobileDurationMinutes,
          hasComment: !!serviceEngagementPayload.mobileCompletionComment,
        });
        
        const newServiceEngagement = addEngagement(serviceEngagementPayload);
        
        console.log('✅ [MobilePrestations] Service engagement créé:', {
          id: newServiceEngagement.id,
          serviceId: newServiceEngagement.serviceId,
          optionIds: newServiceEngagement.optionIds.length,
        });

        // Synchroniser avec le backend
        try {
          // Transformer l'engagement en format backend (snake_case)
          const appointmentData: any = {
            id: newServiceEngagement.id,
            client_id: newServiceEngagement.clientId,
            service_id: newServiceEngagement.serviceId,
            date: newServiceEngagement.scheduledAt,
            start_time: newServiceEngagement.startTime || null,
            status: newServiceEngagement.status,
            kind: newServiceEngagement.kind,
            company_id: newServiceEngagement.companyId || null,
            option_ids: newServiceEngagement.optionIds,
            option_overrides: newServiceEngagement.optionOverrides || {},
            additional_charge: newServiceEngagement.additionalCharge,
            contact_ids: newServiceEngagement.contactIds,
            assigned_user_ids: newServiceEngagement.assignedUserIds,
            invoice_number: newServiceEngagement.invoiceNumber || null,
            invoice_vat_enabled: newServiceEngagement.invoiceVatEnabled ?? null,
            quote_number: newServiceEngagement.quoteNumber || null,
            quote_status: newServiceEngagement.quoteStatus || null,
            quote_name: (newServiceEngagement as any).quoteName || null,
            support_type: newServiceEngagement.supportType,
            support_detail: newServiceEngagement.supportDetail,
            planning_user: newServiceEngagement.planningUser || null,
            mobile_duration_minutes: newServiceEngagement.mobileDurationMinutes ?? null,
            mobile_completion_comment: newServiceEngagement.mobileCompletionComment || null,
            mobile_majoration: newServiceEngagement.mobileMajoration ?? null,
            mobile_pourboire: newServiceEngagement.mobilePourboire ?? null,
            send_history: newServiceEngagement.sendHistory || [],
            // Inclure les catégories si disponibles
            ...((newServiceEngagement as any).mainCategoryId && { main_category_id: (newServiceEngagement as any).mainCategoryId }),
            ...((newServiceEngagement as any).subCategoryId && { sub_category_id: (newServiceEngagement as any).subCategoryId }),
          };
          
          console.log('📤 [MobilePrestations] ========== ENVOI AU BACKEND ==========');
          console.log('📤 [MobilePrestations] Données complètes envoyées:', {
            id: appointmentData.id,
            client_id: appointmentData.client_id,
            service_id: appointmentData.service_id,
            status: appointmentData.status,
            kind: appointmentData.kind,
            option_ids: appointmentData.option_ids?.length || 0,
            option_idsArray: appointmentData.option_ids,
            option_overrides: Object.keys(appointmentData.option_overrides || {}).length,
            additional_charge: appointmentData.additional_charge,
            mobile_duration_minutes: appointmentData.mobile_duration_minutes,
            mobile_completion_comment: appointmentData.mobile_completion_comment ? `présent (${appointmentData.mobile_completion_comment.length} chars)` : 'absent',
            main_category_id: appointmentData.main_category_id || 'absent',
            sub_category_id: appointmentData.sub_category_id || 'absent',
            quote_number: appointmentData.quote_number,
            quote_name: appointmentData.quote_name,
          });
          console.log('📤 [MobilePrestations] Données JSON complètes:', JSON.stringify(appointmentData, null, 2));
          
          const result = await AppointmentService.create(appointmentData);
          if (result.success) {
            console.log('✅ [MobilePrestations] Service créé avec succès dans le backend:', {
              id: result.data?.id,
              backendData: result.data,
            });
            console.log('📤 [MobilePrestations] ========== FIN ENVOI AU BACKEND (SUCCÈS) ==========');
          } else {
            console.error('❌ [MobilePrestations] Erreur lors de la création:', result.error);
            console.log('📤 [MobilePrestations] ========== FIN ENVOI AU BACKEND (ERREUR) ==========');
          }
        } catch (error) {
          console.error('❌ [MobilePrestations] Erreur lors de la synchronisation avec le backend:', error);
        }
      }

      // Marquer le devis comme terminé
      // Note: updateEngagement synchronise automatiquement avec le backend (voir useAppData.ts)
      updateEngagement(quoteEngagement.id, {
        quoteStatus: 'accepté',
      });

      // Nettoyer les prestations terminées pour ce devis
      setCompletedServicesForQuote(prev => {
        const newMap = new Map(prev);
        newMap.delete(quoteEngagement.id);
        return newMap;
      });

    } catch (error) {
      console.error('Erreur lors de la création des services:', error);
    }
  };

  const handleCreateInvoice = (engagement: Engagement) => {
    setShowInvoiceForm(engagement);
  };

  const handleInvoiceSuccess = (invoiceNumber: string) => {
    if (showInvoiceForm) {
      updateEngagement(showInvoiceForm.id, {
        invoiceNumber,
        kind: 'facture',
      });
      setShowInvoiceForm(null);
    }
  };

  const getClientName = (clientId: string): string => {
    const client = clientsById.get(clientId);
    if (!client) {
      // Log uniquement en cas d'erreur réelle, pas à chaque appel
      if (clients.length > 0) {
        console.warn('[MobilePrestations] ⚠️ Client non trouvé:', clientId);
      }
    }
    return client?.name || 'Client inconnu';
  };

  const getServiceName = (engagement: Engagement): string => {
    // Pour les devis, utiliser le nom du devis si disponible
    if (engagement.kind === 'devis' && engagement.quoteName) {
      return engagement.quoteName;
    }
    
    // Sinon, chercher le service dans la liste des services
    const service = services.find((s) => s.id === engagement.serviceId);
    if (service) {
      return service.name;
    }
    
    // Si le service n'est pas trouvé, essayer de trouver le nom via le store global
    // Cela peut arriver si les services ne sont pas encore chargés
    return 'Service inconnu';
  };

  // Fonction helper pour calculer les détails d'une prestation individuelle
  const computeServiceItemDetails = (serviceItem: any) => {
    const servService = servicesById.get(serviceItem.serviceId);
    if (!servService) {
      return null;
    }

    const serviceQuantity = serviceItem.quantity ?? 1;
    const optionIds = serviceItem.optionIds || [];
    const overrides = serviceItem.optionOverrides || {};
    
    // Calculer le prix
    let servicePrice = 0;
    if ((servService as any).base_price !== undefined && (servService as any).base_price !== null) {
      servicePrice = (servService as any).base_price;
    } else if (servService.options && Array.isArray(servService.options) && optionIds.length > 0) {
      servicePrice = servService.options
        .filter((option) => optionIds.includes(option.id))
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
    const totalPrice = (servicePrice + subCategoryPrice) * serviceQuantity;
    
    // Calculer la durée
    let serviceDuration = 0;
    if ((servService as any).base_duration !== undefined && (servService as any).base_duration !== null) {
      serviceDuration = (servService as any).base_duration;
    } else if (servService.options && Array.isArray(servService.options) && optionIds.length > 0) {
      serviceDuration = servService.options
        .filter((option) => optionIds.includes(option.id))
        .reduce((acc, option) => {
          const override = overrides[option.id];
          const optionQuantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
          const durationValue = override?.durationMin ?? option.defaultDurationMin ?? 0;
          return acc + durationValue * optionQuantity;
        }, 0);
    }
    
    // Ajouter la durée de la sous-catégorie si définie
    const subCategoryDuration = (subCategory as any)?.defaultDurationMin || 0;
    const totalDuration = (serviceDuration + subCategoryDuration) * serviceQuantity;
    
    // Récupérer les noms des options
    const optionsWithNames = optionIds
      .map((optionId: string) => {
        const option = servService.options?.find((opt) => opt.id === optionId);
        return option ? { id: optionId, name: option.name } : null;
      })
      .filter(Boolean) as Array<{ id: string; name: string }>;
    
    // Récupérer les catégories
    const mainCategory = serviceItem.mainCategoryId 
      ? categories.find((cat) => cat.id === serviceItem.mainCategoryId)
      : null;
    const subCategoryName = subCategory?.name || null;
    
    return {
      service: servService,
      serviceName: servService.name,
      serviceDescription: servService.description || null,
      mainCategory: mainCategory?.name || null,
      subCategory: subCategoryName,
      options: optionsWithNames,
      quantity: serviceQuantity,
      price: totalPrice,
      duration: totalDuration,
    };
  };

  const getEngagementsForDay = (day: Date): Engagement[] => {
    return weekEngagements.filter((eng) => {
      if (!eng.scheduledAt) return false;
      try {
        return isSameDay(parseISO(eng.scheduledAt), day);
      } catch (error) {
        console.error('[MobilePrestations] Erreur lors du parsing de la date pour getEngagementsForDay:', eng.scheduledAt, error);
        return false;
      }
    });
  };

  const handleAddToAppleCalendar = (engagement: Engagement) => {
    if (!engagement.scheduledAt) return;

    const engDate = parseISO(engagement.scheduledAt);
    const client = clientsById.get(engagement.clientId);
    const service = servicesById.get(engagement.serviceId);
    const isQuote = engagement.kind === 'devis';
    const totals = computeEngagementTotals(engagement);
    
    // Titre : utiliser le nom du devis si disponible, sinon le nom du service
    const title = isQuote && engagement.quoteName 
      ? engagement.quoteName
      : `${service?.name || 'Service'} - ${client?.name || 'Client'}`;
    
    // Description complète avec toutes les informations, bien organisée
    const descriptionParts: string[] = [];
    
    // Section 1: Informations du devis/service
    if (isQuote) {
      descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
      descriptionParts.push('📋 DEVIS');
      descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
      if (engagement.quoteNumber) {
        descriptionParts.push(`Numéro: ${engagement.quoteNumber}`);
      }
      if (engagement.quoteName) {
        descriptionParts.push(`Nom: ${engagement.quoteName}`);
      }
      if (engagement.quoteStatus) {
        const statusLabels: Record<string, string> = {
          'brouillon': 'Brouillon',
          'envoyé': 'Envoyé',
          'accepté': 'Accepté',
          'refusé': 'Refusé',
          'payé': 'Payé',
        };
        descriptionParts.push(`Statut: ${statusLabels[engagement.quoteStatus] || engagement.quoteStatus}`);
      }
      descriptionParts.push('');
    }
    
    // Section 2: Informations client
    descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
    descriptionParts.push('👤 CLIENT');
    descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
    descriptionParts.push(`Nom: ${client?.name || 'Client inconnu'}`);
    
    if (client?.phone) {
      descriptionParts.push(`Téléphone: ${client.phone}`);
    }
    if (client?.email) {
      descriptionParts.push(`Email: ${client.email}`);
    }
    if (client?.address || client?.city) {
      descriptionParts.push(`Adresse: ${[client.address, client.city].filter(Boolean).join(', ')}`);
    }
    descriptionParts.push('');
    
    // Section 3: Prestations détaillées
    descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
    descriptionParts.push('🔧 PRESTATIONS');
    descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
    
    // Si c'est un devis avec plusieurs prestations
    if (engagement.services && Array.isArray(engagement.services) && engagement.services.length > 0) {
      const serviceItemsDetails = engagement.services
        .map((servItem) => computeServiceItemDetails(servItem))
        .filter(Boolean) as Array<NonNullable<ReturnType<typeof computeServiceItemDetails>>>;
      
      serviceItemsDetails.forEach((details, idx) => {
        descriptionParts.push(`${idx + 1}. ${details.serviceName}${details.quantity > 1 ? ` (×${details.quantity})` : ''}`);
        
        if (details.serviceDescription) {
          descriptionParts.push(`   📝 ${details.serviceDescription}`);
        }
        
        if (details.mainCategory || details.subCategory) {
          const categories = [details.mainCategory, details.subCategory].filter(Boolean).join(' / ');
          descriptionParts.push(`   📂 Catégorie: ${categories}`);
        }
        
        if (details.options.length > 0) {
          descriptionParts.push(`   ⚙️ Options:`);
          details.options.forEach((opt) => {
            descriptionParts.push(`      • ${opt.name}`);
          });
        }
        
        descriptionParts.push(`   ⏱️ Durée: ${details.duration > 0 ? formatDuration(details.duration) : 'Non définie'}`);
        descriptionParts.push(`   💰 Prix: ${formatCurrency(details.price)}`);
      });
    } else {
      // Prestation unique
      descriptionParts.push(`Prestation: ${service?.name || 'Service inconnu'}`);
      if (service?.description) {
        descriptionParts.push(`Description: ${service.description}`);
      }
      
      if (service && engagement.optionIds && Array.isArray(engagement.optionIds) && engagement.optionIds.length > 0) {
        const optionsWithNames = engagement.optionIds
          .map((optionId) => {
            const option = service.options?.find((opt) => opt.id === optionId);
            return option ? option.name : null;
          })
          .filter(Boolean);
        
        if (optionsWithNames.length > 0) {
          descriptionParts.push(`Options:`);
          optionsWithNames.forEach((optName) => {
            descriptionParts.push(`  • ${optName}`);
          });
        }
      }
      
      if (totals.duration > 0) {
        descriptionParts.push(`Durée estimée: ${formatDuration(totals.duration)}`);
      }
      
      if (totals.price > 0) {
        descriptionParts.push(`Prix: ${formatCurrency(totals.price + totals.surcharge)}`);
      }
    }
    descriptionParts.push('');
    
    // Section 4: Support
    if (engagement.supportType || engagement.supportDetail) {
      descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
      descriptionParts.push('🛠️ SUPPORT');
      descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
      descriptionParts.push(`Type: ${engagement.supportType || 'Non spécifié'}`);
      if (engagement.supportDetail) {
        descriptionParts.push(`Détails: ${engagement.supportDetail}`);
      }
      descriptionParts.push('');
    }
    
    // Section 5: Totaux (si plusieurs prestations)
    if (engagement.services && Array.isArray(engagement.services) && engagement.services.length > 1) {
      descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
      descriptionParts.push('💰 TOTAUX');
      descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
      if (totals.duration > 0) {
        descriptionParts.push(`Durée totale: ${formatDuration(totals.duration)}`);
      }
      if (totals.price > 0) {
        descriptionParts.push(`Prix total: ${formatCurrency(totals.price + totals.surcharge)}`);
        if (totals.surcharge > 0) {
          descriptionParts.push(`  (dont supplément: ${formatCurrency(totals.surcharge)})`);
        }
      }
      descriptionParts.push('');
    }
    
    // Section 6: Collaborateurs
    if (engagement.assignedUserIds && engagement.assignedUserIds.length > 0) {
      descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
      descriptionParts.push('👥 COLLABORATEURS');
      descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
      const assignedNames = engagement.assignedUserIds.map((assignedId) => {
        const member = projectMembers.find((m) => m.id === assignedId);
        return member ? `${member.firstName} ${member.lastName}` : assignedId;
      }).join(', ');
      descriptionParts.push(assignedNames);
      descriptionParts.push('');
    }
    
    // Section 7: Informations de planification
    descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
    descriptionParts.push('📅 PLANIFICATION');
    descriptionParts.push('━━━━━━━━━━━━━━━━━━━━');
    if (engagement.startTime) {
      descriptionParts.push(`Heure de début: ${engagement.startTime}`);
    }
    descriptionParts.push(`Date: ${format(engDate, 'EEEE d MMMM yyyy', { locale: fr })}`);
    
    const description = descriptionParts.join('\n');
    
    // Calculer la date de début complète avec l'heure
    let startDateTime: Date;
    if (engagement.startTime) {
      // Utiliser l'heure de début spécifiée
      const [hours, minutes] = engagement.startTime.split(':').map(Number);
      startDateTime = new Date(engDate);
      startDateTime.setHours(hours || 0, minutes || 0, 0, 0);
    } else if (engDate.getHours() !== 0 || engDate.getMinutes() !== 0) {
      // Si scheduledAt contient déjà une heure (pas minuit), l'utiliser
      startDateTime = new Date(engDate);
    } else {
      // Par défaut, utiliser la date à 9h00
      startDateTime = new Date(engDate);
      startDateTime.setHours(9, 0, 0, 0);
    }
    
    // Calculer la date de fin (durée estimée + heure de début)
    let endDate: Date;
    if (totals.duration > 0) {
      endDate = new Date(startDateTime.getTime() + totals.duration * 60 * 1000);
    } else {
      // Par défaut, durée d'1 heure
      endDate = new Date(startDateTime.getTime() + 60 * 60 * 1000);
    }
    
    // Format iCal pour Apple Calendar (format UTC)
    const startDateStr = format(startDateTime, "yyyyMMdd'T'HHmmss");
    const endDateStr = format(endDate, "yyyyMMdd'T'HHmmss");
    
    // Préparer le lieu (location) avec l'adresse du client
    const location = client?.address || client?.city 
      ? [client.address, client.city].filter(Boolean).join(', ')
      : '';
    
    // Échapper les caractères spéciaux pour le format iCal
    const escapeIcalText = (text: string): string => {
      return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
    };
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ERP Wash&Go//Mobile App//FR',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `DTSTART:${startDateStr}`,
      `DTEND:${endDateStr}`,
      `SUMMARY:${escapeIcalText(title)}`,
      `DESCRIPTION:${escapeIcalText(description)}`,
      ...(location ? [`LOCATION:${escapeIcalText(location)}`] : []),
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    // Créer un blob et télécharger
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${isQuote ? 'devis' : 'prestation'}-${engagement.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreviousWeek = () => {
    setSelectedDate((prev) => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setSelectedDate((prev) => addDays(prev, 7));
    setSelectedDay(null);
  };

  const handleDatePickerChange = (dateString: string) => {
    const newDate = parseISO(dateString);
    setSelectedDate(newDate);
    setSelectedDay(newDate);
    setShowDatePicker(false);
  };

  const handleGoToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setSelectedDay(today);
    setDatePickerValue(format(today, 'yyyy-MM-dd'));
  };

  // Initialiser le jour sélectionné au jour actuel
  React.useEffect(() => {
    if (!selectedDay) {
      const today = new Date();
      if (today >= weekStart && today <= weekEnd) {
        setSelectedDay(today);
      } else {
        setSelectedDay(weekStart);
      }
    }
  }, [weekStart, weekEnd, selectedDay]);

  // Mettre à jour le date picker quand la date change
  React.useEffect(() => {
    if (selectedDate) {
      setDatePickerValue(format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [selectedDate]);

  const selectedDayEngagements = selectedDay ? getEngagementsForDay(selectedDay) : [];

  return (
    <div className="modern-text" style={{ 
      padding: '0 var(--space-xl)', 
      width: '100%', 
      background: 'var(--bg)',
    }}>
      {/* Header - Style harmonisé avec Clients */}
      <div style={{ 
        paddingTop: '0', 
        display: 'flex', 
        justifyContent: 'flex-start', 
        alignItems: 'center', 
        marginBottom: 'var(--space-md)',
        width: '100%',
      }}>
        <div>
          <h1 className="text-title" style={{ margin: 0, color: 'var(--text)' }}>
            Planning
          </h1>
          {selectedDay && selectedDayEngagements.length > 0 && (
            <span className="text-caption" style={{ color: 'var(--muted)' }}>
              {selectedDayEngagements.length} prestation{selectedDayEngagements.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Navigation de semaine */}
      <div style={{ 
        marginBottom: 'var(--space-md)',
        paddingBottom: 'var(--space-sm)',
        borderBottom: '1px solid rgba(var(--border-rgb), 0.1)',
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleGoToToday}
              className="btn-icon"
              style={{ 
                width: '36px', 
                height: '36px',
                background: 'rgba(var(--accent-rgb), 0.1)',
                border: '1px solid rgba(var(--accent-rgb), 0.2)',
              }}
              title="Aujourd'hui"
            >
              <Today style={{ fontSize: '18px', color: 'var(--accent)' }} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="btn-base btn-secondary"
              style={{ 
                padding: 'var(--space-xs) var(--space-sm)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-xs)',
                minWidth: '100px',
                justifyContent: 'center',
              }}
            >
              <span>{format(selectedDate, 'd MMM', { locale: fr })}</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePreviousWeek}
              className="btn-icon"
              style={{ width: '36px', height: '36px' }}
            >
              <ChevronLeft style={{ fontSize: '20px' }} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleNextWeek}
              className="btn-icon"
              style={{ width: '36px', height: '36px' }}
            >
              <ChevronRight style={{ fontSize: '20px' }} />
            </motion.button>
          </div>
        </div>

        {/* Sélecteur de date */}
        <AnimatePresence>
          {showDatePicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                marginBottom: 'var(--space-sm)',
                padding: 'var(--space-md)',
                background: 'rgba(var(--surface-rgb), 0.8)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(var(--border-rgb), 0.2)',
              }}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 'var(--space-sm)',
              }}>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Choisir une date
                </label>
                <input
                  type="date"
                  value={datePickerValue}
                  onChange={(e) => {
                    setDatePickerValue(e.target.value);
                    handleDatePickerChange(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-md)',
                    border: '2px solid rgba(var(--accent-rgb), 0.3)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                />
                <div style={{ 
                  display: 'flex', 
                  gap: 'var(--space-xs)',
                  marginTop: 'var(--space-xs)',
                }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleGoToToday}
                    className="btn-base btn-secondary"
                    style={{
                      flex: 1,
                      padding: 'var(--space-sm)',
                      fontSize: '13px',
                    }}
                  >
                    <Today style={{ fontSize: '14px', marginRight: 'var(--space-xs)' }} />
                    Aujourd'hui
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDatePicker(false)}
                    className="btn-base btn-ghost"
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      fontSize: '13px',
                    }}
                  >
                    Fermer
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sélecteur de jours horizontal scrollable */}
        <div style={{ 
          display: 'flex',
          gap: 'var(--space-xs)',
          overflowX: 'auto',
          paddingBottom: 'var(--space-xs)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitScrollbar: { display: 'none' },
        }}>
          {weekDays.map((day) => {
            const dayEngagements = getEngagementsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const hasEngagements = dayEngagements.length > 0;

            return (
              <motion.button
                key={day.toISOString()}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setSelectedDay(day);
                  setSelectedDate(day);
                }}
                style={{
                  minWidth: '75px',
                  padding: 'var(--space-sm) var(--space-xs)',
                  borderRadius: 'var(--radius-lg)',
                  border: isSelected 
                    ? '2px solid var(--accent)' 
                    : isToday 
                    ? '1.5px solid var(--accent)' 
                    : '1px solid rgba(var(--border-rgb), 0.3)',
                  background: isSelected 
                    ? 'var(--accent)' 
                    : isToday 
                    ? 'rgba(var(--accent-rgb), 0.15)' 
                    : 'rgba(var(--surface-rgb), 0.6)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  color: isSelected ? 'white' : isToday ? 'var(--accent)' : 'var(--text)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  cursor: 'pointer',
                  position: 'relative',
                  flexShrink: 0,
                  boxShadow: isSelected 
                    ? '0 4px 12px rgba(var(--accent-rgb), 0.3)' 
                    : '0 2px 6px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ 
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  opacity: isSelected ? 0.9 : 0.7,
                  letterSpacing: '0.5px',
                }}>
                  {format(day, 'EEE', { locale: fr })}
                </span>
                <span style={{ 
                  fontSize: '20px',
                  fontWeight: 700,
                  lineHeight: '1',
                }}>
                  {format(day, 'd', { locale: fr })}
                </span>
                {hasEngagements && (
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isSelected ? 'white' : 'var(--accent)',
                    boxShadow: isSelected 
                      ? '0 0 0 2px var(--accent)' 
                      : '0 0 0 2px rgba(var(--accent-rgb), 0.2)',
                  }} />
                )}
                {isToday && !isSelected && (
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    width: '20px',
                    height: '2px',
                    borderRadius: '1px',
                    background: 'var(--accent)',
                  }} />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Liste des prestations - Style harmonisé avec Clients */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        {selectedDay && selectedDayEngagements.length > 0 ? (
          <>
            <div style={{ 
              marginBottom: 'var(--space-xs)',
              paddingBottom: 'var(--space-xs)',
            }}>
              <h2 className="text-body-lg" style={{ 
                margin: 0,
                color: 'var(--text)',
                fontSize: '16px',
                fontWeight: '600',
              }}>
                {format(selectedDay, 'EEEE d MMMM', { locale: fr })}
              </h2>
            </div>

            {selectedDayEngagements.map((eng, engIndex) => {
              const engDate = eng.scheduledAt ? parseISO(eng.scheduledAt) : null;
              // Utiliser startTime si disponible, sinon utiliser l'heure de scheduledAt
              const timeStr = eng.startTime 
                ? eng.startTime 
                : engDate 
                ? format(engDate, 'HH:mm') 
                : 'Non définie';
              const isCompleted = eng.status === 'réalisé';
              const isQuote = eng.kind === 'devis';
              const totals = computeEngagementTotals(eng);
              const isExpanded = expandedEngagementId === eng.id;
              const client = clientsById.get(eng.clientId);
              const estimatedDurationMinutes = totals.duration;
              const service = servicesById.get(eng.serviceId);
              
              // Gestion des sections pliables
              const sectionKey = eng.id;
              const sectionsExpanded = expandedSections[sectionKey] || { devis: false, client: false, prestation: true, collaborateur: false };
              const toggleSection = (section: 'devis' | 'client' | 'prestation' | 'collaborateur') => {
                setExpandedSections((prev) => ({
                  ...prev,
                  [sectionKey]: {
                    ...(prev[sectionKey] || { devis: false, client: false, prestation: true, collaborateur: false }),
                    [section]: !(prev[sectionKey]?.[section] ?? (section === 'prestation' ? true : false)),
                  },
                }));
              };
              
              // Helper pour le statut du devis
              const getQuoteStatusLabel = (status: CommercialDocumentStatus | null): string => {
                switch (status) {
                  case 'brouillon': return 'Brouillon';
                  case 'envoyé': return 'Envoyé';
                  case 'accepté': return 'Accepté';
                  case 'refusé': return 'Refusé';
                  case 'payé': return 'Payé';
                  default: return 'Brouillon';
                }
              };
              
              const getQuoteStatusStyle = (status: CommercialDocumentStatus | null) => {
                if (!status) return { bg: 'rgba(148, 163, 184, 0.15)', color: '#64748b' };
                const styles: Record<CommercialDocumentStatus, { bg: string; color: string }> = {
                  'brouillon': { bg: 'rgba(148, 163, 184, 0.15)', color: '#64748b' },
                  'envoyé': { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
                  'accepté': { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
                  'refusé': { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
                  'payé': { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
                };
                return styles[status] || styles.brouillon;
              };

              return (
                <motion.div
                  key={eng.id}
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
                    borderLeft: `4px solid ${
                      isCompleted 
                        ? 'var(--accent)' 
                        : isQuote 
                        ? '#10b981' 
                        : 'rgba(var(--border-rgb), 0.4)'
                    }`,
                  }}
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedEngagementId(null);
                    } else {
                      setExpandedEngagementId(eng.id);
                    }
                  }}
                >
                  {/* Ligne principale - Toujours visible */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--space-sm)',
                    width: '100%',
                  }}>
                    {/* Icône de temps */}
                    <div 
                      style={{
                        width: isExpanded ? '56px' : '40px',
                        height: isExpanded ? '56px' : '40px',
                        minWidth: isExpanded ? '56px' : '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 'var(--radius-md)',
                        background: isCompleted 
                          ? 'rgba(var(--accent-rgb), 0.1)' 
                          : isQuote
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(var(--border-rgb), 0.1)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <AccessTime style={{ 
                        fontSize: isExpanded ? '24px' : '18px', 
                        color: isCompleted ? 'var(--accent)' : isQuote ? '#10b981' : 'var(--muted)',
                      }} />
                    </div>

                    {/* Informations principales */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        <h3 
                          className="text-body" 
                          style={{ 
                            margin: 0, 
                            color: 'var(--text)',
                            fontSize: isExpanded ? '18px' : '15px',
                            fontWeight: '600',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: isExpanded ? 'normal' : 'nowrap',
                          }}
                        >
                          {getServiceName(eng)}
                        </h3>
                        {isQuote && !isCompleted && (
                          <span className="badge-modern" style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                          }}>
                            DEVIS
                          </span>
                        )}
                        {isCompleted && (
                          <span className="badge-modern badge-primary" style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                          }}>
                            ✓
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        <span className="text-caption" style={{ 
                          fontSize: '12px',
                          color: 'var(--muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {getClientName(eng.clientId)}
                        </span>
                        <span className="text-caption" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          • {timeStr}
                        </span>
                        {!isExpanded && totals.price > 0 && (
                          <span className="text-caption" style={{ 
                            fontSize: '12px', 
                            color: 'var(--accent)',
                            fontWeight: '600',
                            marginLeft: 'auto',
                          }}>
                            {formatCurrency(totals.price + totals.surcharge)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions rapides compactes */}
                    {!isExpanded && (
                      <div 
                        style={{ 
                          display: 'flex', 
                          gap: '4px', 
                          flexShrink: 0,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isCompleted ? (
                          !eng.invoiceNumber ? (
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleCreateInvoice(eng);
                              }}
                              className="btn-icon"
                              style={{ 
                                width: '32px', 
                                height: '32px', 
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(var(--accent-rgb), 0.1)',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Receipt style={{ fontSize: '16px', color: 'var(--accent)' }} />
                            </motion.button>
                          ) : null
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleStartService(eng);
                            }}
                            className="btn-icon"
                            style={{ 
                              width: '32px', 
                              height: '32px', 
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(var(--accent-rgb), 0.1)',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <PlayArrow style={{ fontSize: '16px', color: 'var(--accent)' }} />
                          </motion.button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Détails expandés */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-md)',
                        paddingTop: 'var(--space-md)',
                        borderTop: '1px solid rgba(var(--border-rgb), 0.1)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Informations détaillées avec sections pliables */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {/* Section Devis (pliante, si c'est un devis) */}
                        {isQuote && (eng.quoteNumber || eng.quoteStatus || eng.quoteName) && (
                          <div style={{ border: '1px solid rgba(var(--border-rgb), 0.1)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSection('devis');
                              }}
                              style={{
                                width: '100%',
                                padding: 'var(--space-sm) var(--space-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                gap: 'var(--space-sm)',
                              }}
                            >
                              <span style={{ fontSize: '14px', fontWeight: '600', color: '#10b981' }}>Informations du devis</span>
                              {sectionsExpanded.devis ? <ExpandLess style={{ fontSize: '20px', color: '#10b981' }} /> : <ExpandMore style={{ fontSize: '20px', color: '#10b981' }} />}
                            </button>
                            {sectionsExpanded.devis && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ padding: '0 var(--space-md) var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}
                              >
                                {eng.quoteName && (
                                  <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: eng.quoteNumber || eng.quoteStatus ? '1px solid rgba(var(--border-rgb), 0.04)' : 'none' }}>
                                    <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.1)' }}>
                                      <Description style={{ fontSize: '18px', color: '#10b981' }} />
                                    </div>
                                    <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                      <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Nom du devis</span>
                                      <span className="info-row-value" style={{ fontSize: '14px', fontWeight: '600' }}>
                                        {eng.quoteName}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {eng.quoteNumber && (
                                  <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: eng.quoteStatus ? '1px solid rgba(var(--border-rgb), 0.04)' : 'none' }}>
                                    <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.1)' }}>
                                      <Info style={{ fontSize: '18px', color: '#10b981' }} />
                                    </div>
                                    <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                      <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Numéro</span>
                                      <span className="info-row-value" style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                                        {eng.quoteNumber}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {eng.quoteStatus && (
                                  <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: 'none' }}>
                                    <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.1)' }}>
                                      <CheckCircle style={{ fontSize: '18px', color: '#10b981' }} />
                                    </div>
                                    <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                      <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Statut</span>
                                      <span className="badge-modern" style={{
                                        fontSize: '12px',
                                        padding: '2px 8px',
                                        ...getQuoteStatusStyle(eng.quoteStatus),
                                      }}>
                                        {getQuoteStatusLabel(eng.quoteStatus)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        )}

                        {/* Section Client (pliante) */}
                        {client && (
                          <div style={{ border: '1px solid rgba(var(--border-rgb), 0.1)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSection('client');
                              }}
                              style={{
                                width: '100%',
                                padding: 'var(--space-sm) var(--space-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                gap: 'var(--space-sm)',
                              }}
                            >
                              <span style={{ fontSize: '14px', fontWeight: '600' }}>Client</span>
                              {sectionsExpanded.client ? <ExpandLess style={{ fontSize: '20px' }} /> : <ExpandMore style={{ fontSize: '20px' }} />}
                            </button>
                            {sectionsExpanded.client && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ padding: '0 var(--space-md) var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}
                              >
                                <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: client.phone || client.email || client.address || client.city ? '1px solid rgba(var(--border-rgb), 0.04)' : 'none' }}>
                                  <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                    <Person style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                  </div>
                                  <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                    <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Nom</span>
                                    <span className="info-row-value" style={{ fontSize: '14px', fontWeight: '600' }}>
                                      {client.name}
                                    </span>
                                  </div>
                                </div>
                                {client.phone && (
                                  <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: client.email || client.address || client.city ? '1px solid rgba(var(--border-rgb), 0.04)' : 'none' }}>
                                    <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                      <Phone style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                    </div>
                                    <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                      <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Téléphone</span>
                                      <span className="info-row-value" style={{ fontSize: '14px' }}>
                                        {client.phone}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {client.email && (
                                  <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: client.address || client.city ? '1px solid rgba(var(--border-rgb), 0.04)' : 'none' }}>
                                    <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                      <Email style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                    </div>
                                    <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                      <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Email</span>
                                      <span className="info-row-value" style={{ fontSize: '14px' }}>
                                        {client.email}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {(client.address || client.city) && (
                                  <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: 'none' }}>
                                    <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                      <LocationOn style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                    </div>
                                    <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                      <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Adresse</span>
                                      <span className="info-row-value" style={{ fontSize: '14px' }}>
                                        {[client.address, client.city].filter(Boolean).join(', ') || 'Non renseignée'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        )}

                        {/* Section Prestation (pliante) */}
                        <div style={{ 
                          border: '2px solid rgba(var(--border-rgb), 0.15)', 
                          borderRadius: 'var(--radius-md)', 
                          overflow: 'hidden',
                          background: 'rgba(var(--border-rgb), 0.02)'
                        }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSection('prestation');
                            }}
                            style={{
                              width: '100%',
                              padding: 'var(--space-md)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: sectionsExpanded.prestation ? 'rgba(var(--accent-rgb), 0.05)' : 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              gap: 'var(--space-sm)',
                              transition: 'background-color 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                              <Description style={{ fontSize: '20px', color: 'var(--accent)' }} />
                              <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>Prestations</span>
                            </div>
                            {sectionsExpanded.prestation ? <ExpandLess style={{ fontSize: '22px', color: 'var(--accent)' }} /> : <ExpandMore style={{ fontSize: '22px', color: 'var(--muted)' }} />}
                          </button>
                          {sectionsExpanded.prestation && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              style={{ 
                                padding: 'var(--space-md)', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: 'var(--space-md)',
                                background: 'rgba(var(--surface-rgb), 0.5)'
                              }}
                            >

                            {/* Date et heure */}
                            {engDate && (
                              <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid rgba(var(--border-rgb), 0.04)' }}>
                                <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                  <CalendarToday style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                </div>
                                <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                  <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Date et heure</span>
                                  <span className="info-row-value" style={{ fontSize: '14px' }}>
                                    {format(engDate, 'EEEE d MMMM yyyy', { locale: fr })} à {timeStr}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Durée totale estimée */}
                            {estimatedDurationMinutes > 0 && (
                              <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid rgba(var(--border-rgb), 0.04)' }}>
                                <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                  <AccessTime style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                </div>
                                <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                  <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Durée totale estimée</span>
                                  <span className="info-row-value" style={{ fontSize: '14px', fontWeight: '600' }}>
                                    {formatDuration(estimatedDurationMinutes)}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Prix total estimé */}
                            {totals.price > 0 && (
                              <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid rgba(var(--border-rgb), 0.04)' }}>
                                <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                  <AttachMoney style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                </div>
                                <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                  <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Prix total estimé</span>
                                  <span className="info-row-value" style={{ fontSize: '16px', fontWeight: '600', color: 'var(--accent)' }}>
                                    {formatCurrency(totals.price + totals.surcharge)}
                                    {totals.surcharge > 0 && (
                                      <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--muted)', marginLeft: 'var(--space-xs)' }}>
                                        (dont {formatCurrency(totals.surcharge)} supplément)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Détails des prestations */}
                            {(() => {
                              // Si c'est un devis avec plusieurs prestations (eng.services)
                              if (eng.services && Array.isArray(eng.services) && eng.services.length > 0) {
                                const serviceItemsDetails = eng.services
                                  .map((servItem) => computeServiceItemDetails(servItem))
                                  .filter(Boolean) as Array<NonNullable<ReturnType<typeof computeServiceItemDetails>>>;
                                
                                // Afficher toutes les prestations, même si elles n'ont pas d'options
                                if (serviceItemsDetails.length > 0) {
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span className="info-row-label" style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', letterSpacing: '0.3px' }}>
                                          Prestations
                                        </span>
                                        <span style={{ 
                                          fontSize: '11px', 
                                          fontWeight: '600',
                                          color: 'var(--accent)',
                                          background: 'rgba(var(--accent-rgb), 0.1)',
                                          padding: '4px 10px',
                                          borderRadius: '12px',
                                          border: '1px solid rgba(var(--accent-rgb), 0.2)'
                                        }}>
                                          {serviceItemsDetails.length} {serviceItemsDetails.length > 1 ? 'prestations' : 'prestation'}
                                        </span>
                                      </div>
                                      {serviceItemsDetails.map((details, idx) => (
                                        <div 
                                          key={idx} 
                                          style={{ 
                                            padding: 'var(--space-md)', 
                                            background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.03) 0%, rgba(var(--border-rgb), 0.05) 100%)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '2px solid rgba(var(--border-rgb), 0.15)',
                                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 'var(--space-sm)',
                                            position: 'relative',
                                            overflow: 'hidden'
                                          }}
                                        >
                                          {/* Badge numéro de prestation */}
                                          <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: 'rgba(var(--accent-rgb), 0.15)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            color: 'var(--accent)'
                                          }}>
                                            {idx + 1}
                                          </div>

                                          {/* En-tête avec nom et quantité */}
                                          <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'flex-start', 
                                            justifyContent: 'space-between', 
                                            marginBottom: 'var(--space-xs)',
                                            paddingRight: '32px'
                                          }}>
                                            <div style={{ flex: 1 }}>
                                              <h3 style={{ 
                                                fontSize: '16px', 
                                                fontWeight: '700', 
                                                color: 'var(--text)',
                                                margin: 0,
                                                marginBottom: 'var(--space-2xs)',
                                                lineHeight: '1.3'
                                              }}>
                                                {details.serviceName}
                                              </h3>
                                              {/* Descriptif de la prestation */}
                                              {details.serviceDescription && (
                                                <p style={{ 
                                                  fontSize: '13px', 
                                                  color: 'var(--muted)', 
                                                  lineHeight: '1.5', 
                                                  fontStyle: 'italic',
                                                  margin: 0,
                                                  marginTop: 'var(--space-2xs)'
                                                }}>
                                                  {details.serviceDescription}
                                                </p>
                                              )}
                                            </div>
                                            {details.quantity > 1 && (
                                              <div style={{ 
                                                marginLeft: 'var(--space-xs)',
                                                minWidth: '32px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px', 
                                                fontWeight: '700',
                                                color: 'white',
                                                background: 'var(--accent)',
                                                padding: '0 8px',
                                                borderRadius: '12px',
                                                boxShadow: '0 2px 4px rgba(var(--accent-rgb), 0.3)'
                                              }}>
                                                ×{details.quantity}
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Catégories avec style amélioré */}
                                          {(details.mainCategory || details.subCategory) && (
                                            <div style={{ 
                                              display: 'flex', 
                                              flexWrap: 'wrap', 
                                              gap: '6px', 
                                              marginBottom: 'var(--space-xs)'
                                            }}>
                                              {details.mainCategory && (
                                                <span style={{ 
                                                  fontSize: '11px', 
                                                  fontWeight: '600',
                                                  color: 'var(--accent)',
                                                  background: 'rgba(var(--accent-rgb), 0.12)',
                                                  padding: '4px 10px',
                                                  borderRadius: '12px',
                                                  border: '1px solid rgba(var(--accent-rgb), 0.2)',
                                                  textTransform: 'uppercase',
                                                  letterSpacing: '0.5px'
                                                }}>
                                                  📂 {details.mainCategory}
                                                </span>
                                              )}
                                              {details.subCategory && (
                                                <span style={{ 
                                                  fontSize: '11px', 
                                                  fontWeight: '600',
                                                  color: 'var(--text)',
                                                  background: 'rgba(var(--border-rgb), 0.15)',
                                                  padding: '4px 10px',
                                                  borderRadius: '12px',
                                                  border: '1px solid rgba(var(--border-rgb), 0.25)'
                                                }}>
                                                  {details.subCategory}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                          
                                          {/* Footer avec durée et prix - style carte */}
                                          <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            padding: 'var(--space-sm)',
                                            background: 'rgba(var(--border-rgb), 0.1)',
                                            borderRadius: 'var(--radius-sm)',
                                            marginTop: 'var(--space-xs)',
                                            border: '1px solid rgba(var(--border-rgb), 0.15)'
                                          }}>
                                            <div style={{ 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              gap: '8px'
                                            }}>
                                              <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                background: 'rgba(var(--accent-rgb), 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                              }}>
                                                <AccessTime style={{ fontSize: '16px', color: 'var(--accent)' }} />
                                              </div>
                                              <div>
                                                <div style={{ 
                                                  fontSize: '10px',
                                                  fontWeight: '600',
                                                  color: 'var(--muted)',
                                                  textTransform: 'uppercase',
                                                  letterSpacing: '0.5px',
                                                  marginBottom: '2px'
                                                }}>
                                                  Durée
                                                </div>
                                                <div style={{ 
                                                  fontSize: '14px', 
                                                  fontWeight: '700',
                                                  color: 'var(--text)'
                                                }}>
                                                  {details.duration > 0 ? formatDuration(details.duration) : 'Non définie'}
                                                </div>
                                              </div>
                                            </div>
                                            <div style={{
                                              textAlign: 'right'
                                            }}>
                                              <div style={{ 
                                                fontSize: '10px',
                                                fontWeight: '600',
                                                color: 'var(--muted)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                marginBottom: '2px'
                                              }}>
                                                Prix
                                              </div>
                                              <div style={{ 
                                                fontSize: '18px', 
                                                fontWeight: '700', 
                                                color: 'var(--accent)',
                                                letterSpacing: '-0.3px'
                                              }}>
                                                {formatCurrency(details.price)}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                              }
                              
                              // Sinon, prestation unique avec optionIds
                              if (service && eng.optionIds && Array.isArray(eng.optionIds) && eng.optionIds.length > 0) {
                                const optionsWithNames = eng.optionIds
                                  .map((optionId) => {
                                    const option = service.options?.find((opt) => opt.id === optionId);
                                    return option ? { id: optionId, name: option.name } : null;
                                  })
                                  .filter(Boolean) as Array<{ id: string; name: string }>;
                                
                                if (optionsWithNames.length > 0) {
                                  return (
                                    <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid rgba(var(--border-rgb), 0.04)' }}>
                                      <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                        <Info style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                      </div>
                                      <div className="info-row-content" style={{ gap: 'var(--space-2xs)', flex: 1 }}>
                                        <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Options</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          {optionsWithNames.map((opt) => (
                                            <span key={opt.id} className="info-row-value" style={{ fontSize: '14px' }}>
                                              • {opt.name}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              
                              return null;
                            })()}

                            {/* Durée réelle (si complété) */}
                            {isCompleted && eng.mobileDurationMinutes && (
                              <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: (eng.mobileCompletionComment || eng.mobileMajoration || eng.mobilePourboire) ? '1px solid rgba(var(--border-rgb), 0.04)' : 'none' }}>
                                <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                  <CheckCircle style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                </div>
                                <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                  <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Durée réelle</span>
                                  <span className="info-row-value" style={{ fontSize: '14px' }}>
                                    {formatDuration(eng.mobileDurationMinutes)}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Commentaire (si complété) */}
                            {isCompleted && eng.mobileCompletionComment && (
                              <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: (eng.mobileMajoration || eng.mobilePourboire) ? '1px solid rgba(var(--border-rgb), 0.04)' : 'none' }}>
                                <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                  <Description style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                </div>
                                <div className="info-row-content" style={{ gap: 'var(--space-2xs)', flex: 1 }}>
                                  <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Commentaire</span>
                                  <span className="info-row-value" style={{ fontSize: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {eng.mobileCompletionComment}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Majoration et Pourboire (si complété) */}
                            {isCompleted && (eng.mobileMajoration || eng.mobilePourboire) && (
                              <div className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: 'none' }}>
                                <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                  <AttachMoney style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                </div>
                                <div className="info-row-content" style={{ gap: 'var(--space-2xs)', flex: 1 }}>
                                  <span className="info-row-label" style={{ fontSize: '12px', fontWeight: '500' }}>Majoration / Pourboire</span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {eng.mobileMajoration && eng.mobileMajoration > 0 && (
                                      <span className="info-row-value" style={{ fontSize: '14px' }}>
                                        Majoration : {formatCurrency(eng.mobileMajoration)}
                                      </span>
                                    )}
                                    {eng.mobilePourboire && eng.mobilePourboire > 0 && (
                                      <span className="info-row-value" style={{ fontSize: '14px' }}>
                                        Pourboire : {formatCurrency(eng.mobilePourboire)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            </motion.div>
                          )}
                        </div>

                        {/* Section Collaborateurs (pliante) */}
                        {eng.assignedUserIds && eng.assignedUserIds.length > 0 && (
                          <div style={{ border: '1px solid rgba(var(--border-rgb), 0.1)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSection('collaborateur');
                              }}
                              style={{
                                width: '100%',
                                padding: 'var(--space-sm) var(--space-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                gap: 'var(--space-sm)',
                              }}
                            >
                              <span style={{ fontSize: '14px', fontWeight: '600' }}>Collaborateurs</span>
                              {sectionsExpanded.collaborateur ? <ExpandLess style={{ fontSize: '20px' }} /> : <ExpandMore style={{ fontSize: '20px' }} />}
                            </button>
                            {sectionsExpanded.collaborateur && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ padding: '0 var(--space-md) var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}
                              >
                                {eng.assignedUserIds.map((assignedId, idx) => {
                                  const member = projectMembers.find((m) => m.id === assignedId);
                                  const memberName = member ? `${member.firstName} ${member.lastName}` : assignedId;
                                  return (
                                    <div key={assignedId} className="info-row" style={{ padding: 'var(--space-xs) 0', borderBottom: idx < eng.assignedUserIds.length - 1 ? '1px solid rgba(var(--border-rgb), 0.04)' : 'none' }}>
                                      <div className="info-row-icon" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb), 0.1)' }}>
                                        <Person style={{ fontSize: '18px', color: 'var(--accent)' }} />
                                      </div>
                                      <div className="info-row-content" style={{ gap: 'var(--space-2xs)' }}>
                                        <span className="info-row-value" style={{ fontSize: '14px' }}>
                                          {memberName}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ 
                        display: 'flex',
                        gap: 'var(--space-xs)',
                        flexWrap: 'wrap',
                      }}>
                        {isCompleted ? (
                          !eng.invoiceNumber ? (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateInvoice(eng);
                              }}
                              className="btn-base btn-secondary"
                              style={{
                                flex: 1,
                                padding: 'var(--space-sm) var(--space-md)',
                                fontSize: '13px',
                                minWidth: '120px',
                              }}
                            >
                              <Receipt style={{ fontSize: '16px', marginRight: 'var(--space-xs)' }} />
                              Créer facture
                            </motion.button>
                          ) : (
                            <div className="badge-modern badge-primary" style={{
                              padding: 'var(--space-sm) var(--space-md)',
                              fontSize: '12px',
                            }}>
                              <CheckCircle style={{ fontSize: '14px', marginRight: 'var(--space-xs)' }} />
                              {eng.invoiceNumber}
                            </div>
                          )
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartService(eng);
                            }}
                            className="btn-base btn-primary"
                            style={{
                              flex: 1,
                              padding: 'var(--space-md) var(--space-lg)',
                              fontSize: '14px',
                            }}
                          >
                            <PlayArrow style={{ fontSize: '18px', marginRight: 'var(--space-xs)' }} />
                            {isQuote ? 'Démarrer devis' : 'Démarrer'}
                          </motion.button>
                        )}
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToAppleCalendar(eng);
                          }}
                          className="btn-base btn-secondary"
                          style={{
                            padding: 'var(--space-sm)',
                            minWidth: '44px',
                          }}
                        >
                          <CalendarToday style={{ fontSize: '18px' }} />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </>
        ) : selectedDay ? (
          <div style={{
            padding: 'var(--space-3xl) var(--space-lg)',
            textAlign: 'center',
            color: 'var(--muted)',
          }}>
            <CalendarToday style={{ fontSize: '48px', opacity: 0.3, marginBottom: 'var(--space-md)' }} />
            <p className="text-body-lg" style={{
              margin: 0,
              opacity: 0.7,
            }}>
              Aucune prestation prévue
            </p>
            <p className="text-caption" style={{
              margin: 'var(--space-xs) 0 0 0',
              opacity: 0.6,
            }}>
              Créez un service pour commencer
            </p>
          </div>
        ) : null}
      </div>

      {showCreateForm && (
        <MobileCreateServiceForm
          clients={clients}
          services={services}
          companies={companies}
          onCreate={(data) => {
            addEngagement(data);
            setShowCreateForm(false);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {activeTimer && (() => {
        // Calculer les détails de la prestation
        const serviceDetails = (() => {
          // Si c'est une prestation d'un devis multiple
          if ((activeTimer as any).quoteParentId && typeof (activeTimer as any).quoteServiceIndex === 'number') {
            const parentId = (activeTimer as any).quoteParentId;
            const serviceIndex = (activeTimer as any).quoteServiceIndex;
            const parentEngagement = engagements.find(e => e.id === parentId);
            if (parentEngagement?.services?.[serviceIndex]) {
              const details = computeServiceItemDetails(parentEngagement.services[serviceIndex]);
              if (details) {
                return {
                  serviceName: details.serviceName,
                  serviceDescription: details.serviceDescription,
                  mainCategory: details.mainCategory,
                  subCategory: details.subCategory,
                  price: details.price,
                  duration: details.duration,
                };
              }
            }
          }
          // Pour un service normal, calculer depuis l'engagement
          const service = servicesById.get(activeTimer.serviceId);
          if (!service) return null;
          
          const optionIds = activeTimer.optionIds || [];
          const overrides = activeTimer.optionOverrides || {};
          
          // Calculer le prix
          let servicePrice = 0;
          if (service.options && Array.isArray(service.options) && optionIds.length > 0) {
            servicePrice = service.options
              .filter((option) => optionIds.includes(option.id))
              .reduce((acc, option) => {
                const override = overrides[option.id];
                const optionQuantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
                const unitPrice = override?.unitPriceHT ?? option.unitPriceHT;
                return acc + unitPrice * optionQuantity;
              }, 0);
          }
          
          // Calculer la durée
          let serviceDuration = 0;
          if (service.options && Array.isArray(service.options) && optionIds.length > 0) {
            serviceDuration = service.options
              .filter((option) => optionIds.includes(option.id))
              .reduce((acc, option) => {
                const override = overrides[option.id];
                const optionQuantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
                const durationValue = override?.durationMin ?? option.defaultDurationMin ?? 0;
                return acc + durationValue * optionQuantity;
              }, 0);
          }
          
          // Récupérer la catégorie
          const mainCategory = service.category ? categories.find((cat) => cat.name === service.category) : null;
          
          return {
            service,
            serviceName: service.name,
            serviceDescription: service.description || null,
            mainCategory: mainCategory?.name || service.category || null,
            subCategory: null,
            price: servicePrice,
            duration: serviceDuration,
          };
        })();
        
        return (
          <ServiceTimer
            engagement={activeTimer}
            serviceName={serviceDetails?.serviceName || getServiceName(activeTimer)}
            clientName={getClientName(activeTimer.clientId)}
            serviceDetails={serviceDetails}
            onStop={(durationMinutes, comment, majoration, pourboire) => handleStopTimer(activeTimer.id, durationMinutes, comment, majoration, pourboire)}
            onCancel={() => setActiveTimer(null)}
          />
        );
      })()}

      {showInvoiceForm && (() => {
        const client = clients.find((c) => c.id === showInvoiceForm.clientId);
        const service = services.find((s) => s.id === showInvoiceForm.serviceId);
        const company = companies.find((c) => c.isDefault) || companies[0];
        
        if (!client || !service || !company) {
          return null;
        }

        return (
          <CreateInvoiceFromService
            engagement={showInvoiceForm}
            client={client}
            service={service}
            company={company}
            onSuccess={handleInvoiceSuccess}
            onCancel={() => setShowInvoiceForm(null)}
          />
        );
      })()}

      {/* Modal pour proposer la prestation suivante */}
      {showNextServicePrompt && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div className="mobile-card" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="mobile-card__header">
              <h2 className="mobile-card__title">Prestation suivante</h2>
            </div>

            <div className="mobile-card__section">
              <p style={{ marginBottom: '16px', color: 'var(--text)', fontSize: '14px' }}>
                La prestation précédente est terminée. Souhaitez-vous démarrer la prestation suivante ?
              </p>
              
              {(() => {
                const nextServiceItem = showNextServicePrompt.engagement.services?.[showNextServicePrompt.nextIndex];
                const nextService = nextServiceItem ? servicesById.get(nextServiceItem.serviceId) : null;
                
                if (!nextService) return null;
                
                return (
                  <div style={{ 
                    padding: '12px', 
                    background: 'var(--bg)', 
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      {showNextServicePrompt.nextIndex + 1}. {nextService.name}
                    </div>
                    {nextServiceItem.quantity > 1 && (
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        Quantité: ×{nextServiceItem.quantity}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleStartSpecificService(showNextServicePrompt.engagement, showNextServicePrompt.nextIndex);
                    setShowNextServicePrompt(null);
                  }}
                  className="mobile-button mobile-button--primary"
                  style={{ flex: 1 }}
                >
                  Démarrer
                </button>
                <button
                  type="button"
                  onClick={() => setShowNextServicePrompt(null)}
                  className="mobile-button"
                  style={{ flex: 1 }}
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour le commentaire global */}
      {showGlobalCommentModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div className="mobile-card" style={{ maxWidth: '500px', width: '100%' }}>
            <div className="mobile-card__header">
              <h2 className="mobile-card__title">Commentaire global</h2>
            </div>

            <div className="mobile-card__section">
              <p style={{ marginBottom: '16px', color: 'var(--text)', fontSize: '14px' }}>
                Toutes les prestations sont terminées. Ajoutez un commentaire global pour ce devis (optionnel).
              </p>
              
              <textarea
                id="global-comment"
                value={globalComment}
                onChange={(e) => setGlobalComment(e.target.value)}
                placeholder="Ajoutez un commentaire global pour toutes les prestations..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  marginBottom: '16px',
                }}
              />

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={async () => {
                    console.log('💾 [MobilePrestations] ========== ENREGISTREMENT COMMENTAIRE GLOBAL ==========');
                    console.log('💾 [MobilePrestations] Données avant création des services:', {
                      engagementId: showGlobalCommentModal.engagement.id,
                      quoteNumber: showGlobalCommentModal.engagement.quoteNumber,
                      quoteName: (showGlobalCommentModal.engagement as any).quoteName,
                      servicesCount: showGlobalCommentModal.engagement.services?.length || 0,
                      completedServicesCount: showGlobalCommentModal.completedServices.size,
                      globalComment: globalComment.trim() || 'absent',
                      globalCommentLength: globalComment.trim().length || 0,
                    });
                    console.log('💾 [MobilePrestations] CompletedServices détaillés:', 
                      Array.from(showGlobalCommentModal.completedServices.entries()).map(([idx, data]) => ({
                        serviceIndex: idx,
                        duration: data.duration,
                        hasComment: !!data.comment,
                        commentLength: data.comment?.length || 0,
                      }))
                    );
                    
                    await createServicesFromQuote(
                      showGlobalCommentModal.engagement,
                      showGlobalCommentModal.completedServices,
                      globalComment.trim() || undefined
                    );
                    
                    console.log('💾 [MobilePrestations] Services créés, fermeture modale');
                    setGlobalComment('');
                    setShowGlobalCommentModal(null);
                    console.log('💾 [MobilePrestations] ========== FIN ENREGISTREMENT COMMENTAIRE GLOBAL ==========');
                  }}
                  className="mobile-button mobile-button--primary"
                  style={{ flex: 1 }}
                >
                  Enregistrer dans Prestations
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGlobalComment('');
                    setShowGlobalCommentModal(null);
                  }}
                  className="mobile-button"
                  style={{ flex: 1 }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de prestation pour les devis multiples */}
      {showServiceSelectionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div className="mobile-card" style={{ maxWidth: '500px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="mobile-card__header">
              <h2 className="mobile-card__title">Choisir une prestation</h2>
              <button
                type="button"
                onClick={() => setShowServiceSelectionModal(null)}
                className="mobile-icon-button"
              >
                ✕
              </button>
            </div>

            <div className="mobile-card__section">
              <p style={{ marginBottom: '16px', color: 'var(--muted)', fontSize: '14px' }}>
                {(() => {
                  const completedMap = completedServicesForQuote.get(showServiceSelectionModal.id) || new Map<number, { duration: number; comment?: string }>();
                  const hasCompleted = completedMap.size > 0;
                  return hasCompleted 
                    ? 'Quelle prestation souhaitez-vous démarrer maintenant ?'
                    : 'Ce devis contient plusieurs prestations. Quelle prestation souhaitez-vous démarrer en premier ?';
                })()}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {showServiceSelectionModal.services?.map((serviceItem, index) => {
                  const service = servicesById.get(serviceItem.serviceId);
                  const completedMap = completedServicesForQuote.get(showServiceSelectionModal.id) || new Map<number, { duration: number; comment?: string }>();
                  const isCompleted = completedMap.has(index);
                  
                  if (!service) return null;

                  const serviceDetails = computeServiceItemDetails(serviceItem);

                  return (
                    <motion.button
                      key={index}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStartSpecificService(showServiceSelectionModal, index)}
                      disabled={isCompleted}
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${isCompleted ? 'var(--success)' : 'var(--border)'}`,
                        background: isCompleted ? 'rgba(var(--success-rgb), 0.1)' : 'var(--surface)',
                        cursor: isCompleted ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        opacity: isCompleted ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
                              {index + 1}. {service.name}
                            </span>
                            {serviceItem.quantity > 1 && (
                              <span style={{ fontSize: '12px', color: 'var(--muted)', background: 'var(--bg)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                                ×{serviceItem.quantity}
                              </span>
                            )}
                            {isCompleted && (
                              <CheckCircle style={{ fontSize: '18px', color: 'var(--success)' }} />
                            )}
                          </div>
                          {serviceDetails && (
                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                              {serviceDetails.mainCategory && (
                                <span>{serviceDetails.mainCategory}</span>
                              )}
                              {serviceDetails.subCategory && (
                                <span> • {serviceDetails.subCategory}</span>
                              )}
                              {serviceDetails.duration > 0 && (
                                <span> • {formatDuration(serviceDetails.duration)}</span>
                              )}
                              {serviceDetails.price > 0 && (
                                <span> • {formatCurrency(serviceDetails.price)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {isCompleted && (
                        <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '8px', fontWeight: '600' }}>
                          ✓ Prestation terminée
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="mobile-card__section" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowServiceSelectionModal(null)}
                className="mobile-button"
                style={{ width: '100%' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

interface MobileCreateServiceFormProps {
  clients: Client[];
  services: Service[];
  companies: Company[];
  onCreate: (data: Partial<Engagement>) => void;
  onCancel: () => void;
}

interface SelectedServiceItem {
  serviceId: string;
  optionIds: string[];
  supportType: SupportType;
  supportDetail: string;
}

const MobileCreateServiceForm: React.FC<MobileCreateServiceFormProps> = ({
  clients,
  services,
  companies,
  onCreate,
  onCancel,
}) => {
  const currentUserId = useAppData((state) => state.currentUserId);
  const categories = useAppData((state) => state.categories) || [];
  const activeCompanyId = useAppData((state) => state.activeCompanyId);
  const vatEnabled = useAppData((state) => state.vatEnabled);
  const vatRate = useAppData((state) => state.vatRate);
  const computeEngagementTotals = useAppData((state) => state.computeEngagementTotals);
  
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [supportType, setSupportType] = useState<SupportType>('Voiture');
  const [supportDetail, setSupportDetail] = useState('');
  const [additionalCharge, setAdditionalCharge] = useState(0);

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const selectedClient = clients.find((c) => c.id === selectedClientId);
  
  // Calculer le prix
  const draft: EngagementDraft = {
    clientId: selectedClientId,
    companyId: selectedCompanyId || activeCompanyId || '',
    scheduledAt: selectedDate,
    serviceId: selectedServiceId,
    optionIds: selectedOptionIds,
    optionOverrides: {},
    status: 'planifié',
    kind: 'service',
    supportType,
    supportDetail,
    additionalCharge,
    contactIds: [],
    planningUser: null,
    startTime: selectedTime,
    assignedUserId: currentUserId || '',
  };

  const previewEngagement = selectedServiceId && selectedClientId
    ? buildPreviewEngagement(draft, 'service')
    : null;

  const totals = previewEngagement
    ? computeEngagementTotals(previewEngagement)
    : { price: 0, duration: 0, surcharge: additionalCharge };

  const selectedCompany = companies.find((c) => c.id === (selectedCompanyId || activeCompanyId));
  const vatEnabledForService = selectedCompany?.vatEnabled ?? vatEnabled;
  const vatAmount = vatEnabledForService ? totals.price * (vatRate / 100) : 0;
  const finalPrice = totals.price + totals.surcharge;
  const totalTtc = finalPrice + vatAmount;

  const handleAddService = () => {
    if (!selectedServiceId) {
      alert('Veuillez sélectionner une prestation.');
      return;
    }

    // Vérifier si la prestation n'est pas déjà dans la liste
    if (selectedServices.some(s => s.serviceId === selectedServiceId)) {
      alert('Cette prestation est déjà dans la liste.');
      return;
    }

    const newService: SelectedServiceItem = {
      serviceId: selectedServiceId,
      optionIds: [...selectedOptionIds],
      supportType,
      supportDetail: supportDetail.trim(),
    };

    setSelectedServices([...selectedServices, newService]);
    
    // Réinitialiser les champs de sélection
    setSelectedServiceId('');
    setSelectedOptionIds([]);
    setSupportDetail('');
  };

  const handleRemoveService = (index: number) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId || !selectedDate || !selectedTime || !currentUserId) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (selectedServices.length === 0) {
      alert('Veuillez ajouter au moins une prestation.');
      return;
    }

    const dateTime = `${selectedDate}T${selectedTime}:00`;
    
    // Créer un engagement pour chaque prestation sélectionnée
    selectedServices.forEach((serviceItem) => {
      onCreate({
        clientId: selectedClientId,
        companyId: selectedCompanyId || activeCompanyId || undefined,
        serviceId: serviceItem.serviceId,
        optionIds: serviceItem.optionIds,
        scheduledAt: dateTime,
        status: 'planifié',
        kind: 'service',
        supportType: serviceItem.supportType,
        supportDetail: serviceItem.supportDetail,
        additionalCharge: 0,
        contactIds: [],
        assignedUserIds: [currentUserId],
        sendHistory: [],
        invoiceNumber: null,
        invoiceVatEnabled: null,
        quoteNumber: null,
        quoteStatus: null,
      });
    });
  };

  // Sélection automatique des options actives quand un service est sélectionné
  React.useEffect(() => {
    if (selectedService) {
      const activeOptionIds = selectedService.options
        .filter(opt => opt.active)
        .map(opt => opt.id);
      if (activeOptionIds.length > 0 && JSON.stringify(selectedOptionIds) !== JSON.stringify(activeOptionIds)) {
        setSelectedOptionIds(activeOptionIds);
      }
      // Définir automatiquement le support selon la catégorie
      const autoSupportType = (selectedService.category === 'Autre' ? 'Textile' : selectedService.category) as SupportType;
      if (autoSupportType !== supportType) {
        setSupportType(autoSupportType);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId]);

  // Définir l'entreprise par défaut quand un client est sélectionné
  React.useEffect(() => {
    if (selectedClient && !selectedCompanyId && companies.length > 0) {
      const defaultCompany = companies.find((c) => c.isDefault) || companies[0];
      if (defaultCompany) {
        setSelectedCompanyId(defaultCompany.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div className="mobile-card" style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="mobile-card__header">
          <h2 className="mobile-card__title">Créer un service</h2>
          <button type="button" onClick={onCancel} className="mobile-icon-button">
            ✕
          </button>
        </div>

        <form className="mobile-form-grid" onSubmit={handleSubmit}>
          {/* SECTION : Contexte */}
          <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#0f172a' }}>Contexte</h3>
          </div>

          <div className="mobile-field">
            <label htmlFor="client-select">
              <span>Client *</span>
            </label>
            <select
              id="client-select"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              required
            >
              <option value="">Sélectionner un client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {selectedClient && (
            <div className="mobile-field">
              <label htmlFor="company-select">
                <span>Entreprise *</span>
              </label>
              <select
                id="company-select"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                required
              >
                <option value="">Sélectionner une entreprise</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SECTION : Prestation */}
          <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginTop: '12px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#0f172a' }}>Prestation</h3>
          </div>

          {/* Liste des prestations sélectionnées */}
          {selectedServices.length > 0 && (
            <div className="mobile-field" style={{ gridColumn: '1 / -1' }}>
              <label>
                <span>Prestations sélectionnées ({selectedServices.length})</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedServices.map((serviceItem, index) => {
                  const service = services.find((s) => s.id === serviceItem.serviceId);
                  return (
                    <div
                      key={index}
                      style={{
                        padding: '10px 12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>
                          {service?.name || 'Service inconnu'}
                        </div>
                        {serviceItem.supportDetail && (
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {serviceItem.supportDetail}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(index)}
                        style={{
                          padding: '6px 10px',
                          background: 'transparent',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600',
                          marginLeft: '8px',
                          flexShrink: 0,
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mobile-field">
            <label htmlFor="category-select">
              <span>Support</span>
            </label>
            <select
              id="category-select"
              value={selectedCategory || selectedService?.category || ''}
              onChange={(e) => {
                const category = e.target.value as ServiceCategory | '';
                setSelectedCategory(category);
                if (category) {
                  const firstServiceInCategory = services.find((s) => s.category === category && s.active);
                  if (firstServiceInCategory) {
                    const autoSupportType = (category === 'Autre' ? 'Textile' : category) as SupportType;
                    setSelectedServiceId(firstServiceInCategory.id);
                    setSupportType(autoSupportType);
                    const activeOptionIds = firstServiceInCategory.options
                      .filter(opt => opt.active)
                      .map(opt => opt.id);
                    setSelectedOptionIds(activeOptionIds);
                  }
                } else {
                  setSelectedServiceId('');
                  setSelectedOptionIds([]);
                }
              }}
            >
              <option value="">Toutes les catégories</option>
              {categories
                .filter((cat) => cat.active)
                .map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="mobile-field">
            <label htmlFor="service-select">
              <span>Produits et services</span>
            </label>
            <select
              id="service-select"
              value={selectedServiceId}
              onChange={(e) => {
                const service = services.find((s) => s.id === e.target.value);
                if (service) {
                  const autoSupportType = (service.category === 'Autre' ? 'Textile' : service.category) as SupportType;
                  setSelectedServiceId(e.target.value);
                  setSupportType(autoSupportType);
                  const activeOptionIds = service.options
                    .filter(opt => opt.active)
                    .map(opt => opt.id);
                  setSelectedOptionIds(activeOptionIds);
                } else {
                  setSelectedServiceId(e.target.value);
                  setSelectedOptionIds([]);
                }
              }}
            >
              <option value="">Sélectionner un produit</option>
              {(() => {
                const category = selectedService?.category;
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
            {selectedService && (
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Prix, durée et support déterminés automatiquement
              </p>
            )}
          </div>

          {selectedService && (
            <div className="mobile-field">
              <label htmlFor="support-detail">
                <span>Détail du support</span>
              </label>
              <input
                id="support-detail"
                type="text"
                value={supportDetail}
                onChange={(e) => setSupportDetail(e.target.value)}
                placeholder="Ex: Modèle, dimensions, couleur, état..."
              />
            </div>
          )}

          {selectedService && (
            <div className="mobile-field" style={{ gridColumn: '1 / -1' }}>
              <button
                type="button"
                onClick={handleAddService}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Add style={{ fontSize: '18px' }} />
                Ajouter cette prestation
              </button>
            </div>
          )}

          {/* SECTION : Planification */}
          <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginTop: '12px', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#0f172a' }}>Planification</h3>
          </div>

          <div className="mobile-field">
            <label htmlFor="date-select">
              <span>Date d'intervention *</span>
            </label>
            <input
              id="date-select"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
            />
          </div>

          <div className="mobile-field">
            <label htmlFor="time-select">
              <span>Heure de début *</span>
            </label>
            <input
              id="time-select"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
            />
          </div>


          <div className="mobile-actions">
            <button type="button" onClick={onCancel} className="mobile-button">
              Annuler
            </button>
            <button type="submit" className="mobile-button mobile-button--primary">
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MobilePrestationsPage;

