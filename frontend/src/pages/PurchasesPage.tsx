import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Filter, Download, FileText, TrendingUp, ShoppingCart, Plus, Trash2, Edit2, Search, Car } from 'lucide-react';
import clsx from 'clsx';

import { Button } from '../components/Button';
import { RowActionButton } from '../components/RowActionButton';
import { IconDocument, IconEdit, IconPlus, IconTrash } from '../components/icons';
import { useAppData, Purchase, PurchaseCategory, PurchaseStatus } from '../store/useAppData';
import { BRAND_NAME } from '../lib/branding';
import { formatCurrency, formatDate } from '../lib/format';
import { downloadCsv } from '../lib/csv';
import { PurchaseService } from '../api';
import {
  CRMFeedback,
  CRMBackendStatus,
  CRMBulkActions,
  CRMEmptyState,
  CRMModal,
  CRMModalHeader,
  CRMFormLabel,
  CRMFormInput,
  CRMFormSelect,
  CRMFormTextarea,
  CRMSubmitButton,
  CRMCancelButton,
} from '../components/crm';

const categoryOptions: PurchaseCategory[] = [
  'Produits',
  'Services',
  'Carburant',
  'Entretien',
  'Sous-traitance',
  'Autre',
];

const statusOptions: PurchaseStatus[] = ['Brouillon', 'Validé', 'Payé', 'Annulé'];

const purchaseStatusClasses: Record<PurchaseStatus, string> = {
  Brouillon: 'bg-slate-200 text-slate-700 border border-slate-300 shadow-[0_1px_0_rgba(148,163,184,0.35)]',
  Validé: 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)]',
  Payé: 'bg-blue-200 text-blue-800 border border-blue-300 shadow-[0_1px_0_rgba(59,130,246,0.35)]',
  Annulé: 'bg-rose-200 text-rose-800 border border-rose-300 shadow-[0_1px_0_rgba(244,63,94,0.35)]',
};

type PurchaseFormState = {
  companyId: string;
  vendor: string;
  reference: string;
  description: string;
  date: string;
  amountHt: string;
  vatRate: string;
  category: PurchaseCategory;
  status: PurchaseStatus;
  notes: string;
  recurring: boolean;
  vehicleId: string;
  kilometers: string;
};

const toCurrency = (value: number) => formatCurrency(value || 0);

const computeTtcFromStrings = (amountHt: string, vatRate: string) => {
  const normalizedAmount = parseFloat(amountHt.replace(',', '.'));
  const normalizedVat = parseFloat(vatRate.replace(',', '.'));
  if (!Number.isFinite(normalizedAmount) || !Number.isFinite(normalizedVat)) {
    return 0;
  }
  return Math.round(normalizedAmount * (1 + normalizedVat / 100) * 100) / 100;
};

