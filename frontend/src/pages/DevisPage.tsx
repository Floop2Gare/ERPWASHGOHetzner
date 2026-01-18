import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { startOfMonth, endOfMonth } from 'date-fns';
import clsx from 'clsx';
import {
  FileText,
  Plus,
  Filter,
  Download,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Calendar,
  User,
  Users,
  UserPlus,
  Building2,
  ChevronRight,
  Check,
  Circle,
  Pencil,
  Printer,
  Trash2,
  ArrowRightLeft,
  Mail,
  Phone,
  Info,
  AlertCircle,
  Search,
  Tag,
} from 'lucide-react';
import { IconConvert, IconDuplicate } from '../components/icons';
import {
  CRMFeedback,
  CRMModal,
  CRMModalHeader,
  CRMFormLabel,
  CRMFormInput,
  CRMFormSelect,
  CRMSubmitButton,
  CRMCancelButton,
  CRMErrorAlert,
  DateRangeFilter,
  CRMBulkActions,
} from '../components/crm';
import {
  useAppData,
  Engagement,
  EngagementKind,
  CommercialDocumentStatus,
  Client,
  Service,
  ServiceOption,
  ServiceCategory,
  SupportType,
  EngagementStatus,
  ClientContact,
  ClientContactRole,
  EngagementOptionOverride,
} from '../store/useAppData';
import { formatCurrency, formatDate, formatDuration, toISODateString, parseTime, splitContactName } from '../lib/format';
import { generateQuotePdf, generateQuotePdfWithMultipleServices, type QuoteServiceItem, generateQuoteFileName } from '../lib/invoice';
import { sendDocumentEmail, openEmailComposer } from '../lib/email';
import { getNextQuoteNumber, resolveOptionOverride } from './service/utils';
import type { EngagementDraft, OptionOverrideResolved } from './service/types';
import {
  buildInitialDraft,
  buildDraftFromEngagement,
  buildPreviewEngagement,
  toLocalInputValue,
  fromLocalInputValue,
  computeVatMultiplier,
  sanitizeVatRate,
  formatVatRateLabel,
} from './service/utils';
import { ClientLeadSearch } from '../components/ClientLeadSearch';
import { ServiceCatalogManager } from '../components/ServiceCatalogManager';
import { CategoryService, ClientService, LeadService, ServiceService, AppointmentService, ProjectMemberService, CompanyService } from '../api';
import { useDraftOptions } from './service/hooks';
import { useEntityMaps } from '../hooks/useEntityMaps';
import { ensureClientFromLead, findClientFromLead } from '../lib/clientUtils';

const DevisPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    engagements,
    clients,
    leads,
    services,
    companies,
    categories,
    activeCompanyId,
    vatEnabled,
    vatRate,
    computeEngagementTotals,
    addEngagement,
    updateEngagement,
    removeEngagement,
    recordEngagementSend,
    userProfile,
    currentUserId,
    authUsers,
    projectMembers,
    hasPermission,
    addClient,
    addClientContact,
    addLead,
  } = useAppData();

  // Filtres
  const [statusFilter, setStatusFilter] = useState<CommercialDocumentStatus | 'Tous'>('Tous');
  const [companyFilter, setCompanyFilter] = useState<string>('Toutes');
  const [dateFilter, setDateFilter] = useState<string>('');
  // Période par défaut : du 1er au dernier jour du mois en cours
  const now = new Date();
  const [dateRangeStart, setDateRangeStart] = useState<string>(
    toISODateString(startOfMonth(now))
  );
  const [dateRangeEnd, setDateRangeEnd] = useState<string>(
    toISODateString(endOfMonth(now))
  );
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // États pour la création/édition
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationDraft, setCreationDraft] = useState<EngagementDraft | null>(null);
  const [editDraft, setEditDraft] = useState<EngagementDraft | null>(null); // Nécessaire pour useDraftOptions
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [editingEngagementId, setEditingEngagementId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedClientOrLeadType, setSelectedClientOrLeadType] = useState<'client' | 'lead' | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  const [newContactForm, setNewContactForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    roles: ClientContactRole[];
    isBillingDefault: boolean;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    roles: [],
    isBillingDefault: false,
  });
  
  // États pour le système d'étapes
  const [currentStep, setCurrentStep] = useState<number>(1);
  // État pour basculer entre sélection et gestion du catalogue dans l'étape 2
  const [showCatalogManager, setShowCatalogManager] = useState(false);
  const [serviceSelectionMode, setServiceSelectionMode] = useState<'select' | 'create'>('select');
  const [saveClientToDatabase, setSaveClientToDatabase] = useState<boolean>(false);
  const [isCreatingNewClient, setIsCreatingNewClient] = useState<boolean>(false);
  const [isCreatingNewLead, setIsCreatingNewLead] = useState<boolean>(false);
  const [isCreatingQuote, setIsCreatingQuote] = useState<boolean>(false);
  const [newClientData, setNewClientData] = useState<{
    type: 'company' | 'individual';
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    siret: string;
  } | null>(null);
  const [newLeadData, setNewLeadData] = useState<{
    type: 'company' | 'individual';
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    siret: string;
  } | null>(null);
  const [selectedServices, setSelectedServices] = useState<Array<{
    serviceId: string;
    optionIds: string[];
    optionOverrides: Record<string, EngagementOptionOverride>;
    supportType: SupportType;
    supportDetail: string;
    mainCategoryId?: string;
    subCategoryId?: string;
    quantity?: number; // Quantité pour la prestation
  }>>([]);
  
  // États pour le modal de sélection de prestation
  const [showServiceSelectionModal, setShowServiceSelectionModal] = useState<boolean>(false);
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
  const [modalSelectedMainCategoryId, setModalSelectedMainCategoryId] = useState<string>('');
  const [modalSelectedSubCategoryId, setModalSelectedSubCategoryId] = useState<string>('');
  const [modalSelectedServiceId, setModalSelectedServiceId] = useState<string>('');
  const [modalSelectedSupportDetail, setModalSelectedSupportDetail] = useState<string>('');
  const [modalSelectedOptionIds, setModalSelectedOptionIds] = useState<string[]>([]);
  
  // État pour l'édition du prix dans le tableau
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');
  const [editingDurationIndex, setEditingDurationIndex] = useState<number | null>(null);
  const [editingDurationValue, setEditingDurationValue] = useState<string>('');
  // Toujours un devis, pas de choix de type de document
  const documentType: 'devis' = 'devis';
  const [applyPricingGrid, setApplyPricingGrid] = useState<boolean>(false);

  // Maps pour accès rapide
  const clientsById = useEntityMaps(clients);
  const servicesById = useEntityMaps(services);
  const companiesById = useEntityMaps(companies);

  // Filtrer uniquement les devis
  const filteredQuotes = useMemo(() => {
    const quotes = engagements.filter((engagement) => {
      if (engagement.kind !== 'devis') return false;

      const client = clientsById.get(engagement.clientId);
      const company = engagement.companyId ? companiesById.get(engagement.companyId) : undefined;
      const service = servicesById.get(engagement.serviceId);

      const matchesStatus =
        statusFilter === 'Tous' || engagement.quoteStatus === statusFilter || (statusFilter === 'brouillon' && !engagement.quoteStatus);

      const matchesCompany = companyFilter === 'Toutes' || engagement.companyId === companyFilter;

      const matchesDate = (() => {
        // Si un filtre de date simple est défini, l'utiliser en priorité
        if (dateFilter) {
          if (!engagement.scheduledAt) return false;
          const engagementDate = new Date(engagement.scheduledAt);
          const filterDate = new Date(dateFilter);
          engagementDate.setHours(0, 0, 0, 0);
          filterDate.setHours(0, 0, 0, 0);
          return engagementDate.getTime() === filterDate.getTime();
        }
        // Sinon, utiliser la plage de dates
        if (!engagement.scheduledAt) return false;
        const engagementDate = new Date(engagement.scheduledAt);
        const startDate = new Date(dateRangeStart);
        const endDate = new Date(dateRangeEnd);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        engagementDate.setHours(0, 0, 0, 0);
        return engagementDate >= startDate && engagementDate <= endDate;
      })();

      return matchesStatus && matchesCompany && matchesDate;
    });
    
    // Trier par nom du devis (alphabétique), puis par numéro de devis
    return quotes.sort((a, b) => {
      const nameA = (a.quoteName || '').toLowerCase();
      const nameB = (b.quoteName || '').toLowerCase();
      if (nameA && nameB) {
        return nameA.localeCompare(nameB);
      }
      if (nameA) return -1;
      if (nameB) return 1;
      // Si pas de nom, trier par numéro de devis
      const numA = a.quoteNumber || '';
      const numB = b.quoteNumber || '';
      return numB.localeCompare(numA); // Ordre décroissant pour les numéros
    });
  }, [
    engagements,
    clientsById,
    companiesById,
    servicesById,
    statusFilter,
    companyFilter,
    dateFilter,
    dateRangeStart,
    dateRangeEnd,
  ]);

  // Gestion de la sélection des lignes
  const toggleRowSelection = (id: string) => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected = useMemo(
    () => filteredQuotes.length > 0 && filteredQuotes.every((q) => selectedRows.has(q.id)),
    [filteredQuotes, selectedRows]
  );

  const handleToggleSelectAll = () => {
    if (allSelected) {
      // Désélectionner tous les éléments filtrés
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredQuotes.forEach((q) => next.delete(q.id));
        return next;
      });
    } else {
      // Sélectionner tous les éléments filtrés
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredQuotes.forEach((q) => next.add(q.id));
        return next;
      });
    }
  };

  // Mettre à jour selectedRows quand filteredQuotes change
  useEffect(() => {
    setSelectedRows((current) => {
      const next = new Set<string>();
      filteredQuotes.forEach((q) => {
        if (current.has(q.id)) {
          next.add(q.id);
        }
      });
      return next;
    });
  }, [filteredQuotes]);

  // Ouvrir la création de devis
  const openCreateQuote = useCallback(() => {
    const draft = buildInitialDraft(clients, services, companies, activeCompanyId);
    draft.kind = 'devis';
    draft.status = 'brouillon';
    draft.clientId = '';
    draft.serviceId = '';
    draft.contactIds = [];
    draft.assignedUserIds = [];
    setCreationDraft(draft);
    setSelectedCategory('');
    setCurrentStep(1);
    setSaveClientToDatabase(false);
    setIsCreatingNewClient(false);
    setIsCreatingNewLead(false);
    setNewClientData(null);
    setNewLeadData(null);
    setSelectedLeadId(null);
    setSelectedClientOrLeadType(null);
    setSelectedServices([]);
    setApplyPricingGrid(false);
    setEditingEngagementId(null);
    setShowCreateModal(true);
  }, [clients, services, companies, activeCompanyId]);

  // Détecter le paramètre ?create=true pour ouvrir automatiquement le modal de création
  useEffect(() => {
    const createParam = searchParams.get('create');
    if (createParam === 'true' && !showCreateModal) {
      // Utiliser un petit délai pour s'assurer que les données sont chargées
      const timer = setTimeout(() => {
        try {
          // Ouvrir le modal de création
          openCreateQuote();
          
          // Nettoyer le paramètre de l'URL
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('create');
          setSearchParams(newParams, { replace: true });
        } catch (error) {
          console.error('[DevisPage] Erreur lors de l\'ouverture du modal de création:', error);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, showCreateModal, openCreateQuote, setSearchParams]);

  // Données sélectionnées
  const selectedData = useMemo(() => {
    return filteredQuotes.filter((q) => selectedRows.has(q.id));
  }, [filteredQuotes, selectedRows]);

  // Actions en masse
  const handleBulkPrint = () => {
    if (!selectedData.length) {
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setFeedback('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les fenêtres pop-up.');
      return;
    }
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Liste des devis</title>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            h1 {
              color: #1e40af;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #3b82f6;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .header-info {
              margin-bottom: 20px;
              padding: 10px;
              background-color: #eff6ff;
              border-left: 4px solid #3b82f6;
            }
            @media print {
              body {
                margin: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <h1>Liste des devis</h1>
          <div class="header-info">
            <p><strong>Date d'impression :</strong> ${new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Nombre de devis :</strong> ${selectedData.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>N° Devis</th>
                <th>Client / Prospect</th>
                <th>Service</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Montant TTC</th>
              </tr>
            </thead>
            <tbody>
              ${selectedData.map((engagement) => {
                const client = clientsById.get(engagement.clientId);
                const service = servicesById.get(engagement.serviceId);
                const totals = computeEngagementTotals(engagement);
                const company = engagement.companyId ? companiesById.get(engagement.companyId) : null;
                const vatEnabledForQuote = company?.vatEnabled ?? vatEnabled;
                const vatAmount = vatEnabledForQuote ? totals.price * (vatRate ?? 0) / 100 : 0;
                const totalTtc = totals.price + totals.surcharge + vatAmount;
                const status = engagement.quoteStatus || 'brouillon';
                return `
                  <tr>
                    <td>${engagement.quoteNumber || '—'}</td>
                    <td>${client?.name || 'Client inconnu'}</td>
                    <td>${service?.name || 'Service archivé'}</td>
                    <td>${formatDate(engagement.scheduledAt)}</td>
                    <td>${status.charAt(0).toUpperCase() + status.slice(1)}</td>
                    <td>${formatCurrency(totalTtc)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    setFeedback(`${selectedData.length} devis prêt(s) à imprimer.`);
  };

  const handleBulkDelete = () => {
    if (!hasPermission('service.archive') || !selectedData.length) {
      return;
    }
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer définitivement ${selectedData.length} devis sélectionné(s) ? Cette action est irréversible.`
    );
    if (!confirmed) {
      return;
    }
    selectedData.forEach((engagement) => removeEngagement(engagement.id));
    setSelectedRows(new Set());
    setFeedback(`${selectedData.length} devis supprimé(s).`);
  };

  // États pour le transfert
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetCompanyId, setTransferTargetCompanyId] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<Array<{ id: string; name: string }>>([]);

  const openTransferModal = useCallback(async () => {
    const selectedCount = selectedRows.size;
    if (selectedCount === 0) {
      setFeedback('Veuillez sélectionner au moins un devis à transférer.');
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
  }, [selectedRows.size, activeCompanyId]);

  const handleBulkTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!selectedRows.size || !transferTargetCompanyId) {
      setTransferError('Veuillez sélectionner une entreprise de destination.');
      return;
    }

    try {
      setTransferLoading(true);
      setTransferError(null);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const engagementId of Array.from(selectedRows)) {
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
        setFeedback(`${successCount} devis transféré(s) avec succès.`);
        setSelectedRows(new Set());
        setShowTransferModal(false);
        setTransferTargetCompanyId('');
        // Recharger les devis depuis le backend si nécessaire
        window.location.reload(); // Simple reload pour rafraîchir les données
      }
      
      if (errorCount > 0) {
        setTransferError(`${errorCount} devis n'ont pas pu être transféré(s).`);
      }
    } catch (error: any) {
      setTransferError(error?.message || 'Erreur lors du transfert des devis.');
    } finally {
      setTransferLoading(false);
    }
  };

  const closeTransferModal = useCallback(() => {
    setShowTransferModal(false);
    setTransferTargetCompanyId('');
    setTransferError(null);
  }, []);

  // Statistiques
  const stats = useMemo(() => {
    const total = filteredQuotes.length;
    const brouillon = filteredQuotes.filter((q) => !q.quoteStatus || q.quoteStatus === 'brouillon').length;
    const envoye = filteredQuotes.filter((q) => q.quoteStatus === 'envoyé').length;
    const accepte = filteredQuotes.filter((q) => q.quoteStatus === 'accepté').length;
    const refuse = filteredQuotes.filter((q) => q.quoteStatus === 'refusé').length;
    
    const totalAmount = filteredQuotes.reduce((sum, q) => {
      const totals = computeEngagementTotals(q);
      return sum + totals.price + totals.surcharge;
    }, 0);

    const accepteAmount = filteredQuotes
      .filter((q) => q.quoteStatus === 'accepté')
      .reduce((sum, q) => {
        const totals = computeEngagementTotals(q);
        return sum + totals.price + totals.surcharge;
      }, 0);

    return {
      total,
      brouillon,
      envoye,
      accepte,
      refuse,
      totalAmount,
      accepteAmount,
      tauxAcceptation: envoye > 0 ? Math.round((accepte / envoye) * 100) : 0,
    };
  }, [filteredQuotes, computeEngagementTotals]);

  // Variables calculées pour le formulaire
  const creationClient: Client | null = creationDraft?.clientId
    ? clientsById.get(creationDraft.clientId) ?? null
    : null;

  const creationSelectedService = creationDraft?.serviceId
    ? servicesById.get(creationDraft.serviceId) ?? null
    : null;

  const creationCompany =
    creationDraft?.companyId && creationDraft.companyId !== ''
      ? companiesById.get(creationDraft.companyId) ?? null
      : activeCompanyId
      ? companiesById.get(activeCompanyId) ?? null
      : null;

  const vatPercent = sanitizeVatRate(vatRate);
  const vatMultiplier = computeVatMultiplier(sanitizeVatRate(vatRate));

  const creationTotals = useMemo(() => {
    if (!creationDraft?.serviceId) {
      return { price: 0, duration: 0, surcharge: creationDraft?.additionalCharge || 0 };
    }
    const preview = buildPreviewEngagement(
      {
        ...creationDraft,
        status: 'planifié',
      },
      'devis'
    );
    return computeEngagementTotals(preview);
  }, [creationDraft, computeEngagementTotals]);

  const creationVatEnabled = creationCompany?.vatEnabled ?? vatEnabled;
  const creationVatAmount = creationVatEnabled ? creationTotals.price * vatMultiplier : 0;
  const creationTotalTtc = creationTotals.price + creationVatAmount + creationTotals.surcharge;

  const estimatedDuration = useMemo(() => {
    if (!creationDraft?.serviceId) return null;
    const service = servicesById.get(creationDraft.serviceId);
    if (!service) return null;
    
    const totalDuration = creationDraft.optionIds.reduce((total, optionId) => {
      const option = service.options.find(opt => opt.id === optionId);
      if (!option) return total;
      const override = creationDraft.optionOverrides?.[optionId];
      const duration = override?.durationMin ?? option.defaultDurationMin ?? 0;
      return total + duration;
    }, 0);
    
    return totalDuration > 0 ? totalDuration : null;
  }, [creationDraft?.serviceId, creationDraft?.optionIds, creationDraft?.optionOverrides, servicesById]);

  // Calcul de la durée totale pour toutes les prestations sélectionnées
  const totalDurationMinutes = useMemo(() => {
    return selectedServices
      .filter((sel) => !(sel as any).isSubCategoryRow)
      .reduce((sum, sel) => {
        const service = servicesById.get(sel.serviceId);
        if (!service) return sum;
        
        // Durée du service
        // Priorité au base_duration si disponible (même si 0)
        let serviceDuration = 0;
        if ((service as any).base_duration !== undefined && (service as any).base_duration !== null) {
          serviceDuration = (service as any).base_duration;
        } else if (service.options && Array.isArray(service.options) && sel.optionIds.length > 0) {
          // Sinon, calculer depuis les options sélectionnées
          serviceDuration = service.options
            .filter(opt => sel.optionIds.includes(opt.id))
            .reduce((optSum, opt) => {
              const override = sel.optionOverrides[opt.id];
              const duration = override?.durationMin ?? opt.defaultDurationMin ?? 0;
              const qty = override?.quantity ?? 1;
              return optSum + (duration * qty);
            }, 0);
        }
        
        // Ajouter la durée de la sous-catégorie si définie
        const subCategory = sel.subCategoryId 
          ? categories.find((cat) => cat.id === sel.subCategoryId)
          : null;
        const subCategoryDuration = (subCategory as any)?.defaultDurationMin || 0;
        
        return sum + serviceDuration + subCategoryDuration;
      }, 0);
  }, [selectedServices, servicesById, categories]);

  // Calcul automatique de l'heure de fin
  const calculatedEndTime = useMemo(() => {
    if (!creationDraft?.startTime || !creationDraft?.scheduledAt || totalDurationMinutes === 0) {
      return null;
    }
    
    try {
      const { hours, minutes } = parseTime(creationDraft.startTime);
      const startDate = new Date(`${creationDraft.scheduledAt}T${creationDraft.startTime}`);
      const endDate = new Date(startDate.getTime() + totalDurationMinutes * 60 * 1000);
      
      const endHours = endDate.getHours().toString().padStart(2, '0');
      const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
      return `${endHours}:${endMinutes}`;
    } catch {
      return null;
    }
  }, [creationDraft?.startTime, creationDraft?.scheduledAt, totalDurationMinutes]);

  // Calcul du montant total et nombre d'options pour le résumé
  const summaryStats = useMemo(() => {
    let totalAmount = 0;
    let totalOptions = 0;

    if (selectedServices.length > 0) {
      // Utiliser selectedServices
      selectedServices
        .filter((sel) => !(sel as any).isSubCategoryRow)
        .forEach((sel) => {
          // Calculer le tarif du service
          const service = servicesById.get(sel.serviceId);
          if (service) {
            // Calculer le prix unitaire du service
            let servicePrice = 0;
            // Priorité au base_price si disponible (même si 0)
            if ((service as any).base_price !== undefined && (service as any).base_price !== null) {
              servicePrice = (service as any).base_price;
              totalOptions += 1;
            } else if (service.options && Array.isArray(service.options) && sel.optionIds.length > 0) {
              // Sinon, calculer depuis les options sélectionnées
              service.options
                .filter(opt => sel.optionIds.includes(opt.id))
                .forEach((opt) => {
                  const override = sel.optionOverrides[opt.id];
                  const price = override?.unitPriceHT ?? opt.unitPriceHT;
                  const qty = override?.quantity ?? 1;
                  servicePrice += price * qty;
                  totalOptions += 1;
                });
            }
            
            // Ajouter le prix de la sous-catégorie si elle existe
            const subCategory = sel.subCategoryId 
              ? categories.find((cat) => cat.id === sel.subCategoryId)
              : null;
            const subCategoryPrice = subCategory?.priceHT || 0;
            
            // Multiplier par la quantité du service
            const serviceQuantity = sel.quantity ?? 1;
            totalAmount += (servicePrice + subCategoryPrice) * serviceQuantity;
          }
        });
    } else if (creationDraft?.serviceId && creationDraft.optionIds.length > 0) {
      // Utiliser creationDraft (ancien système)
      const service = servicesById.get(creationDraft.serviceId);
      if (service && service.options && Array.isArray(service.options)) {
        service.options
          .filter(opt => creationDraft.optionIds.includes(opt.id))
          .forEach((opt) => {
            const override = creationDraft.optionOverrides?.[opt.id];
            const price = override?.unitPriceHT ?? opt.unitPriceHT;
            const qty = override?.quantity ?? 1;
            totalAmount += price * qty;
            totalOptions += 1;
          });
      }
      if (creationDraft.additionalCharge) {
        totalAmount += creationDraft.additionalCharge;
      }
    }

    return { totalAmount, totalOptions };
  }, [selectedServices, creationDraft, servicesById, categories]);

  // Utilisation du hook pour gérer les options
  // Note: editDraft n'est pas utilisé dans DevisPage mais nécessaire pour useDraftOptions
  useDraftOptions(
    servicesById,
    creationDraft,
    setCreationDraft,
    editDraft,
    setEditDraft
  );

  // Fonction pour charger les clients depuis le backend
  const loadClientsFromBackend = useCallback(async () => {
    if (!activeCompanyId) {
      useAppData.setState({ clients: [] });
      return;
    }
    
    try {
      const result = await ClientService.getClients();
      if (result.success && Array.isArray(result.data)) {
        // Mappage minimal → le backend renvoie déjà nos objets (JSONB)
        const mapped: Client[] = result.data.map((c: any) => ({
          id: c.id,
          type: c.type ?? 'company',
          name: c.name ?? '',
          companyName: c.type === 'company' ? (c.companyName ?? c.name ?? '') : null,
          firstName: c.type === 'individual' ? (c.firstName ?? null) : null,
          lastName: c.type === 'individual' ? (c.lastName ?? null) : null,
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
        // Remplace les clients du store par la réponse backend
        useAppData.setState({ clients: mapped });
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des clients:', error);
    }
  }, [activeCompanyId]);

  // Fonction pour charger les prospects depuis le backend
  const loadLeadsFromBackend = useCallback(async () => {
    if (!activeCompanyId) {
      useAppData.setState({ leads: [] });
      return;
    }
    
    try {
      const result = await LeadService.getAll();
      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map((l: any) => ({
          id: l.id,
          company: l.company ?? l.name ?? '',
          contact: l.contact ?? l.contactName ?? '',
          phone: l.phone ?? '',
          email: l.email ?? '',
          source: l.source ?? 'inconnu',
          segment: l.segment ?? 'général',
          status: l.status ?? 'Nouveau',
          nextStepDate: l.nextStepDate ?? null,
          nextStepNote: l.nextStepNote ?? '',
          estimatedValue: l.estimatedValue ?? 0,
          owner: l.owner ?? '',
          tags: Array.isArray(l.tags) ? l.tags : [],
          address: l.address ?? '',
          companyId: l.companyId ?? activeCompanyId ?? '',
          supportType: l.supportType ?? 'Voiture',
          supportDetail: l.supportDetail ?? '',
          siret: l.siret ?? '',
          clientType: (l.clientType as 'company' | 'individual') || 'company',
          createdAt: l.createdAt ?? new Date().toISOString(),
          activities: Array.isArray(l.activities) ? l.activities : [],
        }));
        // Remplace les prospects du store par la réponse backend
        useAppData.setState({ leads: mapped });
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des prospects:', error);
    }
  }, [activeCompanyId]);

  // Chargement initial des clients au montage de la page et au changement d'entreprise
  useEffect(() => {
    loadClientsFromBackend();
  }, [loadClientsFromBackend]);

  // Chargement initial des prospects au montage de la page et au changement d'entreprise
  useEffect(() => {
    loadLeadsFromBackend();
  }, [loadLeadsFromBackend]);

  // Fonction pour charger les catégories depuis le backend
  const loadCategoriesFromBackend = useCallback(async () => {
    if (!activeCompanyId) {
      return;
    }
    
    try {
      const result = await CategoryService.getCategories();
      if (result.success && Array.isArray(result.data)) {
        useAppData.setState({ categories: result.data });
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  }, [activeCompanyId]);

  // Fonction pour charger les services depuis le backend
  const loadServicesFromBackend = useCallback(async () => {
    if (!activeCompanyId) {
      useAppData.setState({ services: [] });
      return;
    }
    
    try {
      const result = await ServiceService.getServices();
      if (result.success && Array.isArray(result.data)) {
        // On considère que l'API renvoie déjà des objets compatibles `Service`
        useAppData.setState({ services: result.data });
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des services:', error);
    }
  }, [activeCompanyId]);

  // Chargement initial des catégories au montage de la page et au changement d'entreprise
  useEffect(() => {
    loadCategoriesFromBackend();
  }, [loadCategoriesFromBackend]);

  // Chargement initial des services au montage de la page et au changement d'entreprise
  useEffect(() => {
    loadServicesFromBackend();
  }, [loadServicesFromBackend]);

  // Fonction pour charger les entreprises depuis le backend
  const loadCompaniesFromBackend = useCallback(async () => {
    try {
      console.log('🏢 [DevisPage] Chargement des entreprises depuis le backend');
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
        console.log('✅ [DevisPage] Entreprises chargées:', mappedCompanies.length);
        useAppData.setState({ companies: mappedCompanies });
      } else {
        console.error('❌ [DevisPage] Erreur lors du chargement des entreprises:', result.error);
      }
    } catch (error: any) {
      console.error('❌ [DevisPage] Erreur lors du chargement des entreprises:', error);
    }
  }, []);

  // Chargement initial des entreprises au montage de la page
  useEffect(() => {
    loadCompaniesFromBackend();
  }, [loadCompaniesFromBackend]);

  // Fonction pour charger les engagements depuis le backend
  const loadEngagementsFromBackend = useCallback(async () => {
    if (!activeCompanyId) {
      return;
    }
    
    // Éviter les appels multiples simultanés
    if ((window as any).__loadingAppointments) {
      return;
    }
    (window as any).__loadingAppointments = true;
    
    try {
      const result = await AppointmentService.getAll();
      if (result.success && Array.isArray(result.data)) {
        // Mapper les données du backend vers le format Engagement
        const mappedEngagements = result.data.map((appointment: any) => {
          // Le backend peut utiliser 'date' ou 'scheduled_at'
          const scheduledAt = appointment.scheduled_at || appointment.date || new Date().toISOString();
          
          const mapped = {
            id: appointment.id,
            clientId: appointment.client_id || appointment.clientId,
            serviceId: appointment.service_id || appointment.serviceId,
            scheduledAt: scheduledAt,
            status: appointment.status || 'brouillon',
            // Prioriser company_id (snake_case) car c'est ce que le backend envoie réellement
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
            services: appointment.services || undefined, // Tableau de prestations pour devis multiples
          };
          
          // Log pour un engagement spécifique si c'est celui qu'on vient de modifier
          if (mapped.id && mapped.id.includes('e1767720674458')) {
            console.log('[DevisPage] 🟡 CHARGEMENT DEPUIS BACKEND - engagement mappé:', JSON.stringify({
              id: mapped.id,
              companyId: mapped.companyId,
              assignedUserIds: mapped.assignedUserIds,
              planningUser: mapped.planningUser,
              startTime: mapped.startTime,
              services: mapped.services,
            }, null, 2));
            console.log('[DevisPage] 🟡 CHARGEMENT DEPUIS BACKEND - données brutes backend:', JSON.stringify({
              company_id: appointment.company_id,
              companyId: appointment.companyId,
              assigned_user_ids: appointment.assigned_user_ids,
              assignedUserIds: appointment.assignedUserIds,
              planning_user: appointment.planning_user,
              planningUser: appointment.planningUser,
              start_time: appointment.start_time,
              startTime: appointment.startTime,
              services: appointment.services,
            }, null, 2));
          }
          
          return mapped;
        });
        
        // Fusionner intelligemment avec les engagements existants
        // Garder les engagements locaux qui ne sont pas dans le backend (en cours de création)
        // Remplacer ceux qui existent dans le backend par les versions du backend
        const currentEngagements = useAppData.getState().engagements || [];
        const backendIds = new Set(mappedEngagements.map(e => e.id));
        
        // Garder les engagements locaux qui ne sont pas encore dans le backend
        const localOnlyEngagements = currentEngagements.filter(e => !backendIds.has(e.id));
        
        // Combiner : engagements du backend + engagements locaux uniquement
        const mergedEngagements = [...mappedEngagements, ...localOnlyEngagements];
        
        // Mettre à jour le store avec les engagements fusionnés
        useAppData.setState({ engagements: mergedEngagements });
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des engagements:', error);
    } finally {
      // Libérer le verrou après un court délai
      setTimeout(() => {
        (window as any).__loadingAppointments = false;
      }, 500);
    }
  }, [activeCompanyId]);

  // Chargement initial des engagements au montage de la page et au changement d'entreprise
  useEffect(() => {
    loadEngagementsFromBackend();
  }, [loadEngagementsFromBackend]);

  // Fonction pour charger les membres d'équipe depuis le backend
  const loadProjectMembersFromBackend = useCallback(async () => {
    try {
      const response = await ProjectMemberService.getMembers();
      if (response.success && response.data) {
        const backendMembers = response.data as typeof projectMembers;
        // Mettre à jour le store avec les membres du backend
        useAppData.setState({ projectMembers: backendMembers });
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des membres d\'équipe:', error);
    }
  }, []);

  // Chargement initial des membres d'équipe au montage de la page
  useEffect(() => {
    loadProjectMembersFromBackend();
  }, [loadProjectMembersFromBackend]);

  // Gestion des contacts
  useEffect(() => {
    const targetClient = creationClient;
    if (!targetClient || !creationDraft) {
      if (creationDraft?.contactIds.length) {
        setCreationDraft((draft) => draft ? ({ ...draft, contactIds: [] }) : null);
      }
      return;
    }
    const preferred =
      targetClient.contacts.find((contact) => contact.active && contact.isBillingDefault) ??
      targetClient.contacts.find((contact) => contact.active);
    if (preferred && !creationDraft.contactIds.includes(preferred.id)) {
      setCreationDraft((draft) => draft ? ({ ...draft, contactIds: [preferred.id] }) : null);
    } else if (!preferred && creationDraft.contactIds.length) {
      setCreationDraft((draft) => draft ? ({ ...draft, contactIds: [] }) : null);
    }
  }, [creationClient, creationDraft?.contactIds]);

  const toggleCreationContact = (contactId: string) => {
    if (!creationDraft) return;
    setCreationDraft((draft) => {
      if (!draft) return null;
      return {
        ...draft,
        contactIds: draft.contactIds.includes(contactId)
          ? draft.contactIds.filter((id) => id !== contactId)
          : [...draft.contactIds, contactId],
      };
    });
  };

  // Fonctions pour gérer les options (comme dans ServicePage)
  const creationSelectedOptions =
    creationSelectedService && creationDraft && creationSelectedService.options && Array.isArray(creationSelectedService.options)
      ? creationSelectedService.options
          .filter((option) => creationDraft.optionIds.includes(option.id))
          .map((option) => ({
            option,
            override: resolveOptionOverride(option, creationDraft.optionOverrides?.[option.id]),
          }))
      : [];

  const toggleCreationOption = (optionId: string) => {
    if (!creationDraft) return;
    setCreationDraft((draft) => {
      if (!draft) return null;
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

  const updateCreationOverride = (
    optionId: string,
    updates: Partial<OptionOverrideResolved>
  ) => {
    if (!creationDraft) return;
    setCreationDraft((draft) => {
      if (!draft || !draft.optionIds.includes(optionId)) {
        return draft;
      }
      const current = draft.optionOverrides?.[optionId] ?? {};
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


  // Ouvrir l'édition d'un devis
  const openEditQuote = (engagement: Engagement) => {
    const draft = buildDraftFromEngagement(engagement);
    // Ajouter assignedUserIds au draft
    draft.assignedUserIds = engagement.assignedUserIds || [];
    // Copier le nom du devis s'il existe
    if ((engagement as any).quoteName) {
      (draft as any).quoteName = (engagement as any).quoteName;
    }
    setCreationDraft(draft);
    
    // Ne pas définir l'étape ici, on le fera après le chargement des services
    
    // Déterminer si c'est un client ou un prospect
    const client = clientsById.get(engagement.clientId);
    if (client) {
      // Vérifier si le client correspond à un lead (prospect) - SANS créer de nouveau client
      const matchingLead = leads.find(lead => {
        const existingClient = findClientFromLead(lead, clients);
        return existingClient && existingClient.id === client.id;
      });
      
      if (matchingLead) {
        // C'est un prospect
        setSelectedClientOrLeadType('lead');
        setSelectedLeadId(matchingLead.id);
      } else {
        // C'est un client
        setSelectedClientOrLeadType('client');
        setSelectedLeadId(null);
        
        // Charger le contact sélectionné depuis engagement.contactIds (pour les clients professionnels)
        if (client.type === 'company' && engagement.contactIds && engagement.contactIds.length > 0) {
          setSelectedContactId(engagement.contactIds[0]);
        } else {
          setSelectedContactId(null);
        }
      }
    } else {
      // Client non trouvé - par défaut, considérer comme client
      // Le clientId est dans le draft, donc il sera affiché même si pas dans clientsById
      setSelectedClientOrLeadType('client');
      setSelectedLeadId(null);
      setSelectedContactId(null);
    }
    
    // Charger les services dans selectedServices
    // Si l'engagement a un champ services (plusieurs prestations), utiliser celui-ci
    // Sinon, utiliser le service unique (rétrocompatibilité)
    if (engagement.services && engagement.services.length > 0) {
      // Charger toutes les prestations depuis le champ services
      const servicesToLoad = engagement.services.map((service) => {
        const serviceObj = servicesById.get(service.serviceId);
        // Essayer de retrouver la catégorie et sous-catégorie depuis le service
        let mainCategoryId: string | undefined = service.mainCategoryId;
        let subCategoryId: string | undefined = service.subCategoryId;
        
        if (!mainCategoryId && serviceObj?.category) {
          // Chercher si c'est une sous-catégorie
          const subCategory = categories.find((cat) => cat.name === serviceObj.category && cat.parentId);
          if (subCategory) {
            subCategoryId = subCategory.id;
            mainCategoryId = subCategory.parentId || undefined;
          } else {
            // C'est une catégorie principale
            const mainCategory = categories.find((cat) => cat.name === serviceObj.category && !cat.parentId);
            if (mainCategory) {
              mainCategoryId = mainCategory.id;
            }
          }
        }
        
        return {
          serviceId: service.serviceId,
          optionIds: service.optionIds,
          optionOverrides: service.optionOverrides || {},
          supportType: service.supportType,
          supportDetail: service.supportDetail,
          mainCategoryId,
          subCategoryId,
          quantity: (service as any).quantity ?? 1, // Charger la quantité depuis le service
        };
      });
      
      setSelectedServices(servicesToLoad);
    } else {
      // Rétrocompatibilité : charger le service unique
      const service = servicesById.get(engagement.serviceId);
      if (service) {
        // Essayer de retrouver la catégorie et sous-catégorie depuis le service
        let mainCategoryId: string | undefined;
        let subCategoryId: string | undefined;
        
        if (service.category) {
          // Chercher si c'est une sous-catégorie
          const subCategory = categories.find((cat) => cat.name === service.category && cat.parentId);
          if (subCategory) {
            subCategoryId = subCategory.id;
            mainCategoryId = subCategory.parentId || undefined;
          } else {
            // C'est une catégorie principale
            const mainCategory = categories.find((cat) => cat.name === service.category && !cat.parentId);
            if (mainCategory) {
              mainCategoryId = mainCategory.id;
            }
          }
        }
        
        setSelectedServices([{
          serviceId: engagement.serviceId,
          optionIds: engagement.optionIds,
          optionOverrides: engagement.optionOverrides || {},
          supportType: engagement.supportType,
          supportDetail: engagement.supportDetail,
          mainCategoryId,
          subCategoryId,
          quantity: (engagement as any).services?.[0]?.quantity ?? 1, // Charger la quantité depuis le service ou défaut à 1
        }]);
      }
    }
    
    // Toujours un devis maintenant
    
    setSelectedCategory('');
    setSaveClientToDatabase(false);
    setIsCreatingNewClient(false);
    setIsCreatingNewLead(false);
    setNewClientData(null);
    setNewLeadData(null);
    setSelectedLeadId(null);
    setApplyPricingGrid(false);
    setEditingEngagementId(engagement.id);
    setShowCreateModal(true);
    
    // Lors de l'édition, toujours commencer à l'étape 1 (Contexte)
    // mais toutes les étapes seront marquées comme complétées dans la barre de progression
    setCurrentStep(1);
  };

  // Dupliquer un devis
  const handleDuplicateQuote = (engagement: Engagement) => {
    const draft = buildDraftFromEngagement(engagement);
    // Ajouter assignedUserIds au draft
    draft.assignedUserIds = engagement.assignedUserIds || [];
    // Copier le nom du devis s'il existe
    if ((engagement as any).quoteName) {
      (draft as any).quoteName = (engagement as any).quoteName;
    }
    setCreationDraft(draft);
    
    // Déterminer si c'est un client ou un prospect
    const client = clientsById.get(engagement.clientId);
    if (client) {
      // Vérifier si le client correspond à un lead (prospect) - SANS créer de nouveau client
      const matchingLead = leads.find(lead => {
        const existingClient = findClientFromLead(lead, clients);
        return existingClient && existingClient.id === client.id;
      });
      
      if (matchingLead) {
        // C'est un prospect
        setSelectedClientOrLeadType('lead');
        setSelectedLeadId(matchingLead.id);
      } else {
        // C'est un client
        setSelectedClientOrLeadType('client');
        setSelectedLeadId(null);
      }
    } else {
      // Client non trouvé - par défaut, considérer comme client
      setSelectedClientOrLeadType('client');
      setSelectedLeadId(null);
    }
    
    // Charger les services dans selectedServices
    // Si l'engagement a un champ services (plusieurs prestations), utiliser celui-ci
    // Sinon, utiliser le service unique (rétrocompatibilité)
    if (engagement.services && engagement.services.length > 0) {
      // Charger toutes les prestations depuis le champ services
      const servicesToLoad = engagement.services.map((service) => {
        const serviceObj = servicesById.get(service.serviceId);
        // Essayer de retrouver la catégorie et sous-catégorie depuis le service
        let mainCategoryId: string | undefined = service.mainCategoryId;
        let subCategoryId: string | undefined = service.subCategoryId;
        
        if (!mainCategoryId && serviceObj?.category) {
          // Chercher si c'est une sous-catégorie
          const subCategory = categories.find((cat) => cat.name === serviceObj.category && cat.parentId);
          if (subCategory) {
            subCategoryId = subCategory.id;
            mainCategoryId = subCategory.parentId || undefined;
          } else {
            // C'est une catégorie principale
            const mainCategory = categories.find((cat) => cat.name === serviceObj.category && !cat.parentId);
            if (mainCategory) {
              mainCategoryId = mainCategory.id;
            }
          }
        }
        
        return {
          serviceId: service.serviceId,
          optionIds: service.optionIds,
          optionOverrides: service.optionOverrides || {},
          supportType: service.supportType,
          supportDetail: service.supportDetail,
          mainCategoryId,
          subCategoryId,
          quantity: (service as any).quantity ?? 1, // Charger la quantité depuis le service
        };
      });
      
      setSelectedServices(servicesToLoad);
    } else {
      // Rétrocompatibilité : charger le service unique
      const service = servicesById.get(engagement.serviceId);
      if (service) {
        // Essayer de retrouver la catégorie et sous-catégorie depuis le service
        let mainCategoryId: string | undefined;
        let subCategoryId: string | undefined;
        
        if (service.category) {
          // Chercher si c'est une sous-catégorie
          const subCategory = categories.find((cat) => cat.name === service.category && cat.parentId);
          if (subCategory) {
            subCategoryId = subCategory.id;
            mainCategoryId = subCategory.parentId || undefined;
          } else {
            // C'est une catégorie principale
            const mainCategory = categories.find((cat) => cat.name === service.category && !cat.parentId);
            if (mainCategory) {
              mainCategoryId = mainCategory.id;
            }
          }
        }
        
        setSelectedServices([{
          serviceId: engagement.serviceId,
          optionIds: engagement.optionIds,
          optionOverrides: engagement.optionOverrides || {},
          supportType: engagement.supportType,
          supportDetail: engagement.supportDetail,
          mainCategoryId,
          subCategoryId,
          quantity: (engagement as any).services?.[0]?.quantity ?? 1, // Charger la quantité depuis le service ou défaut à 1
        }]);
      }
    }
    
    // Réinitialiser pour une nouvelle création (pas d'édition)
    setSelectedCategory('');
    setCurrentStep(1);
    setSaveClientToDatabase(false);
    setIsCreatingNewClient(false);
    setIsCreatingNewLead(false);
    setNewClientData(null);
    setNewLeadData(null);
    setSelectedLeadId(null);
    setApplyPricingGrid(false);
    setEditingEngagementId(null); // Pas d'édition, c'est une duplication
    setShowCreateModal(true);
  };

  // Fermer la création
  const closeCreation = () => {
    setShowCreateModal(false);
    setCreationDraft(null);
    setSelectedCategory('');
    setCurrentStep(1);
    setSaveClientToDatabase(false);
    setIsCreatingNewClient(false);
    setIsCreatingNewLead(false);
    setNewClientData(null);
    setNewLeadData(null);
    setSelectedLeadId(null);
    setSelectedClientOrLeadType(null);
    setSelectedContactId(null);
    setSelectedServices([]);
    setApplyPricingGrid(false);
    setEditingEngagementId(null);
  };

  // Navigation entre les étapes
  const goToStep = (step: number) => {
    if (step >= 1 && step <= 4) {
      setCurrentStep(step);
    }
  };

  const nextStep = async () => {
    // Validation de l'étape 1
    if (currentStep === 1) {
      
      let clientCreated = false;
      let createdClientId: string | null = null;
      
      // Si on crée un nouveau client, le créer maintenant
      if (isCreatingNewClient && newClientData) {
        if (newClientData.type === 'company' && !newClientData.companyName?.trim()) {
          setFeedback('Veuillez remplir la raison sociale pour un client professionnel.');
          return;
        }
        if (newClientData.type === 'individual' && !newClientData.firstName?.trim() && !newClientData.lastName?.trim()) {
          setFeedback('Veuillez remplir au moins le prénom ou le nom pour un particulier.');
          return;
        }
        
        // Créer le client maintenant
        try {
          const name = newClientData.type === 'company' 
            ? newClientData.companyName.trim()
            : [newClientData.firstName?.trim(), newClientData.lastName?.trim()].filter(Boolean).join(' ');
          
          const created = addClient({
            type: newClientData.type,
            name: name,
            companyName: newClientData.type === 'company' ? newClientData.companyName.trim() : null,
            firstName: newClientData.type === 'individual' ? (newClientData.firstName?.trim() || null) : null,
            lastName: newClientData.type === 'individual' ? (newClientData.lastName?.trim() || null) : null,
            siret: newClientData.type === 'company' ? (newClientData.siret?.trim() || '') : '',
            email: newClientData.email?.trim() || '',
            phone: newClientData.phone?.trim() || '',
            address: newClientData.address?.trim() || '',
            city: newClientData.city?.trim() || '',
            status: 'Actif',
            tags: [],
            contacts: [],
          });
          
          if (newClientData.email?.trim()) {
            addClientContact(created.id, {
              firstName: newClientData.type === 'company' 
                ? (newClientData.firstName?.trim() || 'Contact')
                : (newClientData.firstName?.trim() || 'Contact'),
              lastName: newClientData.type === 'company'
                ? (newClientData.lastName?.trim() || '')
                : (newClientData.lastName?.trim() || ''),
              email: newClientData.email.trim(),
              mobile: newClientData.phone?.trim() || '',
              roles: ['facturation'],
              isBillingDefault: true,
            });
          }
          
          // Sélectionner automatiquement le client créé
          const updatedDraft = creationDraft 
            ? { ...creationDraft, clientId: created.id }
            : { ...buildInitialDraft(clients, services, companies, activeCompanyId), clientId: created.id, kind: 'devis' };
          
          setCreationDraft(updatedDraft);
          setIsCreatingNewClient(false);
          setNewClientData(null);
          setFeedback(null);
          clientCreated = true;
          createdClientId = created.id;
        } catch (error) {
          setFeedback('Erreur lors de la création du client.');
          return;
        }
      }
      
      // Si on crée un nouveau prospect, le créer maintenant
      if (isCreatingNewLead && newLeadData) {
        if (newLeadData.type === 'company' && !newLeadData.companyName?.trim()) {
          setFeedback('Veuillez remplir la raison sociale pour un prospect professionnel.');
          return;
        }
        if (newLeadData.type === 'individual' && !newLeadData.firstName?.trim() && !newLeadData.lastName?.trim()) {
          setFeedback('Veuillez remplir au moins le prénom ou le nom pour un particulier.');
          return;
        }
        
        try {
          const name = newLeadData.type === 'company' 
            ? newLeadData.companyName.trim()
            : [newLeadData.firstName?.trim(), newLeadData.lastName?.trim()].filter(Boolean).join(' ');
          
          const companyName = newLeadData.type === 'company' ? newLeadData.companyName.trim() : '';
          
          const createdLead = addLead({
            contact: newLeadData.type === 'individual' ? name : '',
            company: companyName,
            email: newLeadData.email?.trim() || '',
            phone: newLeadData.phone?.trim() || '',
            address: newLeadData.address?.trim() || '',
            city: newLeadData.city?.trim() || '',
            status: 'Nouveau',
            source: 'Manuel',
            score: 0,
            tags: [],
            companyId: activeCompanyId || companies[0]?.id || null,
          });
          
          // Convertir le prospect en client pour le devis
          const client = ensureClientFromLeadWrapper(createdLead);
          const updatedDraft = creationDraft 
            ? { ...creationDraft, clientId: client.id }
            : { ...buildInitialDraft(clients, services, companies, activeCompanyId), clientId: client.id, kind: 'devis' };
          
          setCreationDraft(updatedDraft);
          setIsCreatingNewLead(false);
          setNewLeadData(null);
          setFeedback(null);
          clientCreated = true;
          createdClientId = client.id;
        } catch (error) {
          setFeedback('Erreur lors de la création du prospect.');
          return;
        }
      }
      
      // Vérifier qu'un client/prospect est sélectionné (après création éventuelle)
      // Si un client vient d'être créé, utiliser directement l'ID créé
      const finalClientId = createdClientId || creationDraft?.clientId;
      
      if (!finalClientId) {
        setFeedback('Veuillez sélectionner un client ou un prospect ou en créer un nouveau.');
        return;
      }
      
      // S'assurer que creationDraft a bien l'ID du client
      if (createdClientId && creationDraft && creationDraft.clientId !== createdClientId) {
        setCreationDraft({ ...creationDraft, clientId: createdClientId });
      }
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Fonction pour convertir un lead en client (utilise la version unifiée)
  const ensureClientFromLeadWrapper = useCallback((lead: any): Client => {
    return ensureClientFromLead(lead, {
      clients,
      addClient,
      addClientContact,
      setClientBillingContact: undefined, // Pas utilisé dans cette page
      restoreClientContact: undefined, // Pas utilisé dans cette page
      getClient: undefined, // Pas utilisé dans cette page
    });
  }, [clients, addClient, addClientContact]);

  const handleClientOrLeadSelect = useCallback((result: { id: string; type: 'client' | 'lead'; data: Client | any }) => {
    // Réinitialiser le contact sélectionné quand on change de client
    setSelectedContactId(null);
    
    if (result.type === 'lead') {
      // C'est un prospect (lead) - sélectionné depuis la liste des leads
      const lead = result.data;
      const client = ensureClientFromLeadWrapper(lead);
      setSelectedClientOrLeadType('lead');
      setSelectedLeadId(lead.id);
      // Ne pas modifier companyId - garder celui qui est déjà dans le draft
      setCreationDraft((draft) => draft ? ({
        ...draft,
        clientId: client.id,
        // Ne pas toucher à companyId - garder la valeur existante
      }) : null);
    } else {
      // C'est un client - sélectionné depuis la liste des clients
      // Un client dans la liste des clients est TOUJOURS un Client, pas un Prospect
      const client = result.data as Client;
      setSelectedClientOrLeadType('client');
      setSelectedLeadId(null);
      
      // Ne pas modifier companyId - garder celui qui est déjà dans le draft
      setCreationDraft((draft) => draft ? ({
        ...draft,
        clientId: client.id,
        // Ne pas toucher à companyId - garder la valeur existante
      }) : null);
    }
  }, [ensureClientFromLead]);

  // Créer ou modifier le devis - LOGIQUE SIMPLIFIÉE ET PROPRE
  const handleCreateQuote = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validations de base
    if (!creationDraft || isCreatingQuote) {
      return;
    }
    
    setIsCreatingQuote(true);
    setFeedback(null);

    // Validation : client et services
    if (!creationDraft.clientId) {
      setFeedback('Sélectionnez un client/prospect ou créez-en un nouveau.');
      setIsCreatingQuote(false);
      return;
    }
    
    if (selectedServices.length === 0) {
      setFeedback('Sélectionnez au moins une prestation.');
      setIsCreatingQuote(false);
      return;
    }

    // Récupérer le client
    const client = clientsById.get(creationDraft.clientId);
    if (!client) {
      setFeedback('Le client sélectionné est introuvable.');
      setIsCreatingQuote(false);
      return;
    }

    // Déterminer l'entreprise : draft > engagement original > entreprise active
    let companyId: string | null = null;
    if (editingEngagementId) {
      const original = engagements.find(e => e.id === editingEngagementId);
      companyId = (creationDraft.companyId && creationDraft.companyId !== '') 
        ? creationDraft.companyId 
        : (original?.companyId || activeCompanyId);
    } else {
      companyId = (creationDraft.companyId && creationDraft.companyId !== '') 
        ? creationDraft.companyId 
        : activeCompanyId;
    }
    
    if (!companyId) {
      setFeedback("Aucune entreprise sélectionnée.");
      setIsCreatingQuote(false);
      return;
    }

    const company = companiesById.get(companyId);
    if (!company) {
      setFeedback("Entreprise introuvable.");
      setIsCreatingQuote(false);
      return;
    }

    // Préparer les services avec quantités
    const engagementServices = selectedServices
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

    if (engagementServices.length === 0) {
      setFeedback('Aucune prestation sélectionnée.');
      setIsCreatingQuote(false);
      return;
    }

    // Premier service pour rétrocompatibilité
    const firstService = engagementServices[0];
    const firstServiceObj = servicesById.get(firstService.serviceId);
    if (!firstServiceObj) {
      setFeedback('Service introuvable.');
      setIsCreatingQuote(false);
      return;
    }

    // Préparer les données communes
    const isDevis = documentType === 'devis';
    const vatEnabledForQuote = isDevis ? (company.vatEnabled ?? vatEnabled) : false;
    
    // Si la planification n'est pas activée (scheduledAt vide), mettre planningUser et startTime à null
    const hasPlanning = creationDraft.scheduledAt && creationDraft.scheduledAt.trim() !== '';
    const planningUser = hasPlanning && creationDraft.planningUser && creationDraft.planningUser.trim() 
      ? creationDraft.planningUser 
      : null;
    const startTime = hasPlanning && creationDraft.startTime && creationDraft.startTime.trim() 
      ? creationDraft.startTime 
      : null;

    // Données de l'engagement
    // Si scheduledAt est vide, utiliser une date par défaut (requis pour le backend)
    // mais planningUser et startTime seront null pour indiquer que ce n'est pas planifié
    const scheduledAtValue = hasPlanning && creationDraft.scheduledAt && creationDraft.scheduledAt.trim() !== ''
      ? fromLocalInputValue(creationDraft.scheduledAt)
      : new Date().toISOString(); // Date par défaut pour le backend (mais pas planifié si planningUser/startTime sont null)
    
    // Inclure le contact sélectionné si un client professionnel est sélectionné
    const contactIds = selectedContactId && client.type === 'company'
      ? [selectedContactId]
      : (creationDraft.contactIds || []);

    const engagementData = {
      clientId: creationDraft.clientId,
      serviceId: firstService.serviceId,
      optionIds: firstService.optionIds,
      optionOverrides: firstService.optionOverrides,
      scheduledAt: scheduledAtValue,
      companyId: companyId,
      supportType: firstService.supportType,
      supportDetail: firstService.supportDetail,
      additionalCharge: creationDraft.additionalCharge || 0,
      contactIds: contactIds,
      assignedUserIds: creationDraft.assignedUserIds || [],
      planningUser: planningUser,
      startTime: startTime,
      invoiceVatEnabled: vatEnabledForQuote,
      quoteName: (creationDraft.quoteName?.trim()) || null,
      services: engagementServices,
    };

    // Mode édition
    if (editingEngagementId) {
      const updated = updateEngagement(editingEngagementId, {
        ...engagementData,
        quoteStatus: 'brouillon',
      });
      
      if (updated) {
        setFeedback('Devis modifié avec succès.');
        setSelectedEngagementId(updated.id);
        setIsCreatingQuote(false);
        closeCreation();
        return;
      } else {
        setFeedback('Erreur lors de la modification.');
        setIsCreatingQuote(false);
        return;
      }
    }

    // Mode création
    const baseQuoteNumber = getNextQuoteNumber(engagements, new Date());
    
    console.log('🔵 [DevisPage] ========== DÉBUT CRÉATION DEVIS ==========');
    console.log('🔵 [DevisPage] Données du formulaire:', {
      clientId: creationDraft.clientId,
      companyId: companyId,
      quoteName: creationDraft.quoteName,
      scheduledAt: scheduledAtValue,
      planningUser: planningUser,
      startTime: startTime,
      assignedUserIds: creationDraft.assignedUserIds || [],
      contactIds: contactIds,
      additionalCharge: creationDraft.additionalCharge || 0,
    });
    console.log('🔵 [DevisPage] Services sélectionnés:', {
      count: engagementServices.length,
      services: engagementServices.map((s, idx) => ({
        index: idx,
        serviceId: s.serviceId,
        optionIds: s.optionIds?.length || 0,
        optionIdsArray: s.optionIds,
        optionOverrides: Object.keys(s.optionOverrides || {}).length,
        additionalCharge: s.additionalCharge,
        mainCategoryId: s.mainCategoryId || 'absent',
        subCategoryId: s.subCategoryId || 'absent',
        supportType: s.supportType,
        supportDetail: s.supportDetail,
      })),
    });
    console.log('🔵 [DevisPage] EngagementData complet:', {
      ...engagementData,
      services: engagementServices,
    });
    
    const newEngagement = addEngagement({
      ...engagementData,
      status: 'brouillon',
      kind: 'devis',
      sendHistory: [],
      invoiceNumber: null,
      quoteNumber: baseQuoteNumber,
      quoteStatus: 'brouillon',
    });

    if (newEngagement) {
      console.log('✅ [DevisPage] DEVIS CRÉÉ:', {
        id: newEngagement.id,
        quoteNumber: newEngagement.quoteNumber,
        quoteName: newEngagement.quoteName,
        clientId: newEngagement.clientId,
        companyId: newEngagement.companyId,
        status: newEngagement.status,
        kind: newEngagement.kind,
        scheduledAt: newEngagement.scheduledAt,
        planningUser: newEngagement.planningUser,
        startTime: newEngagement.startTime,
        assignedUserIds: newEngagement.assignedUserIds,
        services: (newEngagement as any).services ? `Array(${(newEngagement as any).services.length})` : 'undefined',
        servicesDetails: (newEngagement as any).services ? (newEngagement as any).services.map((s: any, idx: number) => ({
          index: idx,
          serviceId: s.serviceId,
          optionIds: s.optionIds?.length || 0,
          optionIdsArray: s.optionIds,
          additionalCharge: s.additionalCharge,
          mainCategoryId: s.mainCategoryId || 'absent',
          subCategoryId: s.subCategoryId || 'absent',
        })) : [],
      });
      console.log('🔵 [DevisPage] ========== FIN CRÉATION DEVIS ==========');
      
      setFeedback('Devis créé avec succès.');
      setSelectedEngagementId(newEngagement.id);
      setIsCreatingQuote(false);
      closeCreation();
    } else {
      console.error('❌ [DevisPage] ERREUR LORS DE LA CRÉATION DU DEVIS');
      console.log('🔵 [DevisPage] ========== FIN CRÉATION DEVIS (ERREUR) ==========');
      setFeedback('Erreur lors de la création.');
      setIsCreatingQuote(false);
    }
  };

  // Convertir devis en service (avec date obligatoire)
  const handleConvertToService = async (engagement: Engagement) => {
    if (engagement.kind !== 'devis') return;

    // Demander la date de réalisation (obligatoire)
    const serviceDate = prompt('Date de réalisation du service (format: YYYY-MM-DD) *:');
    if (!serviceDate) {
      setFeedback('La date de réalisation est obligatoire.');
      return;
    }

    // Valider le format de date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(serviceDate)) {
      setFeedback('Format de date invalide. Utilisez YYYY-MM-DD.');
      return;
    }

    try {
      const updated = updateEngagement(engagement.id, {
        kind: 'service',
        status: 'réalisé', // Les services convertis depuis un devis accepté sont directement réalisés
        scheduledAt: new Date(serviceDate + 'T00:00:00').toISOString(),
        // Conserver les informations du devis d'origine
        quoteNumber: engagement.quoteNumber || null,
        quoteName: (engagement as any).quoteName || null,
        quoteStatus: null, // Le statut du devis n'est plus nécessaire car c'est maintenant un service
      });

      if (!updated) {
        setFeedback('Erreur lors de la conversion.');
        return;
      }

      // Synchroniser avec le backend
      try {
        const appointmentData: any = {
          kind: updated.kind,
          status: updated.status,
          scheduled_at: updated.scheduledAt,
          quote_number: updated.quoteNumber || null,
          quote_name: (updated as any).quoteName || null,
          quote_status: null,
        };
        
        await AppointmentService.update(updated.id, appointmentData);
        console.log('[DevisPage] ✅ Conversion synchronisée avec le backend');
      } catch (backendError) {
        console.error('[DevisPage] ❌ Erreur lors de la synchronisation avec le backend:', backendError);
        // Ne pas bloquer l'utilisateur si la synchronisation échoue
      }

      setFeedback('Devis converti en service avec succès. Le service apparaît maintenant dans l\'historique des services.');
      // Ne pas naviguer automatiquement, laisser l'utilisateur voir le feedback
    } catch (error) {
      console.error('[Wash&Go] Erreur lors de la conversion', error);
      setFeedback('Erreur lors de la conversion.');
    }
  };

  // Envoyer le devis par email
  const handleSendQuote = async (engagement: Engagement) => {
    const client = clientsById.get(engagement.clientId);
    const company = engagement.companyId ? companiesById.get(engagement.companyId) : null;
    const service = servicesById.get(engagement.serviceId);

    if (!client || !company || !service) {
      setFeedback('Informations manquantes pour envoyer le devis.');
      return;
    }

    try {
      const vatMultiplier = computeVatMultiplier(sanitizeVatRate(vatRate));
      const totals = computeEngagementTotals(engagement);
      const vatEnabledForQuote = company.vatEnabled ?? vatEnabled;
      const subtotal = totals.price + totals.surcharge;
      const vatAmount = vatEnabledForQuote ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
      const totalTtc = vatEnabledForQuote ? subtotal + vatAmount : subtotal;

      const documentNumber = engagement.quoteNumber ?? getNextQuoteNumber(engagements, new Date());
      const issueDate = new Date();

      // Convertir en format pour plusieurs prestations (même pour un seul service)
      const quoteService: QuoteServiceItem = {
        serviceId: service.id,
        serviceName: service.name,
        serviceDescription: service.description || '', // Description de la prestation depuis le catalogue
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
        quantity: (engagement as any).services?.[0]?.quantity ?? 1, // Récupérer la quantité depuis le service
      };

      // Récupérer le contact depuis engagement.contactIds
      const contact = engagement.contactIds && engagement.contactIds.length > 0
        ? client.contacts?.find(c => c.active && engagement.contactIds.includes(c.id))
        : null;

      const pdf = generateQuotePdfWithMultipleServices({
        documentNumber,
        issueDate,
        serviceDate: new Date(engagement.scheduledAt || issueDate),
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

      const pdfDataUri = pdf.output('datauristring');

      // Récupérer les contacts
      const recipients = client.contacts
        .filter((c) => c.active && c.email && engagement.contactIds.includes(c.id))
        .map((c) => c.email);

      if (recipients.length === 0) {
        setFeedback('Aucun contact avec email trouvé.');
        return;
      }

      const subject = `Devis ${documentNumber} – ${client.name}`;
      const body = `Bonjour,\n\nVeuillez trouver ci-joint le devis ${documentNumber} pour le service « ${service.name} ».\n\nTotal TTC : ${formatCurrency(totalTtc)}\n\nValidité du devis : 30 jours.\n\nCordialement,\n${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim();

      const sendResult = await sendDocumentEmail({
        to: recipients,
        subject,
        body,
        attachment: { filename: `${documentNumber}.pdf`, dataUri: pdfDataUri },
      });

      if (sendResult.ok) {
        updateEngagement(engagement.id, { quoteStatus: 'envoyé' });
        recordEngagementSend(engagement.id, {
          contactIds: engagement.contactIds,
          subject,
        });
        setFeedback('Devis envoyé avec succès.');
      } else if ((sendResult as any).reason === 'not-configured') {
        openEmailComposer({ to: recipients, subject, body });
        updateEngagement(engagement.id, { quoteStatus: 'envoyé' });
        recordEngagementSend(engagement.id, {
          contactIds: engagement.contactIds,
          subject,
        });
        setFeedback('SMTP non configuré – email ouvert dans votre messagerie.');
      } else {
        setFeedback((sendResult as any).message ?? "Impossible d'envoyer le devis.");
      }
    } catch (error) {
      console.error('[Wash&Go] Erreur lors de l\'envoi du devis', error);
      setFeedback('Erreur lors de l\'envoi du devis.');
    }
  };

  // Imprimer le devis ou l'offre de prix
  const handlePrintQuote = (engagement: Engagement) => {
    const client = clientsById.get(engagement.clientId);
    // Utiliser l'entreprise du devis, ou l'entreprise active comme fallback
    const company = engagement.companyId 
      ? companiesById.get(engagement.companyId) 
      : (activeCompanyId ? companiesById.get(activeCompanyId) : null);
    const service = servicesById.get(engagement.serviceId);

    if (!client || !company) {
      setFeedback('Informations manquantes pour imprimer le document.');
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

        // Télécharger le PDF avec le bon nom (l'utilisateur peut ensuite l'ouvrir pour l'imprimer)
        const fileName = generateQuoteFileName(documentNumber, client.name, issueDate);
        pdf.save(fileName);
      } else {
        // Utiliser l'ancienne fonction pour un seul service (rétrocompatibilité)
        if (!service) {
          setFeedback('Service introuvable pour imprimer le document.');
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

        // Télécharger le PDF avec le bon nom (l'utilisateur peut ensuite l'ouvrir pour l'imprimer)
        const fileName = generateQuoteFileName(documentNumber, client.name, issueDate);
        pdf.save(fileName);
      }
    } catch (error) {
      console.error('[Wash&Go] Erreur lors de l\'impression', error);
      setFeedback('Erreur lors de l\'impression du document.');
    }
  };

  // Marquer comme accepté/refusé
  const handleUpdateQuoteStatus = (engagement: Engagement, status: 'accepté' | 'refusé') => {
    updateEngagement(engagement.id, { quoteStatus: status });
    setFeedback(`Devis marqué comme ${status === 'accepté' ? 'accepté' : 'refusé'}.`);
  };

  // Obtenir le statut du client (Client ou Prospect)
  const getClientType = (clientId: string): 'Client' | 'Prospect' => {
    const client = clientsById.get(clientId);
    return client?.status === 'Prospect' ? 'Prospect' : 'Client';
  };

  // Styles pour les statuts
  const getStatusStyle = (status: CommercialDocumentStatus | null) => {
    switch (status) {
      case 'brouillon':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      case 'envoyé':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'accepté':
        return 'bg-white text-emerald-700 border border-emerald-300 dark:bg-white dark:text-emerald-700';
      case 'refusé':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const activeCompany = activeCompanyId ? companiesById.get(activeCompanyId) : null;

  return (
    <div className="dashboard-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Gestion CRM</p>
            <h1 className="dashboard-hero__title">Devis et Offres de prix</h1>
            <p className="dashboard-hero__subtitle">
              Gérez vos devis pour clients et prospects en un seul endroit
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      <CRMFeedback message={feedback} />

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="dashboard-kpi group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="dashboard-kpi__eyebrow">Total devis</p>
                <p className="dashboard-kpi__value">{stats.total}</p>
                <p className="dashboard-kpi__description">
                  {stats.brouillon} brouillon{stats.brouillon > 1 ? 's' : ''} • {stats.envoye} envoyé{stats.envoye > 1 ? 's' : ''}
                </p>
              </div>
              <div className="dashboard-kpi__icon">
                <FileText />
              </div>
            </div>
            <div className="dashboard-kpi__glow" aria-hidden />
          </div>
          <div className="dashboard-kpi group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="dashboard-kpi__eyebrow">Montant total</p>
                <p className="dashboard-kpi__value">{formatCurrency(stats.totalAmount)}</p>
                <p className="dashboard-kpi__description">
                  {stats.envoyeAmount > 0 && `${formatCurrency(stats.envoyeAmount)} en attente`}
                </p>
              </div>
              <div className="dashboard-kpi__icon">
                <Download />
              </div>
            </div>
            <div className="dashboard-kpi__glow" aria-hidden />
          </div>
          <div className="dashboard-kpi group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="dashboard-kpi__eyebrow">Taux d'acceptation</p>
                <p className="dashboard-kpi__value">{stats.tauxAcceptation}%</p>
                <p className="dashboard-kpi__description">
                  {stats.accepte} accepté{stats.accepte > 1 ? 's' : ''} • {stats.refuse} refusé{stats.refuse > 1 ? 's' : ''}
                </p>
              </div>
              <div className="dashboard-kpi__icon">
                <CheckCircle2 />
              </div>
            </div>
            <div className="dashboard-kpi__glow" aria-hidden />
          </div>
          <div className="dashboard-kpi group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="dashboard-kpi__eyebrow">CA accepté</p>
                <p className="dashboard-kpi__value">{formatCurrency(stats.accepteAmount)}</p>
                <p className="dashboard-kpi__description">
                  {stats.envoye > 0 && `${Math.round((stats.accepteAmount / stats.totalAmount) * 100)}% du total`}
                </p>
              </div>
              <div className="dashboard-kpi__icon">
                <CheckCircle2 />
              </div>
            </div>
            <div className="dashboard-kpi__glow" aria-hidden />
          </div>
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-4">
              <DateRangeFilter
                startDate={dateRangeStart}
                endDate={dateRangeEnd}
                onChange={(start, end) => {
                  setDateRangeStart(start);
                  setDateRangeEnd(end);
                }}
              />
              {selectedRows.size > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleToggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tout sélectionner</span>
                  </div>
                  <CRMBulkActions
                    selectedCount={selectedRows.size}
                    actions={[
                      {
                        label: 'Imprimer',
                        icon: <Printer className="h-4 w-4" />,
                        onClick: handleBulkPrint,
                      },
                      {
                        label: 'Transférer',
                        icon: <ArrowRightLeft className="h-4 w-4" />,
                        onClick: openTransferModal,
                      },
                      ...(hasPermission('service.archive')
                        ? [
                            {
                              label: 'Supprimer',
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: handleBulkDelete,
                              variant: 'danger' as const,
                            },
                          ]
                        : []),
                    ]}
                  />
                </>
              )}
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                className={clsx(
                  'relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                  showFilters
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/40'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                )}
              >
                <Filter className="h-4 w-4" />
                Filtres
              </button>
              <button
                type="button"
                onClick={openCreateQuote}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                Créer un devis
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Date
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Statut
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as CommercialDocumentStatus | 'Tous')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="Tous">Tous</option>
                  <option value="brouillon">Brouillon</option>
                  <option value="envoyé">Envoyé</option>
                  <option value="accepté">Accepté</option>
                  <option value="refusé">Refusé</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Entreprise
                </label>
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
          </div>
        )}
      </section>

      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)] lg:block">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  N° Devis
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Nom du devis
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Client / Prospect
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Service / Famille
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Montant TTC
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <FileText className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                      Aucun devis trouvé
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Créez votre premier devis pour commencer.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((engagement) => {
                  const client = clientsById.get(engagement.clientId);
                  const service = servicesById.get(engagement.serviceId);
                  const totals = computeEngagementTotals(engagement);
                  const company = engagement.companyId ? companiesById.get(engagement.companyId) : null;
                  const vatEnabledForQuote = company?.vatEnabled ?? vatEnabled;
                  const vatAmount = vatEnabledForQuote ? totals.price * vatMultiplier : 0;
                  const totalTtc = totals.price + totals.surcharge + vatAmount;
                  const clientType = getClientType(engagement.clientId);
                  const status = engagement.quoteStatus || 'brouillon';

                  // Trouver la famille et la sous-famille
                  let familyName = '—';
                  let subFamilyName = '—';
                  
                  // Essayer de retrouver depuis selectedServices si le devis est en cours de création
                  // Sinon, déduire depuis le service
                  const selectedService = selectedServices.find(sel => sel.serviceId === engagement.serviceId);
                  
                  if (selectedService?.mainCategoryId || selectedService?.subCategoryId) {
                    // Utiliser les IDs stockés dans selectedServices (pour les devis en cours de création)
                    if (selectedService.mainCategoryId) {
                      const mainCategory = categories.find((cat) => cat.id === selectedService.mainCategoryId);
                      if (mainCategory) {
                        familyName = mainCategory.name;
                      }
                    }
                    if (selectedService.subCategoryId) {
                      const subCategory = categories.find((cat) => cat.id === selectedService.subCategoryId);
                      if (subCategory) {
                        subFamilyName = subCategory.name;
                      }
                    }
                  } else if (service?.category) {
                    // Fallback : chercher depuis le service (pour les devis existants)
                    // Chercher toutes les catégories qui correspondent au nom du service
                    const matchingCategories = categories.filter((cat) => cat.name === service.category);
                    
                    if (matchingCategories.length > 0) {
                      // Si on trouve plusieurs catégories avec le même nom, prioriser la sous-catégorie
                      const subCategory = matchingCategories.find((cat) => cat.parentId);
                      const mainCategory = matchingCategories.find((cat) => !cat.parentId);
                      
                      if (subCategory) {
                        // C'est une sous-catégorie, trouver la famille parente
                        const parentCategory = categories.find((cat) => cat.id === subCategory.parentId);
                        if (parentCategory) {
                          familyName = parentCategory.name;
                          subFamilyName = subCategory.name;
                        } else {
                          subFamilyName = subCategory.name;
                        }
                      } else if (mainCategory) {
                        // C'est une catégorie principale (famille)
                        familyName = mainCategory.name;
                        
                        // Chercher si le service pourrait appartenir à une sous-catégorie de cette catégorie
                        // en vérifiant toutes les sous-catégories de cette catégorie principale
                        const subCategories = categories.filter((cat) => cat.active && cat.parentId === mainCategory.id);
                        for (const subCat of subCategories) {
                          // Vérifier si le service appartient à cette sous-catégorie
                          // en vérifiant si le service a cette sous-catégorie comme catégorie
                          if (service.category === subCat.name) {
                            subFamilyName = subCat.name;
                            break;
                          }
                        }
                      } else {
                        // Si on ne trouve pas, utiliser directement le nom de la catégorie
                        familyName = service.category;
                      }
                    } else {
                      // Si on ne trouve pas, utiliser directement le nom de la catégorie
                      familyName = service.category;
                    }
                  }

                  return (
                    <tr
                      key={engagement.id}
                      className={clsx(
                        'group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer',
                        selectedRows.has(engagement.id) && 'bg-blue-50/50 dark:bg-blue-500/10',
                        selectedEngagementId === engagement.id && 'bg-blue-50/50 dark:bg-blue-500/10'
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
                        openEditQuote(engagement);
                      }}
                      onDoubleClick={() => openEditQuote(engagement)}
                      title="Double-cliquez pour modifier le devis"
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(engagement.id)}
                          onChange={() => toggleRowSelection(engagement.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {engagement.quoteNumber || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {engagement.quoteName || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center gap-3">
                          {clientType === 'Prospect' ? (
                            <User className="h-4 w-4 text-purple-500" />
                          ) : (
                            <Building2 className="h-4 w-4 text-blue-500" />
                          )}
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {client?.name || 'Client inconnu'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{clientType}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {service?.name || 'Service archivé'}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>{familyName}</span>
                            {subFamilyName !== '—' && (
                              <>
                                <span>/</span>
                                <span>{subFamilyName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {formatDate(engagement.scheduledAt)}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                            getStatusStyle(status)
                          )}
                        >
                          {status === 'brouillon' && <Clock className="mr-1 h-3 w-3" />}
                          {status === 'envoyé' && <Send className="mr-1 h-3 w-3" />}
                          {status === 'accepté' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {status === 'refusé' && <XCircle className="mr-1 h-3 w-3" />}
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle text-right">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                          {formatCurrency(totalTtc)}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {hasPermission('service.create') && status === 'brouillon' && (
                            <button
                              onClick={() => openEditQuote(engagement)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                              title="Modifier le devis"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('service.create') && (
                            <button
                              onClick={() => handleDuplicateQuote(engagement)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                              title="Dupliquer le devis"
                            >
                              <IconDuplicate />
                            </button>
                          )}
                          <button
                            onClick={() => handlePrintQuote(engagement)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                            title={vatEnabledForQuote ? "Imprimer le devis (avec TTC)" : "Imprimer l'offre de prix (HT)"}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {hasPermission('service.email') && status !== 'accepté' && status !== 'refusé' && (
                            <button
                              onClick={() => handleSendQuote(engagement)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                              title="Envoyer par email"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          {hasPermission('service.create') && status === 'accepté' && (
                            <button
                              onClick={() => handleConvertToService(engagement)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-emerald-100 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-200"
                              title="Convertir en service"
                            >
                              <IconConvert />
                            </button>
                          )}
                          {status === 'envoyé' && (
                            <>
                              <button
                                onClick={() => handleUpdateQuoteStatus(engagement, 'accepté')}
                                className="rounded-lg p-2 text-emerald-600 transition hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                                title="Marquer comme accepté"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateQuoteStatus(engagement, 'refusé')}
                                className="rounded-lg p-2 text-red-600 transition hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                                title="Marquer comme refusé"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {hasPermission('service.archive') && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Êtes-vous sûr de vouloir supprimer le devis ${engagement.quoteNumber || engagement.id} ?`)) {
                                  removeEngagement(engagement.id);
                                  setFeedback('Devis supprimé avec succès.');
                                }
                              }}
                              className="rounded-lg p-2 text-red-600 transition hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-200"
                              title="Supprimer le devis"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
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

      {/* Modal de création - Système d'étapes (Stepper) */}
      {showCreateModal && creationDraft && (
        <CRMModal isOpen={showCreateModal} onClose={closeCreation} maxWidth="full">
          <div className="flex h-[90vh] flex-col bg-white dark:bg-slate-900">
            {/* En-tête */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-700">
              <div className="flex-1 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400 block">
                  {editingEngagementId ? 'MODIFIER LE DEVIS' : 'NOUVEAU DEVIS'}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 m-0">
                  {editingEngagementId ? 'Modifier le devis' : 'Nouveau devis'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed m-0">
                  {editingEngagementId ? 'Modifiez les informations du devis.' : 'Créez un nouveau devis en quelques étapes simples.'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Bouton "Appliquer cette grille tarifaire" */}
                {creationClient && currentStep > 1 && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                    <input
                      type="checkbox"
                      id="apply-pricing-grid-header"
                      checked={applyPricingGrid}
                      onChange={(e) => setApplyPricingGrid(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="apply-pricing-grid-header" className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      Appliquer cette grille tarifaire au client
                    </label>
                  </div>
                )}
                <button
                  type="button"
                  onClick={closeCreation}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Contenu principal : Récapitulatif à gauche + Formulaire à droite */}
            <div className="flex flex-1 overflow-hidden">
              {/* Récapitulatif des étapes (gauche) */}
              <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-white flex flex-col">
                {/* En-tête */}
                <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-200 bg-white">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-900">
                    Progression
                  </h3>
                </div>

                {/* Liste des étapes - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 pt-4 bg-white">
                  <div className="space-y-0">
                    {/* Déterminer si on est en mode édition avec données complètes */}
                    {(() => {
                      const isEditing = !!editingEngagementId;
                      const hasClient = !!creationDraft?.clientId;
                      const hasCompany = !!creationDraft?.companyId;
                      const hasServices = selectedServices.length > 0 || !!creationDraft?.serviceId;
                      const hasDate = !!creationDraft?.scheduledAt;
                      
                      // En mode édition, toutes les étapes sont complétées si les données existent
                      const step1Completed = isEditing ? (hasClient && hasCompany) : (currentStep > 1);
                      const step2Completed = isEditing ? hasServices : (currentStep > 2);
                      const step3Completed = isEditing ? hasDate : (currentStep > 3);
                      
                      return (
                        <>
                          {/* Étape 1 : Contexte */}
                          <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className={clsx(
                              'relative w-full text-left transition-all rounded-lg p-3 -ml-3 hover:bg-slate-50 dark:hover:bg-slate-50',
                              currentStep === 1 && 'bg-slate-50 dark:bg-slate-50'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                                <div className={clsx(
                                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all shadow-sm',
                                  step1Completed
                                    ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-500 shadow-blue-200 dark:shadow-blue-900/50'
                                    : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500'
                                )}>
                                  {step1Completed && currentStep !== 1 ? (
                                    <Check className="h-5 w-5" />
                                  ) : (
                                    <span className="text-sm font-bold">1</span>
                                  )}
                                </div>
                                {step1Completed && (
                                  <div className="mt-2 h-10 w-0.5 bg-gradient-to-b from-blue-400 to-blue-200 dark:from-blue-600 dark:to-blue-800" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <p className={clsx(
                                    'text-sm font-bold',
                                    currentStep === 1
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : step1Completed
                                      ? 'text-slate-900 dark:text-slate-100'
                                      : 'text-slate-500 dark:text-slate-400'
                                  )}>
                                    Contexte
                                  </p>
                                  {step1Completed && currentStep !== 1 && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  )}
                                </div>
                          {currentStep === 1 && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                              Sélection ou création du client/prospect
                            </p>
                          )}
                          {(step1Completed || currentStep > 1) && creationClient && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                {creationClient.name}
                              </p>
                              {creationClient.primaryContact && (
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  📧 {creationClient.primaryContact.email || creationClient.primaryContact.phone}
                                </p>
                              )}
                            </div>
                          )}
                          {(step1Completed || currentStep > 1) && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                📋 Devis
                              </p>
                            </div>
                          )}
                          {(step1Completed || currentStep > 1) && (
                            <div className="mt-2 space-y-1">
                              {creationDraft?.companyId && companiesById.get(creationDraft.companyId) && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                  <Building2 className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  <span>{companiesById.get(creationDraft.companyId)?.name || 'Entreprise rattachée'}</span>
                                </div>
                              )}
                              {creationDraft?.quoteName && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                  <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  <span>{creationDraft.quoteName}</span>
                                </div>
                              )}
                              {(creationDraft?.assignedUserIds || []).length > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                  <Users className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  <span>{(creationDraft?.assignedUserIds || []).length} collaborateur{(creationDraft?.assignedUserIds || []).length > 1 ? 's' : ''}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                          {/* Étape 2 : Prestations */}
                          <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            disabled={!step1Completed}
                            className={clsx(
                              'relative w-full text-left transition-all rounded-lg p-3 -ml-3',
                              step1Completed ? 'hover:bg-slate-50 dark:hover:bg-slate-50 cursor-pointer' : 'opacity-50 cursor-not-allowed',
                              currentStep === 2 && 'bg-slate-50 dark:bg-slate-50'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                                <div className={clsx(
                                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all shadow-sm',
                                  step2Completed
                                    ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-500 shadow-blue-200 dark:shadow-blue-900/50'
                                    : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500'
                                )}>
                                  {step2Completed && currentStep !== 2 ? (
                                    <Check className="h-5 w-5" />
                                  ) : (
                                    <span className="text-sm font-bold">2</span>
                                  )}
                                </div>
                                {step2Completed && (
                                  <div className="mt-2 h-10 w-0.5 bg-gradient-to-b from-blue-400 to-blue-200 dark:from-blue-600 dark:to-blue-800" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <p className={clsx(
                                    'text-sm font-bold',
                                    currentStep === 2
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : step2Completed
                                      ? 'text-slate-900 dark:text-slate-100'
                                      : 'text-slate-500 dark:text-slate-400'
                                  )}>
                                    Prestations
                                  </p>
                                  {step2Completed && currentStep !== 2 && selectedServices.length > 0 && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  )}
                                </div>
                                {currentStep === 2 && (
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                                    Sélection des services et options
                                  </p>
                                )}
                                {step2Completed && currentStep !== 2 && selectedServices.length > 0 && (
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                      {selectedServices.length} prestation{selectedServices.length > 1 ? 's' : ''} sélectionnée{selectedServices.length > 1 ? 's' : ''}
                                    </p>
                                    <div className="mt-2 space-y-1">
                                      {selectedServices.slice(0, 2).map((sel, idx) => {
                                        const service = servicesById.get(sel.serviceId);
                                        return service ? (
                                          <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                            <Circle className="h-2 w-2 fill-blue-600 dark:fill-blue-400 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                            <span className="truncate">{service.name}</span>
                                          </div>
                                        ) : null;
                                      })}
                                      {selectedServices.length > 2 && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 pl-3.5">
                                          +{selectedServices.length - 2} autre{selectedServices.length - 2 > 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Étape 3 : Planification */}
                          <button
                            type="button"
                            onClick={() => setCurrentStep(3)}
                            disabled={!step2Completed}
                            className={clsx(
                              'relative w-full text-left transition-all rounded-lg p-3 -ml-3',
                              step2Completed ? 'hover:bg-slate-50 dark:hover:bg-slate-50 cursor-pointer' : 'opacity-50 cursor-not-allowed',
                              currentStep === 3 && 'bg-slate-50 dark:bg-slate-50'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                                <div className={clsx(
                                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all shadow-sm',
                                  step3Completed
                                    ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-500 shadow-blue-200 dark:shadow-blue-900/50'
                                    : 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500'
                                )}>
                                  {step3Completed && currentStep !== 3 ? (
                                    <Check className="h-5 w-5" />
                                  ) : (
                                    <span className="text-sm font-bold">3</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0 pb-2">
                                <div className="flex items-center justify-between mb-1">
                                  <p className={clsx(
                                    'text-sm font-bold',
                                    currentStep === 3
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : step3Completed
                                      ? 'text-slate-900 dark:text-slate-100'
                                      : 'text-slate-500 dark:text-slate-400'
                                  )}>
                                    Planification
                                  </p>
                                  {step3Completed && currentStep !== 3 && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  )}
                                </div>
                                {currentStep === 3 && (
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                                    Date, heure et intervenants
                                  </p>
                                )}
                                {step3Completed && currentStep !== 3 && creationDraft?.scheduledAt && (
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-900 dark:text-slate-100">
                                      <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                      <span className="font-semibold">{formatDate(creationDraft.scheduledAt)}</span>
                                    </div>
                                    {creationDraft.startTime && (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                        <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                        <span>{creationDraft.startTime} - {calculatedEndTime || '—'}</span>
                                      </div>
                                    )}
                                    {(creationDraft?.assignedUserIds || []).length > 0 && (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                        <Users className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                        <span>{(creationDraft?.assignedUserIds || []).length} intervenant{(creationDraft?.assignedUserIds || []).length > 1 ? 's' : ''}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        </>
                      );
                    })()}

                  </div>
                </div>

                {/* Résumé en bas */}
                <div className="border-t border-slate-200 bg-white p-4 dark:bg-white dark:border-slate-200">
                  <div className="space-y-3">
                    {/* Prix unitaire HT */}
                    {summaryStats.totalAmount > 0 && selectedServices.filter((sel) => !(sel as any).isSubCategoryRow).length > 0 && (
                      <div className="rounded-xl bg-white border border-slate-200 p-3 dark:bg-white dark:border-slate-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-600 mb-1">
                          Prix HT unitaire
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-900">
                          {formatCurrency(summaryStats.totalAmount / selectedServices.filter((sel) => !(sel as any).isSubCategoryRow).length)}
                        </p>
                      </div>
                    )}

                    {/* Prix unitaire TTC */}
                    {summaryStats.totalAmount > 0 && creationVatEnabled && selectedServices.filter((sel) => !(sel as any).isSubCategoryRow).length > 0 && (
                      <div className="rounded-xl bg-white border border-slate-200 p-3 dark:bg-white dark:border-slate-200">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-600 mb-1">
                          Prix TTC unitaire
                        </p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-900">
                          {formatCurrency((summaryStats.totalAmount * (1 + vatMultiplier)) / selectedServices.filter((sel) => !(sel as any).isSubCategoryRow).length)}
                        </p>
                      </div>
                    )}

                    {/* Montant total */}
                    <div className="rounded-xl bg-white border-2 border-blue-200 p-4 dark:bg-white dark:border-blue-200">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-700 mb-2">
                        Montant total HT
                      </p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-700 mb-1">
                        {summaryStats.totalAmount > 0 ? formatCurrency(summaryStats.totalAmount) : '0,00 €'}
                      </p>
                      {creationVatEnabled && summaryStats.totalAmount > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-700 mb-1">
                            Montant total TTC
                          </p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-700">
                            {formatCurrency(summaryStats.totalAmount * (1 + vatMultiplier))}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Informations détaillées */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 dark:bg-white dark:border-slate-200">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-500" />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-700">Prestations</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-900">
                          {selectedServices.length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 dark:bg-white dark:border-slate-200">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-500" />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-700">Options</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-900">
                          {summaryStats.totalOptions > 0 ? summaryStats.totalOptions : '0'}
                        </span>
                      </div>

                      {totalDurationMinutes > 0 && (
                        <div className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 dark:bg-white dark:border-slate-200">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-500" />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-700">Durée totale</span>
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-900">
                            {formatDuration(totalDurationMinutes)}
                          </span>
                        </div>
                      )}

                      {(creationDraft?.assignedUserIds || []).length > 0 && (
                        <div className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 dark:bg-white dark:border-slate-200">
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-slate-500 dark:text-slate-500" />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-700">Intervenants</span>
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-900">
                            {(creationDraft?.assignedUserIds || []).length}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulaire de l'étape actuelle (droite) */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    // Ne pas soumettre le formulaire si on est en mode création de prestation
                    if (currentStep === 2 && serviceSelectionMode === 'create') {
                      return;
                    }
                    if (currentStep < 3) {
                      nextStep();
                    } else {
                      handleCreateQuote(e);
                    }
                  }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-900">
                    {/* Affichage conditionnel selon l'étape */}
                    {currentStep === 1 && (
                      /* ÉTAPE 1 : CONTEXTE */
                      <div className="grid grid-cols-1 lg:grid-cols-[45%_55%] gap-4">
                        {/* Colonne gauche - Champs du formulaire */}
                        <div className="space-y-4 max-w-2xl">

                          {/* Ligne 1 : Entreprise et Collaborateurs alignés */}
                          <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 max-w-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              <CRMFormLabel htmlFor="create-company" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Entreprise rattachée *</CRMFormLabel>
                            </div>
                            <CRMFormSelect
                              id="create-company"
                              value={creationDraft?.companyId || ''}
                              onChange={(e) => setCreationDraft((draft) => draft ? ({ ...draft, companyId: e.target.value }) : null)}
                              required
                              className="w-full shadow-sm transition-all focus:shadow-md"
                            >
                              <option value="">Sélectionner une entreprise…</option>
                              {companies.length === 0 ? (
                                <option value="" disabled>
                                  Chargement des entreprises…
                                </option>
                              ) : (
                                companies.map((company) => (
                                  <option key={company.id} value={company.id}>
                                    {company.name}
                                  </option>
                                ))
                              )}
                            </CRMFormSelect>
                            {companies.length === 0 && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                ⚠️ Aucune entreprise disponible. Vérifiez la console pour les détails.
                              </p>
                            )}
                          </div>

                          <div className="space-y-2 max-w-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              <CRMFormLabel htmlFor="create-assigned-users" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Collaborateurs rattachés</CRMFormLabel>
                            </div>
                            {(() => {
                              // Filtrer les membres d'équipe par entreprise sélectionnée
                              const selectedCompanyId = creationDraft?.companyId || '';
                              const teamMembers = selectedCompanyId
                                ? projectMembers.filter((member) => member.companyId === selectedCompanyId)
                                : [];
                              
                              if (!selectedCompanyId) {
                                return (
                                  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                      <Info className="h-4 w-4" />
                                      <p className="text-xs font-medium">
                                        Sélectionnez d'abord une entreprise
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                              
                              if (teamMembers.length === 0) {
                                return (
                                  <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                      <Users className="h-4 w-4" />
                                      <p className="text-xs font-medium">
                                        Aucun membre d'équipe
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => navigate('/workspace/crm/equipe')}
                                      className="w-full rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                    >
                                      Créer mon équipe
                                    </button>
                                  </div>
                                );
                              }
                              
                              return (
                                <>
                                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                                    <div className="space-y-1.5">
                                      {teamMembers.map((member) => {
                                        const isSelected = (creationDraft?.assignedUserIds || []).includes(member.id);
                                        return (
                                          <label
                                            key={member.id}
                                            className={clsx(
                                              "flex cursor-pointer items-center gap-2 rounded p-2 transition-all",
                                              isSelected 
                                                ? "bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" 
                                                : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                            )}
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
                                              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-slate-600"
                                            />
                                            <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                              {member.firstName} {member.lastName}
                                              {member.role && <span className="text-slate-500 dark:text-slate-400 ml-1">• {member.role}</span>}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  {(creationDraft?.assignedUserIds || []).length > 0 && (
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                      {(creationDraft?.assignedUserIds || []).length} collaborateur{(creationDraft?.assignedUserIds || []).length > 1 ? 's' : ''} sélectionné{(creationDraft?.assignedUserIds || []).length > 1 ? 's' : ''}
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                          {/* Ligne 2 : Nom du devis */}
                          <div className="space-y-2 max-w-md">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              <CRMFormLabel htmlFor="create-quote-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nom du devis</CRMFormLabel>
                            </div>
                            <CRMFormInput
                              id="create-quote-name"
                              type="text"
                              value={creationDraft?.quoteName || ''}
                              onChange={(e) => setCreationDraft((draft) => draft ? ({ ...draft, quoteName: e.target.value }) : null)}
                              placeholder="Ex: Nettoyage bureau, Rénovation appartement..."
                              className="w-full shadow-sm transition-all focus:shadow-md focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>

                          {/* Ligne 3 : Recherche client/prospect unifiée */}
                          <div className="space-y-2 max-w-md">
                            <div className="flex items-center gap-2 mb-1">
                              <Search className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              <CRMFormLabel htmlFor="create-client" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Client / Prospect *
                              </CRMFormLabel>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1 min-w-0">
                                <ClientLeadSearch
                                  clients={clients}
                                  leads={leads}
                                  value={creationDraft.clientId}
                                  onChange={(value, type) => {
                                    if (!value) {
                                      setCreationDraft((draft) => draft ? ({ ...draft, clientId: '' }) : null);
                                      setSelectedLeadId(null);
                                      setSelectedClientOrLeadType(null);
                                      setIsCreatingNewClient(false);
                                      setIsCreatingNewLead(false);
                                    } else {
                                      // Le type sera défini dans onSelect via handleClientOrLeadSelect
                                      setCreationDraft((draft) => draft ? ({ ...draft, clientId: value }) : null);
                                      setIsCreatingNewClient(false);
                                      setIsCreatingNewLead(false);
                                    }
                                  }}
                                  onSelect={handleClientOrLeadSelect}
                                  placeholder="Rechercher un client ou un prospect..."
                                  required={!isCreatingNewClient && !isCreatingNewLead}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  // Si un client/prospect est sélectionné, déterminer si on crée un client ou un prospect
                                  // Sinon, créer un client par défaut
                                  const isLead = selectedClientOrLeadType === 'lead';
                                  if (isLead) {
                                    setIsCreatingNewLead(!isCreatingNewLead);
                                    setIsCreatingNewClient(false);
                                    if (!isCreatingNewLead) {
                                      setNewLeadData({
                                        type: 'company',
                                        companyName: '',
                                        firstName: '',
                                        lastName: '',
                                        email: '',
                                        phone: '',
                                        address: '',
                                        city: '',
                                        siret: '',
                                      });
                                    }
                                  } else {
                                    // Par défaut, créer un client
                                    setIsCreatingNewClient(!isCreatingNewClient);
                                    setIsCreatingNewLead(false);
                                    if (!isCreatingNewClient) {
                                      setNewClientData({
                                        type: 'company',
                                        companyName: '',
                                        firstName: '',
                                        lastName: '',
                                        email: '',
                                        phone: '',
                                        address: '',
                                        city: '',
                                        siret: '',
                                      });
                                    }
                                  }
                                }}
                                className={clsx(
                                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all",
                                  (isCreatingNewClient || isCreatingNewLead)
                                    ? "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                                    : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                )}
                              >
                                <Plus className="h-4 w-4" />
                                {(isCreatingNewClient || isCreatingNewLead) ? 'Annuler' : 'Créer'}
                              </button>
                            </div>
                          </div>

                          {/* Case à cocher "Enregistrer dans la base" - uniquement pour les prospects sélectionnés (pas créés) */}
                          {selectedClientOrLeadType === 'lead' && !isCreatingNewClient && !isCreatingNewLead && creationDraft?.clientId && (
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                              <input
                                type="checkbox"
                                id="save-client-to-db"
                                checked={saveClientToDatabase}
                                onChange={(e) => setSaveClientToDatabase(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                              />
                              <label htmlFor="save-client-to-db" className="text-sm text-slate-700 dark:text-slate-300">
                                Enregistrer le prospect dans la base de données lorsque le devis sera enregistré
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Colonne droite - Carte de résumé du client/prospect */}
                        <div className="lg:sticky lg:top-6 h-fit">
                          <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                              {selectedClientOrLeadType === 'lead' ? (
                                <div className="p-1.5 rounded bg-white border border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
                                  <UserPlus className="h-3.5 w-3.5 text-purple-700 dark:text-purple-400" />
                                </div>
                              ) : selectedClientOrLeadType === 'client' ? (
                                <div className="p-1.5 rounded bg-white border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                                  <Users className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                                </div>
                              ) : (
                                <div className="p-1.5 rounded bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                                  <User className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                                </div>
                              )}
                              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                                {selectedClientOrLeadType === 'lead' ? 'Résumé prospect' : selectedClientOrLeadType === 'client' ? 'Résumé client' : 'Résumé'}
                              </h3>
                            </div>
                            {(() => {
                              const selectedClientId = creationDraft?.clientId;
                              if (!selectedClientId) {
                                return (
                                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
                                    <div className="flex flex-col items-center gap-2">
                                      <Search className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Sélectionnez un client ou un prospect
                                      </p>
                                    </div>
                                  </div>
                                );
                              }

                              const client = clientsById.get(selectedClientId);
                              if (!client) {
                                return (
                                  <div className="rounded-lg border border-dashed border-red-300 bg-white p-6 text-center dark:border-red-700 dark:bg-slate-800">
                                    <div className="flex flex-col items-center gap-2">
                                      <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
                                      <p className="text-xs text-red-600 dark:text-red-400">
                                        {selectedClientOrLeadType === 'lead' ? 'Prospect' : 'Client'} introuvable
                                      </p>
                                    </div>
                                  </div>
                                );
                              }

                              // Déterminer le type : 
                              // IMPORTANT: Si le client est dans la liste des clients, c'est TOUJOURS un Client
                              // Un client n'est un Prospect QUE s'il est sélectionné depuis la liste des leads
                              // et qu'il n'existe PAS dans la liste des clients
                              let actualType: 'client' | 'lead';
                              
                              // Si le client existe dans la liste des clients, c'est TOUJOURS un Client
                              const clientInList = clients.find(c => c.id === client.id);
                              if (clientInList) {
                                // Le client existe dans la liste des clients = c'est un Client, pas un Prospect
                                actualType = 'client';
                                if (selectedClientOrLeadType !== 'client') {
                                  setSelectedClientOrLeadType('client');
                                }
                                if (selectedLeadId) {
                                  setSelectedLeadId(null);
                                }
                              } else {
                                // Le client n'existe pas dans la liste des clients
                                // Vérifier si c'est un prospect (selectedLeadId défini)
                                if (selectedLeadId) {
                                  actualType = 'lead';
                                  if (selectedClientOrLeadType !== 'lead') {
                                    setSelectedClientOrLeadType('lead');
                                  }
                                } else {
                                  // Par défaut, c'est un Client
                                  actualType = 'client';
                                  if (selectedClientOrLeadType !== 'client') {
                                    setSelectedClientOrLeadType('client');
                                  }
                                }
                              }

                              const primaryContact = client.contacts?.find((contact) => contact.active && contact.isBillingDefault) 
                                || client.contacts?.find((contact) => contact.active) 
                                || null;

                              // Calculer les statistiques du client
                              const clientEngagements = engagements.filter(eng => eng.clientId === selectedClientId);
                              const clientQuotes = clientEngagements.filter(eng => eng.kind === 'devis');
                              const clientServices = clientEngagements.filter(eng => eng.kind !== 'devis');

                              return (
                                <div className="space-y-4">
                                  {/* Identité - Design amélioré */}
                                  <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                                    <p className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                                      {client.name || client.companyName || '—'}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={clsx(
                                        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border',
                                        actualType === 'lead'
                                          ? 'bg-white border-purple-200 text-purple-700 dark:bg-white dark:border-purple-300 dark:text-purple-700'
                                          : 'bg-white border-blue-200 text-blue-700 dark:bg-white dark:border-blue-300 dark:text-blue-700'
                                      )}>
                                        {actualType === 'lead' ? 'Prospect' : 'Client'}
                                      </span>
                                      <span className={clsx(
                                        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border',
                                        (client.status === 'Actif' || client.status === 'Prospect')
                                          ? 'bg-white border-green-200 text-green-700 dark:bg-white dark:border-green-300 dark:text-green-700'
                                          : 'bg-white border-orange-200 text-orange-700 dark:bg-white dark:border-orange-300 dark:text-orange-700'
                                      )}>
                                        {client.status === 'Prospect' ? 'Actif' : client.status}
                                      </span>
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {client.type === 'company' ? 'Entreprise' : 'Particulier'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Contact principal - Design amélioré */}
                                  {(primaryContact || client.email || client.phone) && (
                                    <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                          Contact
                                        </p>
                                      </div>
                                      <div className="space-y-1.5 pl-6">
                                        {primaryContact && (
                                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {primaryContact.firstName} {primaryContact.lastName}
                                          </p>
                                        )}
                                        {(primaryContact?.email || client.email) && (
                                          <div className="flex items-center gap-2">
                                            <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                            <p className="text-xs text-slate-600 dark:text-slate-400 break-all">
                                              {primaryContact?.email || client.email}
                                            </p>
                                          </div>
                                        )}
                                        {(primaryContact?.mobile || client.phone) && (
                                          <div className="flex items-center gap-2">
                                            <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                              {primaryContact?.mobile || client.phone}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Sélecteur de contact pour clients professionnels */}
                                  {client.type === 'company' && (
                                    <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                                      <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                          <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Contact pour le devis
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setNewContactForm({
                                              firstName: '',
                                              lastName: '',
                                              email: '',
                                              mobile: '',
                                              roles: [],
                                              isBillingDefault: false,
                                            });
                                            setShowCreateContactModal(true);
                                          }}
                                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                        >
                                          <Plus className="h-3 w-3" />
                                          Nouveau
                                        </button>
                                      </div>
                                      <div className="space-y-2 pl-6">
                                        <CRMFormSelect
                                          value={selectedContactId || ''}
                                          onChange={(e) => setSelectedContactId(e.target.value || null)}
                                          className="w-full text-sm"
                                        >
                                          <option value="">Sélectionner un contact (optionnel)</option>
                                          {client.contacts?.filter(c => c.active).map((contact) => (
                                            <option key={contact.id} value={contact.id}>
                                              {contact.firstName} {contact.lastName} {contact.email && `(${contact.email})`}
                                              {contact.isBillingDefault && ' - Facturation par défaut'}
                                            </option>
                                          ))}
                                        </CRMFormSelect>
                                        {selectedContactId && (() => {
                                          const selectedContact = client.contacts?.find(c => c.id === selectedContactId);
                                          if (!selectedContact) return null;
                                          return (
                                            <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                                {selectedContact.firstName} {selectedContact.lastName}
                                              </p>
                                              {selectedContact.email && (
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                  {selectedContact.email}
                                                </p>
                                              )}
                                              {selectedContact.mobile && (
                                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                                  {selectedContact.mobile}
                                                </p>
                                              )}
                                              {selectedContact.roles.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                  {selectedContact.roles.map((role) => (
                                                    <span
                                                      key={role}
                                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white dark:bg-white border border-purple-300 dark:border-purple-500 text-purple-700 dark:text-purple-700"
                                                    >
                                                      {role === 'achat' && 'Achat'}
                                                      {role === 'facturation' && 'Facturation'}
                                                      {role === 'technique' && 'Technique'}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  )}

                                  {/* Adresse - Design amélioré */}
                                  {(client.address || client.city) && (
                                    <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                          Adresse
                                        </p>
                                      </div>
                                      <div className="space-y-0.5 pl-6">
                                        {client.address && (
                                          <p className="text-xs text-slate-700 dark:text-slate-300">
                                            {client.address}
                                          </p>
                                        )}
                                        {client.city && (
                                          <p className="text-xs text-slate-600 dark:text-slate-400">
                                            {client.city}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Tags - Design amélioré */}
                                  {client.tags && client.tags.length > 0 && (
                                    <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Tag className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                          Tags
                                        </p>
                                      </div>
                                      <div className="flex flex-wrap gap-1.5 pl-6">
                                        {client.tags.map((tag, idx) => (
                                          <span key={idx} className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Statistiques - Design amélioré */}
                                  <div className="pb-3 border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        Statistiques
                                      </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 pl-6">
                                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Prestations</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{clientServices.length}</p>
                                      </div>
                                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Devis</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{clientQuotes.length}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* SIRET - Design amélioré */}
                                  {client.type === 'company' && client.siret && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                          Informations légales
                                        </p>
                                      </div>
                                      <p className="text-xs text-slate-600 dark:text-slate-400 pl-6">
                                        SIRET : <span className="font-mono font-semibold">{client.siret}</span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Formulaires de création de nouveau client ou prospect - En dehors de la grille */}
                    {currentStep === 1 && (
                      <>
                        {/* Formulaire création nouveau client */}
                        {isCreatingNewClient && newClientData && (
                          <div className="mt-6 space-y-4 rounded-lg border-2 border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-slate-900">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Informations du nouveau client
                            </h4>
                            
                            {/* Sélecteur Type de client */}
                            <div className="space-y-2">
                              <CRMFormLabel>Type de client</CRMFormLabel>
                              <div className="inline-flex w-full items-center justify-between gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800/80">
                                <button
                                  type="button"
                                  onClick={() => setNewClientData((prev) => prev ? ({ ...prev, type: 'company' }) : null)}
                                  className={clsx(
                                    'flex-1 rounded-lg px-4 py-2 transition focus-visible:outline-none',
                                    newClientData.type === 'company'
                                      ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-700/20 dark:bg-purple-500 dark:ring-purple-400/20'
                                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                                  )}
                                >
                                  Professionnel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewClientData((prev) => prev ? ({ ...prev, type: 'individual', siret: '' }) : null)}
                                  className={clsx(
                                    'flex-1 rounded-lg px-4 py-2 transition focus-visible:outline-none',
                                    newClientData.type === 'individual'
                                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20 dark:bg-blue-500 dark:ring-blue-400/20'
                                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                                  )}
                                >
                                  Particulier
                                </button>
                              </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              {/* Champs spécifiques selon le type */}
                              {newClientData.type === 'company' && (
                                <>
                                  <div className="space-y-2 sm:col-span-2">
                                    <CRMFormLabel htmlFor="new-client-company-name">Raison sociale *</CRMFormLabel>
                                    <CRMFormInput
                                      id="new-client-company-name"
                                      type="text"
                                      value={newClientData.companyName || ''}
                                      onChange={(e) => setNewClientData((prev) => prev ? ({ ...prev, companyName: e.target.value }) : null)}
                                      placeholder="Ex : WashGo Services"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-2 sm:col-span-2">
                                    <CRMFormLabel htmlFor="new-client-siret">SIRET</CRMFormLabel>
                                    <CRMFormInput
                                      id="new-client-siret"
                                      type="text"
                                      inputMode="numeric"
                                      value={newClientData.siret || ''}
                                      onChange={(e) => setNewClientData((prev) => prev ? ({ ...prev, siret: e.target.value }) : null)}
                                      placeholder="123 456 789 00000"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {newClientData.type === 'individual' && (
                                <>
                                  <div className="space-y-2">
                                    <CRMFormLabel htmlFor="new-client-first-name">Prénom *</CRMFormLabel>
                                    <CRMFormInput
                                      id="new-client-first-name"
                                      type="text"
                                      value={newClientData.firstName || ''}
                                      onChange={(e) => setNewClientData((prev) => prev ? ({ ...prev, firstName: e.target.value }) : null)}
                                      placeholder="Ex : Jeanne"
                                      required={!newClientData.lastName}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <CRMFormLabel htmlFor="new-client-last-name">Nom *</CRMFormLabel>
                                    <CRMFormInput
                                      id="new-client-last-name"
                                      type="text"
                                      value={newClientData.lastName || ''}
                                      onChange={(e) => setNewClientData((prev) => prev ? ({ ...prev, lastName: e.target.value }) : null)}
                                      placeholder="Ex : Martin"
                                      required={!newClientData.firstName}
                                    />
                                  </div>
                                </>
                              )}

                              <div className="space-y-2">
                                <CRMFormLabel htmlFor="new-client-email">Email</CRMFormLabel>
                                <CRMFormInput
                                  id="new-client-email"
                                  type="email"
                                  value={newClientData.email || ''}
                                  onChange={(e) => setNewClientData((prev) => prev ? ({ ...prev, email: e.target.value }) : null)}
                                  placeholder="contact@entreprise.fr"
                                />
                              </div>
                              <div className="space-y-2">
                                <CRMFormLabel htmlFor="new-client-phone">Téléphone</CRMFormLabel>
                                <CRMFormInput
                                  id="new-client-phone"
                                  type="tel"
                                  value={newClientData.phone || ''}
                                  onChange={(e) => setNewClientData((prev) => prev ? ({ ...prev, phone: e.target.value }) : null)}
                                  placeholder="06 12 34 56 78"
                                />
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <CRMFormLabel htmlFor="new-client-address">Adresse</CRMFormLabel>
                                <CRMFormInput
                                  id="new-client-address"
                                  type="text"
                                  value={newClientData.address || ''}
                                  onChange={(e) => setNewClientData((prev) => prev ? ({ ...prev, address: e.target.value }) : null)}
                                  placeholder="123 Rue de la République"
                                />
                              </div>
                              <div className="space-y-2">
                                <CRMFormLabel htmlFor="new-client-city">Ville</CRMFormLabel>
                                <CRMFormInput
                                  id="new-client-city"
                                  type="text"
                                  value={newClientData.city || ''}
                                  onChange={(e) => setNewClientData((prev) => prev ? ({ ...prev, city: e.target.value }) : null)}
                                  placeholder="Paris"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Formulaire création nouveau prospect */}
                        {isCreatingNewLead && newLeadData && (
                          <div className="mt-6 space-y-4 rounded-lg border-2 border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-slate-900">
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Informations du nouveau prospect
                            </h4>
                            
                            {/* Sélecteur Type de prospect */}
                            <div className="space-y-2">
                              <CRMFormLabel>Type de prospect</CRMFormLabel>
                              <div className="inline-flex w-full items-center justify-between gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800/80">
                                <button
                                  type="button"
                                  onClick={() => setNewLeadData((prev) => prev ? ({ ...prev, type: 'company' }) : null)}
                                  className={clsx(
                                    'flex-1 rounded-lg px-4 py-2 transition focus-visible:outline-none',
                                    newLeadData.type === 'company'
                                      ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-700/20 dark:bg-purple-500 dark:ring-purple-400/20'
                                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                                  )}
                                >
                                  Professionnel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewLeadData((prev) => prev ? ({ ...prev, type: 'individual', siret: '' }) : null)}
                                  className={clsx(
                                    'flex-1 rounded-lg px-4 py-2 transition focus-visible:outline-none',
                                    newLeadData.type === 'individual'
                                      ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700/20 dark:bg-blue-500 dark:ring-blue-400/20'
                                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'
                                  )}
                                >
                                  Particulier
                                </button>
                              </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              {/* Champs spécifiques selon le type */}
                              {newLeadData.type === 'company' && (
                                <>
                                  <div className="space-y-2 sm:col-span-2">
                                    <CRMFormLabel htmlFor="new-lead-company-name">Raison sociale *</CRMFormLabel>
                                    <CRMFormInput
                                      id="new-lead-company-name"
                                      type="text"
                                      value={newLeadData.companyName || ''}
                                      onChange={(e) => setNewLeadData((prev) => prev ? ({ ...prev, companyName: e.target.value }) : null)}
                                      placeholder="Ex : WashGo Services"
                                      required
                                    />
                                  </div>
                                  <div className="space-y-2 sm:col-span-2">
                                    <CRMFormLabel htmlFor="new-lead-siret">SIRET</CRMFormLabel>
                                    <CRMFormInput
                                      id="new-lead-siret"
                                      type="text"
                                      inputMode="numeric"
                                      value={newLeadData.siret || ''}
                                      onChange={(e) => setNewLeadData((prev) => prev ? ({ ...prev, siret: e.target.value }) : null)}
                                      placeholder="123 456 789 00000"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {newLeadData.type === 'individual' && (
                                <>
                                  <div className="space-y-2">
                                    <CRMFormLabel htmlFor="new-lead-first-name">Prénom *</CRMFormLabel>
                                    <CRMFormInput
                                      id="new-lead-first-name"
                                      type="text"
                                      value={newLeadData.firstName || ''}
                                      onChange={(e) => setNewLeadData((prev) => prev ? ({ ...prev, firstName: e.target.value }) : null)}
                                      placeholder="Ex : Jeanne"
                                      required={!newLeadData.lastName}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <CRMFormLabel htmlFor="new-lead-last-name">Nom *</CRMFormLabel>
                                    <CRMFormInput
                                      id="new-lead-last-name"
                                      type="text"
                                      value={newLeadData.lastName || ''}
                                      onChange={(e) => setNewLeadData((prev) => prev ? ({ ...prev, lastName: e.target.value }) : null)}
                                      placeholder="Ex : Martin"
                                      required={!newLeadData.firstName}
                                    />
                                  </div>
                                </>
                              )}

                              <div className="space-y-2">
                                <CRMFormLabel htmlFor="new-lead-email">Email</CRMFormLabel>
                                <CRMFormInput
                                  id="new-lead-email"
                                  type="email"
                                  value={newLeadData.email || ''}
                                  onChange={(e) => setNewLeadData((prev) => prev ? ({ ...prev, email: e.target.value }) : null)}
                                  placeholder="contact@entreprise.fr"
                                />
                              </div>
                              <div className="space-y-2">
                                <CRMFormLabel htmlFor="new-lead-phone">Téléphone</CRMFormLabel>
                                <CRMFormInput
                                  id="new-lead-phone"
                                  type="tel"
                                  value={newLeadData.phone || ''}
                                  onChange={(e) => setNewLeadData((prev) => prev ? ({ ...prev, phone: e.target.value }) : null)}
                                  placeholder="06 12 34 56 78"
                                />
                              </div>
                              <div className="space-y-2 sm:col-span-2">
                                <CRMFormLabel htmlFor="new-lead-address">Adresse</CRMFormLabel>
                                <CRMFormInput
                                  id="new-lead-address"
                                  type="text"
                                  value={newLeadData.address || ''}
                                  onChange={(e) => setNewLeadData((prev) => prev ? ({ ...prev, address: e.target.value }) : null)}
                                  placeholder="123 Rue de la République"
                                />
                              </div>
                              <div className="space-y-2">
                                <CRMFormLabel htmlFor="new-lead-city">Ville</CRMFormLabel>
                                <CRMFormInput
                                  id="new-lead-city"
                                  type="text"
                                  value={newLeadData.city || ''}
                                  onChange={(e) => setNewLeadData((prev) => prev ? ({ ...prev, city: e.target.value }) : null)}
                                  placeholder="Paris"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {currentStep === 2 && (
                      /* ÉTAPE 2 : PRESTATIONS */
                      <div className="space-y-6">
                        {/* Onglets : Sélection / Création - Style Apple */}
                        <div className="flex justify-center">
                          <div className="inline-flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
                            <button
                              type="button"
                              onClick={() => setServiceSelectionMode('select')}
                              className={clsx(
                                'px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200',
                                serviceSelectionMode === 'select'
                                  ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                              )}
                            >
                              Sélectionner
                            </button>
                            <button
                              type="button"
                              onClick={() => setServiceSelectionMode('create')}
                              className={clsx(
                                'px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200',
                                serviceSelectionMode === 'create'
                                  ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                              )}
                            >
                              Créer
                            </button>
                          </div>
                        </div>

                        {/* Mode Sélection */}
                        {serviceSelectionMode === 'select' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <CRMFormLabel>Prestations sélectionnées</CRMFormLabel>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingServiceIndex(null);
                                  setModalSelectedMainCategoryId('');
                                  setModalSelectedSubCategoryId('');
                                  setModalSelectedServiceId('');
                                  setModalSelectedSupportDetail('');
                                  setModalSelectedOptionIds([]);
                                  setShowServiceSelectionModal(true);
                                }}
                                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                              >
                                <Plus className="h-3 w-3" />
                                Ajouter une prestation
                              </button>
                            </div>

                          {selectedServices.length === 0 ? (
                            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Aucune prestation sélectionnée. Cliquez sur "Ajouter une prestation" pour commencer.
                              </p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                              <table className="w-full" style={{ minWidth: '1500px' }}>
                                <thead className="bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700">
                                  <tr>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                      Famille
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                      Sous-famille
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[150px]">
                                      Prestation
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[100px]">
                                      Détails
                                    </th>
                                    <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[100px]">
                                      Quantité
                                    </th>
                                    <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[110px]">
                                      Prix famille
                                    </th>
                                    <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[130px]">
                                      Prix Prestation
                                    </th>
                                    <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[110px]">
                                      Durée famille
                                    </th>
                                    <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap min-w-[130px]">
                                      Durée Prestation
                                    </th>
                                    <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 whitespace-nowrap w-[120px]">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
                                  {selectedServices
                                    .filter((sel) => !(sel as any).isSubCategoryRow) // Filtrer les lignes de sous-catégorie
                                    .map((sel, idx) => {
                                    const service = servicesById.get(sel.serviceId);
                                    
                                    // Récupérer les informations de la famille et sous-famille
                                    const mainCategory = sel.mainCategoryId 
                                      ? categories.find((cat) => cat.id === sel.mainCategoryId)
                                      : null;
                                    const subCategory = sel.subCategoryId
                                      ? categories.find((cat) => cat.id === sel.subCategoryId)
                                      : null;
                                    
                                    // Calculer le prix et la durée de la prestation
                                    // Priorité au base_price et base_duration si disponibles
                                    let servicePrice = 0;
                                    let serviceDuration = 0;
                                    
                                    if (service) {
                                      // Prix : priorité au base_price
                                      if ((service as any).base_price !== undefined && (service as any).base_price !== null) {
                                        servicePrice = (service as any).base_price;
                                      } else if (service.options && Array.isArray(service.options) && sel.optionIds.length > 0) {
                                        // Sinon, calculer depuis les options sélectionnées
                                        servicePrice = service.options
                                          .filter(opt => sel.optionIds.includes(opt.id))
                                          .reduce((sum, opt) => {
                                            const override = sel.optionOverrides[opt.id];
                                            const price = override?.unitPriceHT ?? opt.unitPriceHT;
                                            const qty = override?.quantity ?? 1;
                                            return sum + (price * qty);
                                          }, 0);
                                      }
                                      
                                      // Durée : priorité au base_duration
                                      if ((service as any).base_duration !== undefined && (service as any).base_duration !== null) {
                                        serviceDuration = (service as any).base_duration;
                                      } else if (service.options && Array.isArray(service.options) && sel.optionIds.length > 0) {
                                        // Sinon, calculer depuis les options sélectionnées
                                        serviceDuration = service.options
                                          .filter(opt => sel.optionIds.includes(opt.id))
                                          .reduce((sum, opt) => {
                                            const override = sel.optionOverrides[opt.id];
                                            const duration = override?.durationMin ?? opt.defaultDurationMin ?? 0;
                                            const qty = override?.quantity ?? 1;
                                            return sum + (duration * qty);
                                          }, 0);
                                      }
                                    }
                                    
                                    // Calculer les totaux en multipliant par la quantité
                                    const serviceQuantity = sel.quantity ?? 1;
                                    const servicePriceTotal = servicePrice * serviceQuantity;
                                    const serviceDurationTotal = serviceDuration * serviceQuantity;
                                    
                                    // Calculer les totaux pour la famille (prix et durée multipliés par la quantité)
                                    const subCategoryPriceTotal = subCategory?.priceHT ? subCategory.priceHT * serviceQuantity : null;
                                    const subCategoryDurationTotal = subCategory?.defaultDurationMin ? subCategory.defaultDurationMin * serviceQuantity : null;
                                    
                                    // Trouver l'index réel dans selectedServices (avec les lignes de sous-catégorie)
                                    const realIndex = selectedServices.findIndex((s, i) => {
                                      if ((s as any).isSubCategoryRow) return false;
                                      let count = 0;
                                      for (let j = 0; j <= i; j++) {
                                        if (!(selectedServices[j] as any).isSubCategoryRow) {
                                          if (count === idx) return j === i;
                                          count++;
                                        }
                                      }
                                      return false;
                                    });
                                    
                                    return (
                                      <tr
                                        key={idx}
                                        className="group cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                        onDoubleClick={() => {
                                          // Trouver l'index réel pour l'édition
                                          const servicesWithoutSubRows = selectedServices.filter((s) => !(s as any).isSubCategoryRow);
                                          const editIndex = servicesWithoutSubRows.findIndex((s) => s === sel);
                                          
                                          setEditingServiceIndex(editIndex);
                                          
                                          // Utiliser les IDs stockés dans selectedServices en priorité
                                          if (sel.mainCategoryId) {
                                            setModalSelectedMainCategoryId(sel.mainCategoryId);
                                          }
                                          if (sel.subCategoryId) {
                                            setModalSelectedSubCategoryId(sel.subCategoryId);
                                          } else {
                                            setModalSelectedSubCategoryId('');
                                          }
                                          
                                          // Fallback : si les IDs ne sont pas stockés, chercher depuis le service
                                          if (!sel.mainCategoryId) {
                                            const currentService = servicesById.get(sel.serviceId);
                                            if (currentService) {
                                              // Chercher la sous-catégorie par nom
                                              const subCategory = categories.find((cat) => cat.name === currentService.category && cat.parentId);
                                              if (subCategory) {
                                                setModalSelectedSubCategoryId(subCategory.id);
                                                setModalSelectedMainCategoryId(subCategory.parentId || '');
                                              } else {
                                                // Si pas de sous-catégorie, chercher la catégorie principale
                                                const mainCategory = categories.find((cat) => cat.name === currentService.category && !cat.parentId);
                                                if (mainCategory) {
                                                  setModalSelectedMainCategoryId(mainCategory.id);
                                                  setModalSelectedSubCategoryId('');
                                                }
                                              }
                                            }
                                          }
                                          
                                          setModalSelectedServiceId(sel.serviceId || '');
                                          setModalSelectedSupportDetail(sel.supportDetail || '');
                                          setModalSelectedOptionIds(sel.optionIds || []);
                                          setShowServiceSelectionModal(true);
                                        }}
                                        title="Double-cliquez sur la ligne pour modifier la prestation"
                                      >
                                        <td className="px-4 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                                          {mainCategory ? mainCategory.name : '—'}
                                        </td>
                                        <td className="px-4 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                          {subCategory ? subCategory.name : '—'}
                                        </td>
                                        <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {service?.name || 'Sélectionner une prestation...'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                                          {sel.supportDetail || '—'}
                                        </td>
                                        {/* Quantité */}
                                        <td className="px-4 py-4 text-center">
                                          <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={sel.quantity ?? 1}
                                            onChange={(e) => {
                                              const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                              setSelectedServices(selectedServices.map((s, i) => 
                                                i === realIndex ? { ...s, quantity: newQuantity } : s
                                              ));
                                            }}
                                            className="w-20 rounded border border-slate-300 bg-white px-2 py-1.5 text-center text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                          />
                                        </td>
                                        {/* Prix famille */}
                                        <td className="px-4 py-4 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                                          {subCategoryPriceTotal !== null ? formatCurrency(subCategoryPriceTotal) : '—'}
                                        </td>
                                        {/* Prix Prestation */}
                                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          <div
                                            className="inline-block cursor-pointer rounded-lg px-3 py-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onDoubleClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              if (!service) return;
                                              setEditingPriceIndex(idx);
                                              // Afficher le prix unitaire pour l'édition
                                              setEditingPriceValue(servicePrice.toFixed(2));
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            title="Double-cliquez pour modifier le tarif unitaire"
                                          >
                                            {editingPriceIndex === idx ? (
                                              <div className="flex items-center justify-end gap-2">
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  min="0"
                                                  value={editingPriceValue}
                                                  onChange={(e) => setEditingPriceValue(e.target.value)}
                                                  onBlur={() => {
                                                    const newPrice = parseFloat(editingPriceValue) || 0;
                                                    if (newPrice > 0 && service) {
                                                      const currentTotal = servicePrice;
                                                      if (currentTotal > 0) {
                                                        const ratio = newPrice / currentTotal;
                                                        const newOverrides = { ...sel.optionOverrides };
                                                        service.options
                                                          .filter(opt => sel.optionIds.includes(opt.id))
                                                          .forEach((opt) => {
                                                            const currentPrice = newOverrides[opt.id]?.unitPriceHT ?? opt.unitPriceHT;
                                                            const currentQty = newOverrides[opt.id]?.quantity ?? 1;
                                                            newOverrides[opt.id] = {
                                                              ...newOverrides[opt.id],
                                                              unitPriceHT: currentPrice * ratio,
                                                              quantity: currentQty,
                                                            };
                                                          });
                                                        setSelectedServices(selectedServices.map((s, i) => 
                                                          i === realIndex ? { ...s, optionOverrides: newOverrides } : s
                                                        ));
                                                      }
                                                    }
                                                    setEditingPriceIndex(null);
                                                    setEditingPriceValue('');
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.currentTarget.blur();
                                                    } else if (e.key === 'Escape') {
                                                      setEditingPriceIndex(null);
                                                      setEditingPriceValue('');
                                                    }
                                                  }}
                                                  className="w-24 rounded border-2 border-blue-500 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                                                  autoFocus
                                                />
                                                <span className="text-sm text-slate-600 dark:text-slate-400">€</span>
                                              </div>
                                            ) : (
                                              formatCurrency(servicePriceTotal)
                                            )}
                                          </div>
                                        </td>
                                        {/* Durée famille */}
                                        <td className="px-4 py-4 text-right text-sm font-medium text-slate-700 dark:text-slate-300">
                                          {subCategoryDurationTotal !== null ? `${subCategoryDurationTotal} min` : '—'}
                                        </td>
                                        {/* Durée Prestation */}
                                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          <div
                                            className="inline-block cursor-pointer rounded-lg px-3 py-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                                            onDoubleClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              if (!service) return;
                                              setEditingDurationIndex(idx);
                                              // Afficher la durée unitaire pour l'édition
                                              setEditingDurationValue(serviceDuration.toString());
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            title="Double-cliquez pour modifier la durée unitaire"
                                          >
                                            {editingDurationIndex === idx ? (
                                              <div className="flex items-center justify-end gap-2">
                                                <input
                                                  type="number"
                                                  step="1"
                                                  min="0"
                                                  value={editingDurationValue}
                                                  onChange={(e) => setEditingDurationValue(e.target.value)}
                                                  onBlur={() => {
                                                    const newDuration = parseInt(editingDurationValue) || 0;
                                                    if (newDuration >= 0 && service) {
                                                      const currentTotal = serviceDuration;
                                                      if (currentTotal > 0) {
                                                        const ratio = newDuration / currentTotal;
                                                        const newOverrides = { ...sel.optionOverrides };
                                                        service.options
                                                          .filter(opt => sel.optionIds.includes(opt.id))
                                                          .forEach((opt) => {
                                                            const currentDuration = newOverrides[opt.id]?.durationMin ?? opt.defaultDurationMin ?? 0;
                                                            const currentQty = newOverrides[opt.id]?.quantity ?? 1;
                                                            newOverrides[opt.id] = {
                                                              ...newOverrides[opt.id],
                                                              durationMin: Math.round(currentDuration * ratio),
                                                              quantity: currentQty,
                                                            };
                                                          });
                                                        setSelectedServices(selectedServices.map((s, i) => 
                                                          i === realIndex ? { ...s, optionOverrides: newOverrides } : s
                                                        ));
                                                      } else if (newDuration > 0) {
                                                        const optionCount = service.options.filter(opt => sel.optionIds.includes(opt.id)).length;
                                                        if (optionCount > 0) {
                                                          const durationPerOption = Math.round(newDuration / optionCount);
                                                          const newOverrides = { ...sel.optionOverrides };
                                                          service.options
                                                            .filter(opt => sel.optionIds.includes(opt.id))
                                                            .forEach((opt) => {
                                                              const currentQty = newOverrides[opt.id]?.quantity ?? 1;
                                                              newOverrides[opt.id] = {
                                                                ...newOverrides[opt.id],
                                                                durationMin: durationPerOption,
                                                                quantity: currentQty,
                                                              };
                                                            });
                                                          setSelectedServices(selectedServices.map((s, i) => 
                                                            i === realIndex ? { ...s, optionOverrides: newOverrides } : s
                                                          ));
                                                        }
                                                      }
                                                    }
                                                    setEditingDurationIndex(null);
                                                    setEditingDurationValue('');
                                                  }}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.currentTarget.blur();
                                                    } else if (e.key === 'Escape') {
                                                      setEditingDurationIndex(null);
                                                      setEditingDurationValue('');
                                                    }
                                                  }}
                                                  className="w-24 rounded border-2 border-blue-500 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
                                                  autoFocus
                                                />
                                                <span className="text-sm text-slate-600 dark:text-slate-400">min</span>
                                              </div>
                                            ) : (
                                              `${serviceDurationTotal} min`
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                // Trouver l'index réel pour l'édition
                                                const servicesWithoutSubRows = selectedServices.filter((s) => !(s as any).isSubCategoryRow);
                                                const editIndex = servicesWithoutSubRows.findIndex((s) => s === sel);
                                                
                                                setEditingServiceIndex(editIndex);
                                                
                                                // Utiliser les IDs stockés dans selectedServices en priorité
                                                if (sel.mainCategoryId) {
                                                  setModalSelectedMainCategoryId(sel.mainCategoryId);
                                                }
                                                if (sel.subCategoryId) {
                                                  setModalSelectedSubCategoryId(sel.subCategoryId);
                                                } else {
                                                  setModalSelectedSubCategoryId('');
                                                }
                                                
                                                // Fallback : si les IDs ne sont pas stockés, chercher depuis le service
                                                if (!sel.mainCategoryId) {
                                                  const currentService = servicesById.get(sel.serviceId);
                                                  if (currentService) {
                                                    // Chercher la sous-catégorie par nom
                                                    const subCategory = categories.find((cat) => cat.name === currentService.category && cat.parentId);
                                                    if (subCategory) {
                                                      setModalSelectedSubCategoryId(subCategory.id);
                                                      setModalSelectedMainCategoryId(subCategory.parentId || '');
                                                    } else {
                                                      // Si pas de sous-catégorie, chercher la catégorie principale
                                                      const mainCategory = categories.find((cat) => cat.name === currentService.category && !cat.parentId);
                                                      if (mainCategory) {
                                                        setModalSelectedMainCategoryId(mainCategory.id);
                                                        setModalSelectedSubCategoryId('');
                                                      }
                                                    }
                                                  }
                                                }
                                                
                                                setModalSelectedServiceId(sel.serviceId || '');
                                                setModalSelectedSupportDetail(sel.supportDetail || '');
                                                setModalSelectedOptionIds(sel.optionIds || []);
                                                setShowServiceSelectionModal(true);
                                              }}
                                              className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                              title="Modifier la prestation"
                                            >
                                              <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                // Supprimer aussi la ligne de sous-catégorie associée si elle existe
                                                const newServices = [...selectedServices];
                                                if (realIndex > 0 && (newServices[realIndex - 1] as any).isSubCategoryRow && 
                                                    (newServices[realIndex - 1] as any).subCategoryId === sel.subCategoryId) {
                                                  newServices.splice(realIndex - 1, 2);
                                                } else {
                                                  newServices.splice(realIndex, 1);
                                                }
                                                setSelectedServices(newServices);
                                              }}
                                              className="rounded-lg p-2 text-red-600 transition hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                                              title="Supprimer la prestation"
                                            >
                                              <X className="h-4 w-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700">
                                  <tr>
                                    <td colSpan={4} className="px-4 py-4 text-right text-sm font-bold text-slate-900 dark:text-slate-100">
                                      Total HT
                                    </td>
                                    <td colSpan={2} className="px-4 py-4 text-right text-lg font-bold text-blue-600 dark:text-blue-400">
                                      {formatCurrency(
                                        selectedServices
                                          .filter((sel) => !(sel as any).isSubCategoryRow)
                                          .reduce((sum, sel) => {
                                            const service = servicesById.get(sel.serviceId);
                                            if (!service) return sum;
                                            
                                            // Calculer le prix unitaire du service
                                            let servicePrice = 0;
                                            // Priorité au base_price si disponible
                                            if ((service as any).base_price !== undefined && (service as any).base_price !== null) {
                                              servicePrice = (service as any).base_price;
                                            } else if (service.options && Array.isArray(service.options) && sel.optionIds.length > 0) {
                                              // Sinon, calculer depuis les options sélectionnées
                                              servicePrice = service.options
                                                .filter(opt => sel.optionIds.includes(opt.id))
                                                .reduce((optSum, opt) => {
                                                  const override = sel.optionOverrides[opt.id];
                                                  const price = override?.unitPriceHT ?? opt.unitPriceHT;
                                                  const qty = override?.quantity ?? 1;
                                                  return optSum + (price * qty);
                                                }, 0);
                                            }
                                            
                                            // Ajouter le prix de la sous-catégorie si elle existe
                                            const subCategory = sel.subCategoryId 
                                              ? categories.find((cat) => cat.id === sel.subCategoryId)
                                              : null;
                                            const subCategoryPrice = subCategory?.priceHT || 0;
                                            
                                            // Multiplier par la quantité du service
                                            const serviceQuantity = sel.quantity ?? 1;
                                            const totalServicePrice = (servicePrice + subCategoryPrice) * serviceQuantity;
                                            
                                            return sum + totalServicePrice;
                                          }, 0)
                                      )}
                                    </td>
                                    <td colSpan={2} className="px-4 py-4 text-right text-lg font-bold text-blue-600 dark:text-blue-400">
                                      {formatDuration(
                                        selectedServices
                                          .filter((sel) => !(sel as any).isSubCategoryRow)
                                          .reduce((sum, sel) => {
                                            const service = servicesById.get(sel.serviceId);
                                            if (!service) return sum;
                                            
                                            // Durée du service
                                            // Priorité au base_duration si disponible
                                            let serviceDuration = 0;
                                            if ((service as any).base_duration !== undefined && (service as any).base_duration !== null) {
                                              serviceDuration = (service as any).base_duration;
                                            } else if (service.options && Array.isArray(service.options) && sel.optionIds.length > 0) {
                                              // Sinon, calculer depuis les options sélectionnées
                                              serviceDuration = service.options
                                                .filter(opt => sel.optionIds.includes(opt.id))
                                                .reduce((optSum, opt) => {
                                                  const override = sel.optionOverrides[opt.id];
                                                  const duration = override?.durationMin ?? opt.defaultDurationMin ?? 0;
                                                  const qty = override?.quantity ?? 1;
                                                  return optSum + (duration * qty);
                                                }, 0);
                                            }
                                            
                                            // Ajouter la durée de la sous-catégorie si définie
                                            const subCategory = sel.subCategoryId 
                                              ? categories.find((cat) => cat.id === sel.subCategoryId)
                                              : null;
                                            const subCategoryDuration = (subCategory as any)?.defaultDurationMin || 0;
                                            
                                            // Multiplier par la quantité du service
                                            const serviceQuantity = sel.quantity ?? 1;
                                            const totalServiceDuration = (serviceDuration + subCategoryDuration) * serviceQuantity;
                                            
                                            return sum + totalServiceDuration;
                                          }, 0)
                                      )}
                                    </td>
                                    <td className="px-4 py-4"></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                          </div>
                        )}

                        {/* Mode Création */}
                        {serviceSelectionMode === 'create' && (
                          <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                            <ServiceCatalogManager
                              compact={true}
                              onServiceCreated={(service) => {
                                // Ne pas basculer en mode sélection, rester sur le tableau
                                // Les services seront automatiquement rechargés par ServiceCatalogManager
                                console.log('[DevisPage] Service créé:', service);
                              }}
                              onCategoryCreated={(category) => {
                                // Recharger les catégories
                                console.log('Catégorie créée:', category.id);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {currentStep === 3 && (
                      /* ÉTAPE 3 : PLANIFICATION */
                      <div className="space-y-6">

                        <div className="space-y-4">
                          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                            <input
                              type="checkbox"
                              id="is-planned"
                              checked={!!creationDraft.scheduledAt}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCreationDraft((draft) => draft ? ({
                                    ...draft,
                                    scheduledAt: new Date().toISOString().split('T')[0],
                                  }) : null);
                                } else {
                                  // Désélectionner la planification : vider tous les champs de planification
                                  setCreationDraft((draft) => draft ? ({
                                    ...draft,
                                    scheduledAt: '',
                                    startTime: '',
                                    planningUser: null,
                                    assignedUserId: '', // Pour le planning
                                  }) : null);
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <label htmlFor="is-planned" className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              Cette prestation est planifiée
                            </label>
                          </div>

                          {creationDraft.scheduledAt && (
                            <div className="space-y-4 rounded-lg border border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-slate-900">
                              <div className="space-y-2">
                                <CRMFormLabel htmlFor="create-date">Date d'intervention *</CRMFormLabel>
                                <CRMFormInput
                                  id="create-date"
                                  type="date"
                                  value={creationDraft.scheduledAt}
                                  onChange={(e) => setCreationDraft((draft) => draft ? ({ ...draft, scheduledAt: e.target.value }) : null)}
                                  required
                                />
                              </div>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <CRMFormLabel htmlFor="create-time">Heure de début *</CRMFormLabel>
                                  <CRMFormInput
                                    id="create-time"
                                    type="time"
                                    value={creationDraft.startTime || ''}
                                    onChange={(e) => setCreationDraft((draft) => draft ? ({ ...draft, startTime: e.target.value }) : null)}
                                    required
                                  />
                                </div>

                                <div className="space-y-2">
                                  <CRMFormLabel htmlFor="create-end-time">Heure de fin (calculée)</CRMFormLabel>
                                  <CRMFormInput
                                    id="create-end-time"
                                    type="time"
                                    value={calculatedEndTime || ''}
                                    disabled
                                    className="bg-slate-50 dark:bg-slate-800 cursor-not-allowed"
                                  />
                                  {totalDurationMinutes > 0 && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      Durée totale : {formatDuration(totalDurationMinutes)}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {(creationDraft?.assignedUserIds || []).length > 0 ? (
                                <div className="space-y-2">
                                  <CRMFormLabel>Intervenants assignés</CRMFormLabel>
                                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                                    <div className="flex flex-wrap gap-2">
                                      {(creationDraft?.assignedUserIds || []).map((userId) => {
                                        const user = authUsers.find(u => u.id === userId);
                                        if (!user) return null;
                                        return (
                                          <span
                                            key={userId}
                                            className="inline-flex items-center gap-1 rounded-md bg-blue-500 px-2 py-1 text-xs font-medium text-white dark:bg-blue-600 dark:text-white"
                                          >
                                            <User className="h-3 w-3 text-white" />
                                            {user.profile.firstName} {user.profile.lastName}
                                          </span>
                                        );
                                      })}
                                    </div>
                                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                                      Les intervenants ont été sélectionnés dans l'étape Contexte.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-lg border border-blue-200 bg-white p-3 dark:border-blue-700 dark:bg-white dark:border-opacity-50">
                                  <p className="text-sm text-blue-600 dark:text-blue-600 font-medium">
                                    ⚠️ Aucun intervenant n'a été sélectionné dans l'étape Contexte. Veuillez retourner à l'étape 1 pour sélectionner des collaborateurs.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}


                  </div>
                  
                  {/* Boutons de navigation - Fixés en bas */}
                  <div className="flex-shrink-0 border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-white">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={previousStep}
                        disabled={currentStep === 1}
                        className={clsx(
                          'rounded-lg px-4 py-2 text-sm font-medium transition',
                          currentStep === 1
                            ? 'cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-200 dark:bg-slate-50 dark:text-slate-400'
                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-300 dark:bg-white dark:text-slate-700 dark:hover:bg-slate-50'
                        )}
                      >
                        <ChevronRight className="mr-2 inline h-4 w-4 rotate-180" />
                        Précédent
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingQuote}
                        className={clsx(
                          "rounded-lg px-4 py-2 text-sm font-medium text-white transition",
                          isCreatingQuote
                            ? "cursor-not-allowed bg-blue-400 dark:bg-blue-500"
                            : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                        )}
                      >
                        {currentStep < 3 ? (
                          <>
                            Suivant
                            <ChevronRight className="ml-2 inline h-4 w-4" />
                          </>
                        ) : (
                          editingEngagementId ? 'Enregistrer les modifications' : 'Enregistrer le devis'
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </CRMModal>
      )}

      {/* Modal de sélection de prestation (famille/sous-famille) */}
      {showServiceSelectionModal && (() => {
        // Calculer le prix et la durée en temps réel
        const selectedService = modalSelectedServiceId ? servicesById.get(modalSelectedServiceId) : null;
        const selectedSubCategory = modalSelectedSubCategoryId 
          ? categories.find((cat) => cat.id === modalSelectedSubCategoryId)
          : null;
        
        // Calculer le prix de la prestation seule (sans sous-catégorie)
        let servicePrice = 0;
        let serviceDuration = 0;
        if (selectedService) {
          // Priorité au base_price et base_duration si disponibles
          if ((selectedService as any).base_price !== undefined && (selectedService as any).base_price !== null) {
            servicePrice = (selectedService as any).base_price;
          } else if (selectedService.options && Array.isArray(selectedService.options)) {
            // Sinon, calculer depuis les options actives
            const activeOptions = selectedService.options.filter(opt => opt.active);
            servicePrice = activeOptions.reduce((sum, opt) => sum + opt.unitPriceHT, 0);
          }
          
          if ((selectedService as any).base_duration !== undefined && (selectedService as any).base_duration !== null) {
            serviceDuration = (selectedService as any).base_duration;
          } else if (selectedService.options && Array.isArray(selectedService.options)) {
            // Sinon, calculer depuis les options actives
            const activeOptions = selectedService.options.filter(opt => opt.active);
            serviceDuration = activeOptions.reduce((sum, opt) => sum + (opt.defaultDurationMin || 0), 0);
          }
        }
        
        // Calculer le prix total (sous-catégorie + service)
        let totalPrice = servicePrice;
        if (selectedSubCategory?.priceHT) {
          totalPrice += selectedSubCategory.priceHT;
        }
        
        // Calculer la durée totale (inclure la sous-catégorie si elle a une durée)
        let totalDuration = serviceDuration;
        if ((selectedSubCategory as any)?.defaultDurationMin) {
          totalDuration += (selectedSubCategory as any).defaultDurationMin;
        }
        
        return (
          <CRMModal
            isOpen={showServiceSelectionModal}
            onClose={() => {
              setShowServiceSelectionModal(false);
              setEditingServiceIndex(null);
              setModalSelectedMainCategoryId('');
              setModalSelectedSubCategoryId('');
              setModalSelectedServiceId('');
              setModalSelectedSupportDetail('');
              setModalSelectedOptionIds([]);
            }}
            maxWidth="6xl"
          >
            <div className="flex h-[85vh] bg-white dark:bg-slate-900">
              {/* Contenu principal à gauche */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {editingServiceIndex !== null ? 'Modifier la prestation' : 'Sélectionner une prestation'}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Choisissez la catégorie, la sous-catégorie, le service et les options.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Interface visuelle avec blocs cliquables */}
                  
                  {/* Catégories principales - Toujours visibles */}
                  <div>
                    <CRMFormLabel className="mb-3 block">Catégories *</CRMFormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {categories
                        .filter((cat) => cat.active && !cat.parentId)
                        .map((category) => {
                          const isSelected = modalSelectedMainCategoryId === category.id;
                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => {
                                setModalSelectedMainCategoryId(category.id);
                                setModalSelectedSubCategoryId(''); // Réinitialiser la sous-catégorie
                                setModalSelectedServiceId(''); // Réinitialiser le service
                                setModalSelectedSupportDetail('');
                              }}
                              className={clsx(
                                'relative rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-lg',
                                isSelected
                                  ? 'border-blue-600 bg-white'
                                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  {category.name}
                                </span>
                                {isSelected && (
                                  <Check className="h-5 w-5 text-white" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Sous-catégories et Services - Affichés simultanément quand une catégorie est sélectionnée */}
                  {modalSelectedMainCategoryId && (() => {
                    const selectedMainCategory = categories.find((cat) => cat.id === modalSelectedMainCategoryId);
                    if (!selectedMainCategory) return null;
                    
                    const subCategories = categories.filter((cat) => cat.active && cat.parentId === modalSelectedMainCategoryId);
                    
                    // Déterminer les services à afficher
                    // RÈGLES MÉTIER :
                    // 1. Chaque prestation doit être obligatoirement rattachée à une catégorie principale
                    // 2. Le filtrage principal se fait uniquement sur la catégorie principale
                    // 3. Les sous-catégories servent uniquement de filtres complémentaires
                    // 4. Les sous-catégories ne doivent jamais afficher des prestations d'une autre catégorie
                    
                    // Étape 1 : Trouver la catégorie principale de chaque service
                    // Un service peut avoir :
                    // - Une catégorie principale directement (s.category === mainCategory.name)
                    // - Une sous-catégorie qui appartient à la catégorie principale
                    const getServiceMainCategory = (service: Service): Category | null => {
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
                      
                      // Service sans catégorie principale valide (ne sera pas affiché)
                      return null;
                    };
                    
                    // Étape 2 : Filtrer les services par catégorie principale uniquement
                    // CRITÈRE PRINCIPAL : Le service doit appartenir à la catégorie principale sélectionnée
                    let filteredServices = services.filter((s) => {
                      if (!s.active) return false;
                      
                      // Trouver la catégorie principale du service
                      const serviceMainCategory = getServiceMainCategory(s);
                      
                      // Si le service n'a pas de catégorie principale, ne pas l'afficher
                      if (!serviceMainCategory) return false;
                      
                      // CRITÈRE OBLIGATOIRE : Le service doit appartenir à la catégorie principale sélectionnée
                      // Cela garantit qu'aucune prestation d'une autre catégorie ne sera affichée
                      if (serviceMainCategory.id !== selectedMainCategory.id) return false;
                      
                      // RÈGLE FONDAMENTALE : Les prestations sont rattachées uniquement à la catégorie principale
                      // Les sous-catégories sont des filtres complémentaires qui ne modifient PAS la liste des prestations
                      // La sélection d'une sous-catégorie ne doit JAMAIS filtrer les prestations
                      // La sous-catégorie est un contexte complémentaire (ex: places, taille, modèle)
                      // qui ne doit pas affecter l'affichage des prestations
                      
                      // Tous les services de la catégorie principale sont affichés,
                      // que une sous-catégorie soit sélectionnée ou non
                      return true;
                    });
                    
                    // Debug: afficher les informations de filtrage
                    console.log('[DevisPage] Filtrage des services:', {
                      totalServices: services.length,
                      activeServices: services.filter(s => s.active).length,
                      selectedMainCategory: selectedMainCategory?.name,
                      selectedSubCategory: modalSelectedSubCategoryId ? categories.find(c => c.id === modalSelectedSubCategoryId)?.name : null,
                      filteredServicesCount: filteredServices.length,
                      servicesCategories: [...new Set(services.map(s => s.category).filter(Boolean))],
                      sampleServiceCategories: services.slice(0, 5).map(s => ({ 
                        id: s.id, 
                        name: s.name, 
                        category: s.category,
                        mainCategory: getServiceMainCategory(s)?.name || 'N/A'
                      }))
                    });
                    
                    return (
                      <div className="space-y-4">
                        {/* Sous-catégories - Affichées en blocs si elles existent */}
                        {subCategories.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <CRMFormLabel>Sous-catégories</CRMFormLabel>
                              <button
                                type="button"
                                onClick={() => {
                                  setModalSelectedSubCategoryId('');
                                  setModalSelectedServiceId('');
                                }}
                                className={clsx(
                                  'text-xs px-3 py-1 rounded-lg transition',
                                  !modalSelectedSubCategoryId
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                )}
                              >
                                Toutes
                              </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {subCategories.map((subCategory) => {
                                const isSelected = modalSelectedSubCategoryId === subCategory.id;
                                return (
                                  <button
                                    key={subCategory.id}
                                    type="button"
                                    onClick={() => {
                                      setModalSelectedSubCategoryId(subCategory.id);
                                      setModalSelectedServiceId('');
                                    }}
                                    className={clsx(
                                      'relative rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-lg',
                                      isSelected
                                        ? 'border-blue-600 bg-white'
                                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                                    )}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <span className="text-sm font-semibold block text-slate-900 dark:text-slate-100">
                                          {subCategory.name}
                                        </span>
                                        {(subCategory.priceHT || (subCategory as any).defaultDurationMin) && (
                                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            {subCategory.priceHT && (
                                              <span>{formatCurrency(subCategory.priceHT)}</span>
                                            )}
                                            {(subCategory as any).defaultDurationMin && (
                                              <span>• {(subCategory as any).defaultDurationMin} min</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {isSelected && (
                                        <Check className="h-5 w-5 text-white ml-2 flex-shrink-0" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Services - Affichés en même temps que les sous-catégories */}
                        <div>
                          <CRMFormLabel className="mb-3 block">Prestations disponibles *</CRMFormLabel>
                          {filteredServices.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                              {filteredServices.map((service) => {
                                const isSelected = modalSelectedServiceId === service.id;
                                const activeOptions = (service.options && Array.isArray(service.options))
                                  ? service.options.filter(opt => opt.active)
                                  : [];
                                // Utiliser base_price et base_duration en priorité, sinon calculer depuis les options
                                const servicePrice = (service as any).base_price !== undefined && (service as any).base_price !== null
                                  ? (service as any).base_price
                                  : activeOptions.reduce((sum, opt) => sum + opt.unitPriceHT, 0);
                                const serviceDuration = (service as any).base_duration !== undefined && (service as any).base_duration !== null
                                  ? (service as any).base_duration
                                  : activeOptions.reduce((sum, opt) => sum + (opt.defaultDurationMin || 0), 0);
                                
                                return (
                                  <button
                                    key={service.id}
                                    type="button"
                                    onClick={() => {
                                      setModalSelectedServiceId(service.id);
                                      setModalSelectedOptionIds([]);
                                    }}
                                    className={clsx(
                                      'relative rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-lg',
                                      isSelected
                                        ? 'border-blue-600 bg-white'
                                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                                    )}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <span className="text-sm font-semibold block mb-1 text-slate-900 dark:text-slate-100">
                                          {service.name}
                                        </span>
                                        {(servicePrice > 0 || serviceDuration > 0) && (
                                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            {servicePrice > 0 && (
                                              <span className="font-medium">{formatCurrency(servicePrice)}</span>
                                            )}
                                            {serviceDuration > 0 && (
                                              <span>• {formatDuration(serviceDuration)}</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {isSelected && (
                                        <Check className="h-5 w-5 text-white ml-2 flex-shrink-0" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800">
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Aucune prestation disponible pour cette catégorie
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}


                {/* Étape 4 : Type de support (texte libre) */}
                <div className="rounded-xl border-2 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                  <div className="space-y-2">
                    <CRMFormLabel htmlFor="modal-support-detail">Type de support</CRMFormLabel>
                    <CRMFormInput
                      id="modal-support-detail"
                      type="text"
                      value={modalSelectedSupportDetail}
                      onChange={(e) => setModalSelectedSupportDetail(e.target.value)}
                      placeholder="Ex: Voiture, Canapé, Textile, etc."
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Saisissez librement le type de support pour cette prestation
                    </p>
                  </div>
                </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <CRMCancelButton
                    onClick={() => {
                      setShowServiceSelectionModal(false);
                      setEditingServiceIndex(null);
                      setModalSelectedMainCategoryId('');
                      setModalSelectedSubCategoryId('');
                      setModalSelectedServiceId('');
                      setModalSelectedSupportDetail('');
                    }}
                  >
                    Annuler
                  </CRMCancelButton>
                  <CRMSubmitButton
                onClick={(e) => {
                  e.preventDefault();
                  if (!modalSelectedMainCategoryId) {
                    setFeedback('Veuillez sélectionner une catégorie.');
                    return;
                  }
                  if (!modalSelectedServiceId) {
                    setFeedback('Veuillez sélectionner un service.');
                    return;
                  }

                  const selectedService = servicesById.get(modalSelectedServiceId);
                  if (!selectedService) {
                    setFeedback('Service introuvable.');
                    return;
                  }

                  // Récupérer automatiquement toutes les options actives du service
                  const activeOptionIds = (selectedService.options && Array.isArray(selectedService.options))
                    ? selectedService.options
                        .filter(opt => opt.active)
                        .map(opt => opt.id)
                    : [];
                  
                  // Vérifier si le service a base_price et base_duration (services sans options)
                  const hasBasePrice = (selectedService as any).base_price !== undefined && (selectedService as any).base_price !== null;
                  const hasBaseDuration = (selectedService as any).base_duration !== undefined && (selectedService as any).base_duration !== null;
                  const hasBaseValues = hasBasePrice || hasBaseDuration;
                  
                  // Permettre l'ajout si le service a des options actives OU des valeurs de base (base_price/base_duration)
                  if (activeOptionIds.length === 0 && !hasBaseValues) {
                    setFeedback('Ce service n\'a aucune option active et aucune valeur de base (prix ou durée).');
                    return;
                  }

                  // Déterminer le supportType basé sur la catégorie principale
                  const selectedMainCategory = categories.find((cat) => cat.id === modalSelectedMainCategoryId);
                  const defaultSupportType = selectedMainCategory 
                    ? (selectedMainCategory.name === 'Autre' ? 'Textile' : selectedMainCategory.name) as SupportType
                    : 'Textile';

                  // Récupérer les informations de la sous-catégorie si elle est sélectionnée
                  const selectedSubCategory = modalSelectedSubCategoryId 
                    ? categories.find((cat) => cat.id === modalSelectedSubCategoryId)
                    : null;

                  // Trouver l'index réel du service (en ignorant les lignes de sous-catégorie)
                  const servicesWithoutSubRows = selectedServices.filter((s) => !(s as any).isSubCategoryRow);
                  
                  if (editingServiceIndex !== null && editingServiceIndex < servicesWithoutSubRows.length) {
                    // Modifier une prestation existante
                    const serviceToEdit = servicesWithoutSubRows[editingServiceIndex];
                    const realIndex = selectedServices.findIndex((s) => s === serviceToEdit);
                    
                    // Retirer l'ancienne ligne de sous-catégorie si elle existe (juste avant)
                    const newServices = [...selectedServices];
                    if (realIndex > 0 && (newServices[realIndex - 1] as any).isSubCategoryRow) {
                      newServices.splice(realIndex - 1, 1);
                      const updatedRealIndex = realIndex - 1;
                      newServices[updatedRealIndex] = {
                        serviceId: modalSelectedServiceId,
                        supportType: defaultSupportType,
                        supportDetail: modalSelectedSupportDetail,
                        optionIds: activeOptionIds,
                        optionOverrides: {},
                        mainCategoryId: modalSelectedMainCategoryId,
                        subCategoryId: modalSelectedSubCategoryId || undefined,
                      };
                    } else {
                      newServices[realIndex] = {
                        serviceId: modalSelectedServiceId,
                        supportType: defaultSupportType,
                        supportDetail: modalSelectedSupportDetail,
                        optionIds: activeOptionIds,
                        optionOverrides: {},
                        mainCategoryId: modalSelectedMainCategoryId,
                        subCategoryId: modalSelectedSubCategoryId || undefined,
                        quantity: newServices[realIndex]?.quantity ?? 1, // Conserver la quantité existante ou initialiser à 1
                      };
                    }
                    
                    setSelectedServices(newServices);
                  } else {
                    // Ajouter une nouvelle prestation (sans ligne de sous-catégorie séparée)
                    const newService = {
                      serviceId: modalSelectedServiceId,
                      optionIds: activeOptionIds,
                      optionOverrides: {},
                      supportType: defaultSupportType,
                      supportDetail: modalSelectedSupportDetail,
                      mainCategoryId: modalSelectedMainCategoryId,
                      subCategoryId: modalSelectedSubCategoryId || undefined,
                      quantity: 1, // Initialiser la quantité à 1
                    };
                    
                    setSelectedServices([...selectedServices, newService]);
                  }

                  // Fermer le modal et réinitialiser
                  setShowServiceSelectionModal(false);
                  setEditingServiceIndex(null);
                  setModalSelectedMainCategoryId('');
                  setModalSelectedSubCategoryId('');
                  setModalSelectedServiceId('');
                  setModalSelectedSupportDetail('');
                  setFeedback(null);
                }}
                  >
                    {editingServiceIndex !== null ? 'Modifier' : 'Ajouter'}
                  </CRMSubmitButton>
                </div>
              </div>

              {/* Aperçu en temps réel à droite */}
              <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-900 p-6 border-l border-slate-200 dark:border-slate-700">
                <div className="sticky top-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-1">
                      Aperçu
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Résumé de la prestation</p>
                  </div>

                  {/* Informations principales dans une seule carte */}
                  {(modalSelectedMainCategoryId || modalSelectedServiceId) && (
                    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                      <div className="space-y-3">
                        {/* Catégorie principale */}
                        {modalSelectedMainCategoryId && (() => {
                          const mainCategory = categories.find((cat) => cat.id === modalSelectedMainCategoryId);
                          return (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Famille</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{mainCategory?.name || '—'}</p>
                            </div>
                          );
                        })()}

                        {/* Sous-catégorie */}
                        {modalSelectedSubCategoryId && (() => {
                          const subCategory = categories.find((cat) => cat.id === modalSelectedSubCategoryId);
                          return (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Sous-famille</p>
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{subCategory?.name || '—'}</p>
                            </div>
                          );
                        })()}

                        {/* Service */}
                        {modalSelectedServiceId && selectedService && (
                          <div className={clsx("pt-2", (modalSelectedMainCategoryId || modalSelectedSubCategoryId) && "border-t border-slate-100 dark:border-slate-700")}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Prestation</p>
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedService.name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prix de la prestation seule */}
                  {modalSelectedServiceId && selectedService && servicePrice > 0 && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Prestation</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600 dark:text-slate-400">Prix HT</span>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(servicePrice)}</span>
                        </div>
                        {serviceDuration > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 dark:text-slate-400">Durée</span>
                            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatDuration(serviceDuration)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prix de la sous-catégorie si présente */}
                  {modalSelectedSubCategoryId && (() => {
                    const subCategory = categories.find((cat) => cat.id === modalSelectedSubCategoryId);
                    if (!subCategory?.priceHT && !(subCategory as any)?.defaultDurationMin) return null;
                    
                    return (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">Sous-famille</p>
                        <div className="space-y-1.5">
                          {subCategory?.priceHT && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-600 dark:text-slate-400">Prix HT</span>
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(subCategory.priceHT)}</span>
                            </div>
                          )}
                          {(subCategory as any)?.defaultDurationMin && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-600 dark:text-slate-400">Durée</span>
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{(subCategory as any).defaultDurationMin} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Résumé total - Mise en avant */}
                  <div className="rounded-xl border-2 border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-800 p-5 shadow-md">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-3">Résumé</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-blue-700">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-300">Prix HT</span>
                        <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                          {formatCurrency(totalPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-300">Durée totale</span>
                        <span className="text-xl font-bold text-blue-700 dark:text-blue-300">
                          {formatDuration(totalDuration)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CRMModal>
        );
      })()}

      {/* Modale de transfert de devis */}
      <CRMModal isOpen={showTransferModal} onClose={closeTransferModal}>
        <div className="p-6">
          <CRMModalHeader
            title={`Transférer ${selectedRows.size} devis`}
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
                      Les {selectedRows.size} devis sélectionné(s) seront transférés vers cette entreprise.
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

      {/* Modale de création de contact pour le devis */}
      <CRMModal isOpen={showCreateContactModal} onClose={() => setShowCreateContactModal(false)}>
        <div className="p-6 bg-white dark:bg-slate-900">
          <CRMModalHeader
            title="Ajouter un contact à l'entreprise"
            description="Le contact sera enregistré dans la fiche client et pourra être utilisé pour ce devis"
            onClose={() => setShowCreateContactModal(false)}
          />
          <div className="space-y-4 mt-6">
            {(() => {
              const selectedClientId = creationDraft?.clientId;
              const client = selectedClientId ? clients.find((c) => c.id === selectedClientId) : null;
              
              if (!client || client.type !== 'company') {
                return (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Veuillez d'abord sélectionner un client professionnel.
                    </p>
                  </div>
                );
              }

              const handleSubmitNewContact = () => {
                if (!selectedClientId || !client) return;

                if (!newContactForm.firstName.trim() || !newContactForm.lastName.trim()) {
                  setFeedback('Veuillez renseigner au moins le prénom et le nom.');
                  return;
                }

                const newContact = addClientContact(selectedClientId, {
                  firstName: newContactForm.firstName.trim(),
                  lastName: newContactForm.lastName.trim(),
                  email: newContactForm.email.trim(),
                  mobile: newContactForm.mobile.trim(),
                  roles: newContactForm.roles,
                  isBillingDefault: newContactForm.isBillingDefault,
                });

                if (newContact) {
                  // Sélectionner automatiquement le nouveau contact
                  setSelectedContactId(newContact.id);
                  setShowCreateContactModal(false);
                  setNewContactForm({
                    firstName: '',
                    lastName: '',
                    email: '',
                    mobile: '',
                    roles: [],
                    isBillingDefault: false,
                  });
                  setFeedback('Contact ajouté avec succès et sélectionné pour ce devis.');
                } else {
                  setFeedback('Une erreur est survenue lors de la création du contact.');
                }
              };

              return (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <CRMFormLabel htmlFor="new-contact-first-name" required>
                        Prénom
                      </CRMFormLabel>
                      <CRMFormInput
                        id="new-contact-first-name"
                        type="text"
                        value={newContactForm.firstName}
                        onChange={(e) => setNewContactForm((prev) => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Jean"
                        required
                      />
                    </div>
                    <div>
                      <CRMFormLabel htmlFor="new-contact-last-name" required>
                        Nom
                      </CRMFormLabel>
                      <CRMFormInput
                        id="new-contact-last-name"
                        type="text"
                        value={newContactForm.lastName}
                        onChange={(e) => setNewContactForm((prev) => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Dupont"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <CRMFormLabel htmlFor="new-contact-email">
                        E-mail
                      </CRMFormLabel>
                      <CRMFormInput
                        id="new-contact-email"
                        type="email"
                        value={newContactForm.email}
                        onChange={(e) => setNewContactForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="jean.dupont@entreprise.fr"
                      />
                    </div>
                    <div>
                      <CRMFormLabel htmlFor="new-contact-mobile">
                        Téléphone
                      </CRMFormLabel>
                      <CRMFormInput
                        id="new-contact-mobile"
                        type="tel"
                        value={newContactForm.mobile}
                        onChange={(e) => setNewContactForm((prev) => ({ ...prev, mobile: e.target.value }))}
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                  </div>

                  <div>
                    <CRMFormLabel>Rôles dans l'entreprise (optionnel)</CRMFormLabel>
                    <div className="space-y-2 mt-2">
                      {(['achat', 'facturation', 'technique'] as ClientContactRole[]).map((role) => (
                        <label key={role} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newContactForm.roles.includes(role)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewContactForm((prev) => ({ ...prev, roles: [...prev.roles, role] }));
                              } else {
                                setNewContactForm((prev) => ({ ...prev, roles: prev.roles.filter((r) => r !== role) }));
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {role === 'achat' && 'Achat'}
                            {role === 'facturation' && 'Facturation'}
                            {role === 'technique' && 'Technique'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newContactForm.isBillingDefault}
                        onChange={(e) => setNewContactForm((prev) => ({ ...prev, isBillingDefault: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Contact facturation par défaut
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <CRMCancelButton onClick={() => setShowCreateContactModal(false)}>
                      Annuler
                    </CRMCancelButton>
                    <CRMSubmitButton
                      type="button"
                      onClick={handleSubmitNewContact}
                      disabled={!newContactForm.firstName.trim() || !newContactForm.lastName.trim()}
                    >
                      Ajouter
                    </CRMSubmitButton>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </CRMModal>
    </div>
  );
};

export default DevisPage;