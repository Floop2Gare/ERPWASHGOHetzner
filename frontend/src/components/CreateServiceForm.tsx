import React, { useMemo, useEffect, useState } from 'react';
import clsx from 'clsx';
import type {
  Client,
  Company,
  Service,
  ServiceCategory,
  EngagementStatus,
  SupportType,
  AuthUser,
} from '../store/useAppData';
import type { EngagementDraft } from '../pages/service/types';
import { CRMFormLabel, CRMFormInput, CRMFormSelect, CRMFormTextarea } from './crm';
import { formatCurrency, formatDuration } from '../lib/format';
import { computeEngagementTotals, buildPreviewEngagement } from '../pages/service/utils';

type CreateServiceFormProps = {
  draft: EngagementDraft;
  onDraftChange: (draft: EngagementDraft) => void;
  clients: Client[];
  companies: Company[];
  services: Service[];
  categories: Array<{ id: string; name: ServiceCategory; active: boolean }>;
  authUsers: AuthUser[];
  vatEnabled: boolean;
  vatRate: number;
  onValidationError?: (error: string) => void;
  internalNotes?: string;
  onInternalNotesChange?: (notes: string) => void;
};

export const CreateServiceForm: React.FC<CreateServiceFormProps> = ({
  draft,
  onDraftChange,
  clients,
  companies,
  services,
  categories,
  authUsers,
  vatEnabled,
  vatRate,
  onValidationError,
  internalNotes: externalInternalNotes,
  onInternalNotesChange,
}) => {
  // État local pour les notes internes si non fourni en props
  const [localInternalNotes, setLocalInternalNotes] = useState('');
  const internalNotes = externalInternalNotes ?? localInternalNotes;
  const setInternalNotes = onInternalNotesChange ?? setLocalInternalNotes;
  
  // Calcul des totaux
  const previewEngagement = useMemo(() => {
    if (!draft.serviceId || !draft.clientId) return null;
    return buildPreviewEngagement(draft, {
      services: new Map(services.map((s) => [s.id, s])),
      clients: new Map(clients.map((c) => [c.id, c])),
      companies: new Map(companies.map((c) => [c.id, c])),
    });
  }, [draft, services, clients, companies]);

  const totals = useMemo(() => {
    if (!previewEngagement) return { price: 0, duration: 0, surcharge: 0 };
    return computeEngagementTotals(previewEngagement);
  }, [previewEngagement]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === draft.serviceId) ?? null,
    [services, draft.serviceId]
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === draft.clientId) ?? null,
    [clients, draft.clientId]
  );

  const filteredServices = useMemo(() => {
    if (!draft.serviceId && !selectedService) {
      return services.filter((s) => s.active);
    }
    const category = selectedService?.category;
    if (category) {
      return services.filter((s) => s.category === category && s.active);
    }
    return services.filter((s) => s.active);
  }, [services, selectedService, draft.serviceId]);

  // Calcul du prix de base (non modifiable)
  const basePrice = useMemo(() => {
    if (!selectedService) return 0;
    return totals.price;
  }, [selectedService, totals.price]);

  // Calcul du prix final (base + majoration/remise)
  const finalPrice = useMemo(() => {
    return basePrice + (draft.additionalCharge || 0);
  }, [basePrice, draft.additionalCharge]);

  // Calcul du prix final avec TVA si applicable
  const finalPriceWithVat = useMemo(() => {
    if (!vatEnabled) return finalPrice;
    const vatMultiplier = vatRate / 100;
    return finalPrice * (1 + vatMultiplier);
  }, [finalPrice, vatEnabled, vatRate]);

  // Calcul de la durée estimée
  const estimatedDuration = totals.duration;

  // Calcul de l'heure de fin si heure de début et durée sont disponibles
  const endTime = useMemo(() => {
    if (!draft.startTime || !estimatedDuration) return '';
    const [hours, minutes] = draft.startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + estimatedDuration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  }, [draft.startTime, estimatedDuration]);

  // Adresse d'intervention pré-remplie
  const interventionAddress = useMemo(() => {
    if (selectedClient?.address) {
      return `${selectedClient.address}${selectedClient.city ? `, ${selectedClient.city}` : ''}`;
    }
    return '';
  }, [selectedClient]);

  // Gestion du changement de catégorie
  const handleCategoryChange = (categoryName: string) => {
    if (!categoryName) {
      onDraftChange({
        ...draft,
        serviceId: '',
        optionIds: [],
        optionOverrides: {},
      });
      return;
    }

    const firstServiceInCategory = services.find(
      (s) => s.category === categoryName && s.active
    );
    if (firstServiceInCategory) {
      const supportType = (categoryName === 'Autre' ? 'Textile' : categoryName) as SupportType;
      onDraftChange({
        ...draft,
        serviceId: firstServiceInCategory.id,
        optionIds: [],
        optionOverrides: {},
        supportType,
      });
    }
  };

  // Gestion du changement de service
  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      const supportType = (service.category === 'Autre' ? 'Textile' : service.category) as SupportType;
      onDraftChange({
        ...draft,
        serviceId,
        optionIds: [],
        optionOverrides: {},
        supportType,
      });
    } else {
      onDraftChange({
        ...draft,
        serviceId,
        optionIds: [],
        optionOverrides: {},
      });
    }
  };

  // Validation
  const validate = (): string | null => {
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
  };

  // Exposer la validation au parent
  useEffect(() => {
    if (onValidationError) {
      const error = validate();
      if (error) {
        onValidationError(error);
      }
    }
  }, [draft, onValidationError]);

  return (
    <div className="space-y-6">
      {/* Layout horizontal optimisé - Tous les champs visibles en une seule ligne logique */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        
        {/* COLONNE 1 : QUI (Client & Entreprise) - 2 colonnes */}
        <div className="xl:col-span-2 space-y-3">
          <div className="space-y-2">
            <CRMFormLabel htmlFor="client" required className="text-xs font-semibold">
              Client
            </CRMFormLabel>
            <CRMFormSelect
              id="client"
              value={draft.clientId}
              onChange={(e) => onDraftChange({ ...draft, clientId: e.target.value })}
              className="text-sm"
            >
              <option value="">Sélectionner…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </CRMFormSelect>
          </div>

          <div className="space-y-2">
            <CRMFormLabel htmlFor="company" required className="text-xs font-semibold">
              Entreprise
            </CRMFormLabel>
            <CRMFormSelect
              id="company"
              value={draft.companyId}
              onChange={(e) => onDraftChange({ ...draft, companyId: e.target.value })}
              className="text-sm"
            >
              <option value="">Sélectionner…</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </CRMFormSelect>
          </div>
        </div>

        {/* COLONNE 2 : QUOI (Produit & Support) - 3 colonnes */}
        <div className="xl:col-span-3 space-y-3">
          <div className="space-y-2">
            <CRMFormLabel htmlFor="category" className="text-xs font-semibold">
              Catégorie
            </CRMFormLabel>
            <CRMFormSelect
              id="category"
              value={selectedService?.category || ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="text-sm"
            >
              <option value="">Toutes</option>
              {categories
                .filter((cat) => cat.active)
                .map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
            </CRMFormSelect>
          </div>

          <div className="space-y-2">
            <CRMFormLabel htmlFor="service" required className="text-xs font-semibold">
              Produit / Prestation
            </CRMFormLabel>
            <CRMFormSelect
              id="service"
              value={draft.serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="text-sm"
            >
              <option value="">Sélectionner…</option>
              {filteredServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </CRMFormSelect>
            {selectedService && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Prix, durée et support déterminés automatiquement
              </p>
            )}
          </div>

          {/* Support (affiché uniquement si le produit le nécessite) */}
          {selectedService && (
            <>
              <div className="space-y-2">
                <CRMFormLabel htmlFor="support-type" required className="text-xs font-semibold">
                  Support
                </CRMFormLabel>
                <CRMFormSelect
                  id="support-type"
                  value={draft.supportType}
                  onChange={(e) =>
                    onDraftChange({ ...draft, supportType: e.target.value as SupportType })
                  }
                  className="text-sm"
                >
                  {categories
                    .filter((cat) => cat.active)
                    .map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                </CRMFormSelect>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Déterminé automatiquement
                </p>
              </div>
              <div className="space-y-2">
                <CRMFormLabel htmlFor="support-detail" className="text-xs font-semibold">
                  Détail support
                </CRMFormLabel>
                <CRMFormInput
                  id="support-detail"
                  type="text"
                  value={draft.supportDetail}
                  onChange={(e) => onDraftChange({ ...draft, supportDetail: e.target.value })}
                  placeholder="Modèle, dimensions, couleur..."
                  className="text-sm"
                />
              </div>
            </>
          )}
        </div>

        {/* COLONNE 3 : PRIX - 2 colonnes */}
        <div className="xl:col-span-2 space-y-3">
          <div className="space-y-2">
            <CRMFormLabel htmlFor="base-price" className="text-xs font-semibold">
              Prix de base
            </CRMFormLabel>
            <CRMFormInput
              id="base-price"
              type="text"
              value={formatCurrency(basePrice)}
              readOnly
              className="bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed text-sm font-medium"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Grille standard (non modifiable)
            </p>
          </div>

          <div className="space-y-2">
            <CRMFormLabel htmlFor="additional-charge" className="text-xs font-semibold">
              Ajustement (€)
            </CRMFormLabel>
            <CRMFormInput
              id="additional-charge"
              type="number"
              step="0.01"
              value={draft.additionalCharge || 0}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                onDraftChange({ ...draft, additionalCharge: value });
              }}
              placeholder="0.00"
              className="text-sm"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              + majoration / - remise
            </p>
          </div>

          <div className="space-y-2">
            <CRMFormLabel htmlFor="final-price" className="text-xs font-semibold">
              Prix final
            </CRMFormLabel>
            <div className="space-y-1">
              <CRMFormInput
                id="final-price"
                type="text"
                value={formatCurrency(finalPrice)}
                readOnly
                className="bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed text-sm font-semibold"
              />
              {vatEnabled && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  TTC : {formatCurrency(finalPriceWithVat)}
                </p>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Montant facturé au client
            </p>
          </div>
        </div>

        {/* COLONNE 4 : QUAND (Planification) - 3 colonnes */}
        <div className="xl:col-span-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <CRMFormLabel htmlFor="scheduled-date" required className="text-xs font-semibold">
                Date
              </CRMFormLabel>
              <CRMFormInput
                id="scheduled-date"
                type="date"
                value={draft.scheduledAt}
                onChange={(e) => onDraftChange({ ...draft, scheduledAt: e.target.value })}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <CRMFormLabel htmlFor="start-time" required className="text-xs font-semibold">
                Heure début
              </CRMFormLabel>
              <CRMFormInput
                id="start-time"
                type="time"
                value={draft.startTime || ''}
                onChange={(e) => onDraftChange({ ...draft, startTime: e.target.value })}
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <CRMFormLabel htmlFor="end-time" className="text-xs font-semibold">
                Heure fin
              </CRMFormLabel>
              <CRMFormInput
                id="end-time"
                type="time"
                value={endTime}
                readOnly
                className="bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed text-sm"
                placeholder={estimatedDuration ? 'Calculée' : '—'}
              />
              {estimatedDuration && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Durée : {formatDuration(estimatedDuration)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <CRMFormLabel htmlFor="intervention-address" className="text-xs font-semibold">
                Adresse
              </CRMFormLabel>
              <CRMFormInput
                id="intervention-address"
                type="text"
                value={interventionAddress}
                readOnly
                className="bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed text-sm"
                placeholder={selectedClient ? 'Adresse client' : '—'}
              />
            </div>
          </div>
        </div>

        {/* COLONNE 5 : QUI FAIT & STATUT - 2 colonnes */}
        <div className="xl:col-span-2 space-y-3">
          <div className="space-y-2">
            <CRMFormLabel htmlFor="assigned-user" required className="text-xs font-semibold">
              Intervenant
            </CRMFormLabel>
            <CRMFormSelect
              id="assigned-user"
              value={draft.assignedUserId}
              onChange={(e) => onDraftChange({ ...draft, assignedUserId: e.target.value })}
              className="text-sm"
            >
              <option value="">Sélectionner…</option>
              {authUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.profile.firstName} {user.profile.lastName}
                </option>
              ))}
            </CRMFormSelect>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Responsable opérationnel
            </p>
          </div>

          <div className="space-y-2">
            <CRMFormLabel htmlFor="status" required className="text-xs font-semibold">
              Statut
            </CRMFormLabel>
            <CRMFormSelect
              id="status"
              value={draft.status}
              onChange={(e) =>
                onDraftChange({ ...draft, status: e.target.value as EngagementStatus })
              }
              disabled={draft.kind === 'devis'}
              className="text-sm"
            >
              <option value="planifié">À planifier</option>
              <option value="envoyé">Confirmé</option>
              <option value="réalisé">Terminé</option>
              <option value="annulé">Annulé</option>
            </CRMFormSelect>
            {draft.kind === 'devis' && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Devis en brouillon
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Notes internes - Ligne séparée en bas */}
      <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
        <CRMFormLabel htmlFor="internal-notes" className="text-xs font-semibold">
          Notes internes
        </CRMFormLabel>
        <CRMFormTextarea
          id="internal-notes"
          rows={2}
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          placeholder="Notes internes concernant ce service..."
          className="resize-none text-sm"
        />
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          Visibles uniquement en interne
        </p>
      </div>
    </div>
  );
};