const buildFormState = (
  purchase: Purchase | null,
  defaultCompanyId: string,
  defaultVatRate: number
): PurchaseFormState => {
  if (purchase) {
    return {
      companyId: purchase.companyId ?? '',
      vendor: purchase.vendor,
      reference: purchase.reference,
      description: purchase.description ?? '',
      date: purchase.date,
      amountHt: purchase.amountHt.toString(),
      vatRate: purchase.vatRate.toString(),
      category: purchase.category,
      status: purchase.status,
      notes: purchase.notes ?? '',
      recurring: purchase.recurring,
      vehicleId: purchase.vehicleId ?? '',
      kilometers: purchase.kilometers !== null && purchase.kilometers !== undefined ? purchase.kilometers.toString() : '',
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  return {
    companyId: defaultCompanyId,
    vendor: '',
    reference: '',
    description: '',
    date: today,
    amountHt: '',
    vatRate: defaultVatRate.toString(),
    category: 'Produits',
    status: 'Validé',
    notes: '',
    recurring: false,
    vehicleId: '',
    kilometers: '',
  };
};

const buildCsvLine = (values: (string | number | null | undefined)[], separator: string) =>
  values
    .map((value) => {
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value).replace(/"/g, '""');
      return stringValue.includes(separator) || stringValue.includes('"')
        ? `"${stringValue}"`
        : stringValue;
    })
    .join(separator);

const PurchasesPage = () => {
  const {
    purchases,
    companies,
    vehicles,
    addPurchase,
    updatePurchase,
    removePurchase,
    bulkRemovePurchases,
    addVehicle,
    updateVehicle,
    removeVehicle,
    vatEnabled,
    vatRate,
    getCompany,
  } = useAppData();

  const defaultCompanyId = companies[0]?.id ?? '';
  const defaultVat = vatEnabled ? vatRate : 0;

  const [search, setSearch] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Tous' | PurchaseStatus>('Tous');
  const [categoryFilter, setCategoryFilter] = useState<'Toutes' | PurchaseCategory>('Toutes');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [activePanel, setActivePanel] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PurchaseFormState>(
    buildFormState(null, defaultCompanyId, defaultVat)
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [backendLoading, setBackendLoading] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [showCreateVehicle, setShowCreateVehicle] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    mileage: '',
    usageRate: '',
    costPerKm: '',
    companyId: '',
  });

  const setFeedbackMessage = (message: string) => {
    setFeedback(message);
  };

  const listSectionRef = useRef<HTMLDivElement | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const purchaseModalFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!detailId) {
      return;
    }
    if (!purchases.some((purchase) => purchase.id === detailId)) {
      setDetailId(null);
    }
  }, [detailId, purchases]);

  useEffect(() => {
    if (!activePanel) {
      return;
    }
    const timer = window.setTimeout(() => {
      const focusable = purchaseModalFormRef.current?.querySelector<HTMLElement>('input, select, textarea');
      focusable?.focus({ preventScroll: true });
    }, 160);
    return () => window.clearTimeout(timer);
  }, [activePanel]);

  useEffect(() => {
    if (!detailId || !detailRef.current) {
      return;
    }
    detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [detailId]);

  // Charger les achats depuis le backend au démarrage
  useEffect(() => {
    const loadPurchases = async () => {
      try {
        setBackendLoading(true);
        setBackendError(null);
        const result = await PurchaseService.getAll();
        if (result.success && result.data) {
          const backendPurchaseIds = new Set(result.data.map((p) => p.id));
          const currentPurchaseIds = new Set(purchases.map((p) => p.id));
          
          // Supprimer les achats qui n'existent plus dans le backend
          purchases.forEach((purchase) => {
            if (!backendPurchaseIds.has(purchase.id)) {
              removePurchase(purchase.id);
            }
          });
          
          // Synchroniser avec le store Zustand - seulement ajouter/mettre à jour
          result.data.forEach((purchase) => {
            const existing = purchases.find((p) => p.id === purchase.id);
            if (!existing) {
              // L'achat n'existe pas dans le store, on l'ajoute
              addPurchase(purchase);
            } else {
              // L'achat existe, on le met à jour si nécessaire
              updatePurchase(purchase.id, purchase);
            }
          });
        } else if (!result.success) {
          setBackendError(result.error || 'Erreur lors du chargement des achats.');
        }
      } catch (error: any) {
        console.error('Erreur lors du chargement des achats:', error);
        setBackendError(error?.message || 'Erreur lors du chargement des achats.');
      } finally {
        setBackendLoading(false);
      }
    };

    loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Charger une seule fois au montage

  useEffect(() => {
    if (activePanel !== 'create') {
      return;
    }
    setFormState((current) => ({
      ...current,
      vatRate: vatEnabled ? (current.vatRate || defaultVat.toString()) : '0',
    }));
  }, [activePanel, vatEnabled, defaultVat]);

  const filteredPurchases = useMemo(() => {
    const term = search.trim().toLowerCase();
    const start = periodStart ? new Date(periodStart) : null;
    const end = periodEnd ? new Date(periodEnd) : null;

    return purchases
      .filter((purchase) => {
        if (term) {
          const companyName = purchase.companyId
            ? getCompany(purchase.companyId)?.name ?? ''
            : '';
          const haystack = [
            purchase.vendor,
            purchase.reference,
            purchase.description ?? '',
            companyName,
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(term)) {
            return false;
          }
        }
        if (statusFilter !== 'Tous' && purchase.status !== statusFilter) {
          return false;
        }
        if (categoryFilter !== 'Toutes' && purchase.category !== categoryFilter) {
          return false;
        }
        if (start && new Date(purchase.date) < start) {
          return false;
        }
        if (end && new Date(purchase.date) > end) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [
    purchases,
    search,
    statusFilter,
    categoryFilter,
    periodStart,
    periodEnd,
    getCompany,
  ]);

  useEffect(() => {
    setSelectedRows((current) => {
      const next = new Set<string>();
      filteredPurchases.forEach((purchase) => {
        if (selectedIds.includes(purchase.id) || current.has(purchase.id)) {
          next.add(purchase.id);
        }
      });
      return next;
    });
  }, [filteredPurchases, selectedIds]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const totals = useMemo(() => {
    if (!filteredPurchases.length) {
      return { totalHt: 0, totalVat: 0, totalTtc: 0, monthlyAverage: 0 };
    }
    const totalHt = filteredPurchases.reduce((sum, purchase) => sum + purchase.amountHt, 0);
    const totalTtc = filteredPurchases.reduce((sum, purchase) => sum + purchase.amountTtc, 0);
    const totalVat = totalTtc - totalHt;

    const dates = filteredPurchases.map((purchase) => new Date(purchase.date)).sort((a, b) => a.getTime() - b.getTime());
    const effectiveStart = periodStart ? new Date(periodStart) : dates[0];
    const effectiveEnd = periodEnd ? new Date(periodEnd) : dates[dates.length - 1];
    const monthSpan =
      effectiveEnd.getFullYear() * 12 + effectiveEnd.getMonth() - (effectiveStart.getFullYear() * 12 + effectiveStart.getMonth());
    const monthCount = Math.max(monthSpan + 1, 1);
    const monthlyAverage = totalTtc / monthCount;

    return { totalHt, totalVat, totalTtc, monthlyAverage };
  }, [filteredPurchases, periodStart, periodEnd]);

  const purchaseKpis = useMemo(() => {
    return [
      {
        id: 'total',
        label: 'Achats enregistrés',
        value: filteredPurchases.length.toLocaleString('fr-FR'),
        helper: `${filteredPurchases.filter((p) => p.status === 'Payé').length} payés`,
      },
      {
        id: 'total-ttc',
        label: 'Montant total TTC',
        value: formatCurrency(totals.totalTtc),
        helper: `${formatCurrency(totals.totalHt)} HT`,
      },
      {
        id: 'monthly',
        label: 'Dépense mensuelle',
        value: formatCurrency(totals.monthlyAverage),
        helper: `Moyenne sur la période`,
      },
    ];
  }, [filteredPurchases, totals]);

  const allSelected = useMemo(
    () => filteredPurchases.length > 0 && filteredPurchases.every((purchase) => selectedRows.has(purchase.id)),
    [filteredPurchases, selectedRows]
  );

  const selectedData = useMemo(() => {
    return filteredPurchases.filter((purchase) => selectedRows.has(purchase.id));
  }, [filteredPurchases, selectedRows]);

  const detailPurchase = detailId ? purchases.find((purchase) => purchase.id === detailId) ?? null : null;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredPurchases.forEach((purchase) => next.delete(purchase.id));
        return next;
      });
      setSelectedIds((current) => current.filter((id) => !filteredPurchases.some((purchase) => purchase.id === id)));
    } else {
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredPurchases.forEach((purchase) => next.add(purchase.id));
        return next;
      });
      setSelectedIds((current) => [
        ...new Set([...current, ...filteredPurchases.map((purchase) => purchase.id)]),
      ]);
    }
  };

  const toggleRowSelection = (purchaseId: string) => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(purchaseId)) {
        next.delete(purchaseId);
      } else {
        next.add(purchaseId);
      }
      return next;
    });
    setSelectedIds((current) =>
      current.includes(purchaseId)
        ? current.filter((id) => id !== purchaseId)
        : [...current, purchaseId]
    );
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (periodStart) count++;
    if (periodEnd) count++;
    if (statusFilter !== 'Tous') count++;
    if (categoryFilter !== 'Toutes') count++;
    return count;
  }, [search, periodStart, periodEnd, statusFilter, categoryFilter]);

  const handleExport = () => {
    if (!filteredPurchases.length) {
      setFeedbackMessage('Aucun achat à exporter.');
      return;
    }
    const header = [
      'Date',
      'Société',
      'Fournisseur / Commande',
      'Montant HT',
      'TVA %',
      'Montant TTC',
      'Type',
      'Statut',
      'Récurrent',
    ];
    const rows = filteredPurchases.map((purchase) => [
      formatDate(purchase.date),
      purchase.companyId ? getCompany(purchase.companyId)?.name ?? '' : '',
      `${purchase.vendor}${purchase.reference ? ` (${purchase.reference})` : ''}`,
      purchase.amountHt.toFixed(2).replace('.', ','),
      purchase.vatRate.toString().replace('.', ','),
      purchase.amountTtc.toFixed(2).replace('.', ','),
      purchase.category,
      purchase.status,
      purchase.recurring ? 'Oui' : 'Non',
    ]);
    downloadCsv({ fileName: 'achats.csv', header, rows });
    setFeedbackMessage(`${rows.length} achat(s) exporté(s).`);
  };

  const handleBulkPrint = () => {
    if (!selectedIds.length) {
      return;
    }
    setFeedbackMessage(`${selectedIds.length} achat(s) prêt(s) à imprimer.`);
  };

  const closeForm = () => {
    setActivePanel(null);
    setEditingId(null);
    setFormState(buildFormState(null, defaultCompanyId, defaultVat));
  };

  const scrollToList = useCallback(() => {
    requestAnimationFrame(() => {
      listSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [defaultCompanyId, defaultVat]);

  const openCreate = () => {
    setActivePanel('create');
    setEditingId(null);
    setFormState(buildFormState(null, defaultCompanyId, defaultVat));
    setFeedback(null);
  };

  const openEdition = (purchase: Purchase) => {
    setActivePanel('edit');
    setEditingId(purchase.id);
    setFormState(buildFormState(purchase, defaultCompanyId, defaultVat));
    setFeedback(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const companyId = formState.companyId || null;
    const amountHt = parseFloat(formState.amountHt.replace(',', '.'));
    const vatValue = vatEnabled ? parseFloat(formState.vatRate.replace(',', '.')) : 0;
    if (!Number.isFinite(amountHt)) {
        setFeedbackMessage('Veuillez renseigner un montant HT valide.');
      return;
    }
    const payload = {
      companyId,
      vendor: formState.vendor.trim(),
      reference: formState.reference.trim(),
      description: formState.description.trim() || undefined,
      date: formState.date,
      amountHt,
      vatRate: Number.isFinite(vatValue) ? vatValue : 0,
      category: formState.category,
      status: formState.status,
      recurring: formState.recurring,
      notes: formState.notes.trim() || undefined,
      vehicleId: formState.vehicleId ? formState.vehicleId : null,
      kilometers: formState.kilometers ? Number(formState.kilometers) : null,
    };

    const handleSubmitAsync = async () => {
      try {
        if (editingId) {
          // Mise à jour
          const result = await PurchaseService.update(editingId, { ...payload, id: editingId });
          if (result.success && result.data) {
            updatePurchase(editingId, result.data);
            setFeedbackMessage('Achat mis à jour.');
          } else {
            setFeedbackMessage('Erreur lors de la mise à jour de l\'achat.');
            return;
          }
        } else {
          // Création
          const result = await PurchaseService.create(payload);
          if (result.success && result.data) {
            addPurchase(result.data);
            setFeedbackMessage('Achat enregistré.');
            setDetailId(null);
            setSelectedRows(new Set());
            setSelectedIds([]);
            scrollToList();
          } else {
            setFeedbackMessage('Erreur lors de l\'enregistrement de l\'achat.');
            return;
          }
        }
        closeForm();
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'achat:', error);
        setFeedbackMessage('Erreur lors de la sauvegarde de l\'achat.');
      }
    };

    void handleSubmitAsync();
  };

  const handleDelete = async (purchase: Purchase) => {
    if (!window.confirm(`Supprimer l'achat ${purchase.reference || purchase.vendor} ?`)) {
      return;
    }
    
    // Suppression optimiste : supprimer du store immédiatement
    removePurchase(purchase.id);
    setSelectedIds((current) => current.filter((id) => id !== purchase.id));
    setSelectedRows((current) => {
      const next = new Set(current);
      next.delete(purchase.id);
      return next;
    });
    if (detailId === purchase.id) {
      setDetailId(null);
    }
    
    try {
      const result = await PurchaseService.delete(purchase.id);
      
      // 404 = l'achat n'existe pas dans la base, c'est OK (déjà supprimé)
      const isNotFound = result.error && (result.error.includes('404') || result.error.includes('non trouvée'));
      
      if (!result.success && !isNotFound) {
        // Erreur autre que 404, recharger pour resynchroniser
        console.warn('Erreur lors de la suppression côté backend, rechargement des achats...');
        const reloadResult = await PurchaseService.getAll();
        if (reloadResult.success && reloadResult.data) {
          // Supprimer les achats qui n'existent plus dans le backend
          purchases.forEach((p) => {
            if (!reloadResult.data!.some((bp) => bp.id === p.id)) {
              removePurchase(p.id);
            }
          });
          // Ajouter/mettre à jour les achats du backend
          reloadResult.data.forEach((p) => {
            const existing = purchases.find((ep) => ep.id === p.id);
            if (!existing) {
              addPurchase(p);
            } else {
              updatePurchase(p.id, p);
            }
          });
        }
        setFeedbackMessage('Erreur lors de la suppression. Les données ont été resynchronisées.');
      } else {
        // Succès ou 404 (n'existe pas, c'est OK)
        setFeedbackMessage('Achat supprimé.');
      }
    } catch (error: any) {
      console.error('Exception lors de la suppression de l\'achat:', error);
      // En cas d'erreur, recharger pour resynchroniser
      try {
        const reloadResult = await PurchaseService.getAll();
        if (reloadResult.success && reloadResult.data) {
          purchases.forEach((p) => {
            if (!reloadResult.data!.some((bp) => bp.id === p.id)) {
              removePurchase(p.id);
            }
          });
          reloadResult.data.forEach((p) => {
            const existing = purchases.find((ep) => ep.id === p.id);
            if (!existing) {
              addPurchase(p);
            } else {
              updatePurchase(p.id, p);
            }
          });
        }
      } catch (reloadError) {
        console.error('Erreur lors du rechargement:', reloadError);
      }
      setFeedbackMessage('Achat supprimé localement. Synchronisation en cours...');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) {
      return;
    }
    if (!window.confirm(`Supprimer ${selectedRows.size} achat(s) sélectionné(s) ?`)) {
      return;
    }
    
    const selectedIdsArray = Array.from(selectedRows);
    
    // Suppression optimiste : supprimer du store immédiatement
    bulkRemovePurchases(selectedIdsArray);
    setSelectedRows(new Set());
    setSelectedIds([]);
    
    try {
      // Supprimer chaque achat via l'API
      const deletePromises = selectedIdsArray.map((id) => PurchaseService.delete(id));
      const results = await Promise.all(deletePromises);
      
      // Compter les erreurs (404 est OK, l'achat n'existe pas)
      const realErrors = results.filter((r) => {
        if (!r.success && r.error) {
          const isNotFound = r.error.includes('404') || r.error.includes('non trouvée');
          return !isNotFound;
        }
        return false;
      });
      
      if (realErrors.length > 0) {
        console.warn('Certaines suppressions ont échoué, rechargement des achats...');
        // Recharger pour resynchroniser
        const reloadResult = await PurchaseService.getAll();
        if (reloadResult.success && reloadResult.data) {
          purchases.forEach((p) => {
            if (!reloadResult.data!.some((bp) => bp.id === p.id)) {
              removePurchase(p.id);
            }
          });
          reloadResult.data.forEach((p) => {
            const existing = purchases.find((ep) => ep.id === p.id);
            if (!existing) {
              addPurchase(p);
            } else {
              updatePurchase(p.id, p);
            }
          });
        }
        setFeedbackMessage(`${selectedIdsArray.length - realErrors.length} achat(s) supprimé(s). ${realErrors.length} erreur(s).`);
      } else {
        setFeedbackMessage(`${selectedIdsArray.length} achat(s) supprimé(s).`);
      }
    } catch (error: any) {
      console.error('Erreur lors de la suppression en masse:', error);
      // Recharger pour resynchroniser
      try {
        const reloadResult = await PurchaseService.getAll();
        if (reloadResult.success && reloadResult.data) {
          purchases.forEach((p) => {
            if (!reloadResult.data!.some((bp) => bp.id === p.id)) {
              removePurchase(p.id);
            }
          });
          reloadResult.data.forEach((p) => {
            const existing = purchases.find((ep) => ep.id === p.id);
            if (!existing) {
              addPurchase(p);
            } else {
              updatePurchase(p.id, p);
            }
          });
        }
      } catch (reloadError) {
        console.error('Erreur lors du rechargement:', reloadError);
      }
      setFeedbackMessage('Achats supprimés localement. Synchronisation en cours...');
    }
  };

  const handleCreateVehicle = () => {
    if (!vehicleForm.name.trim()) {
      setFeedbackMessage('Veuillez renseigner un nom pour le véhicule.');
      return;
    }
    const mileage = parseFloat(vehicleForm.mileage.replace(',', '.')) || 0;
    const usageRate = parseFloat(vehicleForm.usageRate.replace(',', '.')) || 0;
    const costPerKm = parseFloat(vehicleForm.costPerKm.replace(',', '.')) || 0;
    
    if (costPerKm <= 0) {
      setFeedbackMessage('Veuillez renseigner un coût au kilomètre valide.');
      return;
    }
    
    const vehiclePayload: any = {
      name: vehicleForm.name.trim(),
      mileage,
      usageRate,
      costPerKm,
      active: true,
    };
    
    // Ajouter companyId si sélectionné
    if (vehicleForm.companyId) {
      vehiclePayload.companyId = vehicleForm.companyId;
    }
    
    if (editingVehicleId) {
      // Mise à jour
      updateVehicle(editingVehicleId, vehiclePayload);
      setFeedbackMessage('Véhicule mis à jour.');
    } else {
      // Création
      addVehicle(vehiclePayload);
      setFeedbackMessage('Véhicule créé avec succès.');
    }
    
    setVehicleForm({ name: '', mileage: '', usageRate: '', costPerKm: '', companyId: '' });
    setEditingVehicleId(null);
    setShowCreateVehicle(false);
  };

  const closeVehicleModal = () => {
    setShowCreateVehicle(false);
    setEditingVehicleId(null);
    setVehicleForm({ name: '', mileage: '', usageRate: '', costPerKm: '', companyId: '' });
  };

  const isEditingPurchase = Boolean(editingId);
  const purchaseModalEyebrow = isEditingPurchase ? 'MODIFIER UN ACHAT' : 'CRÉER UN ACHAT';
  const purchaseModalTitle = isEditingPurchase ? 'Modifier un achat' : 'Nouvel achat';
  const purchaseModalSubtitle = isEditingPurchase
    ? 'Mettez à jour les informations de l’achat. Les modifications seront enregistrées immédiatement.'
    : 'Renseignez les informations essentielles pour enregistrer un nouvel achat fournisseur.';


  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  return (
    <div className="dashboard-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Gestion des achats</p>
            <h1 className="dashboard-hero__title">Achats</h1>
            <p className="dashboard-hero__subtitle">
              Consolidez vos factures fournisseurs, associez-les à vos sociétés {BRAND_NAME} et anticipez la trésorerie.
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      <CRMFeedback message={feedback} />

      <section className="space-y-4">
        <CRMBackendStatus
          loading={backendLoading}
          error={backendError}
          loadingMessage="Synchronisation des achats avec le serveur…"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {purchaseKpis.map((kpi, index) => {
            const Icon = [ShoppingCart, TrendingUp, FileText][index] ?? ShoppingCart;
            return (
              <div key={kpi.id} className="dashboard-kpi group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="dashboard-kpi__eyebrow">{kpi.label}</p>
                    <p className="dashboard-kpi__value">{kpi.value}</p>
                    <p className="dashboard-kpi__description">{kpi.helper}</p>
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

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-4">
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
                    label: 'Supprimer',
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: handleBulkDelete,
                    variant: 'danger' as const,
                  },
                ]}
              />
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                className={clsx(
                  'relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition',
                  showFilters || activeFiltersCount > 0
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/40'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                )}
              >
                <Filter className="h-4 w-4" />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white dark:bg-blue-500">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreateVehicle(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Créer un véhicule</span>
                <span className="sm:hidden">Véhicule</span>
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Nouvel achat
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="purchase-search">
                  Recherche
                </label>
                <input
                  id="purchase-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Fournisseur, référence, société"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="purchase-start">
                  Période du
                </label>
                <input
                  id="purchase-start"
                  type="date"
                  value={periodStart}
                  onChange={(event) => setPeriodStart(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="purchase-end">
                  Au
                </label>
                <input
                  id="purchase-end"
                  type="date"
                  value={periodEnd}
                  onChange={(event) => setPeriodEnd(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="purchase-status">
                  Statut
                </label>
                <select
                  id="purchase-status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'Tous' | PurchaseStatus)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="Tous">Tous</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="purchase-category">
                  Type d'achat
                </label>
                <select
                  id="purchase-category"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as 'Toutes' | PurchaseCategory)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="Toutes">Tous</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPeriodStart('');
                  setPeriodEnd('');
                  setStatusFilter('Tous');
                  setCategoryFilter('Toutes');
                }}
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <X className="h-4 w-4" />
                Effacer les filtres
              </button>
            )}
          </div>
        )}
      </section>

      <div ref={listSectionRef} className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)] lg:block">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-4 w-12" />
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Fournisseur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Société
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Montant TTC
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Lignes épinglées pour les véhicules */}
              {vehicles.map((vehicle) => {
                const vehicleCompany = (vehicle as any).companyId ? getCompany((vehicle as any).companyId) : null;
                return (
                  <tr
                    key={`vehicle-${vehicle.id}`}
                    className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800">
                          <Car className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatDate(new Date().toISOString().slice(0, 10))}
                      </p>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {vehicle.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {vehicle.mileage.toLocaleString('fr-FR')} km
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {vehicleCompany?.name || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {vehicle.costPerKm.toFixed(2)} €/km
                      </p>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className="text-sm text-slate-600 dark:text-slate-300">Véhicule</span>
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Actif
                      </span>
                    </td>
                    <td className="px-6 py-4 align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const vehicleCompanyId = (vehicle as any).companyId || '';
                            setVehicleForm({
                              name: vehicle.name,
                              mileage: vehicle.mileage.toString(),
                              usageRate: vehicle.usageRate.toString(),
                              costPerKm: vehicle.costPerKm.toString(),
                              companyId: vehicleCompanyId,
                            });
                            setEditingVehicleId(vehicle.id);
                            setShowCreateVehicle(true);
                          }}
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          title="Modifier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Supprimer le véhicule ${vehicle.name} ?`)) {
                              removeVehicle(vehicle.id);
                              setFeedbackMessage('Véhicule supprimé.');
                            }
                          }}
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPurchases.map((purchase) => {
                const companyLabel = purchase.companyId
                  ? getCompany(purchase.companyId)?.name ?? '—'
                  : '—';
                const isSelected = selectedRows.has(purchase.id);
                return (
                  <tr
                    key={purchase.id}
                    className={clsx(
                      'group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/10',
                      isSelected && 'bg-blue-50/50 dark:bg-blue-500/10'
                    )}
                  >
                    <td className="px-6 py-5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(purchase.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatDate(purchase.date)}
                      </p>
                      {purchase.recurring && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Récurrent</p>
                      )}
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {purchase.vendor}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {[purchase.description, purchase.reference].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {companyLabel}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {toCurrency(purchase.amountTtc)}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {toCurrency(purchase.amountHt)} HT · {purchase.vatRate}%
                      </p>
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {purchase.category}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border',
                          purchaseStatusClasses[purchase.status]
                        )}
                      >
                        {purchase.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-start gap-2 opacity-100 transition group-hover:translate-x-[1px] group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setDetailId(purchase.id)}
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                          title="Voir le détail"
                        >
                          <IconDocument />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdition(purchase)}
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          title="Modifier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(purchase)}
                          className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {filteredPurchases.map((purchase) => {
          const companyLabel = purchase.companyId
            ? getCompany(purchase.companyId)?.name ?? '—'
            : '—';
          const isSelected = selectedRows.has(purchase.id);
          return (
            <div
              key={purchase.id}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 items-start gap-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(purchase.id)}
                    onChange={() => toggleRowSelection(purchase.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                      {purchase.vendor}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {[purchase.description, purchase.reference].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border',
                          purchaseStatusClasses[purchase.status]
                        )}
                      >
                        {purchase.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {purchase.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {formatDate(purchase.date)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Société</span>
                  <span className="text-slate-800 dark:text-slate-100">{companyLabel}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="font-medium">Montant TTC</span>
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {toCurrency(purchase.amountTtc)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {toCurrency(purchase.amountHt)} HT · {purchase.vatRate}% TVA
                </p>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setDetailId(purchase.id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/40"
                >
                  <IconDocument className="h-4 w-4" />
                  Détail
                </button>
                <button
                  type="button"
                  onClick={() => openEdition(purchase)}
                  className="rounded-lg bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="Modifier"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(purchase)}
                  className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/40"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredPurchases.length === 0 && (
        <CRMEmptyState
          message="Aucun achat sur la période sélectionnée. Ajustez vos filtres ou créez un nouvel achat."
        />
      )}


      <CRMModal isOpen={Boolean(activePanel)} onClose={closeForm} maxWidth="7xl">
        <form
          ref={purchaseModalFormRef}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          <CRMModalHeader
            eyebrow={purchaseModalEyebrow}
            title={purchaseModalTitle}
            description={purchaseModalSubtitle}
            onClose={closeForm}
            className="[&_h2]:text-slate-900 [&_h2]:dark:text-slate-100"
          />

          {feedback && (
            <CRMFeedback message={feedback} />
          )}

          {/* Contenu principal du formulaire */}
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Colonne gauche : Champs du formulaire */}
            <div className="space-y-6">
              {/* Informations générales */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                  Informations générales
                </h3>
                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <CRMFormLabel htmlFor="purchase-company">Société</CRMFormLabel>
                    <CRMFormSelect
                      id="purchase-company"
                      value={formState.companyId}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, companyId: event.target.value }))
                      }
                    >
                      <option value="">Non affecté</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </CRMFormSelect>
                  </div>
                  <div>
                    <CRMFormLabel htmlFor="purchase-date" required>Date</CRMFormLabel>
                    <CRMFormInput
                      id="purchase-date"
                      type="date"
                      value={formState.date}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, date: event.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div>
                  <CRMFormLabel htmlFor="purchase-vendor" required>
                    Fournisseur / Commande
                  </CRMFormLabel>
                  <CRMFormInput
                    id="purchase-vendor"
                    type="text"
                    value={formState.vendor}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, vendor: event.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <CRMFormLabel htmlFor="purchase-reference">Référence</CRMFormLabel>
                  <CRMFormInput
                    id="purchase-reference"
                    type="text"
                    value={formState.reference}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, reference: event.target.value }))
                    }
                    placeholder="Numéro de facture, commande..."
                  />
                </div>
                <div>
                  <CRMFormLabel htmlFor="purchase-description">Description</CRMFormLabel>
                  <CRMFormTextarea
                    id="purchase-description"
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={3}
                    placeholder="Détails de l'achat..."
                  />
                </div>
              </div>

              {/* Montants */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                  Montants
                </h3>
                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <CRMFormLabel htmlFor="purchase-amount" required>Montant HT (€)</CRMFormLabel>
                    <CRMFormInput
                      id="purchase-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formState.amountHt}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, amountHt: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <CRMFormLabel htmlFor="purchase-vat">
                      TVA (%)
                      {!vatEnabled && (
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          (désactivée)
                        </span>
                      )}
                    </CRMFormLabel>
                    <CRMFormInput
                      id="purchase-vat"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formState.vatRate}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, vatRate: event.target.value }))
                      }
                      disabled={!vatEnabled}
                      placeholder={vatEnabled ? String(vatRate) : '0'}
                    />
                    {vatEnabled && (
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        Taux par défaut de l'entreprise : {vatRate}%
                      </p>
                    )}
                  </div>
                </div>
                {(() => {
                  const amountHt = parseFloat(formState.amountHt.replace(',', '.')) || 0;
                  const vatRateValue = parseFloat(formState.vatRate.replace(',', '.')) || 0;
                  const vatAmount = amountHt * (vatRateValue / 100);
                  const amountTtc = amountHt + vatAmount;
                  
                  return (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Montant HT :</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formState.amountHt ? toCurrency(amountHt) : '0,00 €'}
                        </span>
                      </div>
                      {vatRateValue > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">
                            TVA ({vatRateValue}%) :
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {formState.amountHt ? toCurrency(Math.round(vatAmount * 100) / 100) : '0,00 €'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Montant TTC :
                        </span>
                        <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                          {formState.amountHt ? toCurrency(Math.round(amountTtc * 100) / 100) : '0,00 €'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Classification */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                  Classification
                </h3>
                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <CRMFormLabel htmlFor="purchase-category-form">Type d'achat</CRMFormLabel>
                    <CRMFormSelect
                      id="purchase-category-form"
                      value={formState.category}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          category: event.target.value as PurchaseCategory,
                        }))
                      }
                    >
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </CRMFormSelect>
                  </div>
                  <div>
                    <CRMFormLabel htmlFor="purchase-status-form">Statut</CRMFormLabel>
                    <CRMFormSelect
                      id="purchase-status-form"
                      value={formState.status}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          status: event.target.value as PurchaseStatus,
                        }))
                      }
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </CRMFormSelect>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                  <input
                    id="purchase-recurring"
                    type="checkbox"
                    checked={formState.recurring}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, recurring: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <CRMFormLabel htmlFor="purchase-recurring" className="mb-0 cursor-pointer">
                    Achat récurrent
                  </CRMFormLabel>
                </div>
              </div>

              {/* Véhicule (optionnel) */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                  Véhicule associé (optionnel)
                </h3>
                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <CRMFormLabel htmlFor="purchase-vehicle">Véhicule</CRMFormLabel>
                    <CRMFormSelect
                      id="purchase-vehicle"
                      value={formState.vehicleId}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, vehicleId: event.target.value }))
                      }
                    >
                      <option value="">Aucun</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.name}
                        </option>
                      ))}
                    </CRMFormSelect>
                  </div>
                  <div>
                    <CRMFormLabel htmlFor="purchase-km">Kilomètres</CRMFormLabel>
                    <CRMFormInput
                      id="purchase-km"
                      type="number"
                      min="0"
                      value={formState.kilometers}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, kilometers: event.target.value }))
                      }
                      placeholder="Si lié au véhicule"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
                  Notes complémentaires
                </h3>
                <div>
                  <CRMFormLabel htmlFor="purchase-notes">Notes</CRMFormLabel>
                  <CRMFormTextarea
                    id="purchase-notes"
                    value={formState.notes}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, notes: event.target.value }))
                    }
                    rows={4}
                    placeholder="Informations supplémentaires, remarques..."
                  />
                </div>
              </div>
            </div>

            {/* Colonne droite : Résumé / Aide contextuelle */}
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Résumé
                </h4>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  {(() => {
                    const amountHt = parseFloat(formState.amountHt.replace(',', '.')) || 0;
                    const vatRate = parseFloat(formState.vatRate.replace(',', '.')) || 0;
                    const amountTtc = computeTtcFromStrings(formState.amountHt, formState.vatRate);
                    const vatAmount = amountTtc - amountHt;
                    return (
                      <>
                        <div className="flex justify-between">
                          <span>Montant HT :</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formState.amountHt ? toCurrency(amountHt) : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>TVA ({vatRate}%) :</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formState.amountHt ? toCurrency(vatAmount) : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">Montant TTC :</span>
                          <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                            {formState.amountHt ? toCurrency(amountTtc) : '—'}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-white p-4 dark:border-blue-800 dark:bg-slate-900">
                <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  💡 Astuce
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  Les achats récurrents sont automatiquement marqués pour faciliter le suivi des dépenses régulières (abonnements, contrats, etc.).
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <CRMCancelButton onClick={closeForm} />
            <CRMSubmitButton type="submit">
              {!isEditingPurchase && <IconPlus className="h-4 w-4" />}
              {isEditingPurchase ? 'Enregistrer les modifications' : "Créer l'achat"}
            </CRMSubmitButton>
          </div>
        </form>
      </CRMModal>

      {/* Modal de création de véhicule */}
      <CRMModal isOpen={showCreateVehicle} onClose={closeVehicleModal} maxWidth="2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateVehicle();
          }}
          className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          <CRMModalHeader
            eyebrow={editingVehicleId ? 'MODIFIER UN VÉHICULE' : 'CRÉER UN VÉHICULE'}
            title={editingVehicleId ? 'Modifier le véhicule' : 'Nouveau véhicule'}
            description={editingVehicleId ? 'Mettez à jour les informations du véhicule.' : 'Renseignez les informations du véhicule pour le suivi des coûts et du kilométrage.'}
            onClose={closeVehicleModal}
            className="[&_h2]:text-slate-900 [&_h2]:dark:text-slate-100"
          />

          {feedback && (
            <CRMFeedback message={feedback} />
          )}

          <div className="space-y-4">
            <div>
              <CRMFormLabel htmlFor="vehicle-name" required>
                Nom du véhicule
              </CRMFormLabel>
              <CRMFormInput
                id="vehicle-name"
                type="text"
                value={vehicleForm.name}
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Ex: Renault Master"
                required
              />
            </div>
            <div>
              <CRMFormLabel htmlFor="vehicle-company">
                Société affiliée
              </CRMFormLabel>
              <CRMFormSelect
                id="vehicle-company"
                value={vehicleForm.companyId}
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, companyId: event.target.value }))
                }
              >
                <option value="">Aucune société</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </CRMFormSelect>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div>
                <CRMFormLabel htmlFor="vehicle-mileage">
                  Kilométrage actuel
                </CRMFormLabel>
                <CRMFormInput
                  id="vehicle-mileage"
                  type="number"
                  min="0"
                  value={vehicleForm.mileage}
                  onChange={(event) =>
                    setVehicleForm((current) => ({ ...current, mileage: event.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="vehicle-usage-rate">
                  Taux d'utilisation (%)
                </CRMFormLabel>
                <CRMFormInput
                  id="vehicle-usage-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={vehicleForm.usageRate}
                  onChange={(event) =>
                    setVehicleForm((current) => ({ ...current, usageRate: event.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <CRMFormLabel htmlFor="vehicle-cost-per-km" required>
                Coût au kilomètre (€)
              </CRMFormLabel>
              <CRMFormInput
                id="vehicle-cost-per-km"
                type="number"
                min="0"
                step="0.01"
                value={vehicleForm.costPerKm}
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, costPerKm: event.target.value }))
                }
                placeholder="0.00"
                required
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Coût moyen par kilomètre parcouru (carburant, entretien, etc.)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <CRMCancelButton onClick={closeVehicleModal} />
            <CRMSubmitButton type="submit">
              {!editingVehicleId && <IconPlus className="h-4 w-4" />}
              {editingVehicleId ? 'Enregistrer les modifications' : 'Créer le véhicule'}
            </CRMSubmitButton>
          </div>
        </form>
      </CRMModal>

    </div>
  );
};

export default PurchasesPage;
