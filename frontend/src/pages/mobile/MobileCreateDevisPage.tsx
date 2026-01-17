import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowBack } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAppData } from '../../store/useAppData';
import { ClientService, ServiceService, CategoryService } from '../../api';
import { buildInitialDraft, buildPreviewEngagement, computeEngagementTotals, formatCurrency, formatDuration } from '../service/utils';
import type { EngagementDraft } from '../service/types';
import { ClientLeadSearch } from '../../components/ClientLeadSearch';
import type { SupportType, EngagementStatus, ServiceCategory } from '../../store/useAppData';
import '../mobile.css';
import '../../styles/apple-mobile.css';

const MobileCreateDevisPage: React.FC = () => {
  const navigate = useNavigate();
  const clients = useAppData((state) => state.clients) || [];
  const leads = useAppData((state) => state.leads) || [];
  const services = useAppData((state) => state.services) || [];
  const companies = useAppData((state) => state.companies) || [];
  const categories = useAppData((state) => state.categories) || [];
  const authUsers = useAppData((state) => state.authUsers) || [];
  const activeCompanyId = useAppData((state) => state.activeCompanyId);
  const vatEnabled = useAppData((state) => state.vatEnabled);
  const vatRate = useAppData((state) => state.vatRate);
  const addEngagement = useAppData((state) => state.addEngagement);
  const currentUserId = useAppData((state) => state.currentUserId);
  
  // États du formulaire
  const [draft, setDraft] = useState<EngagementDraft>(() => {
    const initialDraft = buildInitialDraft(clients, services, companies, activeCompanyId);
    return {
      ...initialDraft,
      kind: 'devis',
      status: 'brouillon' as EngagementStatus,
      assignedUserId: currentUserId || '',
    };
  });
  const [internalNotes, setInternalNotes] = useState('');
  const [contextType, setContextType] = useState<'client' | 'prospect' | null>(null);
  const [clientId, setClientId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  const hasLoadedRef = useRef(false);

  // Charger les données nécessaires
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadData = async () => {
      if (clients.length === 0) {
        setLoadingClients(true);
        try {
          await ClientService.getClients();
        } catch (err) {
          console.error('Erreur chargement clients:', err);
        } finally {
          setLoadingClients(false);
        }
      }

      if (services.length === 0) {
        setLoadingServices(true);
        try {
          await ServiceService.getAll();
        } catch (err) {
          console.error('Erreur chargement services:', err);
        } finally {
          setLoadingServices(false);
        }
      }

      if (categories.length === 0) {
        setLoadingCategories(true);
        try {
          await CategoryService.getCategories();
        } catch (err) {
          console.error('Erreur chargement catégories:', err);
        } finally {
          setLoadingCategories(false);
        }
      }
    };

    loadData();
  }, []);

  // Mettre à jour draft.clientId quand clientId change
  useEffect(() => {
    if (clientId) {
      setDraft(prev => {
        const updated = { ...prev, clientId };
        // Définir l'entreprise par défaut si nécessaire
        if (!updated.companyId && activeCompanyId) {
          updated.companyId = activeCompanyId;
        }
        return updated;
      });
    }
  }, [clientId, activeCompanyId]);

  // Calculs dérivés
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === draft.clientId) ?? null,
    [clients, draft.clientId]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === draft.serviceId) ?? null,
    [services, draft.serviceId]
  );

  const selectedCompany = useMemo(() => {
    if (draft.companyId) {
      return companies.find((c) => c.id === draft.companyId) ?? null;
    }
    if (activeCompanyId) {
      return companies.find((c) => c.id === activeCompanyId) ?? null;
    }
    return null;
  }, [companies, draft.companyId, activeCompanyId]);

  // Calcul du preview engagement
  const previewEngagement = useMemo(() => {
    if (!draft.serviceId || !draft.clientId) return null;
    return buildPreviewEngagement(draft, 'devis');
  }, [draft]);

  // Calcul des totaux
  const totals = useMemo(() => {
    if (!previewEngagement) return { price: 0, duration: 0, surcharge: draft.additionalCharge || 0 };
    return computeEngagementTotals(previewEngagement);
  }, [previewEngagement, draft.additionalCharge]);

  // Calcul du prix de base
  const basePrice = useMemo(() => {
    if (!selectedService) return 0;
    return totals.price;
  }, [selectedService, totals.price]);

  // Calcul du prix final
  const finalPrice = useMemo(() => {
    return basePrice + (draft.additionalCharge || 0);
  }, [basePrice, draft.additionalCharge]);

  // TVA
  const vatEnabledForQuote = selectedCompany?.vatEnabled ?? vatEnabled;
  const vatAmount = vatEnabledForQuote ? finalPrice * (vatRate / 100) : 0;
  const finalPriceWithVat = finalPrice + vatAmount;

  // Durée estimée
  const estimatedDuration = totals.duration;

  // Calcul de l'heure de fin
  const endTime = useMemo(() => {
    if (!draft.startTime || !estimatedDuration) return '';
    const [hours, minutes] = draft.startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + estimatedDuration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  }, [draft.startTime, estimatedDuration]);

  // Adresse d'intervention
  const interventionAddress = useMemo(() => {
    if (selectedClient?.address) {
      return `${selectedClient.address}${selectedClient.city ? `, ${selectedClient.city}` : ''}`;
    }
    return '';
  }, [selectedClient]);

  // Services filtrés par catégorie
  const filteredServices = useMemo(() => {
    if (selectedCategory) {
      return services.filter((s) => s.category === selectedCategory && s.active);
    }
    if (selectedService?.category) {
      return services.filter((s) => s.category === selectedService.category && s.active);
    }
    return services.filter((s) => s.active);
  }, [services, selectedCategory, selectedService]);

  // Gestion du changement de catégorie
  const handleCategoryChange = (categoryName: string) => {
    setSelectedCategory(categoryName);
    if (!categoryName) {
      setDraft(prev => ({
        ...prev,
        serviceId: '',
        optionIds: [],
        optionOverrides: {},
      }));
      return;
    }

    const firstServiceInCategory = services.find(
      (s) => s.category === categoryName && s.active
    );
    if (firstServiceInCategory) {
      const supportType = (categoryName === 'Autre' ? 'Textile' : categoryName) as SupportType;
      setDraft(prev => ({
        ...prev,
        serviceId: firstServiceInCategory.id,
        optionIds: [],
        optionOverrides: {},
        supportType,
      }));
    }
  };

  // Gestion du changement de service
  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      const supportType = (service.category === 'Autre' ? 'Textile' : service.category) as SupportType;
      setDraft(prev => ({
        ...prev,
        serviceId,
        optionIds: [],
        optionOverrides: {},
        supportType,
      }));
    } else {
      setDraft(prev => ({
        ...prev,
        serviceId,
        optionIds: [],
        optionOverrides: {},
      }));
    }
  };

  // Validation
  const validate = useCallback((): string | null => {
    if (!draft.clientId) {
      return 'Le client est obligatoire.';
    }
    if (!draft.serviceId) {
      return 'Le produit/prestation est obligatoire.';
    }
    if (!draft.companyId) {
      return "L'entreprise rattachée est obligatoire.";
    }
    if (selectedService?.options.some((opt) => opt.id && draft.optionIds.includes(opt.id)) && !draft.supportType) {
      return 'Le type de support est obligatoire pour ce produit.';
    }
    if (!draft.scheduledAt) {
      return 'La date d\'intervention est obligatoire.';
    }
    if (!draft.assignedUserId) {
      return 'L\'intervenant assigné est obligatoire.';
    }
    if (!draft.status) {
      return 'Le statut du service est obligatoire.';
    }
    return null;
  }, [draft, selectedService]);

  // Création du devis
  const handleCreate = useCallback(async () => {
    const error = validate();
    if (error) {
      setValidationError(error);
      return;
    }

    setIsCreating(true);
    setValidationError(null);

    try {
      const finalDraft: EngagementDraft = {
        ...draft,
        kind: 'devis',
        status: 'brouillon' as EngagementStatus,
        assignedUserId: draft.assignedUserId || currentUserId || '',
      };

      // Convertir le draft en Engagement pour addEngagement
      const previewEngagement = buildPreviewEngagement(finalDraft, 'devis');
      
      // Créer l'objet pour addEngagement (sans id, avec assignedUserIds)
      const { id, ...engagementData } = previewEngagement;
      const engagementForAdd = {
        ...engagementData,
        assignedUserIds: previewEngagement.assignedUserIds || (finalDraft.assignedUserId ? [finalDraft.assignedUserId] : []),
      };
      
      addEngagement(engagementForAdd);
      navigate('/mobile/devis', { replace: true });
    } catch (err: any) {
      setValidationError(err.message || 'Erreur lors de la création du devis');
      setIsCreating(false);
    }
  }, [draft, validate, addEngagement, navigate, currentUserId]);

  return (
    <div className="modern-text" style={{
      padding: '0 var(--space-xl)',
      width: '100%',
      background: 'var(--bg)',
      minHeight: '100vh',
      paddingBottom: '120px',
    }}>
      {/* Header */}
      <div style={{
        paddingTop: 'var(--space-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-lg)',
      }}>
        <button
          onClick={() => navigate('/mobile/devis')}
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text)',
          }}
        >
          <ArrowBack style={{ fontSize: '20px' }} />
        </button>
        <h1 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: '700',
          color: 'var(--text)',
          flex: 1,
        }}>
          Nouveau devis
        </h1>
      </div>

      {/* Message d'erreur */}
      {validationError && (
        <div style={{
          padding: 'var(--space-md)',
          marginBottom: 'var(--space-md)',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 'var(--radius-md)',
          color: '#dc2626',
          fontSize: '13px',
        }}>
          {validationError}
        </div>
      )}

      {/* Formulaire */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        
        {/* SECTION 1: QUI - Client & Entreprise */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: 'var(--space-xs)' }}>
            Client & Entreprise
          </h2>

          {/* Client ou Prospect */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Client ou Prospect <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                onClick={() => {
                  setContextType('client');
                  setClientId('');
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: contextType === 'client' ? '#9333ea' : 'transparent',
                  color: contextType === 'client' ? 'white' : 'var(--text)',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Client
              </button>
              <button
                type="button"
                onClick={() => {
                  setContextType('prospect');
                  setClientId('');
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: contextType === 'prospect' ? '#3b82f6' : 'transparent',
                  color: contextType === 'prospect' ? 'white' : 'var(--text)',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Prospect
              </button>
            </div>
          </div>

          {contextType && (
            <div>
              <ClientLeadSearch
                clients={contextType === 'client' ? clients : []}
                leads={contextType === 'prospect' ? leads : []}
                value={clientId}
                onChange={(id) => setClientId(id)}
                required
                searchMode={contextType === 'client' ? 'client' : 'lead'}
                loadingClients={loadingClients}
                loadingLeads={false}
              />
            </div>
          )}

          {/* Entreprise */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Entreprise <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={draft.companyId}
              onChange={(e) => setDraft(prev => ({ ...prev, companyId: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '15px',
              }}
            >
              <option value="">Sélectionner…</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION 2: QUOI - Produit & Support */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: 'var(--space-xs)' }}>
            Prestation
          </h2>

          {/* Catégorie */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Catégorie
            </label>
            <select
              value={selectedCategory || selectedService?.category || ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '15px',
              }}
            >
              <option value="">Toutes</option>
              {categories
                .filter((cat) => cat.active)
                .map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Produit / Prestation */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Produit / Prestation <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={draft.serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '15px',
              }}
            >
              <option value="">Sélectionner…</option>
              {filteredServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            {selectedService && (
              <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                Prix, durée et support déterminés automatiquement
              </p>
            )}
          </div>

          {/* Support (affiché uniquement si le produit le nécessite) */}
          {selectedService && (
            <>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Support <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={draft.supportType}
                  onChange={(e) => setDraft(prev => ({ ...prev, supportType: e.target.value as SupportType }))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '15px',
                  }}
                >
                  {categories
                    .filter((cat) => cat.active)
                    .map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                </select>
                <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                  Déterminé automatiquement
                </p>
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Détail support
                </label>
                <input
                  type="text"
                  value={draft.supportDetail}
                  onChange={(e) => setDraft(prev => ({ ...prev, supportDetail: e.target.value }))}
                  placeholder="Modèle, dimensions, couleur..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '15px',
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* SECTION 3: PRIX */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: 'var(--space-xs)' }}>
            Tarification
          </h2>

          {/* Prix de base */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Prix de base
            </label>
            <input
              type="text"
              value={formatCurrency(basePrice)}
              readOnly
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: '15px',
                fontWeight: '500',
                cursor: 'not-allowed',
              }}
            />
            <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
              Grille standard (non modifiable)
            </p>
          </div>

          {/* Ajustement */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Ajustement (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={draft.additionalCharge || 0}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setDraft(prev => ({ ...prev, additionalCharge: value }));
              }}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '15px',
              }}
            />
            <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
              + majoration / - remise
            </p>
          </div>

          {/* Prix final */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Prix final
            </label>
            <input
              type="text"
              value={formatCurrency(finalPrice)}
              readOnly
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'not-allowed',
              }}
            />
            {vatEnabledForQuote && (
              <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                TTC : {formatCurrency(finalPriceWithVat)}
              </p>
            )}
            <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
              Montant facturé au client
            </p>
          </div>
        </div>

        {/* SECTION 4: QUAND - Planification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: 'var(--space-xs)' }}>
            Planification
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            {/* Date */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Date <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="date"
                value={draft.scheduledAt}
                onChange={(e) => setDraft(prev => ({ ...prev, scheduledAt: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '15px',
                }}
              />
            </div>

            {/* Heure début */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Heure début <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="time"
                value={draft.startTime || ''}
                onChange={(e) => setDraft(prev => ({ ...prev, startTime: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: '15px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            {/* Heure fin */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Heure fin
              </label>
              <input
                type="time"
                value={endTime}
                readOnly
                placeholder={estimatedDuration ? 'Calculée' : '—'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text)',
                  fontSize: '15px',
                  cursor: 'not-allowed',
                }}
              />
              {estimatedDuration && (
                <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
                  Durée : {formatDuration(estimatedDuration)}
                </p>
              )}
            </div>

            {/* Adresse */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Adresse
              </label>
              <input
                type="text"
                value={interventionAddress}
                readOnly
                placeholder={selectedClient ? 'Adresse client' : '—'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text)',
                  fontSize: '15px',
                  cursor: 'not-allowed',
                }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: QUI FAIT & STATUT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: 'var(--space-xs)' }}>
            Attribution & Statut
          </h2>

          {/* Intervenant */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Intervenant <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={draft.assignedUserId}
              onChange={(e) => setDraft(prev => ({ ...prev, assignedUserId: e.target.value }))}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '15px',
              }}
            >
              <option value="">Sélectionner…</option>
              {authUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.profile.firstName} {user.profile.lastName}
                </option>
              ))}
            </select>
            <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
              Responsable opérationnel
            </p>
          </div>

          {/* Statut */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '11px',
              fontWeight: '600',
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Statut <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={draft.status}
              onChange={(e) => setDraft(prev => ({ ...prev, status: e.target.value as EngagementStatus }))}
              disabled
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                fontSize: '15px',
                cursor: 'not-allowed',
              }}
            >
              <option value="brouillon">Brouillon</option>
            </select>
            <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
              Devis en brouillon
            </p>
          </div>
        </div>

        {/* SECTION 6: Notes internes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: 'var(--space-xs)' }}>
            Notes internes
          </h2>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Notes internes concernant ce service..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '15px',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
          <p style={{ fontSize: '10px', color: 'var(--muted)' }}>
            Visibles uniquement en interne
          </p>
        </div>
      </div>

      {/* Boutons de navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 'var(--space-md)',
        paddingBottom: 'calc(var(--space-md) + env(safe-area-inset-bottom, 0px))',
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: 'var(--space-sm)',
      }}>
        <button
          type="button"
          onClick={() => navigate('/mobile/devis')}
          disabled={isCreating}
          style={{
            flex: 1,
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            color: 'var(--text)',
            fontWeight: '600',
            fontSize: '14px',
            borderRadius: 'var(--radius-md)',
            cursor: isCreating ? 'not-allowed' : 'pointer',
          }}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating}
          style={{
            flex: 1,
            padding: 'var(--space-sm) var(--space-md)',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            fontWeight: '600',
            fontSize: '14px',
            borderRadius: 'var(--radius-md)',
            cursor: isCreating ? 'not-allowed' : 'pointer',
            opacity: isCreating ? 0.5 : 1,
          }}
        >
          {isCreating ? 'Création...' : 'Créer le devis'}
        </button>
      </div>
    </div>
  );
};

export default MobileCreateDevisPage;
