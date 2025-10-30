import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import { RowActionButton } from '../components/RowActionButton';
import { IconDocument, IconEdit, IconPlus, IconTrash } from '../components/icons';
import { useAppData, Purchase, PurchaseCategory, PurchaseStatus } from '../store/useAppData';
import { BRAND_NAME } from '../lib/branding';
import { formatCurrency, formatDate } from '../lib/format';

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
  Brouillon: 'border-slate-300 text-slate-500 bg-white',
  Validé: 'border-emerald-300 text-emerald-600 bg-emerald-50/50',
  Payé: 'border-primary/40 text-primary bg-primary/5',
  Annulé: 'border-rose-300 text-rose-600 bg-rose-50/50',
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

type FuelFormState = {
  vehicleId: string;
  companyId: string;
  kilometers: string;
  date: string;
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

const buildFuelForm = (companyId: string, vehicleId: string | undefined): FuelFormState => ({
  companyId,
  vehicleId: vehicleId ?? '',
  kilometers: '',
  date: new Date().toISOString().slice(0, 10),
});

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PurchaseFormState>(
    buildFormState(null, defaultCompanyId, defaultVat)
  );
  const [fuelState, setFuelState] = useState<FuelFormState>(
    buildFuelForm(defaultCompanyId, vehicles[0]?.id)
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const listSectionRef = useRef<HTMLDivElement | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => purchases.some((purchase) => purchase.id === id)));
  }, [purchases]);

  useEffect(() => {
    if (!detailId) {
      return;
    }
    if (!purchases.some((purchase) => purchase.id === detailId)) {
      setDetailId(null);
    }
  }, [detailId, purchases]);

  useEffect(() => {
    if (!activePanel || !formRef.current) {
      return;
    }
    formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      const focusable = formRef.current?.querySelector<HTMLElement>('input, select, textarea');
      focusable?.focus({ preventScroll: true });
    }, 160);
  }, [activePanel]);

  useEffect(() => {
    if (!detailId || !detailRef.current) {
      return;
    }
    detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [detailId]);

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

  const allSelected =
    filteredPurchases.length > 0 && filteredPurchases.every((purchase) => selectedIds.includes(purchase.id));

  const detailPurchase = detailId ? purchases.find((purchase) => purchase.id === detailId) ?? null : null;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredPurchases.some((purchase) => purchase.id === id)));
      return;
    }
    setSelectedIds((current) => [
      ...new Set([...current, ...filteredPurchases.map((purchase) => purchase.id)]),
    ]);
  };

  const handleRowSelection = (purchaseId: string) => {
    setSelectedIds((current) =>
      current.includes(purchaseId)
        ? current.filter((id) => id !== purchaseId)
        : [...current, purchaseId]
    );
  };

  const handleExport = () => {
    if (!filteredPurchases.length) {
      setFeedback('Aucun achat à exporter.');
      return;
    }
    const separator = ';';
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
    const lines = filteredPurchases.map((purchase) =>
      buildCsvLine(
        [
          formatDate(purchase.date),
          purchase.companyId ? getCompany(purchase.companyId)?.name ?? '' : '',
          `${purchase.vendor}${purchase.reference ? ` (${purchase.reference})` : ''}`,
          purchase.amountHt.toFixed(2).replace('.', ','),
          purchase.vatRate.toString().replace('.', ','),
          purchase.amountTtc.toFixed(2).replace('.', ','),
          purchase.category,
          purchase.status,
          purchase.recurring ? 'Oui' : 'Non',
        ],
        separator
      )
    );
    const content = [header.join(separator), ...lines].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'washandgo-achats.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedback('Export CSV généré.');
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
      setFeedback('Veuillez renseigner un montant HT valide.');
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

    if (editingId) {
      updatePurchase(editingId, payload);
      setFeedback('Achat mis à jour.');
    } else {
      const created = addPurchase(payload);
      setFeedback('Achat enregistré.');
      setDetailId(null);
      setSelectedIds([]);
      scrollToList();
    }
    closeForm();
  };

  const handleDelete = (purchase: Purchase) => {
    if (!window.confirm(`Supprimer l'achat ${purchase.reference || purchase.vendor} ?`)) {
      return;
    }
    removePurchase(purchase.id);
    setSelectedIds((current) => current.filter((id) => id !== purchase.id));
    if (detailId === purchase.id) {
      setDetailId(null);
    }
    setFeedback('Achat supprimé.');
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) {
      return;
    }
    if (!window.confirm(`Supprimer ${selectedIds.length} achat(s) sélectionné(s) ?`)) {
      return;
    }
    bulkRemovePurchases(selectedIds);
    setSelectedIds([]);
    setFeedback('Achats supprimés.');
  };

  const selectedVehicle = fuelState.vehicleId
    ? vehicles.find((vehicle) => vehicle.id === fuelState.vehicleId) ?? null
    : null;
  const fuelKilometers = parseFloat(fuelState.kilometers.replace(',', '.'));
  const fuelCost = selectedVehicle && Number.isFinite(fuelKilometers)
    ? Math.round(fuelKilometers * selectedVehicle.costPerKm * 100) / 100
    : 0;

  const handleFuelSubmit = () => {
    if (!selectedVehicle || !Number.isFinite(fuelKilometers) || fuelKilometers <= 0) {
      setFeedback('Renseignez un véhicule et un kilométrage valide.');
      return;
    }
    const companyId = fuelState.companyId || null;
    const vatValue = vatEnabled ? vatRate : 0;
    const created = addPurchase({
      companyId,
      vendor: `Carburant ${selectedVehicle.name}`,
      reference: `FUEL-${Date.now()}`,
      description: `Kilométrage estimé ${fuelKilometers} km`,
      date: fuelState.date,
      amountHt: fuelCost,
      vatRate: vatValue,
      category: 'Carburant',
      status: 'Validé',
      recurring: true,
      notes: undefined,
      vehicleId: selectedVehicle.id,
      kilometers: fuelKilometers,
    });
    setFuelState(buildFuelForm(defaultCompanyId, selectedVehicle.id));
    setFeedback('Estimation carburant ajoutée.');
    setDetailId(created.id);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-slate-900">Achats</h1>
          <p className="text-[13px] text-slate-500">
            Suivez vos dépenses, rapprochez-les des sociétés {BRAND_NAME} et préparez vos marges.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport}>
            Exporter CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <IconPlus />
            Nouvel achat
          </Button>
        </div>
      </header>

      <Card className="shadow-none border-slate-200/80">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Total HT</p>
            <p className="mt-1 text-[20px] font-semibold text-slate-900">{toCurrency(totals.totalHt)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Total TVA</p>
            <p className="mt-1 text-[20px] font-semibold text-slate-900">{toCurrency(totals.totalVat)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Total TTC</p>
            <p className="mt-1 text-[20px] font-semibold text-slate-900">{toCurrency(totals.totalTtc)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Dépense mensuelle moyenne</p>
            <p className="mt-1 text-[20px] font-semibold text-slate-900">{toCurrency(totals.monthlyAverage)}</p>
          </div>
        </div>
      </Card>

      <Card className="shadow-none border-slate-200/80">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-search">
              Recherche
            </label>
            <input
              id="purchase-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-48 rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-start">
              Période du
            </label>
            <input
              id="purchase-start"
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-end">
              au
            </label>
            <input
              id="purchase-end"
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-status">
              Statut
            </label>
            <select
              id="purchase-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'Tous' | PurchaseStatus)}
              className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="Tous">Tous</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-category">
              Type d'achat
            </label>
            <select
              id="purchase-category"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as 'Toutes' | PurchaseCategory)
              }
              className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="Toutes">Tous</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1" />
          {selectedIds.length > 0 && (
            <Button variant="secondary" size="sm" onClick={handleBulkDelete}>
              Supprimer la sélection
            </Button>
          )}
        </div>
      </Card>

      <div ref={listSectionRef}>
        <Card className="shadow-none border-slate-200/80">
          <Table
          columns={[
            <input
              key="select-all"
              type="checkbox"
              className="table-checkbox h-4 w-4 rounded focus:ring-primary"
              checked={allSelected}
              onChange={handleToggleSelectAll}
            />,
            'Date',
            'Société',
            'Description',
            'Montant HT',
            'TVA',
            'Montant TTC',
            'Type',
            'Statut',
            'Actions',
          ]}
          rows={filteredPurchases.map((purchase) => {
            const companyLabel = purchase.companyId
              ? getCompany(purchase.companyId)?.name ?? '—'
              : '—';
            const isSelected = selectedIds.includes(purchase.id);
            return [
              <input
                key={`select-${purchase.id}`}
                type="checkbox"
                className="table-checkbox h-4 w-4 rounded focus:ring-primary"
                checked={isSelected}
                onChange={() => handleRowSelection(purchase.id)}
              />,
              <div>
                <p className="text-[12px] font-medium text-slate-800">{formatDate(purchase.date)}</p>
                {purchase.recurring && (
                  <p className="text-[11px] text-slate-500">Récurrent</p>
                )}
              </div>,
              <div className="text-[12px] text-slate-700">{companyLabel}</div>,
              <div className="space-y-1">
                <p className="text-[12px] font-medium text-slate-800">{purchase.vendor}</p>
                <p className="text-[11px] text-slate-500">
                  {[purchase.description, purchase.reference].filter(Boolean).join(' · ')}
                </p>
              </div>,
              <div className="text-[12px] text-slate-800">{toCurrency(purchase.amountHt)}</div>,
              <div className="text-[12px] text-slate-800">{purchase.vatRate}%</div>,
              <div className="text-[12px] font-medium text-slate-900">{toCurrency(purchase.amountTtc)}</div>,
              <div className="text-[12px] text-slate-700">{purchase.category}</div>,
              <span
                key={`status-${purchase.id}`}
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] ${purchaseStatusClasses[purchase.status]}`}
              >
                {purchase.status}
              </span>,
              <div className="flex items-center gap-1">
                <RowActionButton label="Voir le détail" onClick={() => setDetailId(purchase.id)}>
                  <IconDocument />
                </RowActionButton>
                <RowActionButton label="Modifier" onClick={() => openEdition(purchase)}>
                  <IconEdit />
                </RowActionButton>
                <RowActionButton label="Supprimer" onClick={() => handleDelete(purchase)} tone="danger">
                  <IconTrash />
                </RowActionButton>
              </div>,
            ];
          })}
          tone="plain"
          density="compact"
          striped={false}
          onRowClick={(index) => {
            const target = filteredPurchases[index];
            if (target) {
              setDetailId(target.id);
            }
          }}
          rowClassName={(index) =>
            clsx(
              selectedIds.includes(filteredPurchases[index]?.id ?? '')
                ? 'bg-primary/5'
                : undefined
            )
          }
        />
          {!filteredPurchases.length && (
            <p className="px-3 py-3 text-[12px] text-slate-500">
              Aucun achat sur la période sélectionnée.
            </p>
          )}
        </Card>
      </div>

      <Card className="shadow-none border-slate-200/80">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Carburant / Déplacements</h2>
            <p className="mb-4 text-[12px] text-slate-500">
              Estimez vos coûts carburant à partir de vos véhicules référencés.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="fuel-vehicle">
                  Véhicule
                </label>
                <select
                  id="fuel-vehicle"
                  value={fuelState.vehicleId}
                  onChange={(event) =>
                    setFuelState((current) => ({ ...current, vehicleId: event.target.value }))
                  }
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Sélectionnez</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="fuel-company">
                  Société
                </label>
                <select
                  id="fuel-company"
                  value={fuelState.companyId}
                  onChange={(event) =>
                    setFuelState((current) => ({ ...current, companyId: event.target.value }))
                  }
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Non affecté</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="fuel-date">
                  Date
                </label>
                <input
                  id="fuel-date"
                  type="date"
                  value={fuelState.date}
                  onChange={(event) =>
                    setFuelState((current) => ({ ...current, date: event.target.value }))
                  }
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="fuel-km">
                  Kilomètres parcourus
                </label>
                <input
                  id="fuel-km"
                  type="number"
                  min="0"
                  value={fuelState.kilometers}
                  onChange={(event) =>
                    setFuelState((current) => ({ ...current, kilometers: event.target.value }))
                  }
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-slate-600">
                Coût estimé : <span className="font-semibold text-slate-900">{toCurrency(fuelCost)}</span>
              </p>
              <Button size="sm" onClick={handleFuelSubmit}>
                Ajouter à la liste
              </Button>
            </div>
          </div>
          {detailPurchase ? (
            <div ref={detailRef}>
              <h2 className="text-[15px] font-semibold text-slate-900">Détail de l'achat</h2>
              <div className="mt-3 space-y-2 text-[12px] text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">Fournisseur :</span> {detailPurchase.vendor}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Référence :</span>{' '}
                  {detailPurchase.reference || '—'}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Société :</span>{' '}
                  {detailPurchase.companyId ? getCompany(detailPurchase.companyId)?.name ?? '—' : '—'}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Montants :</span>{' '}
                  {toCurrency(detailPurchase.amountHt)} HT · {detailPurchase.vatRate}% ·{' '}
                  {toCurrency(detailPurchase.amountTtc)} TTC
                </p>
                <p>
                  <span className="font-medium text-slate-800">Type :</span> {detailPurchase.category}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Statut :</span> {detailPurchase.status}
                </p>
                {detailPurchase.notes && (
                  <p>
                    <span className="font-medium text-slate-800">Notes :</span> {detailPurchase.notes}
                  </p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setDetailId(null)}>
                  Fermer
                </Button>
                <Button size="sm" onClick={() => openEdition(detailPurchase)}>
                  Modifier
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Sélection</h2>
              <p className="mt-3 text-[12px] text-slate-500">
                Sélectionnez une ligne pour consulter le détail de l'achat.
              </p>
            </div>
          )}
        </div>
      </Card>

      {activePanel && (
        <div ref={formRef}>
          <Card className="shadow-none border-slate-200/80">
            <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-slate-900">
                {editingId ? 'Modifier un achat' : 'Nouvel achat'}
              </h2>
              <Button variant="secondary" size="sm" onClick={closeForm} type="button">
                Fermer
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-company">
                  Société
                </label>
                <select
                  id="purchase-company"
                  value={formState.companyId}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, companyId: event.target.value }))
                  }
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Non affecté</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-vendor">
                  Fournisseur / Commande
                </label>
                <input
                  id="purchase-vendor"
                  type="text"
                  value={formState.vendor}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, vendor: event.target.value }))
                  }
                  required
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-reference">
                  Référence
                </label>
                <input
                  id="purchase-reference"
                  type="text"
                  value={formState.reference}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, reference: event.target.value }))
                  }
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-3">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-description">
                  Description
                </label>
                <textarea
                  id="purchase-description"
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, description: event.target.value }))
                  }
                  className="h-20 rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-date">
                  Date
                </label>
                <input
                  id="purchase-date"
                  type="date"
                  value={formState.date}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, date: event.target.value }))
                  }
                  required
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-amount">
                  Montant HT (€)
                </label>
                <input
                  id="purchase-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.amountHt}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, amountHt: event.target.value }))
                  }
                  required
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-vat">
                  TVA (%)
                </label>
                <input
                  id="purchase-vat"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formState.vatRate}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, vatRate: event.target.value }))
                  }
                  disabled={!vatEnabled}
                  className={clsx(
                    'rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:outline-none focus:ring-2',
                    vatEnabled
                      ? 'focus:border-primary focus:ring-primary/30'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400'
                  )}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500">Montant TTC</span>
                <div className="rounded-soft border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-semibold text-slate-900">
                  {toCurrency(computeTtcFromStrings(formState.amountHt, formState.vatRate))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-category-form">
                  Type d'achat
                </label>
                <select
                  id="purchase-category-form"
                  value={formState.category}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      category: event.target.value as PurchaseCategory,
                    }))
                  }
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-status-form">
                  Statut
                </label>
                <select
                  id="purchase-status-form"
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      status: event.target.value as PurchaseStatus,
                    }))
                  }
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="purchase-recurring"
                  type="checkbox"
                  checked={formState.recurring}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, recurring: event.target.checked }))
                  }
                  className="table-checkbox h-4 w-4 rounded focus:ring-primary"
                />
                <label className="text-[12px] text-slate-600" htmlFor="purchase-recurring">
                  Achat récurrent
                </label>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-vehicle">
                  Véhicule associé (optionnel)
                </label>
                <select
                  id="purchase-vehicle"
                  value={formState.vehicleId}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, vehicleId: event.target.value }))
                  }
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Aucun</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-km">
                  Kilomètres (si lié au véhicule)
                </label>
                <input
                  id="purchase-km"
                  type="number"
                  min="0"
                  value={formState.kilometers}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, kilometers: event.target.value }))
                  }
                  className="rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="md:col-span-3 flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-500" htmlFor="purchase-notes">
                  Notes
                </label>
                <textarea
                  id="purchase-notes"
                  value={formState.notes}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, notes: event.target.value }))
                  }
                  className="h-20 rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={closeForm} type="button">
                Annuler
              </Button>
              <Button type="submit">{editingId ? 'Enregistrer' : 'Créer'}</Button>
            </div>
            </form>
          </Card>
        </div>
      )}

      {feedback && (
        <div className="rounded-soft border border-primary/30 bg-primary/5 px-3 py-2 text-[12px] text-primary">
          {feedback}
        </div>
      )}
    </div>
  );
};

export default PurchasesPage;
