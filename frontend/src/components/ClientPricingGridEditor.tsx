/**
 * Composant pour éditer la grille tarifaire d'un client
 * Affiche tous les services/options du catalogue et permet de définir des prix personnalisés
 */

import { useState, useEffect, useMemo } from 'react';
import { Save, RotateCcw, Euro, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useAppData, type Client, type Service, type ServiceOption, type ClientPricingGrid, type ClientPricingItem } from '../store/useAppData';
import { ClientService } from '../api/services/clients';
import { formatCurrency } from '../lib/format';

interface ClientPricingGridEditorProps {
  clientId: string;
  onSave?: () => void;
}

export const ClientPricingGridEditor = ({ clientId, onSave }: ClientPricingGridEditorProps) => {
  const { clients, services, updateClientPricingGrid, getCurrentUser } = useAppData();
  const client = clients.find((c) => c.id === clientId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Charger la grille tarifaire depuis le backend si elle n'est pas dans le store
  const [pricingGrid, setPricingGrid] = useState<ClientPricingGrid | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPricingGrid = async () => {
      if (!clientId) return;
      
      setIsLoading(true);
      try {
        const result = await ClientService.getPricingGrid(clientId);
        if (result.success && result.data) {
          setPricingGrid(result.data as ClientPricingGrid);
        } else {
          setPricingGrid({ pricingItems: [] });
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la grille tarifaire:', error);
        setPricingGrid({ pricingItems: [] });
      } finally {
        setIsLoading(false);
      }
    };

    loadPricingGrid();
  }, [clientId]);

  // Construire la liste des services/options avec leurs prix
  const pricingItems = useMemo(() => {
    if (!services.length) {
      return [];
    }

    // Grouper par service
    const items: Array<{
      service: Service;
      option: ServiceOption;
      pricingItem: ClientPricingItem | null;
    }> = [];

    services.forEach((service) => {
      if (!service.active) return;
      
      service.options.forEach((option) => {
        if (!option.active) return;
        
        // Chercher le prix personnalisé dans la grille
        const existingPricingItem = pricingGrid?.pricingItems.find(
          (item) => item.serviceId === service.id && item.serviceOptionId === option.id
        ) || null;

        items.push({
          service,
          option,
          pricingItem: existingPricingItem
            ? {
                serviceId: service.id,
                serviceOptionId: option.id,
                defaultPriceHT: option.unitPriceHT,
                customPriceHT: existingPricingItem.customPriceHT,
                comment: existingPricingItem.comment || null,
              }
            : null,
        });
      });
    });

    return items;
  }, [services, pricingGrid]);

  // État local pour les modifications
  const [localPricing, setLocalPricing] = useState<Record<string, { price: number | null; comment: string }>>({});

  // Initialiser localPricing avec les valeurs existantes
  useEffect(() => {
    if (!pricingGrid) return;
    
    const initial: Record<string, { price: number | null; comment: string }> = {};
    pricingGrid.pricingItems.forEach((item) => {
      const key = `${item.serviceId}-${item.serviceOptionId}`;
      initial[key] = {
        price: item.customPriceHT,
        comment: item.comment || '',
      };
    });
    setLocalPricing(initial);
  }, [pricingGrid]);

  const handlePriceChange = (serviceId: string, optionId: string, price: number | null) => {
    const key = `${serviceId}-${optionId}`;
    setLocalPricing((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        price: price === null || isNaN(price) ? null : price,
      },
    }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleCommentChange = (serviceId: string, optionId: string, comment: string) => {
    const key = `${serviceId}-${optionId}`;
    setLocalPricing((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        comment: comment || '',
      },
    }));
  };

  const handleResetToDefault = () => {
    setLocalPricing({});
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!clientId) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Construire la grille tarifaire à partir des modifications locales
      const pricingItemsToSave: ClientPricingItem[] = [];

      pricingItems.forEach(({ service, option }) => {
        const key = `${service.id}-${option.id}`;
        const local = localPricing[key];

        // Ne sauvegarder que si un prix personnalisé ou un commentaire est défini
        if (local && (local.price !== null || local.comment)) {
          pricingItemsToSave.push({
            serviceId: service.id,
            serviceOptionId: option.id,
            defaultPriceHT: option.unitPriceHT,
            customPriceHT: local.price !== null ? local.price : null,
            comment: local.comment || null,
          });
        }
      });

      const gridToSave: ClientPricingGrid = {
        pricingItems: pricingItemsToSave,
      };

      const result = await updateClientPricingGrid(clientId, gridToSave);
      
      if (result.success) {
        setPricingGrid(gridToSave);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        onSave?.();
      } else {
        setSaveError(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde de la grille tarifaire:', error);
      setSaveError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500 dark:text-slate-400">Chargement de la grille tarifaire...</div>
      </div>
    );
  }

  if (!services.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <AlertCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Aucun service dans le catalogue
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Créez des services dans le catalogue de prestations pour pouvoir définir une grille tarifaire.
        </p>
      </div>
    );
  }

  // Grouper par service pour l'affichage
  const servicesGrouped = useMemo(() => {
    const grouped: Record<string, typeof pricingItems> = {};
    pricingItems.forEach((item) => {
      if (!grouped[item.service.id]) {
        grouped[item.service.id] = [];
      }
      grouped[item.service.id].push(item);
    });
    return grouped;
  }, [pricingItems]);

  const hasChanges = Object.keys(localPricing).length > 0;

  return (
    <div className="space-y-4">
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Grille tarifaire personnalisée
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Définissez des prix personnalisés pour ce client. Laissez vide pour utiliser le prix par défaut.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            disabled={!hasChanges || isSaving}
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
              (!hasChanges || isSaving) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600',
              (!hasChanges || isSaving) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Messages de feedback */}
      {saveError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-100">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-100">
          Grille tarifaire enregistrée avec succès
        </div>
      )}

      {/* Liste des services */}
      <div className="space-y-6">
        {Object.entries(servicesGrouped).map(([serviceId, items]) => {
          const service = items[0].service;
          return (
            <div key={serviceId} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 overflow-hidden">
              {/* En-tête du service */}
              <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{service.name}</h4>
                {service.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{service.description}</p>
                )}
              </div>

              {/* Options du service */}
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {items.map(({ option, pricingItem }) => {
                  const key = `${serviceId}-${option.id}`;
                  const local = localPricing[key];
                  const currentPrice = local?.price !== undefined ? local.price : (pricingItem?.customPriceHT ?? null);
                  const currentComment = local?.comment !== undefined ? local.comment : (pricingItem?.comment || '');
                  const isCustom = currentPrice !== null;

                  return (
                    <div key={option.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="grid grid-cols-12 gap-4 items-start">
                        {/* Nom de l'option */}
                        <div className="col-span-12 md:col-span-3">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {option.label}
                          </p>
                          {option.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {option.description}
                            </p>
                          )}
                        </div>

                        {/* Prix par défaut */}
                        <div className="col-span-12 md:col-span-2">
                          <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">
                            Prix par défaut
                          </label>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                            <Euro className="h-3.5 w-3.5" />
                            {formatCurrency(option.unitPriceHT)}
                          </div>
                        </div>

                        {/* Prix personnalisé */}
                        <div className="col-span-12 md:col-span-2">
                          <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">
                            Prix client
                          </label>
                          <div className="relative">
                            <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={currentPrice === null ? '' : currentPrice}
                              onChange={(e) => {
                                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                handlePriceChange(serviceId, option.id, value);
                              }}
                              placeholder="Prix par défaut"
                              className={clsx(
                                'w-full rounded-lg border-2 bg-white pl-7 pr-3 py-1.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
                                isCustom && 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/20'
                              )}
                            />
                          </div>
                        </div>

                        {/* Commentaire */}
                        <div className="col-span-12 md:col-span-5">
                          <label className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">
                            Commentaire (optionnel)
                          </label>
                          <input
                            type="text"
                            value={currentComment}
                            onChange={(e) => handleCommentChange(serviceId, option.id, e.target.value)}
                            placeholder="Ex: Prix négocié pour volume"
                            className="w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 transition-all placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {pricingItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Aucune option de service active
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Activez des options dans vos services pour pouvoir définir des prix personnalisés.
          </p>
        </div>
      )}
    </div>
  );
};
