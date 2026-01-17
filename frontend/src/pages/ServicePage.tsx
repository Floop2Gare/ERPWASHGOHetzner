import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useGoogleCalendarEvents } from '../hooks/useGoogleCalendarEvents';

import { Button } from '../components/Button';
import {
  IconArchive,
  IconDocument,
  IconDuplicate,
  IconEdit,
  IconPaperPlane,
  IconPrinter,
  IconReceipt,
} from '../components/icons';
import { ClipboardList, Clock3, Download, Euro, Filter, Plus, SlidersHorizontal, X, ArrowRightLeft, Check, CheckCircle2, Building2, FileText, Users, Calendar, Clock, Circle, Info, AlertCircle, Printer } from 'lucide-react';
import {
  CRMFeedback,
  CRMBackendStatus,
  CRMBulkActions,
  CRMModal,
  CRMModalHeader,
  CRMFormLabel,
  CRMFormInput,
  CRMFormSelect,
  CRMSubmitButton,
  CRMCancelButton,
  CRMErrorAlert,
  DateRangeFilter,
} from '../components/crm';
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
  Lead,
} from '../store/useAppData';
import { ServiceService, ClientInvoiceService, CategoryService, AppointmentService, CompanyService } from '../api';
import { formatCurrency, formatDate, formatDuration, mergeBodyWithSignature, toISODateString, splitContactName } from '../lib/format';
import { downloadCsv, type CsvValue } from '../lib/csv';
import { generateInvoicePdf, generateInvoicePdfWithMultipleServices, generateQuotePdfWithMultipleServices, generateQuoteFileName, generateInvoiceFileName, type QuoteServiceItem } from '../lib/invoice';
import { BRAND_NAME } from '../lib/branding';
import { openEmailComposer, sendDocumentEmail, SendDocumentEmailResult } from '../lib/email';
import { normalisePhone } from '../lib/phone';
import { useEntityMaps } from '../hooks/useEntityMaps';
import { ensureClientFromLead, findClientFromLead } from '../lib/clientUtils';

// Imports depuis les nouveaux modules
import type {
  EngagementDraft,
  QuickClientDraft,
  ServiceEmailPrompt,
  InvoiceEmailContext,
  OptionOverrideResolved,
} from './service/types';
import {
  SERVICE_COLUMN_CONFIG,
  SERVICE_COLUMN_ORDER,
  getDefaultColumnVisibility,
  getDefaultColumnWidths,
  type ServiceColumnId,
} from './service/constants';
import {
  createCalendarEvent,
  sanitizeDraftOverrides,
  resolveOptionOverride,
  toLocalInputValue,
  fromLocalInputValue,
  buildInitialDraft,
  buildDraftFromEngagement,
  buildPreviewEngagement,
  documentLabels,
  serviceKindStyles,
  serviceStatusStyles,
  documentTypeFromKind,
  buildLegacyDocumentNumber,
  getEngagementDocumentNumber,
  getNextInvoiceNumber,
  getNextQuoteNumber,
  sanitizeVatRate,
  computeVatMultiplier,
  formatVatRateLabel,
  formatFileSize,
} from './service/utils';
import {
  useServicePageState,
  useEngagementSelection,
  useDraftOptions,
} from './service/hooks';
import { CreateServiceForm } from '../components/CreateServiceForm';
import { LeadDetailModal } from '../components/LeadDetailModal';

