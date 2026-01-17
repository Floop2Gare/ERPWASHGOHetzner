import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Receipt, CheckCircle, Description } from '@mui/icons-material';
import { useAppData } from '../../store/useAppData';
import type { Engagement, Client, Service } from '../../store/useAppData';
import { generateInvoicePdf } from '../../lib/invoice';
import { formatCurrency, formatDate } from '../../lib/format';
import { ServiceService, CategoryService } from '../../api';
import '../mobile.css';
import '../../styles/apple-mobile.css';

const MobileFacturationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const engagements = useAppData((state) => state.engagements) || [];
  const clients = useAppData((state) => state.clients) || [];
  const services = useAppData((state) => state.services) || [];
  const companies = useAppData((state) => state.companies) || [];
  const updateEngagement = useAppData((state) => state.updateEngagement);
  const computeEngagementTotals = useAppData((state) => state.computeEngagementTotals);
  const activeCompanyId = useAppData((state) => state.activeCompanyId);

  const [filter, setFilter] = useState<'all' | 'with-invoice' | 'without-invoice'>('all');
  
  // États pour le chargement des données
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const servicesLoadedRef = useRef(false);
  const categoriesLoadedRef = useRef(false);

  // Fonction pour charger les services
  const loadServices = useCallback(async () => {
    if (loadingServices || servicesLoadedRef.current) {
      return;
    }
    
    const currentServices = useAppData.getState().services || [];
    if (currentServices.length > 0) {
      servicesLoadedRef.current = true;
      return;
    }

    servicesLoadedRef.current = true;
    setLoadingServices(true);

    try {
      console.log('[MobileFacturation] Chargement des services depuis le backend...');
      const result = await ServiceService.getServices();
      
      if (result.success && Array.isArray(result.data)) {
        (useAppData as any).setState({ services: result.data });
        console.log('[MobileFacturation] ✅ Services chargés:', result.data.length);
      } else if (!result.success) {
        console.error('[MobileFacturation] ❌ Erreur lors du chargement des services:', result.error);
        servicesLoadedRef.current = false;
      }
    } catch (error: any) {
      console.error('[MobileFacturation] ❌ Erreur lors du chargement des services:', error);
      servicesLoadedRef.current = false;
    } finally {
      setLoadingServices(false);
    }
  }, [loadingServices]);

  // Fonction pour charger les catégories
  const loadCategories = useCallback(async () => {
    if (!activeCompanyId || loadingCategories || categoriesLoadedRef.current) {
      return;
    }
    
    const currentCategories = useAppData.getState().categories || [];
    if (currentCategories.length > 0) {
      categoriesLoadedRef.current = true;
      return;
    }

    categoriesLoadedRef.current = true;
    setLoadingCategories(true);

    try {
      console.log('[MobileFacturation] Chargement des catégories depuis le backend...');
      const result = await CategoryService.getCategories();
      
      if (result.success && Array.isArray(result.data)) {
        (useAppData as any).setState({ categories: result.data });
        console.log('[MobileFacturation] ✅ Catégories chargées:', result.data.length);
      } else if (!result.success) {
        console.error('[MobileFacturation] ❌ Erreur lors du chargement des catégories:', result.error);
        categoriesLoadedRef.current = false;
      }
    } catch (error: any) {
      console.error('[MobileFacturation] ❌ Erreur lors du chargement des catégories:', error);
      categoriesLoadedRef.current = false;
    } finally {
      setLoadingCategories(false);
    }
  }, [activeCompanyId, loadingCategories]);

  // Charger les services et catégories au montage (nécessaires pour calculer les prix)
  useEffect(() => {
    const currentServices = useAppData.getState().services || [];
    const currentCategories = useAppData.getState().categories || [];
    
    // Charger les services en PRIORITÉ car nécessaires pour calculer les totaux
    if (currentServices.length === 0 && !servicesLoadedRef.current) {
      servicesLoadedRef.current = true;
      loadServices();
    }
    
    // Charger les catégories aussi car utilisées dans le calcul des totaux (sous-catégories avec prix)
    if (activeCompanyId && currentCategories.length === 0 && !categoriesLoadedRef.current) {
      categoriesLoadedRef.current = true;
      loadCategories();
    }
  }, [activeCompanyId, loadServices, loadCategories]);
  
  // Vérifier si on doit créer une facture depuis une prestation
  const createFromId = searchParams.get('create');

  // Créer des maps pour accès rapide O(1) au lieu de O(n)
  const clientsById = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach((client) => map.set(client.id, client));
    return map;
  }, [clients]);

  const servicesById = useMemo(() => {
    const map = new Map<string, Service>();
    services.forEach((service) => map.set(service.id, service));
    return map;
  }, [services]);

  const getClientName = useCallback((clientId: string): string => {
    const client = clientsById.get(clientId);
    return client?.name || 'Client inconnu';
  }, [clientsById]);

  const getServiceName = useCallback((serviceId: string): string => {
    const service = servicesById.get(serviceId);
    return service?.name || 'Service inconnu';
  }, [servicesById]);

  const handleCreateInvoice = useCallback(async (engagement: Engagement) => {
    const client = clientsById.get(engagement.clientId);
    const service = servicesById.get(engagement.serviceId);
    const company = companies.find((c) => c.isDefault) || companies[0];

    if (!client || !service || !company) {
      alert('Impossible de créer la facture : données manquantes.');
      return;
    }

    // Générer le numéro de facture si nécessaire
    let invoiceNumber = engagement.invoiceNumber;
    if (!invoiceNumber) {
      const now = new Date();
      const year = format(now, 'yyyy');
      const month = format(now, 'MM');
      const day = format(now, 'dd');
      const random = Math.floor(Math.random() * 1000).toString().padStart(4, '0');
      invoiceNumber = `FAC-${year}${month}${day}-${random}`;
    }

    // Mettre à jour l'engagement avec le numéro de facture
    updateEngagement(engagement.id, {
      invoiceNumber,
      kind: 'facture',
      invoiceVatEnabled: engagement.invoiceVatEnabled ?? company.vatEnabled,
    });

    // Générer le PDF de la facture
    try {
      const options = service.options.filter((opt) => engagement.optionIds.includes(opt.id));
      const engDate = engagement.scheduledAt ? parseISO(engagement.scheduledAt) : new Date();

      await generateInvoicePdf({
        documentNumber: invoiceNumber,
        issueDate: new Date(),
        serviceDate: engDate,
        company: {
          ...company,
          vatNumber: company.vatNumber || '',
          iban: company.iban || '',
          bic: company.bic || '',
        },
        client,
        service,
        options,
        optionOverrides: engagement.optionOverrides || {},
        additionalCharge: engagement.additionalCharge || 0,
        vatRate: 20,
        vatEnabled: engagement.invoiceVatEnabled ?? company.vatEnabled,
        status: engagement.status,
        supportType: engagement.supportType,
        supportDetail: engagement.supportDetail,
      });

      alert('Facture créée avec succès !');
    } catch (error) {
      console.error('Erreur lors de la génération de la facture:', error);
      alert('Erreur lors de la génération de la facture.');
    }
  }, [clientsById, servicesById, companies, updateEngagement]);

  const handleViewInvoice = useCallback((engagement: Engagement) => {
    // Navigation vers une page de visualisation (à implémenter si nécessaire)
    navigate(`/mobile/facturation/${engagement.id}`);
  }, [navigate]);

  // Filtrer les engagements selon le filtre (mémorisé pour éviter les recalculs)
  const filteredEngagements = useMemo(() => {
    return engagements.filter((eng) => {
    if (filter === 'with-invoice') {
      return eng.invoiceNumber !== null;
    }
    if (filter === 'without-invoice') {
      return eng.invoiceNumber === null && eng.kind === 'service';
    }
    return eng.kind === 'service' || eng.kind === 'facture';
  });
  }, [engagements, filter]);

  // Si on a un paramètre create, créer la facture automatiquement
  useEffect(() => {
    if (createFromId) {
      const engagement = engagements.find((eng) => eng.id === createFromId);
      if (engagement && !engagement.invoiceNumber) {
        handleCreateInvoice(engagement);
        // Nettoyer l'URL
        navigate('/mobile/facturation', { replace: true });
      }
    }
  }, [createFromId, engagements, handleCreateInvoice, navigate]);

  // Styles mémorisés pour optimiser les performances
  const containerStyle = useMemo(() => ({
    width: '100%',
    padding: '0 var(--space-xl)',
    minHeight: '100vh',
    background: 'var(--bg)',
    WebkitOverflowScrolling: 'touch' as const,
  }), []);

  const headerStyle = useMemo(() => ({
    paddingTop: 'var(--space-md)',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    width: '100%',
    marginBottom: 'var(--space-lg)',
  }), []);

  return (
    <div className="modern-text" style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 className="text-title" style={{ margin: 0, color: 'var(--text)' }}>
            Facturation
          </h1>
          {filteredEngagements.length > 0 && (
            <span className="text-caption" style={{ color: 'var(--muted)' }}>
              {filteredEngagements.length} service{filteredEngagements.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--space-sm)', 
        marginBottom: 'var(--space-lg)',
        flexWrap: 'wrap',
      }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setFilter('all')}
          className="btn-base btn-secondary btn-compact"
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            fontSize: '13px',
            background: filter === 'all' ? 'var(--accent)' : 'var(--surface)',
            color: filter === 'all' ? 'white' : 'var(--text)',
            border: filter === 'all' ? 'none' : '1.5px solid rgba(var(--border-rgb), 0.15)',
          }}
          >
            Tous
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setFilter('with-invoice')}
          className="btn-base btn-secondary btn-compact"
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            fontSize: '13px',
            background: filter === 'with-invoice' ? 'var(--accent)' : 'var(--surface)',
            color: filter === 'with-invoice' ? 'white' : 'var(--text)',
            border: filter === 'with-invoice' ? 'none' : '1.5px solid rgba(var(--border-rgb), 0.15)',
          }}
          >
            Facturés
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setFilter('without-invoice')}
          className="btn-base btn-secondary btn-compact"
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            fontSize: '13px',
            background: filter === 'without-invoice' ? 'var(--accent)' : 'var(--surface)',
            color: filter === 'without-invoice' ? 'white' : 'var(--text)',
            border: filter === 'without-invoice' ? 'none' : '1.5px solid rgba(var(--border-rgb), 0.15)',
          }}
          >
            À facturer
        </motion.button>
      </div>

      {/* Liste des engagements */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', width: '100%' }}>
        {filteredEngagements.length > 0 ? (
          filteredEngagements.map((engagement) => {
            const engDate = engagement.scheduledAt ? parseISO(engagement.scheduledAt) : null;
            const hasInvoice = engagement.invoiceNumber !== null;
            const totals = computeEngagementTotals(engagement);

            return (
              <motion.div
                key={engagement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="card-modern"
                style={{
                  padding: 'var(--space-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-md)',
                  borderLeft: hasInvoice ? '4px solid var(--accent)' : '4px solid var(--border)',
                  willChange: 'opacity, transform',
                }}
              >
                {/* En-tête avec service et statut */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="text-body-lg" style={{ 
                      margin: 0,
                      fontWeight: 600,
                      color: 'var(--text)',
                      lineHeight: '1.4',
                    }}>
                      {getServiceName(engagement.serviceId)}
                    </h3>
                    <p className="text-caption" style={{ 
                      margin: 'var(--space-2xs) 0 0 0',
                      lineHeight: '1.4',
                    }}>
                      {getClientName(engagement.clientId)}
                    </p>
                  </div>
                  {hasInvoice && (
                    <div className="badge-modern badge-primary" style={{
                      background: 'rgba(var(--accent-rgb), 0.1)',
                      color: 'var(--accent)',
                      border: 'none',
                      padding: '6px 12px',
                      fontSize: '12px',
                      flexShrink: 0,
                    }}>
                      <CheckCircle style={{ fontSize: '14px', marginRight: '4px' }} />
                      Facturé
                    </div>
                  )}
                </div>

                {/* Informations détaillées */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                  {engDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      <span className="text-footnote" style={{ color: 'var(--muted)' }}>
                      📅 {format(engDate, 'd MMMM yyyy à HH:mm', { locale: fr })}
                    </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <span className="text-footnote" style={{ color: 'var(--muted)' }}>
                      {engagement.supportType} • {engagement.supportDetail}
                  </span>
                  </div>
                  {hasInvoice && engagement.invoiceNumber && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                      <span className="text-footnote" style={{ color: 'var(--muted)' }}>
                        Facture: {engagement.invoiceNumber}
                      </span>
                    </div>
                  )}
                  {totals.price > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginTop: 'var(--space-xs)' }}>
                      <span className="text-body" style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {formatCurrency(totals.price + totals.surcharge)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
                  {!hasInvoice ? (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => handleCreateInvoice(engagement)}
                      className="btn-base btn-primary btn-compact"
                      style={{
                        flex: 1,
                        padding: 'var(--space-md) var(--space-lg)',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-xs)',
                      }}
                    >
                      <Receipt style={{ fontSize: '18px' }} />
                      Créer la facture
                    </motion.button>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => handleViewInvoice(engagement)}
                      className="btn-base btn-secondary btn-compact"
                      style={{
                        flex: 1,
                        padding: 'var(--space-md) var(--space-lg)',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-xs)',
                      }}
                    >
                      <Description style={{ fontSize: '18px' }} />
                      Voir la facture
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div style={{
            padding: 'var(--space-3xl) var(--space-lg)',
            textAlign: 'center',
            color: 'var(--muted)',
          }}>
            <Receipt style={{ fontSize: '48px', opacity: 0.3, marginBottom: 'var(--space-md)' }} />
            <p className="text-body-lg" style={{
              margin: 0,
              opacity: 0.7,
            }}>
              Aucun service à afficher
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileFacturationPage;

