import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  ChevronLeft,
  ChevronRight,
  Building2,
  UserPlus,
  Mail,
  Phone,
  Search,
  Info,
  Users,
  X,
} from 'lucide-react';
import { ClientLeadSearch } from '../../components/ClientLeadSearch';
import { useAppData, EngagementOptionOverride, SupportType } from '../../store/useAppData';
import type { Client, Company, Service, Lead } from '../../store/useAppData';
import { formatCurrency, formatDuration } from '../../lib/format';
import { useEntityMaps } from '../../hooks/useEntityMaps';
import { AppointmentService } from '../../api';
import { sanitizeVatRate, getNextQuoteNumber } from '../service/utils';
import { ensureClientFromLead } from '../../lib/clientUtils';
import { buildInitialDraft } from '../service/utils';
import '../mobile.css';
import '../../styles/apple-mobile.css';

const MobileCreateDevisPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    engagements,
    clients,
    services,
    companies,
    categories,
    leads,
    activeCompanyId,
    addEngagement,
    addClient,
    addClientContact,
    addLead,
    vatEnabled,
    vatRate,
    userProfile,
    projectMembers,
    authUsers,
  } = useAppData();

  const clientsById = useEntityMaps(clients);
  const servicesById = useEntityMaps(services);
  const companiesById = useEntityMaps(companies);

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
  const [createQuoteError, setCreateQuoteError] = useState<string | null>(null);
  // États pour l'étape 2 : sélection de prestations
  const [step2SelectedCategory, setStep2SelectedCategory] = useState<string>('');
  const [step2SelectedSubCategoryId, setStep2SelectedSubCategoryId] = useState<string>('');
  const [step2SelectedServiceId, setStep2SelectedServiceId] = useState<string>('');
  const [step2SelectedOptionIds, setStep2SelectedOptionIds] = useState<string[]>([]);
  const [step2SupportDetail, setStep2SupportDetail] = useState<string>('');
  const step2DataLoadedRef = useRef(false);

  // Initialiser le draft au montage
  useEffect(() => {
    const currentState = useAppData.getState();
    const currentServices = currentState.services || services;
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
    
    // Charger les services et catégories si nécessaire
    const loadData = async () => {
      if (currentServices.length === 0) {
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
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      throw error;
    }
  }, [clients, addClient, addClientContact]);

  const handleClientOrLeadSelect = useCallback((result: { id: string; type: 'client' | 'lead'; data: Client | Lead }) => {
    try {
      if (result.type === 'lead') {
        const lead = result.data as Lead;
        const client = ensureClientFromLeadWrapper(lead);
        setSelectedClientOrLeadType('lead');
        setSelectedLeadId(lead.id);
        setCreationDraft((draft) => {
          if (!draft) return null;
          return { ...draft, clientId: client.id };
        });
      } else {
        const client = result.data as Client;
        setSelectedClientOrLeadType('client');
        setSelectedLeadId(null);
        setCreationDraft((draft) => {
          if (!draft) return null;
          return { ...draft, clientId: client.id };
        });
      }
      setCreateQuoteError(null);
    } catch (error) {
      console.error('[MobileCreateDevisPage] Erreur lors de la sélection du client/prospect:', error);
      setCreateQuoteError(`Erreur lors de la sélection: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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

    if (selectedServices.some(s => s.serviceId === step2SelectedServiceId)) {
      setCreateQuoteError('Cette prestation est déjà dans la liste.');
      return;
    }

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
  React.useEffect(() => {
    if (currentStep === 2 && !step2DataLoadedRef.current) {
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
    
    if (currentStep !== 2) {
      step2DataLoadedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, activeCompanyId]);

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

      const vatEnabledForQuote = company.vatEnabled ?? vatEnabled;
      
      const hasPlanning = creationDraft.scheduledAt && creationDraft.scheduledAt.trim() !== '';
      const planningUser = hasPlanning && creationDraft.planningUser && creationDraft.planningUser.trim() 
        ? creationDraft.planningUser 
        : null;
      const startTime = hasPlanning && creationDraft.startTime && creationDraft.startTime.trim() 
        ? creationDraft.startTime 
        : null;

      const scheduledAtValue = hasPlanning && creationDraft.scheduledAt && creationDraft.scheduledAt.trim() !== ''
        ? creationDraft.scheduledAt
        : new Date().toISOString();

      const contactIds = client.contacts?.find(c => c.active && c.isBillingDefault) 
        ? [client.contacts.find(c => c.active && c.isBillingDefault)!.id]
        : [];

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

      try {
        await AppointmentService.create(newEngagement);
      } catch (error) {
        console.error('Erreur lors de la synchronisation avec le backend:', error);
      }

      navigate('/mobile/devis', { replace: true });
    } catch (error: any) {
      setCreateQuoteError(error?.message || 'Erreur lors de la création du devis.');
    }
  };

  const step2SelectedService = services.find((s) => s.id === step2SelectedServiceId);

  if (!creationDraft) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Chargement...</div>
      </div>
    );
  }

  return (
    <>
      {/* Élément invisible pour la détection par la navbar */}
      <div data-mobile-modal="true" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
        <button
          type="button"
          data-modal-action="cancel"
          onClick={currentStep > 1 ? previousStep : () => navigate('/mobile/devis')}
        >
          {currentStep > 1 ? 'Précédent' : 'Annuler'}
        </button>
        <button
          type="button"
          data-modal-action="submit"
          onClick={currentStep < 3 ? nextStep : handleCreateQuote}
        >
          {currentStep < 3 ? 'Suivant' : 'Créer'}
        </button>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '100%',
        padding: 'var(--space-md)',
        background: 'var(--bg)',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}>
        {createQuoteError && (
          <div style={{
            padding: 'var(--space-sm) var(--space-md)',
            marginBottom: 'var(--space-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 'var(--radius-md)',
            color: '#dc2626',
            fontSize: '12px',
          }}>
            {createQuoteError}
          </div>
        )}

        {/* Indicateur d'étapes */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xl)', position: 'relative', padding: '0 var(--space-xs)' }}>
          {[1, 2, 3].map((step) => (
            <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: currentStep >= step ? 'var(--accent)' : 'var(--bg-secondary)',
                color: currentStep >= step ? 'white' : 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
                zIndex: 2,
              }}>
                {currentStep > step ? '✓' : step}
              </div>
              <div style={{
                fontSize: '9px',
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
                  top: '14px',
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
          {currentStep === 1 && (
            <>
              {/* Client / Prospect */}
              <div>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '4px', 
                  fontSize: '9px', 
                  fontWeight: '600', 
                  color: 'var(--muted)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px' 
                }}>
                  <Search size={10} />
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

              {/* Entreprise */}
              <div>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '4px', 
                  fontSize: '9px', 
                  fontWeight: '600', 
                  color: 'var(--muted)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px' 
                }}>
                  <Building2 size={10} />
                  Entreprise *
                </label>
                <select
                  value={creationDraft.companyId || ''}
                  onChange={(e) => setCreationDraft((draft) => draft ? ({ ...draft, companyId: e.target.value }) : null)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
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

              {/* Collaborateurs */}
              <div>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '4px', 
                  fontSize: '9px', 
                  fontWeight: '600', 
                  color: 'var(--muted)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px' 
                }}>
                  <Users size={10} />
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
                        border: '1px solid var(--border)',
                        background: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--muted)',
                        fontSize: '12px',
                      }}>
                        <Info size={12} />
                        <span>Sélectionnez d'abord une entreprise</span>
                      </div>
                    );
                  }
                  
                  if (teamMembers.length === 0) {
                    return (
                      <div style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--muted)',
                        fontSize: '12px',
                      }}>
                        <Users size={12} />
                        <span>Aucun membre d'équipe</span>
                      </div>
                    );
                  }
                  
                  return (
                    <div style={{
                      maxHeight: '100px',
                      overflowY: 'auto',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
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
                                padding: '4px 6px',
                                borderRadius: 'var(--radius-sm)',
                                background: isSelected ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
                                border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
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
                              <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text)' }}>
                                {member.firstName} {member.lastName}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Nom du devis */}
              <div>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '4px', 
                  fontSize: '9px', 
                  fontWeight: '600', 
                  color: 'var(--muted)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px' 
                }}>
                  <FileText size={10} />
                  Nom du devis
                </label>
                <input
                  type="text"
                  value={creationDraft?.quoteName || ''}
                  onChange={(e) => setCreationDraft((draft) => draft ? ({ ...draft, quoteName: e.target.value }) : null)}
                  placeholder="Ex: Nettoyage bureau..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
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
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    padding: '8px',
                    marginTop: '4px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {actualType === 'lead' ? (
                          <UserPlus size={10} style={{ color: '#9333ea' }} />
                        ) : (
                          <Users size={10} style={{ color: '#2563eb' }} />
                        )}
                        <h3 style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {actualType === 'lead' ? 'Prospect' : 'Client'}
                        </h3>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '8px',
                          fontWeight: '600',
                          background: (client.status === 'Actif' || client.status === 'Prospect') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                          color: (client.status === 'Actif' || client.status === 'Prospect') ? '#10b981' : '#f97316',
                        }}>
                          {client.status === 'Prospect' ? 'Actif' : client.status}
                        </span>
                        <span style={{ fontSize: '8px', color: 'var(--muted)' }}>
                          {client.type === 'company' ? 'Pro' : 'Part'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: 'var(--text)' }}>
                        {client.name || client.companyName || '—'}
                      </p>

                      {(primaryContact || client.email || client.phone) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {primaryContact && (
                            <p style={{ margin: 0, fontSize: '10px', fontWeight: '600', color: 'var(--text)' }}>
                              {primaryContact.firstName} {primaryContact.lastName}
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {(primaryContact?.email || client.email) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Mail size={9} style={{ color: 'var(--muted)' }} />
                                <span style={{ fontSize: '9px', color: 'var(--muted)' }}>
                                  {primaryContact?.email || client.email}
                                </span>
                              </div>
                            )}
                            {(primaryContact?.mobile || client.phone) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Phone size={9} style={{ color: 'var(--muted)' }} />
                                <span style={{ fontSize: '9px', color: 'var(--muted)' }}>
                                  {primaryContact?.mobile || client.phone}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
                        <div>
                          <span style={{ fontSize: '8px', color: 'var(--muted)' }}>Devis: </span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text)' }}>
                            {clientQuotes.length}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '8px', color: 'var(--muted)' }}>Services: </span>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text)' }}>
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
          {currentStep === 2 && (
            <>
              {/* Liste des prestations sélectionnées */}
              {selectedServices.length > 0 && (
                <div>
                  <label style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '4px', 
                    fontSize: '9px', 
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
                      
                      const mainCategory = serviceItem.mainCategoryId
                        ? categories.find((cat) => cat.id === serviceItem.mainCategoryId)
                        : null;
                      const subCategory = serviceItem.subCategoryId
                        ? categories.find((cat) => cat.id === serviceItem.subCategoryId)
                        : null;
                      
                      let servicePrice = 0;
                      let serviceDuration = 0;
                      
                      if (service) {
                        if ((service as any).base_price !== undefined && (service as any).base_price !== null) {
                          servicePrice = (service as any).base_price;
                        } else if (service.options && Array.isArray(service.options) && serviceItem.optionIds.length > 0) {
                          servicePrice = service.options
                            .filter(opt => serviceItem.optionIds.includes(opt.id))
                            .reduce((sum, opt) => {
                              const override = serviceItem.optionOverrides[opt.id];
                              const price = override?.unitPriceHT ?? opt.unitPriceHT;
                              const qty = override?.quantity ?? 1;
                              return sum + (price * qty);
                            }, 0);
                        }
                        
                        if ((service as any).base_duration !== undefined && (service as any).base_duration !== null) {
                          serviceDuration = (service as any).base_duration;
                        } else if (service.options && Array.isArray(service.options) && serviceItem.optionIds.length > 0) {
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
                      
                      const subCategoryPrice = subCategory?.priceHT || 0;
                      const subCategoryDuration = (subCategory as any)?.defaultDurationMin || 0;
                      
                      const serviceQuantity = serviceItem.quantity ?? 1;
                      const totalPrice = (servicePrice + subCategoryPrice) * serviceQuantity;
                      const totalDuration = (serviceDuration + subCategoryDuration) * serviceQuantity;
                      
                      return (
                        <div
                          key={index}
                          style={{
                            padding: '10px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '3px' }}>
                                {service?.name || 'Service inconnu'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveServiceFromStep2(index)}
                              style={{
                                padding: '4px 8px',
                                background: 'transparent',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600',
                                flexShrink: 0,
                                minWidth: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              ×
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                            {mainCategory && (
                              <div style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                background: 'rgba(37, 99, 235, 0.1)',
                                border: '1px solid rgba(37, 99, 235, 0.2)',
                                fontSize: '10px',
                                fontWeight: '600',
                                color: '#2563eb',
                              }}>
                                {mainCategory.name}
                              </div>
                            )}
                            {subCategory && (
                              <div style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                background: 'rgba(147, 51, 234, 0.1)',
                                border: '1px solid rgba(147, 51, 234, 0.2)',
                                fontSize: '10px',
                                fontWeight: '600',
                                color: '#9333ea',
                              }}>
                                {subCategory.name}
                              </div>
                            )}
                          </div>

                          {serviceItem.supportDetail && (
                            <div style={{
                              padding: '6px',
                              background: 'white',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                            }}>
                              <div style={{ fontSize: '9px', fontWeight: '600', color: '#64748b', marginBottom: '3px', textTransform: 'uppercase' }}>
                                Support
                              </div>
                              <div style={{ fontSize: '12px', color: '#0f172a' }}>
                                {serviceItem.supportDetail}
                              </div>
                            </div>
                          )}

                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px',
                            background: 'white',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                          }}>
                            <div>
                              <div style={{ fontSize: '9px', fontWeight: '600', color: '#64748b', marginBottom: '2px', textTransform: 'uppercase' }}>
                                Prix
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                                {formatCurrency(totalPrice)}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '9px', fontWeight: '600', color: '#64748b', marginBottom: '2px', textTransform: 'uppercase' }}>
                                Durée
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
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
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    setStep2SelectedSubCategoryId('');
                    setStep2SelectedServiceId('');
                    setStep2SelectedOptionIds([]);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
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

              {/* Sous-catégorie */}
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
                        marginBottom: '4px', 
                        fontSize: '9px', 
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
                          setStep2SelectedServiceId('');
                          setStep2SelectedOptionIds([]);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
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
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Sélectionner une prestation</option>
                  {services && Array.isArray(services) && categories && Array.isArray(categories) && services.length > 0 ? (
                    (() => {
                      if (!step2SelectedCategory) {
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
                      
                      const getServiceMainCategory = (service: typeof services[0]): typeof categories[0] | null => {
                        if (!service.category) return null;
                        const serviceCategoryLower = service.category.toLowerCase().trim();
                        const directMatch = categories.find(
                          (cat) => !cat.parentId && cat.name.toLowerCase().trim() === serviceCategoryLower
                        );
                        if (directMatch) return directMatch;
                        const subCategoryMatch = categories.find(
                          (cat) => cat.parentId && cat.name.toLowerCase().trim() === serviceCategoryLower
                        );
                        if (subCategoryMatch && subCategoryMatch.parentId) {
                          const mainCategory = categories.find((cat) => cat.id === subCategoryMatch.parentId);
                          return mainCategory || null;
                        }
                        return null;
                      };
                      
                      const filteredServices = services.filter((s) => {
                        if (!s.active) return false;
                        const serviceMainCategory = getServiceMainCategory(s);
                        if (!serviceMainCategory) return false;
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
                    marginBottom: '4px', 
                    fontSize: '9px', 
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
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
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
                    padding: '8px 12px',
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
                  <Plus size={14} />
                  Ajouter cette prestation
                </button>
              )}
            </>
          )}

          {/* Étape 3 : Planification */}
          {currentStep === 3 && (
            <>
              <div>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '4px', 
                  fontSize: '9px', 
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
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '13px',
                  }}
                />
              </div>

              {(creationDraft?.assignedUserIds || []).length > 0 && (
                <div>
                  <label style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '4px', 
                    fontSize: '9px', 
                    fontWeight: '600', 
                    color: 'var(--muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px' 
                  }}>
                    <Users size={10} />
                    Intervenants assignés
                  </label>
                  <div style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                  }}>
                    {(creationDraft?.assignedUserIds || []).map((userId) => {
                      const user = authUsers.find(u => u.id === userId);
                      if (!user) return null;
                      return (
                        <span
                          key={userId}
                          style={{
                            padding: '3px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
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
    </>
  );
};

export default MobileCreateDevisPage;
