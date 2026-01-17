import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Client,
  Engagement,
  EngagementKind,
  EngagementStatus,
  Service,
  ServiceOption,
} from '../../store/useAppData';
import type { EngagementDraft, QuickClientDraft, ServiceEmailPrompt } from './types';
import { buildInitialDraft, buildDraftFromEngagement, sanitizeDraftOverrides } from './utils';

export function useServicePageState(
  clients: Client[],
  services: Service[],
  companies: any[],
  activeCompanyId: string | null
) {
  const baseDraft = useMemo(
    () => buildInitialDraft(clients, services, companies, activeCompanyId),
    [clients, services, companies, activeCompanyId]
  );

  const [creationMode, setCreationMode] = useState<'service' | 'facture' | null>(null);
  const [creationDraft, setCreationDraft] = useState<EngagementDraft>(baseDraft);
  const [quickClientDraft, setQuickClientDraft] = useState<QuickClientDraft>({
    name: '',
    siret: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    status: 'Actif',
  });
  const [isAddingClient, setIsAddingClient] = useState(false);

  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [selectedEngagementIds, setSelectedEngagementIds] = useState<string[]>([]);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [editModalDraft, setEditModalDraft] = useState<EngagementDraft | null>(null);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [mailPrompt, setMailPrompt] = useState<ServiceEmailPrompt | null>(null);
  const [mailPromptClientId, setMailPromptClientId] = useState('');

  // Reset creation draft when base draft changes
  useEffect(() => {
    setCreationDraft(baseDraft);
  }, [baseDraft]);

  return {
    // State
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
    selectedEngagementIds,
    setSelectedEngagementIds,
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
  };
}

export function useEngagementSelection(
  engagements: Engagement[],
  filteredEngagements: Engagement[]
) {
  const [selectedEngagementIds, setSelectedEngagementIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedEngagementIds((current) =>
      current.filter((id) => engagements.some((engagement) => engagement.id === id))
    );
  }, [engagements]);

  const allEngagementsSelected =
    filteredEngagements.length > 0 &&
    filteredEngagements.every((engagement) => selectedEngagementIds.includes(engagement.id));

  const toggleEngagementSelection = useCallback((engagementId: string) => {
    setSelectedEngagementIds((current) =>
      current.includes(engagementId)
        ? current.filter((id) => id !== engagementId)
        : [...current, engagementId]
    );
  }, []);

  const toggleSelectAllEngagements = useCallback(() => {
    if (allEngagementsSelected) {
      setSelectedEngagementIds((current) =>
        current.filter((id) => !filteredEngagements.some((engagement) => engagement.id === id))
      );
    } else {
      setSelectedEngagementIds((current) => [
        ...new Set([...current, ...filteredEngagements.map((engagement) => engagement.id)]),
      ]);
    }
  }, [allEngagementsSelected, filteredEngagements]);

  const clearSelectedEngagements = useCallback(() => setSelectedEngagementIds([]), []);

  const selectedEngagementsForBulk = useCallback(
    () => engagements.filter((engagement) => selectedEngagementIds.includes(engagement.id)),
    [engagements, selectedEngagementIds]
  );

  return {
    selectedEngagementIds,
    setSelectedEngagementIds,
    allEngagementsSelected,
    toggleEngagementSelection,
    toggleSelectAllEngagements,
    clearSelectedEngagements,
    selectedEngagementsForBulk,
  };
}

export function useDraftOptions(
  servicesById: Map<string, Service>,
  creationDraft: EngagementDraft | null,
  setCreationDraft: React.Dispatch<React.SetStateAction<EngagementDraft | null>>,
  editDraft: EngagementDraft | null,
  setEditDraft: React.Dispatch<React.SetStateAction<EngagementDraft | null>>
) {
  // Auto-filter options when service changes
  useEffect(() => {
    setCreationDraft((draft) => {
      if (!draft || !draft.serviceId) {
        return draft;
      }
      const service = servicesById.get(draft.serviceId);
      if (!service) {
        return draft;
      }
      const allowed = new Set(service.options.map((option) => option.id));
      const filtered = draft.optionIds.filter((id) => allowed.has(id));
      const unchanged =
        filtered.length === draft.optionIds.length &&
        filtered.every((id, index) => id === draft.optionIds[index]);
      if (unchanged) {
        return draft;
      }
      return {
        ...draft,
        optionIds: filtered,
        optionOverrides: sanitizeDraftOverrides(filtered, draft.optionOverrides),
      };
    });
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }
      const service = servicesById.get(draft.serviceId);
      if (!service) {
        return draft;
      }
      const allowed = new Set(service.options.map((option) => option.id));
      const filtered = draft.optionIds.filter((id) => allowed.has(id));
      const unchanged =
        filtered.length === draft.optionIds.length &&
        filtered.every((id, index) => id === draft.optionIds[index]);
      if (unchanged) {
        return draft;
      }
      return {
        ...draft,
        optionIds: filtered,
        optionOverrides: sanitizeDraftOverrides(filtered, draft.optionOverrides),
      };
    });
  }, [servicesById, setCreationDraft, setEditDraft]);
}