const ServicePage = () => {
  const {
    engagements,
    clients,
    services,
    companies,
    activeCompanyId,
    userProfile,
    currentUserId,
    authUsers,
    documents,
    leads,
    addClient,
    addClientContact,
    addLead,
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
    categories,
    getClientEngagements,
    restoreClientContact,
  } = useAppData();

  const [backendLoading, setBackendLoading] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Fonction pour charger les services depuis le backend
  const loadServicesFromBackend = useCallback(async () => {
    if (!activeCompanyId) {
      (useAppData as any).setState({ services: [] });
      return;
    }
    
    const loadFromBackend = async () => {
      try {
        setBackendLoading(true);
        setBackendError(null);
        const result = await ServiceService.getServices();
        if (result.success && Array.isArray(result.data)) {
          // On considère que l'API renvoie déjà des objets compatibles `Service`
          (useAppData as any).setState({ services: result.data });
        } else if (!result.success) {
          setBackendError(result.error || 'Erreur lors du chargement des services.');
        }
      } catch (error: any) {
        setBackendError(error?.message || 'Erreur lors du chargement des services.');
      } finally {
        setBackendLoading(false);
      }
    };
    await loadFromBackend();
  }, [activeCompanyId]);

  // Fonction pour charger les catégories depuis le backend
  const loadCategoriesFromBackend = useCallback(async () => {
    if (!activeCompanyId) {
      return;
    }
    
    try {
      const result = await CategoryService.getCategories();
      if (result.success && Array.isArray(result.data)) {
        (useAppData as any).setState({ categories: result.data });
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  }, [activeCompanyId]);

  // Fonction pour charger les entreprises depuis le backend
  const loadCompaniesFromBackend = useCallback(async () => {
    if (!activeCompanyId) {
      return;
    }
    
    // Protection pour éviter les appels multiples
    if ((window as any).__loadingCompanies) {
      console.log('🟡 [ServicePage] Entreprises EN COURS DE CHARGEMENT - IGNORÉ');
      return;
    }
    
    if ((window as any).__companiesLoaded && companies.length > 0) {
      console.log('🟢 [ServicePage] Entreprises DÉJÀ CHARGÉES - IGNORÉ', { count: companies.length });
      return;
    }
    
    try {
      (window as any).__loadingCompanies = true;
      console.log('🏢 [ServicePage] Chargement des entreprises depuis le backend');
      const result = await CompanyService.getCompanies();
      
      if (result.success && Array.isArray(result.data)) {
        const mappedCompanies = result.data.map((c: any) => ({
          id: c.id,
          name: c.name || '',
          logoUrl: c.logoUrl || '',
          invoiceLogoUrl: c.invoiceLogoUrl || '',
          address: c.address || '',
          postalCode: c.postalCode || '',
          city: c.city || '',
          country: c.country || 'France',
          phone: c.phone || '',
          email: c.email || '',
          website: c.website || '',
          siret: c.siret || '',
          vatNumber: c.vatNumber || '',
          legalNotes: c.legalNotes || '',
          documentHeaderTitle: c.documentHeaderTitle,
          documentHeaderSubtitle: c.documentHeaderSubtitle,
          documentHeaderNote: c.documentHeaderNote,
          vatEnabled: c.vatEnabled ?? false,
          isDefault: c.isDefault ?? false,
          defaultSignatureId: c.defaultSignatureId || null,
          bankName: c.bankName,
          bankAddress: c.bankAddress,
          iban: c.iban,
          bic: c.bic,
          planningUser: c.planningUser || null,
        }));
        
        console.log('✅ [ServicePage] Entreprises chargées:', mappedCompanies.length);
        (useAppData as any).setState({ companies: mappedCompanies });
        (window as any).__companiesLoaded = true;
      } else {
        console.error('❌ [ServicePage] Erreur lors du chargement des entreprises:', result.error);
      }
    } catch (error: any) {
      console.error('❌ [ServicePage] Erreur lors du chargement des entreprises:', error);
    } finally {
      (window as any).__loadingCompanies = false;
    }
  }, [activeCompanyId, companies.length]);

  // Fonction pour charger les clients depuis le backend
  const loadClientsFromBackend = useCallback(async () => {
    if (!activeCompanyId) {
      return;
    }
    
    // Protection pour éviter les appels multiples
    if ((window as any).__loadingClients) {
      console.log('🟡 [ServicePage] Clients EN COURS DE CHARGEMENT - IGNORÉ');
      return;
    }
    
    if ((window as any).__clientsLoaded && clients.length > 0) {
      console.log('🟢 [ServicePage] Clients DÉJÀ CHARGÉS - IGNORÉ', { count: clients.length });
      return;
    }
    
    try {
      (window as any).__loadingClients = true;
      console.log('📡 [ServicePage] Appel API ClientService.getAll()');
      const { ClientService } = await import('../api');
      const result = await ClientService.getAll();
      console.log('📥 [ServicePage] Clients reçus', { success: result.success, count: result.data?.length || 0 });
      
      if (result.success && Array.isArray(result.data)) {
        const mapped: Client[] = result.data.map((c: any) => ({
          id: c.id,
          name: c.name || c.companyName || '',
          type: (c.type as 'company' | 'individual') || 'individual',
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
        
        console.log('✅ [ServicePage] Mise à jour du store avec', mapped.length, 'clients');
        (useAppData as any).setState({ clients: mapped });
        (window as any).__clientsLoaded = true;
        (window as any).__loadingClients = false;
      } else {
        console.error('[ServicePage] ❌ Erreur lors du chargement des clients:', result.error);
        (window as any).__loadingClients = false;
      }
    } catch (error: any) {
      console.error('[ServicePage] ❌ Erreur lors du chargement des clients:', error);
      (window as any).__loadingClients = false;
    }
  }, [activeCompanyId, clients.length]);

  const location = useLocation();
  const navigate = useNavigate();

  // Fonction pour charger les engagements depuis le backend
  const loadEngagementsFromBackend = useCallback(async () => {
    if (!activeCompanyId) {
      return;
    }
    
    // Protection globale pour éviter les appels multiples
    if ((window as any).__loadingAppointments) {
      console.log('🟡 [ServicePage] Engagements EN COURS DE CHARGEMENT - IGNORÉ');
      return;
    }
    
    // Si déjà chargé globalement, ne pas recharger
    if ((window as any).__appointmentsLoaded) {
      console.log('🟢 [ServicePage] Engagements DÉJÀ CHARGÉS GLOBALEMENT - IGNORÉ');
      return;
    }
    
    try {
      (window as any).__loadingAppointments = true;
      setBackendLoading(true);
      setBackendError(null);
      
      console.log('📡 [ServicePage] ========== DÉBUT CHARGEMENT ENGAGEMENTS ==========');
      console.log('📡 [ServicePage] Appel API AppointmentService.getAll()');
      const result = await AppointmentService.getAll();
      console.log('📥 [ServicePage] Réponse API reçue', { 
        success: result.success, 
        count: result.data?.length || 0,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
      
      if (result.success && Array.isArray(result.data)) {
        console.log('✅ [ServicePage] Données reçues du backend:', {
          totalCount: result.data.length,
          servicesCount: result.data.filter((a: any) => a.kind === 'service').length,
          quotesCount: result.data.filter((a: any) => a.kind === 'devis').length,
          invoicesCount: result.data.filter((a: any) => a.kind === 'facture').length,
        });
        
        // Log COMPLET des données brutes pour TOUS les engagements
        console.log('🔍 [ServicePage] ========== DONNÉES BRUTES DU BACKEND ==========');
        result.data.forEach((a: any, index: number) => {
          console.log(`📦 [ServicePage] Engagement ${index + 1}/${result.data.length}:`, {
            id: a.id,
            client_id: a.client_id,
            clientId: a.clientId,
            service_id: a.service_id,
            serviceId: a.serviceId,
            status: a.status,
            kind: a.kind,
            option_ids: a.option_ids,
            optionIds: a.optionIds,
            option_ids_type: typeof a.option_ids,
            option_ids_isArray: Array.isArray(a.option_ids),
            option_ids_length: Array.isArray(a.option_ids) ? a.option_ids.length : 'N/A',
            option_ids_value: a.option_ids, // Valeur brute complète
            option_overrides: a.option_overrides,
            optionOverrides: a.optionOverrides,
            option_overrides_type: typeof a.option_overrides,
            option_overrides_value: a.option_overrides, // Valeur brute complète
            additional_charge: a.additional_charge,
            additionalCharge: a.additionalCharge,
            mobile_duration_minutes: a.mobile_duration_minutes,
            mobile_completion_comment: a.mobile_completion_comment ? 'présent' : 'absent',
            main_category_id: a.main_category_id,
            sub_category_id: a.sub_category_id,
            // Toutes les clés disponibles
            allKeys: Object.keys(a),
            // Données complètes pour l'engagement problématique
            ...(a.id === 'e1768335465885' ? { FULL_DATA: JSON.stringify(a, null, 2) } : {}),
          });
        });
        console.log('🔍 [ServicePage] ========== FIN DONNÉES BRUTES ==========');
        
        // Mapper les données du backend vers le format Engagement
        console.log('🔄 [ServicePage] ========== DÉBUT MAPPING ==========');
        const mappedEngagements = result.data.map((appointment: any, index: number) => {
          const scheduledAt = appointment.scheduled_at || appointment.date || new Date().toISOString();
          
          // Extraire clientId et serviceId avec support des deux formats
          const clientId = appointment.client_id || appointment.clientId;
          const serviceId = appointment.service_id || appointment.serviceId;
          
          // Extraire optionIds - TRÈS IMPORTANT : vérifier tous les formats possibles
          let optionIds: string[] = [];
          if (Array.isArray(appointment.option_ids)) {
            optionIds = appointment.option_ids;
          } else if (Array.isArray(appointment.optionIds)) {
            optionIds = appointment.optionIds;
          } else if (appointment.option_ids) {
            // Si c'est une string, essayer de la parser
            try {
              optionIds = JSON.parse(appointment.option_ids);
            } catch {
              optionIds = [];
            }
          }
          
          // Extraire optionOverrides - vérifier tous les formats (AVANT extraction depuis services)
          let optionOverrides: Record<string, any> = {};
          if (typeof appointment.option_overrides === 'object' && appointment.option_overrides !== null) {
            optionOverrides = appointment.option_overrides;
          } else if (typeof appointment.optionOverrides === 'object' && appointment.optionOverrides !== null) {
            optionOverrides = appointment.optionOverrides;
          } else if (typeof appointment.option_overrides === 'string') {
            try {
              optionOverrides = JSON.parse(appointment.option_overrides);
            } catch {
              optionOverrides = {};
            }
          }
          
          // Extraire additionalCharge
          let additionalCharge = appointment.additional_charge ?? appointment.additionalCharge ?? 0;
          
          // Si optionIds est vide mais qu'il y a un array "services", extraire les optionIds depuis services
          if (optionIds.length === 0 && Array.isArray(appointment.services) && appointment.services.length > 0) {
            console.log(`🔍 [ServicePage] Engagement ${index + 1} a un array "services" avec ${appointment.services.length} service(s)`);
            console.log(`🔍 [ServicePage] Contenu de services[0]:`, appointment.services[0]);
            
            // Essayer de trouver le service qui correspond au service_id
            if (serviceId) {
              const matchingService = appointment.services.find((s: any) => 
                (s.serviceId === serviceId) || (s.service_id === serviceId)
              );
              if (matchingService) {
                console.log(`✅ [ServicePage] Service correspondant trouvé dans services array`);
                if (Array.isArray(matchingService.optionIds)) {
                  optionIds = matchingService.optionIds;
                  console.log(`✅ [ServicePage] OptionIds extraits depuis service correspondant (optionIds):`, optionIds);
                } else if (Array.isArray(matchingService.option_ids)) {
                  optionIds = matchingService.option_ids;
                  console.log(`✅ [ServicePage] OptionIds extraits depuis service correspondant (option_ids):`, optionIds);
                }
                
                // Extraire aussi optionOverrides depuis le service correspondant
                if (typeof matchingService.optionOverrides === 'object' && matchingService.optionOverrides !== null) {
                  optionOverrides = matchingService.optionOverrides;
                  console.log(`✅ [ServicePage] OptionOverrides extraits depuis service correspondant`);
                } else if (typeof matchingService.option_overrides === 'object' && matchingService.option_overrides !== null) {
                  optionOverrides = matchingService.option_overrides;
                  console.log(`✅ [ServicePage] OptionOverrides extraits depuis service correspondant (option_overrides)`);
                }
                
                // Extraire additionalCharge depuis le service correspondant
                if (matchingService.additionalCharge !== undefined && matchingService.additionalCharge !== null) {
                  additionalCharge = matchingService.additionalCharge;
                  console.log(`✅ [ServicePage] AdditionalCharge extrait depuis service correspondant:`, additionalCharge);
                } else if (matchingService.additional_charge !== undefined && matchingService.additional_charge !== null) {
                  additionalCharge = matchingService.additional_charge;
                  console.log(`✅ [ServicePage] AdditionalCharge extrait depuis service correspondant (additional_charge):`, additionalCharge);
                }
              } else {
                // Si pas de correspondance, prendre le premier service
                console.log(`⚠️ [ServicePage] Aucun service correspondant trouvé, utilisation du premier service`);
                const firstService = appointment.services[0];
                if (firstService && Array.isArray(firstService.optionIds)) {
                  optionIds = firstService.optionIds;
                  console.log(`✅ [ServicePage] OptionIds extraits depuis services[0].optionIds:`, optionIds);
                } else if (firstService && Array.isArray(firstService.option_ids)) {
                  optionIds = firstService.option_ids;
                  console.log(`✅ [ServicePage] OptionIds extraits depuis services[0].option_ids:`, optionIds);
                }
              }
            } else {
              // Pas de serviceId, prendre le premier service
              const firstService = appointment.services[0];
              if (firstService && Array.isArray(firstService.optionIds)) {
                optionIds = firstService.optionIds;
                console.log(`✅ [ServicePage] OptionIds extraits depuis services[0].optionIds:`, optionIds);
              } else if (firstService && Array.isArray(firstService.option_ids)) {
                optionIds = firstService.option_ids;
                console.log(`✅ [ServicePage] OptionIds extraits depuis services[0].option_ids:`, optionIds);
              }
            }
          }
          
          // Log spécial pour l'engagement problématique
          if (appointment.id === 'e1768335465885') {
            console.log('🔴 [ServicePage] ========== DEBUG ENGAGEMENT PROBLÉMATIQUE ==========');
            console.log('🔴 [ServicePage] serviceId:', serviceId);
            console.log('🔴 [ServicePage] optionIds après extraction:', optionIds);
            console.log('🔴 [ServicePage] optionOverrides après extraction:', optionOverrides);
            console.log('🔴 [ServicePage] additionalCharge:', additionalCharge);
            console.log('🔴 [ServicePage] services array:', appointment.services);
            if (Array.isArray(appointment.services) && appointment.services.length > 0) {
              console.log('🔴 [ServicePage] services[0] complet:', JSON.stringify(appointment.services[0], null, 2));
            }
            console.log('🔴 [ServicePage] ===================================================');
          }
          
          console.log(`🔄 [ServicePage] Mapping engagement ${index + 1}:`, {
            id: appointment.id,
            clientId,
            serviceId,
            optionIds: optionIds.length > 0 ? optionIds : 'VIDE ⚠️',
            optionIdsCount: optionIds.length,
            optionOverridesKeys: Object.keys(optionOverrides).length,
            additionalCharge,
          });
          
          const mapped: any = {
            id: appointment.id,
            clientId: clientId,
            serviceId: serviceId,
            scheduledAt: scheduledAt,
            status: appointment.status || 'brouillon',
            companyId: appointment.company_id || appointment.companyId || null,
            kind: appointment.kind || 'service', // Par défaut 'service' pour les prestations réalisées
            supportType: appointment.support_type || appointment.supportType || 'Voiture',
            supportDetail: appointment.support_detail || appointment.supportDetail || '',
            additionalCharge: additionalCharge,
            contactIds: appointment.contact_ids || appointment.contactIds || [],
            assignedUserIds: appointment.assigned_user_ids || appointment.assignedUserIds || [],
            sendHistory: appointment.send_history || appointment.sendHistory || [],
            invoiceNumber: appointment.invoice_number || appointment.invoiceNumber || null,
            invoiceVatEnabled: appointment.invoice_vat_enabled ?? appointment.invoiceVatEnabled ?? null,
            quoteNumber: appointment.quote_number || appointment.quoteNumber || null,
            quoteStatus: appointment.quote_status || appointment.quoteStatus || null,
            quoteName: appointment.quote_name || appointment.quoteName || null,
            optionIds: optionIds,
            optionOverrides: optionOverrides,
            planningUser: appointment.planning_user || appointment.planningUser || null,
            startTime: appointment.start_time || appointment.startTime || null,
            mobileDurationMinutes: appointment.mobile_duration_minutes ?? appointment.mobileDurationMinutes ?? null,
            mobileCompletionComment: appointment.mobile_completion_comment || appointment.mobileCompletionComment || null,
            services: appointment.services || undefined,
          };
          
          // Inclure les catégories si disponibles (avec support des deux formats)
          if (appointment.main_category_id) {
            mapped.mainCategoryId = appointment.main_category_id;
          }
          if (appointment.sub_category_id) {
            mapped.subCategoryId = appointment.sub_category_id;
          }
          
          // Log détaillé pour chaque engagement mappé
          console.log(`✅ [ServicePage] Engagement ${index + 1} mappé avec succès:`, {
            id: mapped.id,
            clientId: mapped.clientId,
            serviceId: mapped.serviceId,
            status: mapped.status,
            kind: mapped.kind,
            optionIds: mapped.optionIds,
            optionIdsCount: mapped.optionIds.length,
            optionOverrides: mapped.optionOverrides,
            optionOverridesKeys: Object.keys(mapped.optionOverrides),
            additionalCharge: mapped.additionalCharge,
            mobileDurationMinutes: mapped.mobileDurationMinutes,
            hasComment: !!mapped.mobileCompletionComment,
            mainCategoryId: mapped.mainCategoryId,
            subCategoryId: mapped.subCategoryId,
          });
          
          return mapped;
        });
        console.log('🔄 [ServicePage] ========== FIN MAPPING ==========');
        
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
          console.log('✅ [ServicePage] ========== MISE À JOUR DU STORE ==========');
          console.log('✅ [ServicePage] Nombre d\'engagements:', mergedEngagements.length);
          mergedEngagements.forEach((e, i) => {
            console.log(`  ${i + 1}. ID: ${e.id}, Client: ${e.clientId}, Service: ${e.serviceId}, Options: ${e.optionIds.length}`);
          });
          useAppData.setState({ engagements: mergedEngagements });
          console.log('✅ [ServicePage] ========== STORE MIS À JOUR ==========');
        } else {
          console.log('ℹ️ [ServicePage] Aucun changement détecté, pas de mise à jour du store');
        }
        
        // Marquer comme chargé seulement après succès
        (window as any).__appointmentsLoaded = true;
        (window as any).__loadingAppointments = false;
      } else {
        console.error('[ServicePage] ❌ Erreur lors du chargement:', result.error);
        setBackendError(result.error || 'Erreur lors du chargement des prestations.');
        (window as any).__loadingAppointments = false;
      }
    } catch (error: any) {
      console.error('[ServicePage] ❌ Erreur lors du chargement des engagements:', error);
      setBackendError(error?.message || 'Erreur lors du chargement des prestations.');
      (window as any).__loadingAppointments = false;
    } finally {
      setBackendLoading(false);
    }
  }, [activeCompanyId]);

  // Chargement initial et rechargement au changement d'entreprise
  // IMPORTANT: Charger dans l'ordre: clients et services d'abord, puis engagements
  useEffect(() => {
    const loadAll = async () => {
      // 1. Charger les clients, services, catégories et entreprises en parallèle
      await Promise.all([
        loadClientsFromBackend(),
        loadServicesFromBackend(),
        loadCategoriesFromBackend(),
        loadCompaniesFromBackend(),
      ]);
      
      // 2. Attendre un peu pour que les clients/services soient dans le store
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. Charger les engagements (qui dépendent des clients et services)
      await loadEngagementsFromBackend();
    };
    
    loadAll();
  }, [loadClientsFromBackend, loadServicesFromBackend, loadCategoriesFromBackend, loadEngagementsFromBackend]);

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
  
  // Filtre de période - initialisé avec le mois en cours
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      start: formatDate(firstDay),
      end: formatDate(lastDay),
    };
  };
  
  const currentMonth = getCurrentMonthRange();
  const [dateRangeStart, setDateRangeStart] = useState<string>(currentMonth.start);
  const [dateRangeEnd, setDateRangeEnd] = useState<string>(currentMonth.end);
  const [internalNotes, setInternalNotes] = useState<string>('');
  const resizeStateRef = useRef<{
    columnId: ServiceColumnId;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Utilisation des hooks personnalisés pour la gestion d'état
  const servicePageState = useServicePageState(clients, services, companies, activeCompanyId);
  const {
    creationMode,
    setCreationMode,
    creationDraft,
    setCreationDraft,
    quickClientDraft,
    setQuickClientDraft,
    isAddingClient,
    setIsAddingClient,
    selectedEngagementId,
    setSelectedEngagementId,
    showEditServiceModal,
    setShowEditServiceModal,
    editModalDraft,
    setEditModalDraft,
    editModalError,
    setEditModalError,
    mailPrompt,
    setMailPrompt,
    mailPromptClientId,
    setMailPromptClientId,
  } = servicePageState;

  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const selectedEngagement = useMemo(
    () => {
      const engagement = engagements.find((engagement) => engagement.id === selectedEngagementId) ?? null;
      if (engagement) {
        console.log('📋 [ServicePage] Engagement sélectionné pour modale:', {
          id: engagement.id,
          status: engagement.status,
          mobileDurationMinutes: engagement.mobileDurationMinutes,
          hasMobileComment: !!engagement.mobileCompletionComment,
          mainCategoryId: (engagement as any).mainCategoryId,
          subCategoryId: (engagement as any).subCategoryId,
          optionIds: engagement.optionIds.length,
          optionOverrides: Object.keys(engagement.optionOverrides || {}).length,
          additionalCharge: engagement.additionalCharge,
        });
      }
      return engagement;
    },
    [engagements, selectedEngagementId]
  );
  const [editDraft, setEditDraft] = useState<EngagementDraft | null>(
    selectedEngagement ? buildDraftFromEngagement(selectedEngagement) : null
  );
  const [highlightQuote, setHighlightQuote] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedClientOrLeadType, setSelectedClientOrLeadType] = useState<'client' | 'lead' | null>(null);
  const [showLeadDetailModal, setShowLeadDetailModal] = useState(false);
  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leads.find((l) => l.id === selectedLeadId) ?? null;
  }, [selectedLeadId, leads]);

  const clientsWithEmail = useMemo(
    () => clients.filter((client) => client.contacts.some((contact) => contact.active && contact.email)),
    [clients]
  );

  const clientsById = useEntityMaps(clients);
  const companiesById = useEntityMaps(companies);
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

  // baseDraft pour les réinitialisations
  const baseDraft = useMemo(
    () => buildInitialDraft(clients, services, companies, activeCompanyId),
    [clients, services, companies, activeCompanyId]
  );

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
    setSelectedCategory('');
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
    const newService = params.get('new');
    
    // Gérer l'ouverture d'un engagement existant
    if (engagementId) {
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('engagementId');
      navigate({ pathname: location.pathname, search: nextParams.toString() ? `?${nextParams}` : '' }, { replace: true });

      if (engagements.some((engagement) => engagement.id === engagementId)) {
        setCreationMode(null);
        setSelectedEngagementId(engagementId);
      }
      return;
    }
    
    // Gérer l'ouverture du formulaire de création
    if (newService === 'true') {
      const nextParams = new URLSearchParams(location.search);
      nextParams.delete('new');
      navigate({ pathname: location.pathname, search: nextParams.toString() ? `?${nextParams}` : '' }, { replace: true });
      setFeedback(null);
      setCreationMode('service');
      setCreationDraft({
        ...baseDraft,
        status: 'planifié',
      });
      setIsAddingClient(false);
      setSelectedEngagementId(null);
      setEditDraft(null);
    }
  }, [location.pathname, location.search, engagements, navigate]);

  const servicesById = useEntityMaps(services);

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
    const selectedDateStr = toISODateString(selectedDate);
    
    // Filtrer les événements pour la date sélectionnée
    const dayEvents = calendarEvents.filter(event => {
      const eventDate = toISODateString(new Date(event.start));
      return eventDate === selectedDateStr;
    });

    // Créer des créneaux de 30 minutes de 8h à 18h
    const timeSlots: Array<{ start: string; end: string; label: string }> = [];
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

  // Utilisation du hook personnalisé pour gérer automatiquement les options de draft
  useDraftOptions(servicesById, creationDraft, setCreationDraft, editDraft, setEditDraft);

  const searchValue = search.trim().toLowerCase();

  const filteredEngagements = useMemo(() => {
    const filtered = engagements.filter((engagement) => {
      // Exclure les devis - ils sont gérés dans la page DevisPage
      if (engagement.kind === 'devis') return false;
      
      // N'afficher que les services réalisés dans l'historique
      if (engagement.status !== 'réalisé') return false;

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
      
      // Filtre par période
      const matchesDateRange = (() => {
        if (!engagement.scheduledAt) return false;
        const engagementDate = new Date(engagement.scheduledAt);
        const startDate = new Date(dateRangeStart);
        const endDate = new Date(dateRangeEnd);
        // Définir les heures à minuit pour la comparaison
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        engagementDate.setHours(0, 0, 0, 0);
        return engagementDate >= startDate && engagementDate <= endDate;
      })();
      
      return matchesSearch && matchesStatus && matchesKind && matchesCompany && matchesDateRange;
    });
    
    // Debug : afficher les statistiques de filtrage
    console.log('🔍 [ServicePage] Filtrage des engagements:', {
      total: engagements.length,
      aprèsExclusionDevis: engagements.filter(e => e.kind !== 'devis').length,
      aprèsFiltreStatut: engagements.filter(e => e.kind !== 'devis' && e.status === 'réalisé').length,
      filtrés: filtered.length,
      dateRange: { start: dateRangeStart, end: dateRangeEnd },
      statusFilter,
      kindFilter,
      companyFilter,
      searchValue: searchValue.length > 0 ? searchValue : '(vide)',
    });
    
    return filtered;
  }, [
    engagements,
    clientsById,
    companiesById,
    servicesById,
    searchValue,
    statusFilter,
    kindFilter,
    companyFilter,
    dateRangeStart,
    dateRangeEnd,
  ]);

  // Utilisation du hook personnalisé pour la gestion de la sélection des engagements
  const {
    selectedEngagementIds,
    setSelectedEngagementIds,
    allEngagementsSelected,
    toggleEngagementSelection,
    toggleSelectAllEngagements,
    clearSelectedEngagements,
    selectedEngagementsForBulk,
  } = useEngagementSelection(engagements, filteredEngagements);

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

  // États pour le transfert
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetCompanyId, setTransferTargetCompanyId] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Array<{ id: string; name: string }>>([]);

  const openTransferModal = useCallback(async () => {
    const selectedCount = selectedEngagementIds.length;
    if (selectedCount === 0) {
      setFeedback('Veuillez sélectionner au moins une prestation à transférer.');
      return;
    }
    
    // Ouvrir la modale immédiatement
    setShowTransferModal(true);
    setTransferError(null);
    setTransferLoading(true);
    setTransferTargetCompanyId('');
    
    try {
      const result = await CompanyService.getAll();
      if (result.success && Array.isArray(result.data)) {
        const companiesList = result.data
          .filter((c: any) => c.id !== activeCompanyId) // Exclure l'entreprise actuelle
          .map((c: any) => ({ id: c.id, name: c.name || c.id }));
        setAvailableCompanies(companiesList);
        if (companiesList.length === 0) {
          setTransferError('Aucune autre entreprise disponible pour le transfert.');
        } else {
          setTransferTargetCompanyId(companiesList[0]?.id || '');
        }
      } else {
        setTransferError('Impossible de charger la liste des entreprises.');
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des entreprises:', error);
      setTransferError(error?.message || 'Erreur lors du chargement des entreprises.');
    } finally {
      setTransferLoading(false);
    }
  }, [selectedEngagementIds.length, activeCompanyId]);

  const handleBulkTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!selectedEngagementIds.length || !transferTargetCompanyId) {
      setTransferError('Veuillez sélectionner une entreprise de destination.');
      return;
    }

    try {
      setTransferLoading(true);
      setTransferError(null);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const engagementId of selectedEngagementIds) {
        try {
          const result = await AppointmentService.transfer(engagementId, transferTargetCompanyId);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        setFeedback(`${successCount} prestation(s) transférée(s) avec succès.`);
        setSelectedEngagementIds([]);
        setShowTransferModal(false);
        setTransferTargetCompanyId('');
        // Recharger les engagements depuis le backend si nécessaire
        window.location.reload(); // Simple reload pour rafraîchir les données
      }
      
      if (errorCount > 0) {
        setTransferError(`${errorCount} prestation(s) n'ont pas pu être transférée(s).`);
      }
    } catch (error: any) {
      setTransferError(error?.message || 'Erreur lors du transfert des prestations.');
    } finally {
      setTransferLoading(false);
    }
  };

  const closeTransferModal = useCallback(() => {
    setShowTransferModal(false);
    setTransferTargetCompanyId('');
    setTransferError(null);
  }, []);

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
      // Calculer le sous-total HT (prix + frais complémentaires)
      const subtotalHt = totals.price + totals.surcharge;
      // Calculer la TVA sur le sous-total HT
      const vatAmount = vatEnabledForRow ? Math.round(subtotalHt * vatMultiplier * 100) / 100 : 0;
      // Total TTC = sous-total HT + TVA
      const finalTotal = subtotalHt + vatAmount;
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
      filteredEngagements.reduce(
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
    [filteredEngagements, computeEngagementTotals]
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
    const { firstName, lastName: restName } = splitContactName(quickClientDraft.name);
    const defaultContact = addClientContact(created.id, {
      firstName: firstName || 'Contact',
      lastName: restName || 'Facturation',
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

  // Fonction pour convertir un lead en client (similaire à LeadPage)
  // Fonction pour convertir un lead en client (utilise la version unifiée)
  const ensureClientFromLeadWrapper = useCallback((lead: Lead): Client => {
    return ensureClientFromLead(lead, {
      clients,
      addClient,
      addClientContact,
      setClientBillingContact,
      restoreClientContact,
      getClient,
    });
  }, [clients, addClient, addClientContact, setClientBillingContact, restoreClientContact, getClient]);

  const handleClientOrLeadSelect = useCallback((result: { id: string; type: 'client' | 'lead'; name: string; email: string; phone: string; data: Client | Lead }) => {
    if (result.type === 'lead') {
      const lead = result.data as Lead;
      setSelectedLeadId(lead.id);
      setSelectedClientOrLeadType('lead');
      setShowLeadDetailModal(true);
      // Convertir le lead en client pour le devis
      const client = ensureClientFromLeadWrapper(lead);
      const companyId = lead.companyId ?? companies[0]?.id ?? null;
      setCreationDraft((draft) => ({
        ...draft,
        clientId: client.id,
        companyId: companyId || '',
      }));
    } else {
      const client = result.data as Client;
      setSelectedLeadId(null);
      setSelectedClientOrLeadType('client');
      setShowLeadDetailModal(false);
      setCreationDraft((draft) => ({
        ...draft,
        clientId: client.id,
        companyId: companies[0]?.id || '',
      }));
    }
  }, [ensureClientFromLead, companies, setCreationDraft]);

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
    if (!editModalDraft.assignedUserId) {
      setEditModalError('Veuillez sélectionner un collaborateur pour ce service.');
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
      // Préparer les données de mise à jour en incluant TOUTES les données
      const updateData: any = {
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
        assignedUserIds: [editModalDraft.assignedUserId], // Assigner le collaborateur sélectionné
        planningUser: editModalDraft.planningUser,
        startTime: editModalDraft.startTime,
      };
      
      // Conserver les données mobile et catégories si elles existent
      if ((editModalDraft as any).mainCategoryId) {
        updateData.mainCategoryId = (editModalDraft as any).mainCategoryId;
      }
      if ((editModalDraft as any).subCategoryId) {
        updateData.subCategoryId = (editModalDraft as any).subCategoryId;
      }
      if ((editModalDraft as any).mobileDurationMinutes !== null && (editModalDraft as any).mobileDurationMinutes !== undefined) {
        updateData.mobileDurationMinutes = (editModalDraft as any).mobileDurationMinutes;
      }
      if ((editModalDraft as any).mobileCompletionComment) {
        updateData.mobileCompletionComment = (editModalDraft as any).mobileCompletionComment;
      }
      
      const updated = updateEngagement(selectedEngagement.id, updateData);

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
    
    if (!company.name.trim() || !company.siret.trim()) {
      setFeedback("Complétez le nom et le SIRET de l'entreprise avant de générer une facture.");
      return;
    }
    if (!client.name.trim()) {
      setFeedback('Le client doit avoir un nom pour générer une facture.');
      return;
    }

    // Vérifier que le total est > 0 (peut venir d'options, de base_price, ou de catégories)
    const totals = computeEngagementTotals(engagement);
    if (totals.price <= 0 && engagement.additionalCharge <= 0) {
      setFeedback('Sélectionnez au moins une prestation à facturer.');
      return;
    }
    const issueDate = new Date();
    const vatEnabledForInvoice = engagement.invoiceVatEnabled ?? (company.vatEnabled ?? vatEnabled);
    const documentNumber = engagement.invoiceNumber ?? getNextInvoiceNumber(engagements, issueDate);
    
    // Calculer la date d'échéance (30 jours après la date d'émission)
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // Résoudre le contact pour la facture
    const recipients = resolveEngagementRecipients(engagement, client);
    const contactForInvoice = engagement.contactIds && engagement.contactIds.length > 0
      ? client.contacts?.find(c => c.active && engagement.contactIds.includes(c.id))
      : null;

    // Convertir l'engagement en format QuoteServiceItem pour la facture multiple services
    const invoiceServiceItem: QuoteServiceItem = {
      serviceId: service.id,
      serviceName: service.name,
      serviceDescription: service.description || '',
      supportType: engagement.supportType,
      supportDetail: engagement.supportDetail || '',
      options: optionsSelected,
      optionOverrides: engagement.optionOverrides ?? {},
      additionalCharge: engagement.additionalCharge ?? 0,
      mainCategoryId: (engagement as any).mainCategoryId,
      subCategoryId: (engagement as any).subCategoryId,
      base_price: (service as any).base_price,
      base_duration: (service as any).base_duration,
      quantity: 1,
    };

    try {
      // Utiliser le nouveau template de facture conforme au droit français
      const pdf = generateInvoicePdfWithMultipleServices({
        documentNumber,
        issueDate,
        serviceDate: new Date(engagement.scheduledAt),
        dueDate,
        company: {
          ...company,
          vatNumber: company.vatNumber || undefined,
          iban: company.iban || undefined,
          bic: company.bic || undefined,
          invoiceLogoUrl: company.invoiceLogoUrl || undefined,
        },
        client,
        contact: contactForInvoice || undefined,
        services: [invoiceServiceItem],
        vatRate: vatPercent,
        vatEnabled: vatEnabledForInvoice,
        paymentMethod: 'Chèque, virement bancaire, espèces',
        categories: categories || [],
      });
      const subtotal = totals.price + totals.surcharge;
      const vatAmount = vatEnabledForInvoice ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
      const totalTtc = vatEnabledForInvoice ? subtotal + vatAmount : subtotal;
      const pdfDataUri = pdf.output('datauristring');

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
        const fileName = generateInvoiceFileName(documentNumber, client.name, issueDate);
        if (typeof window !== 'undefined') {
          // Utiliser un lien de téléchargement pour forcer le nom du fichier
          const blob = pdf.output('blob');
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          pdf.save(fileName);
        }
      } else if (mode === 'print' && typeof window !== 'undefined') {
        pdf.autoPrint?.();
        const blobUrl = pdf.output('bloburl');
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      }

      // Ne pas transformer la prestation en facture - garder le kind: 'service'
      // Mettre à jour uniquement le numéro de facture et le statut si nécessaire
      if (engagement.status !== 'réalisé') {
        updateEngagement(engagement.id, {
          status: 'réalisé',
          companyId: company.id,
          invoiceNumber: documentNumber,
          invoiceVatEnabled: vatEnabledForInvoice,
        });
      } else {
        // Si déjà réalisé, juste mettre à jour le numéro de facture
        updateEngagement(engagement.id, {
          companyId: company.id,
          invoiceNumber: documentNumber,
          invoiceVatEnabled: vatEnabledForInvoice,
        });
      }
      
      // Créer une facture séparée (nouvel engagement avec kind: 'facture')
      const invoiceEngagementPayload = {
        kind: 'facture' as const,
        status: 'envoyé' as const,
        clientId: engagement.clientId,
        serviceId: engagement.serviceId,
        optionIds: engagement.optionIds || [],
        optionOverrides: engagement.optionOverrides || {},
        scheduledAt: issueDate.toISOString(),
        companyId: company.id,
        supportType: engagement.supportType,
        supportDetail: engagement.supportDetail || '',
        additionalCharge: engagement.additionalCharge ?? 0,
        contactIds: engagement.contactIds || [],
        assignedUserIds: engagement.assignedUserIds || [],
        planningUser: engagement.planningUser,
        invoiceNumber: documentNumber,
        invoiceVatEnabled: vatEnabledForInvoice,
        quoteNumber: engagement.quoteNumber || null,
        quoteName: (engagement as any).quoteName || null,
        mainCategoryId: (engagement as any).mainCategoryId,
        subCategoryId: (engagement as any).subCategoryId,
      };
      
      const newInvoiceEngagement = addEngagement(invoiceEngagementPayload);
      setSelectedEngagementId(engagement.id); // Garder la sélection sur la prestation
      setEditDraft(buildDraftFromEngagement(engagement)); // Garder le draft de la prestation

      // Enregistrer la facture dans le backend Docker
      try {
        const subtotal = totals.price + totals.surcharge;
        const vatAmount = vatEnabledForInvoice ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
        const totalTtc = vatEnabledForInvoice ? subtotal + vatAmount : subtotal;
        
        // Date d'échéance déjà calculée plus haut dans la fonction

        // Déterminer le statut de la facture
        let invoiceStatus: 'brouillon' | 'envoyé' | 'accepté' | 'refusé' | 'payé' = 'envoyé';
        if (engagement.status === 'réalisé') {
          invoiceStatus = 'payé';
        } else if (engagement.status === 'envoyé') {
          invoiceStatus = 'envoyé';
        } else {
          invoiceStatus = 'brouillon';
        }

        const clientInvoice = {
          id: newInvoiceEngagement.id,
          number: documentNumber,
          clientId: client.id,
          clientName: client.name,
          companyId: company.id,
          companyName: company.name,
          engagementId: newInvoiceEngagement.id,
          issueDate: toISODateString(issueDate),
          dueDate: toISODateString(dueDate),
          amountHt: subtotal,
          amountTtc: totalTtc,
          vatAmount: vatAmount,
          vatRate: vatPercent,
          vatEnabled: vatEnabledForInvoice,
          status: invoiceStatus,
        };

        // Essayer de créer, si ça échoue avec un conflit, mettre à jour
        const result = await ClientInvoiceService.create(clientInvoice);
        if (!result.success && result.error?.includes('409')) {
          // Facture existe déjà, mettre à jour
          await ClientInvoiceService.update(newInvoiceEngagement.id, clientInvoice);
          console.log('[ServicePage] ✅ Facture mise à jour dans le backend:', documentNumber);
        } else if (result.success) {
          console.log('[ServicePage] ✅ Facture enregistrée dans le backend:', documentNumber);
        }
        
        // Synchroniser aussi l'engagement facture avec le backend
        try {
          const appointmentData: any = {
            id: newInvoiceEngagement.id,
            client_id: newInvoiceEngagement.clientId,
            service_id: newInvoiceEngagement.serviceId,
            date: newInvoiceEngagement.scheduledAt,
            status: newInvoiceEngagement.status,
            kind: newInvoiceEngagement.kind,
            company_id: newInvoiceEngagement.companyId || null,
            option_ids: newInvoiceEngagement.optionIds,
            option_overrides: newInvoiceEngagement.optionOverrides || {},
            additional_charge: newInvoiceEngagement.additionalCharge,
            contact_ids: newInvoiceEngagement.contactIds,
            assigned_user_ids: newInvoiceEngagement.assignedUserIds,
            invoice_number: newInvoiceEngagement.invoiceNumber || null,
            invoice_vat_enabled: newInvoiceEngagement.invoiceVatEnabled ?? null,
            quote_number: newInvoiceEngagement.quoteNumber || null,
            support_type: newInvoiceEngagement.supportType,
            support_detail: newInvoiceEngagement.supportDetail,
            ...((newInvoiceEngagement as any).mainCategoryId && { main_category_id: (newInvoiceEngagement as any).mainCategoryId }),
            ...((newInvoiceEngagement as any).subCategoryId && { sub_category_id: (newInvoiceEngagement as any).subCategoryId }),
          };
          
          const syncResult = await AppointmentService.create(appointmentData);
          if (syncResult.success) {
            console.log('[ServicePage] ✅ Engagement facture synchronisé avec le backend:', newInvoiceEngagement.id);
          }
        } catch (syncError) {
          console.error('[ServicePage] ❌ Erreur lors de la synchronisation de l\'engagement facture:', syncError);
        }
      } catch (error) {
        // Erreur silencieuse pour ne pas perturber le flux utilisateur
        console.error('[ServicePage] ❌ Erreur lors de l\'enregistrement de la facture dans le backend:', error);
      }

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
          const fileName = generateInvoiceFileName(documentNumber, client.name, issueDate);
          if (typeof window !== 'undefined') {
            // Utiliser un lien de téléchargement pour forcer le nom du fichier
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } else {
            pdf.save(fileName);
          }
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
      // Convertir en format pour plusieurs prestations (même pour un seul service)
      const quoteService: QuoteServiceItem = {
        serviceId: service.id,
        serviceName: service.name,
        serviceDescription: service.description || '', // Description de la prestation depuis le catalogue
        supportType: engagement.supportType,
        supportDetail: engagement.supportDetail || '',
        options: optionsSelected,
        optionOverrides: engagement.optionOverrides ?? {},
        additionalCharge: engagement.additionalCharge || 0,
      };

      const pdf = generateQuotePdfWithMultipleServices({
        documentNumber,
        issueDate,
        serviceDate: new Date(engagement.scheduledAt),
        client,
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
        vatRate: vatPercent,
        vatEnabled: vatEnabledForQuote,
        validityNote: '30 jours',
        paymentMethod: 'Chèque, virement bancaire',
        paymentTerms: 'À réception de facture',
        deposit: 0,
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
        const fileName = generateQuoteFileName(documentNumber, client.name, issueDate);
        if (typeof window !== 'undefined') {
          // Utiliser un lien de téléchargement pour forcer le nom du fichier
          const blob = pdf.output('blob');
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          pdf.save(fileName);
        }
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
          const fileName = generateQuoteFileName(documentNumber, client.name, issueDate);
          if (typeof window !== 'undefined') {
            // Utiliser un lien de téléchargement pour forcer le nom du fichier
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } else {
            pdf.save(fileName);
          }
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
    // Log TRÈS DÉTAILLÉ pour chaque engagement dans le tableau
    console.log('📊 [ServicePage] ========== CRÉATION LIGNE TABLEAU ==========');
    console.log('📊 [ServicePage] Engagement ID:', engagement.id);
    console.log('📊 [ServicePage] Données engagement:', {
      clientId: engagement.clientId,
      serviceId: engagement.serviceId,
      optionIds: engagement.optionIds,
      optionIdsLength: engagement.optionIds.length,
      optionOverrides: engagement.optionOverrides,
      optionOverridesKeys: Object.keys(engagement.optionOverrides || {}),
      additionalCharge: engagement.additionalCharge,
    });
    
    // Log pour debug si client ou service non trouvé
    const client = clientsById.get(engagement.clientId);
    if (!client && engagement.clientId) {
      console.error('❌ [ServicePage] Client non trouvé:', {
        engagementId: engagement.id,
        clientId: engagement.clientId,
        availableClients: Array.from(clientsById.keys()).slice(0, 10),
        totalClients: clientsById.size,
      });
    } else if (client) {
      console.log('✅ [ServicePage] Client trouvé:', client.name);
    }
    
    // Utiliser companyId de l'engagement, ou fallback sur activeCompanyId si disponible
    const engagementCompanyId = engagement.companyId || activeCompanyId;
    let company = engagementCompanyId ? companiesById.get(engagementCompanyId) : undefined;
    
    // Si l'entreprise n'est pas trouvée mais qu'on a activeCompanyId, essayer de la récupérer
    if (!company && activeCompanyId) {
      company = companiesById.get(activeCompanyId) || companies.find(c => c.id === activeCompanyId) || companies[0] || undefined;
    }
    
    // Log pour diagnostiquer les problèmes d'entreprise et de contact
    if (!company && engagement.companyId) {
      console.warn('⚠️ [ServicePage] Entreprise non trouvée:', {
        engagementId: engagement.id,
        companyId: engagement.companyId,
        activeCompanyId,
        availableCompanies: Array.from(companiesById.keys()).slice(0, 10),
        totalCompanies: companiesById.size,
        companiesArrayLength: companies.length,
      });
    } else if (company) {
      console.log('✅ [ServicePage] Entreprise trouvée:', company.name, { engagementCompanyId, activeCompanyId });
    } else {
      console.warn('⚠️ [ServicePage] Engagement sans companyId et aucune entreprise disponible:', {
        engagementId: engagement.id,
        clientId: engagement.clientId,
        activeCompanyId,
        companiesCount: companies.length,
      });
    }
    
    const service = servicesById.get(engagement.serviceId);
    if (!service && engagement.serviceId) {
      console.error('❌ [ServicePage] Service non trouvé:', {
        engagementId: engagement.id,
        serviceId: engagement.serviceId,
        availableServices: Array.from(servicesById.keys()).slice(0, 10),
        totalServices: servicesById.size,
      });
    } else if (service) {
      console.log('✅ [ServicePage] Service trouvé:', service.name);
      console.log('✅ [ServicePage] Options du service:', service.options.map(o => o.id));
    }
    
    const optionsSelected =
      service?.options.filter((option) => engagement.optionIds.includes(option.id)) ?? ([] as ServiceOption[]);
    console.log('📊 [ServicePage] Options sélectionnées:', {
      optionIdsEngagement: engagement.optionIds,
      optionsSelectedCount: optionsSelected.length,
      optionsSelectedLabels: optionsSelected.map(o => o.label),
    });
    
    const totals = computeEngagementTotals(engagement);
    console.log('💰 [ServicePage] Calcul des totaux:', {
      price: totals.price,
      duration: totals.duration,
      surcharge: totals.surcharge,
      optionIds: engagement.optionIds.length,
      optionOverrides: Object.keys(engagement.optionOverrides || {}).length,
      additionalCharge: engagement.additionalCharge,
    });
    
    const vatEnabledForRow = engagement.invoiceVatEnabled ?? (company?.vatEnabled ?? vatEnabled);
    const vatAmount = vatEnabledForRow ? totals.price * vatMultiplier : 0;
    const totalWithVat = totals.price + vatAmount;
    const finalTotal = totalWithVat + totals.surcharge;
    const documentNumber = getEngagementDocumentNumber(engagement);
    // Dans la page prestations, on affiche toujours "Service" ou "Prestation", jamais "Facture"
    // Même si l'engagement a été transformé en facture, on garde le label "Service" dans cette page
    const displayKind = engagement.kind === 'facture' ? 'service' : engagement.kind;
    const kindStyle = serviceKindStyles[displayKind];
    const statusStyle = serviceStatusStyles[engagement.status];
    const optionsSummary =
      optionsSelected.length > 0
        ? optionsSelected.map((option) => option.label).join(' • ')
        : 'Aucune prestation sélectionnée';
    
    // Log pour debug si les données semblent incorrectes
    // Ne pas considérer comme une erreur si le prix > 0 même sans options (peut venir de base_price ou catégories)
    if (!client || !service || totals.price === 0) {
      console.error('❌ [ServicePage] ========== DONNÉES INCOMPLÈTES ==========');
      console.error('❌ [ServicePage] Engagement ID:', engagement.id);
      console.error('❌ [ServicePage] Problèmes détectés:', {
        hasClient: !!client,
        hasService: !!service,
        price: totals.price,
        optionIds: engagement.optionIds,
        optionIdsLength: engagement.optionIds.length,
        optionOverrides: engagement.optionOverrides,
        optionOverridesKeys: Object.keys(engagement.optionOverrides || {}),
        additionalCharge: engagement.additionalCharge,
        serviceOptions: service?.options?.map(o => o.id) || [],
      });
      console.error('❌ [ServicePage] ============================================');
    } else {
      console.log('✅ [ServicePage] Données complètes pour engagement:', engagement.id);
    }
    console.log('📊 [ServicePage] ========== FIN CRÉATION LIGNE ==========');

    // Récupérer les catégories si disponibles
    const mainCategoryId = (engagement as any).mainCategoryId;
    const subCategoryId = (engagement as any).subCategoryId;
    const mainCategory = mainCategoryId ? categories.find(c => c.id === mainCategoryId) : null;
    const subCategory = subCategoryId ? categories.find(c => c.id === subCategoryId) : null;

    // Durée réelle depuis mobile
    const realDurationMinutes = engagement.mobileDurationMinutes;
    const realDurationLabel = realDurationMinutes && realDurationMinutes > 0
      ? `${Math.floor(realDurationMinutes / 60)}h${(realDurationMinutes % 60).toString().padStart(2, '0')}`
      : null;

    // Contact principal (si disponible)
    // Logique différente selon le type de client :
    // - Particulier : utiliser firstName, lastName, email, phone du client
    // - Professionnel : utiliser le contact affilié si disponible, sinon les infos du client
    let contactLabel: string | null = null;
    let contactSubLabel: string | null = null;
    
    if (client?.type === 'individual') {
      // Particulier : utiliser les informations directes du client
      const firstName = client.firstName || '';
      const lastName = client.lastName || '';
      const name = [firstName, lastName].filter(Boolean).join(' ').trim() || client.name;
      const email = client.email || '';
      const phone = client.phone || '';
      
      if (name) {
        contactLabel = name;
        const details = [email, phone].filter(Boolean).join(' - ');
        contactSubLabel = details || null;
      }
    } else if (client?.type === 'company') {
      // Professionnel : chercher le contact affilié d'abord
      const selectedContactId = engagement.contactIds?.[0];
      const resolvedContact = selectedContactId
        ? client.contacts?.find(c => c.id === selectedContactId)
        : null;
      
      if (resolvedContact) {
        // Contact affilié trouvé
        const name = [resolvedContact.firstName, resolvedContact.lastName].filter(Boolean).join(' ').trim();
        const roles = resolvedContact.roles && resolvedContact.roles.length > 0
          ? resolvedContact.roles.join(', ')
          : null;
        const email = resolvedContact.email || '';
        const phone = resolvedContact.mobile || '';
        
        if (name) {
          contactLabel = roles ? `${name} (${roles})` : name;
          const details = [email, phone].filter(Boolean).join(' - ');
          contactSubLabel = details || null;
        }
      } else {
        // Aucun contact affilié : utiliser les informations du client professionnel
        const name = client.name || '';
        const email = client.email || '';
        const phone = client.phone || '';
        
        if (name) {
          contactLabel = name;
          const details = [email, phone].filter(Boolean).join(' - ');
          contactSubLabel = details || null;
        }
      }
    }
    
    // Log pour diagnostiquer les problèmes de contact
    if (!contactLabel && client) {
      console.warn('⚠️ [ServicePage] Aucun contact résolu:', {
        engagementId: engagement.id,
        clientId: engagement.clientId,
        clientType: client?.type,
        contactIds: engagement.contactIds,
        clientContactsCount: client?.contacts?.length || 0,
        clientHasEmail: !!client?.email,
        clientHasPhone: !!client?.phone,
      });
    }

    // Données incomplètes (utile pour repérer les lignes à corriger)
    const hasIncompleteData =
      !service ||
      (Array.isArray(service?.options) && service.options.length === 0 && engagement.optionIds.length === 0) ||
      totals.price === 0;

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
      clientName: client?.name ?? (engagement.clientId ? `Client ID: ${engagement.clientId}` : 'Client inconnu'),
      companyName: company?.name ?? '—',
      supportType: engagement.supportType,
      supportDetail: engagement.supportDetail,
      serviceName: service?.name ?? (engagement.serviceId ? `Service ID: ${engagement.serviceId}` : 'Service inconnu'),
      optionsSummary: optionsSummary || (engagement.optionIds.length > 0 ? `⚠️ ${engagement.optionIds.length} option(s) non trouvée(s)` : 'Aucune prestation sélectionnée'),
      // Afficher les optionIds bruts si les options ne sont pas trouvées
      rawOptionIds: engagement.optionIds.length > 0 && optionsSelected.length === 0 ? engagement.optionIds : null,
      durationLabel: totals.duration ? formatDuration(totals.duration) : '—',
      realDurationLabel, // Durée réelle depuis mobile
      amountHtLabel: formatCurrency(totals.price),
      vatLabel: vatEnabledForRow ? formatCurrency(vatAmount) : null,
      totalLabel: formatCurrency(finalTotal),
      surchargeLabel: totals.surcharge ? formatCurrency(totals.surcharge) : null,
      // Catégories
      mainCategoryName: mainCategory?.name || null,
      subCategoryName: subCategory?.name || null,
      // Données mobile
      mobileCompletionComment: engagement.mobileCompletionComment || null,
      mobileDurationMinutes: engagement.mobileDurationMinutes || null,
      // Contact
      contactLabel,
      contactSubLabel,
      // Qualité de données
      hasIncompleteData,
    };
  });

  const renderDesktopActions = (engagement: Engagement) => {
    // Toujours afficher le bouton Imprimer pour les prestations (service ou facture transformée en service)
    const isService = engagement.kind === 'service' || engagement.kind === 'facture';
    
    // Log pour déboguer
    console.log('🔍 [renderDesktopActions]', {
      engagementId: engagement.id,
      kind: engagement.kind,
      isService,
    });
    
    if (!isService) {
      console.log('❌ [renderDesktopActions] Pas un service, bouton non affiché');
      return <div className="flex items-center justify-start gap-2" onClick={(e) => e.stopPropagation()}></div>;
    }
    
    console.log('✅ [renderDesktopActions] Bouton Imprimer affiché pour', engagement.id);
    
    return (
      <div className="flex items-center justify-start gap-2 opacity-100 transition group-hover:translate-x-[1px] group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void handleGenerateInvoice(engagement, 'print');
          }}
          className="flex items-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-500 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-blue-600 hover:border-blue-600"
          title="Imprimer la facture"
          style={{ minWidth: '120px' }}
        >
          <Printer className="h-4 w-4" />
          <span>Imprimer</span>
        </button>
      </div>
    );
  };

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
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    row.kindStyle.className
                  )}
                >
                  {row.kindStyle.label}
                </span>
                <span className={clsx('text-xs font-medium', row.statusStyle.className, 'px-2 py-0.5 rounded-full')}>
                  {row.statusStyle.label}
                </span>
                {row.hasIncompleteData ? (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full dark:text-amber-300 dark:bg-amber-900/30">
                    ⚠️ Données incomplètes
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{row.scheduledAt}</p>
            </div>
          );
        case 'client':
          return (
            <div className="space-y-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={row.clientName}>
                {row.clientName}
              </p>
              {row.contactLabel ? (
                <p className="truncate text-xs text-slate-600 dark:text-slate-300" title={row.contactLabel}>
                  {row.contactLabel}
                  {row.contactSubLabel ? ` • ${row.contactSubLabel}` : ''}
                </p>
              ) : (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={row.companyName}>
                  {row.companyName}
                </p>
              )}
            </div>
          );
        case 'prestations':
          return (
            <div className="space-y-1.5">
              {/* Nom de la formule/prestation */}
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100" title={row.serviceName}>
                {row.serviceName}
              </p>
              
              {/* Options sélectionnées - AFFICHAGE COMPLET */}
              {row.optionsSummary && row.optionsSummary !== 'Aucune prestation sélectionnée' ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Options :</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed" title={row.optionsSummary}>
                    {row.optionsSummary}
                  </p>
                </div>
              ) : null}
              
              {/* Catégories - AFFICHAGE COMPLET */}
              {(row.mainCategoryName || row.subCategoryName) && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">📂</span>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {row.mainCategoryName || ''}
                    {row.mainCategoryName && row.subCategoryName && ' > '}
                    {row.subCategoryName || ''}
                  </p>
                </div>
              )}
              
              {/* Majoration si présente */}
              {row.engagement.additionalCharge > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  💰 Majoration : +{formatCurrency(row.engagement.additionalCharge)}
                </p>
              )}
              
              {/* Commentaire mobile - AFFICHAGE COMPLET (pas tronqué) */}
              {row.mobileCompletionComment ? (
                <div className="mt-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50 p-2 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">💬 Commentaire :</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                    {row.mobileCompletionComment}
                  </p>
                </div>
              ) : null}
            </div>
          );
        case 'total':
          return (
            <div className="space-y-1.5 text-right">
              {/* Total TTC - MISE EN AVANT */}
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">{row.totalLabel}</p>
              
              {/* Montant HT */}
              <p className="text-xs text-slate-600 dark:text-slate-400">
                HT : {row.amountHtLabel}
              </p>
              
              {/* Durées - AFFICHAGE COMPLET */}
              <div className="space-y-0.5">
                {row.durationLabel && row.durationLabel !== '—' ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    ⏱️ Estimée : {row.durationLabel}
                  </p>
                ) : null}
                {row.realDurationLabel ? (
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    ✅ Réelle : {row.realDurationLabel}
                  </p>
                ) : null}
              </div>
              
              {/* Majoration si présente (déjà affichée dans prestations, mais on la remet ici pour visibilité) */}
              {row.surchargeLabel ? (
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  + {row.surchargeLabel}
                </p>
              ) : null}
            </div>
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
            <p className="dashboard-hero__eyebrow">Gestion CRM</p>
            <h1 className="dashboard-hero__title">Historique des services</h1>
            <p className="dashboard-hero__subtitle">
              Consultez l'historique de vos interventions réalisées et factures associées.
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      {/* Messages de feedback - Position standardisée : après header, avant KPIs */}
      {feedback && <CRMFeedback message={feedback} />}

      {/* Messages backend/loading - Position standardisée : section avant KPIs */}
      {(backendLoading || backendError) && (
        <section>
          <CRMBackendStatus
            loading={backendLoading}
            error={backendError}
            loadingMessage="Synchronisation des services avec le serveur…"
          />
        </section>
      )}

      {/* Section KPIs */}
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

        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
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
                <DateRangeFilter
                  startDate={dateRangeStart}
                  endDate={dateRangeEnd}
                  onChange={(start, end) => {
                    setDateRangeStart(start);
                    setDateRangeEnd(end);
                  }}
                />
                {selectedEngagementIds.length > 0 && (
                  <CRMBulkActions
                    selectedCount={selectedEngagementIds.length}
                    actions={[
                      hasPermission('service.print') && {
                        label: 'Imprimer',
                        onClick: handleBulkPrintEngagements,
                        icon: <IconPrinter />,
                      },
                      hasPermission('service.email') && {
                        label: 'Envoyer',
                        onClick: handleBulkSendEngagements,
                        icon: <IconPaperPlane />,
                      },
                      {
                        label: 'Transférer',
                        onClick: openTransferModal,
                        icon: <ArrowRightLeft className="h-4 w-4" />,
                      },
                      hasPermission('service.archive') && {
                        label: 'Archiver',
                        onClick: handleBulkArchiveEngagements,
                        icon: <IconArchive />,
                        variant: 'danger' as const,
                      },
                      hasPermission('service.archive') && {
                        label: 'Supprimer',
                        onClick: handleBulkDeleteEngagements,
                        icon: <X />,
                        variant: 'danger' as const,
                      },
                    ].filter(Boolean)}
                  />
                )}
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
                <button
                  type="button"
                  onClick={() => setShowFilters((value) => !value)}
                  className={clsx(
                    'relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all border',
                    showFilters || activeFiltersCount > 0
                      ? 'bg-white text-blue-600 border-blue-600 hover:border-blue-700 dark:bg-slate-800 dark:text-blue-400 dark:border-blue-500'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:border-slate-500'
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm dark:bg-blue-500">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowColumnManager((value) => !value)}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all border',
                    showColumnManager
                      ? 'bg-white text-blue-600 border-blue-600 hover:border-blue-700 dark:bg-slate-800 dark:text-blue-400 dark:border-blue-500'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:border-slate-500'
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Colonnes
                </button>
                <button
                  type="button"
                  onClick={handleExportEngagements}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 shadow-sm dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Le filtre de statut est retiré car on n'affiche que les services réalisés */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Type</label>
                  <select
                    value={kindFilter}
                    onChange={(event) => setKindFilter(event.target.value as EngagementKind | 'Tous')}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Tous">Tous</option>
                    <option value="service">Service</option>
                    <option value="facture">Facture</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Entreprise</label>
                  <select
                    value={companyFilter}
                    onChange={(event) => setCompanyFilter(event.target.value as 'Toutes' | string)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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

      <div className="hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900 lg:block">
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-4 w-12" />
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Organisation / Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Date de la prestation
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Entreprise
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Chiffre d'affaires
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serviceTableRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <span className="text-2xl text-slate-400 dark:text-slate-500">📄</span>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Aucune prestation trouvée</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Ajustez votre recherche ou vos filtres pour retrouver vos services.
                    </p>
                  </td>
                </tr>
              ) : (
                serviceTableRows.map((row) => {
                  const client = clientsById.get(row.engagement.clientId);
                  return (
                    <tr
                      key={row.id}
                      className={clsx(
                        'group transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer border-b border-slate-100 dark:border-slate-700',
                        row.isSelected && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                      onClick={(e) => {
                        // Ne pas ouvrir la modale si on clique sur la checkbox, les boutons d'action ou les liens
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('input[type="checkbox"]') ||
                          target.closest('button') ||
                          target.closest('a')
                        ) {
                          return;
                        }
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
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={row.isSelected}
                          onChange={() => toggleEngagementSelection(row.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-5 align-middle text-center">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                            row.kindStyle.className
                          )}
                        >
                          {row.kindStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {row.clientName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {row.scheduledAt || '—'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {row.companyName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {row.totalLabel}
                          </p>
                          {row.amountHtLabel && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              HT: {row.amountHtLabel}
                            </p>
                          )}
                          {row.surchargeLabel && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              +{row.surchargeLabel} majoration
                            </p>
                          )}
                          {row.durationLabel && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              Durée: {row.durationLabel}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
                          {row.contactLabel ? (
                            <>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{row.contactLabel}</p>
                              {row.contactSubLabel && (
                                <p className="text-xs text-slate-600 dark:text-slate-400">{row.contactSubLabel}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400">—</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-start gap-2 opacity-100 transition group-hover:translate-x-[1px] group-hover:opacity-100">
                          {renderDesktopActions(row.engagement)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
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
                        {row.engagement.mobileDurationMinutes && row.engagement.status === 'réalisé' && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {Math.floor(row.engagement.mobileDurationMinutes / 60)}h{(row.engagement.mobileDurationMinutes % 60).toString().padStart(2, '0')} via mobile
                          </p>
                        )}
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
                  {row.engagement.mobileCompletionComment && row.engagement.status === 'réalisé' && (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                        💬 Commentaire de réalisation
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {row.engagement.mobileCompletionComment}
                      </p>
                    </div>
                  )}
                </div>

                {columnVisibility.actions ? renderMobileActions(row.engagement) : null}
              </div>
            ))}
          </div>

          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-muted/80">
            {serviceTableRows.length} prestation(s)
          </p>

      {/* Modale de modification de service */}
      {showEditServiceModal && editModalDraft && selectedEngagement && (
        <CRMModal
          isOpen={showEditServiceModal}
          onClose={closeEditServiceModal}
          maxWidth="6xl"
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await handleUpdateService();
            }}
            className="flex flex-col h-[90vh] bg-white dark:bg-slate-900 overflow-hidden"
          >
            {/* Header fixe */}
            <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    MODIFIER UN SERVICE
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {selectedEngagement.kind === 'service' 
                      ? (selectedEngagement.quoteNumber ?? buildLegacyDocumentNumber(selectedEngagement.id, 'Service'))
                      : getEngagementDocumentNumber(selectedEngagement)}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Modifiez les informations du service. Les modifications seront enregistrées immédiatement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditServiceModal}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Contenu principal avec sidebar */}
            <div className="flex-1 flex overflow-hidden">
              {/* Barre latérale gauche - Informations du client */}
              <div className="w-80 flex flex-col border-r border-slate-200 bg-white">
                {/* Header de la sidebar */}
                <div className="p-6 pb-4 border-b border-slate-200 bg-white">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Informations client
                  </h3>
                </div>

                {/* Informations du client - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                  {(() => {
                    const client = clientsById.get(editModalDraft.clientId);
                    const company = editModalDraft.companyId ? companiesById.get(editModalDraft.companyId) : undefined;
                    
                    // Résoudre le contact principal : utiliser contactIds de l'engagement si disponible, sinon le contact par défaut
                    const selectedContactId = editModalDraft.contactIds?.[0];
                    const resolvedContact =
                      (selectedContactId && client?.contacts?.find((c) => c.active && c.id === selectedContactId)) ||
                      client?.contacts?.find((c) => c.active && c.isBillingDefault) ||
                      client?.contacts?.find((c) => c.active) ||
                      null;
                    
                    if (!client) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-sm text-slate-500">Aucun client sélectionné</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {/* Nom du client */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                            Client
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {client.name}
                          </p>
                          {client.type && (
                            <p className="text-xs text-slate-600 mt-1">
                              {client.type === 'company' ? 'Entreprise' : 'Particulier'}
                            </p>
                          )}
                        </div>

                        {/* Entreprise rattachée */}
                        {company && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                              Entreprise rattachée
                            </p>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-500" />
                              <p className="text-sm font-medium text-slate-900">
                                {company.name}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Contact principal */}
                        {resolvedContact && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                              Contact
                            </p>
                            <div className="space-y-2">
                              {resolvedContact.firstName || resolvedContact.lastName ? (
                                <p className="text-sm font-medium text-slate-900">
                                  {resolvedContact.firstName} {resolvedContact.lastName}
                                </p>
                              ) : null}
                              {resolvedContact.email && (
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <span>📧</span>
                                  <span>{resolvedContact.email}</span>
                                </div>
                              )}
                              {resolvedContact.mobile && (
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <span>📱</span>
                                  <span>{resolvedContact.mobile}</span>
                                </div>
                              )}
                              {resolvedContact.phone && !resolvedContact.mobile && (
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                  <span>☎️</span>
                                  <span>{resolvedContact.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Adresse */}
                        {(client.address || client.city) && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                              Adresse
                            </p>
                            <div className="text-sm text-slate-700">
                              {client.address && <p>{client.address}</p>}
                              {client.city && <p>{client.city}</p>}
                            </div>
                          </div>
                        )}

                        {/* SIRET (si entreprise) */}
                        {client.type === 'company' && client.siret && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                              SIRET
                            </p>
                            <p className="text-sm font-mono text-slate-900">
                              {client.siret}
                            </p>
                          </div>
                        )}

                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Contenu principal (droite) - Informations de la prestation */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                  {editModalError && <CRMErrorAlert message={editModalError} />}

                  {/* Section 1 : Informations de la prestation */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
                      Informations de la prestation
                    </h3>

                    {/* Service et description */}
                    {(() => {
                      const service = editModalDraft.serviceId ? servicesById.get(editModalDraft.serviceId) : null;
                      return service ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Service
                            </p>
                            <p className="text-base font-semibold text-slate-900">
                              {service.name}
                            </p>
                          </div>
                          {service.description && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Description
                              </p>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                {service.description}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}

                    {/* Catégories */}
                    {((selectedEngagement as any)?.mainCategoryId || (selectedEngagement as any)?.subCategoryId) && (
                      <div className="grid gap-4 md:grid-cols-2">
                        {(selectedEngagement as any)?.mainCategoryId && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Catégorie principale
                            </p>
                            <p className="text-base font-semibold text-slate-900">
                              {(() => {
                                const cat = categories.find(c => c.id === (selectedEngagement as any).mainCategoryId);
                                return cat?.name || (selectedEngagement as any).mainCategoryId;
                              })()}
                            </p>
                          </div>
                        )}
                        {(selectedEngagement as any)?.subCategoryId && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Sous-catégorie
                            </p>
                            <p className="text-base font-semibold text-slate-900">
                              {(() => {
                                const cat = categories.find(c => c.id === (selectedEngagement as any).subCategoryId);
                                return cat?.name || (selectedEngagement as any).subCategoryId;
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Options sélectionnées */}
                    {(() => {
                      const service = editModalDraft.serviceId ? servicesById.get(editModalDraft.serviceId) : null;
                      const selectedOptions = service?.options.filter(opt => editModalDraft.optionIds.includes(opt.id)) ?? [];
                      if (selectedOptions.length === 0) return null;
                      
                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Prestations sélectionnées
                          </p>
                          <div className="space-y-2">
                            {selectedOptions.map((option) => {
                              const override = editModalDraft.optionOverrides?.[option.id];
                              const quantity = override?.quantity ?? 1;
                              const unitPrice = override?.unitPriceHT ?? option.unitPriceHT;
                              const totalPrice = unitPrice * quantity;
                              const duration = override?.durationMin ?? option.defaultDurationMin ?? 0;
                              const isCustomized = override && (override.unitPriceHT !== undefined || override.quantity !== 1 || override.durationMin !== undefined);
                              
                              return (
                                <div key={option.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm font-semibold text-slate-900">
                                        {option.label}
                                        {isCustomized && <span className="ml-2 text-xs text-amber-600">(personnalisé)</span>}
                                      </p>
                                      {option.description && (
                                        <p className="text-xs text-slate-600 mt-1">
                                          {option.description}
                                        </p>
                                      )}
                                      {quantity > 1 && (
                                        <p className="text-xs text-slate-500 mt-1">
                                          Quantité: ×{quantity}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="text-sm font-bold text-slate-900">
                                        {formatCurrency(totalPrice)} HT
                                      </p>
                                      {duration > 0 && (
                                        <p className="text-xs text-slate-600">
                                          {formatDuration(duration)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Section 2 : Prix et durées */}
                  <div className="space-y-4 border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
                      Prix et durées
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Prix */}
                      {(() => {
                        const totals = computeEngagementTotals(selectedEngagement);
                        const vatEnabledForRow = selectedEngagement.invoiceVatEnabled ?? (companiesById.get(selectedEngagement.companyId || '')?.vatEnabled ?? vatEnabled);
                        const vatAmount = vatEnabledForRow ? totals.price * vatMultiplier : 0;
                        const totalWithVat = totals.price + vatAmount;
                        const finalTotal = totalWithVat + totals.surcharge;
                        
                        return (
                          <>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Prix HT
                              </p>
                              <p className="text-2xl font-bold text-slate-900">
                                {formatCurrency(totals.price)}
                              </p>
                            </div>
                            {totals.surcharge > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                                  Majoration
                                </p>
                                <p className="text-xl font-bold text-amber-700">
                                  +{formatCurrency(totals.surcharge)}
                                </p>
                              </div>
                            )}
                            {vatEnabledForRow && totals.price > 0 && (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  TVA ({vatRate}%)
                                </p>
                                <p className="text-xl font-bold text-slate-900">
                                  {formatCurrency(vatAmount)}
                                </p>
                              </div>
                            )}
                            <div className="space-y-2 md:col-span-2 border-t border-slate-200 pt-4">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                Total {vatEnabledForRow && totals.price > 0 ? 'TTC' : 'HT'}
                              </p>
                              <p className="text-3xl font-bold text-blue-700">
                                {formatCurrency(finalTotal)}
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Durées */}
                    <div className="grid gap-4 md:grid-cols-2 border-t border-slate-200 pt-4">
                      {(() => {
                        const totals = computeEngagementTotals(selectedEngagement);
                        // Chercher mobileDurationMinutes dans selectedEngagement ou editModalDraft
                        // Vérifier aussi dans les engagements directement au cas où selectedEngagement serait obsolète
                        const engagementFromList = engagements.find(e => e.id === selectedEngagement.id);
                        const realDuration = selectedEngagement.mobileDurationMinutes 
                          ?? (editModalDraft as any)?.mobileDurationMinutes 
                          ?? engagementFromList?.mobileDurationMinutes 
                          ?? null;
                        
                        // Log pour déboguer
                        console.log('🔍 [ServicePage] ========== AUDIT DURÉE RÉALISATION ==========');
                        console.log('🔍 [ServicePage] Engagement ID:', selectedEngagement.id);
                        console.log('🔍 [ServicePage] Status:', selectedEngagement.status);
                        console.log('🔍 [ServicePage] Kind:', selectedEngagement.kind);
                        console.log('🔍 [ServicePage] selectedEngagement.mobileDurationMinutes:', selectedEngagement.mobileDurationMinutes, `(type: ${typeof selectedEngagement.mobileDurationMinutes})`);
                        console.log('🔍 [ServicePage] editModalDraft?.mobileDurationMinutes:', (editModalDraft as any)?.mobileDurationMinutes, `(type: ${typeof (editModalDraft as any)?.mobileDurationMinutes})`);
                        console.log('🔍 [ServicePage] engagementFromList?.mobileDurationMinutes:', engagementFromList?.mobileDurationMinutes, `(type: ${typeof engagementFromList?.mobileDurationMinutes})`);
                        console.log('🔍 [ServicePage] realDuration calculée:', realDuration, `(type: ${typeof realDuration})`);
                        console.log('🔍 [ServicePage] Condition d\'affichage:', {
                          'realDuration !== null': realDuration !== null,
                          'realDuration !== undefined': realDuration !== undefined,
                          'realDuration > 0': realDuration > 0,
                          'résultat': realDuration !== null && realDuration !== undefined && realDuration > 0,
                        });
                        console.log('🔍 [ServicePage] Durée estimée (totals.duration):', totals.duration);
                        console.log('🔍 [ServicePage] selectedEngagement complet:', JSON.stringify({
                          id: selectedEngagement.id,
                          mobileDurationMinutes: selectedEngagement.mobileDurationMinutes,
                          mobileCompletionComment: selectedEngagement.mobileCompletionComment,
                          status: selectedEngagement.status,
                          kind: selectedEngagement.kind,
                        }, null, 2));
                        console.log('🔍 [ServicePage] ============================================');
                        
                        return (
                          <>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Durée estimée
                              </p>
                              <p className="text-xl font-bold text-slate-900">
                                {totals.duration > 0 ? formatDuration(totals.duration) : '—'}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-green-600">
                                Durée de réalisation
                              </p>
                              {realDuration !== null && realDuration !== undefined && (realDuration >= 0 || selectedEngagement.status === 'réalisé') ? (
                                selectedEngagement.status === 'réalisé' && realDuration === 0 ? (
                                  <p className="text-xl font-bold text-green-700">
                                    0 min
                                  </p>
                                ) : realDuration > 0 ? (
                                  <>
                                    <p className="text-xl font-bold text-green-700">
                                      {Math.floor(realDuration / 60)}h{(realDuration % 60).toString().padStart(2, '0')}
                                    </p>
                                    {totals.duration > 0 && (
                                      <p className="text-xs text-slate-600">
                                        Différence avec estimée: {realDuration >= totals.duration ? '+' : ''}{formatDuration(Math.abs(realDuration - totals.duration))}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-base text-slate-400 italic">
                                    Non renseignée
                                  </p>
                                )
                              ) : (
                                <p className="text-base text-slate-400 italic">
                                  Non renseignée
                                </p>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Section 3 : Planification */}
                  <div className="space-y-4 border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
                      Planification
                    </h3>

                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Date prévue */}
                      {editModalDraft.scheduledAt && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Date prévue
                          </p>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <p className="text-base font-semibold text-slate-900">
                              {formatDate(editModalDraft.scheduledAt)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Heure de début */}
                      {editModalDraft.startTime && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Heure de début
                          </p>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-500" />
                            <p className="text-base font-semibold text-slate-900">
                              {editModalDraft.startTime}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Heure de fin (calculée) */}
                      {editModalDraft.startTime && (() => {
                        const totals = computeEngagementTotals(selectedEngagement);
                        const realDuration = selectedEngagement.mobileDurationMinutes;
                        const durationMinutes = realDuration && realDuration > 0 ? realDuration : totals.duration;
                        
                        if (durationMinutes > 0) {
                          const [startHours, startMinutes] = editModalDraft.startTime.split(':').map(Number);
                          const startDate = new Date();
                          startDate.setHours(startHours, startMinutes, 0, 0);
                          const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
                          const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
                          
                          return (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Heure de fin estimée
                              </p>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-500" />
                                <p className="text-base font-semibold text-slate-900">
                                  {endTime}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Support */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Type de support
                        </p>
                        <p className="text-base font-semibold text-slate-900">
                          {editModalDraft.supportType || '—'}
                        </p>
                      </div>
                      {editModalDraft.supportDetail && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Détail du support
                          </p>
                          <p className="text-base text-slate-700">
                            {editModalDraft.supportDetail}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Statut */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Statut
                      </p>
                      <span className={clsx(
                        'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
                        selectedEngagement.status === 'réalisé' 
                          ? 'bg-green-100 text-green-800' 
                          : selectedEngagement.status === 'planifié'
                          ? 'bg-blue-100 text-blue-800'
                          : selectedEngagement.status === 'envoyé'
                          ? 'bg-purple-100 text-purple-800'
                          : selectedEngagement.status === 'annulé'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-800'
                      )}>
                        {selectedEngagement.status}
                      </span>
                    </div>
                  </div>

                  {/* Section 4 : Commentaire de réalisation */}
                  {selectedEngagement.mobileCompletionComment && selectedEngagement.status === 'réalisé' && (
                    <div className="space-y-4 border-t border-slate-200 pt-6">
                      <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2">
                        Commentaire de réalisation
                      </h3>
                      <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-4">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {selectedEngagement.mobileCompletionComment}
                        </p>
                        {selectedEngagement.mobileDurationMinutes && (
                          <p className="text-xs text-slate-600 mt-2">
                            Durée enregistrée: {Math.floor(selectedEngagement.mobileDurationMinutes / 60)}h{(selectedEngagement.mobileDurationMinutes % 60).toString().padStart(2, '0')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer avec boutons d'action */}
                <div className="border-t border-slate-200 bg-white dark:border-slate-700 p-6">
                  <div className="flex items-center justify-end gap-3">
                    {hasPermission('service.print') && selectedEngagement && selectedEngagement.kind === 'service' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (selectedEngagement) {
                            await handleGenerateInvoice(selectedEngagement, 'print');
                          }
                        }}
                        className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/40"
                      >
                        <IconPrinter className="h-4 w-4" />
                        Imprimer une facture
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={closeEditServiceModal}
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </CRMModal>
      )}


        {/* Modale de détails du lead/prospect */}
        <LeadDetailModal
          isOpen={showLeadDetailModal}
          onClose={() => {
            setShowLeadDetailModal(false);
            setSelectedLeadId(null);
          }}
          lead={selectedLead}
          clients={clients}
          engagements={engagements}
          services={services}
          computeEngagementTotals={computeEngagementTotals}
        />

      {/* Modale de transfert de prestation */}
      <CRMModal isOpen={showTransferModal} onClose={closeTransferModal}>
        <div className="p-6">
          <CRMModalHeader
            title={`Transférer ${selectedEngagementIds.length} prestation(s)`}
            onClose={closeTransferModal}
          />
          <form onSubmit={handleBulkTransfer} className="space-y-6 mt-6">
            <div className="space-y-4">
              <div>
                <CRMFormLabel htmlFor="transfer-target-company">
                  Entreprise de destination
                </CRMFormLabel>
                {transferLoading ? (
                  <div className="text-sm text-slate-500 dark:text-slate-400 py-2">
                    Chargement des entreprises...
                  </div>
                ) : (
                  <>
                    <CRMFormSelect
                      id="transfer-target-company"
                      value={transferTargetCompanyId}
                      onChange={(e) => setTransferTargetCompanyId(e.target.value)}
                      required
                      disabled={transferLoading || availableCompanies.length === 0}
                    >
                      <option value="">Sélectionner une entreprise</option>
                      {availableCompanies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </CRMFormSelect>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Les {selectedEngagementIds.length} prestation(s) sélectionnée(s) seront transférées vers cette entreprise.
                    </p>
                  </>
                )}
              </div>

              {transferError && (
                <CRMErrorAlert message={transferError} />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <CRMCancelButton
                type="button"
                onClick={closeTransferModal}
                disabled={transferLoading}
              >
                Annuler
              </CRMCancelButton>
              <CRMSubmitButton
                type="submit"
                disabled={transferLoading || !transferTargetCompanyId || availableCompanies.length === 0}
              >
                {transferLoading && transferTargetCompanyId ? 'Transfert en cours...' : 'Transférer'}
              </CRMSubmitButton>
            </div>
          </form>
        </div>
      </CRMModal>
    </div>
  );
};

export default ServicePage;
