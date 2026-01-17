import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Filter, Download, X, FileText, CheckCircle, Clock, Plus, Printer } from 'lucide-react';
import clsx from 'clsx';

import { VendorInvoiceService } from '../../api';
import type { VendorInvoice, VendorInvoiceStatus } from './accountingTypes';
import { formatCurrency, formatDate } from '../../lib/format';
import { downloadCsv } from '../../lib/csv';
import {
  CRMFeedback,
  CRMBackendStatus,
  CRMBulkActions,
  CRMEmptyState,
  CRMModal,
  CRMModalHeader,
  CRMFormLabel,
  CRMFormInput,
  CRMSubmitButton,
  CRMCancelButton,
  CRMErrorAlert,
} from '../../components/crm';

type FilterState = {
  status: '' | VendorInvoiceStatus;
  vendor: string;
};

type InvoiceRow = {
  id: string;
  number: string;
  vendor: string;
  issueDate: string | null;
  dueDate: string | null;
  amountTtc: number;
  status: VendorInvoiceStatus;
};

const STATUS_BADGE_CLASSES: Record<VendorInvoiceStatus, string> = {
  Payée: 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)]',
  'À payer': 'bg-amber-200 text-amber-800 border border-amber-300 shadow-[0_1px_0_rgba(245,158,11,0.35)]',
  Brouillon: 'bg-slate-200 text-slate-700 border border-slate-300 shadow-[0_1px_0_rgba(148,163,184,0.35)]',
};

const STATUS_LABELS: Record<VendorInvoiceStatus, string> = {
  Payée: 'Payée',
  'À payer': 'À payer',
  Brouillon: 'Brouillon',
};

const formatInvoiceNumber = (sequence: number) => `FF2025-${sequence.toString().padStart(3, '0')}`;

const extractInvoiceSequence = (invoiceNumber: string) => {
  const match = invoiceNumber.match(/(\d+)$/);
  if (!match) {
    return 0;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const computeNextInvoiceNumber = (currentRows: VendorInvoice[]) => {
  const maxSequence = currentRows.reduce((max, invoice) => {
    const sequence = extractInvoiceSequence(invoice.number);
    return sequence > max ? sequence : max;
  }, 0);
  return formatInvoiceNumber(maxSequence + 1);
};

type CreateInvoiceFormState = {
  vendor: string;
  issueDate: string;
  dueDate: string;
  amount: string;
  status: VendorInvoiceStatus;
};

const CREATE_INVOICE_DEFAULTS: CreateInvoiceFormState = {
  vendor: '',
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  amount: '',
  status: 'À payer',
};

const VendorInvoicesPage = () => {
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    vendor: '',
  });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [createInvoiceForm, setCreateInvoiceForm] = useState<CreateInvoiceFormState>(() => ({
    ...CREATE_INVOICE_DEFAULTS,
  }));
  const [createInvoiceError, setCreateInvoiceError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les factures depuis le backend au montage
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await VendorInvoiceService.getAll();
        if (result.success && result.data) {
          setInvoices(result.data);
        } else {
          setError(result.error || 'Erreur lors du chargement des factures fournisseurs.');
        }
      } catch (error: any) {
        setError(error?.message || 'Erreur lors du chargement des factures fournisseurs.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoices();
  }, []);

  const invoiceRows = useMemo<InvoiceRow[]>(() => {
    return invoices.map((invoice) => ({
      id: invoice.id || '',
      number: invoice.number || '',
      vendor: invoice.vendor || 'Fournisseur inconnu',
      issueDate: invoice.issueDate || null,
      dueDate: invoice.dueDate || null,
      amountTtc: invoice.amountTtc || 0,
      status: invoice.status as VendorInvoiceStatus,
    }));
  }, [invoices]);

  useEffect(() => {
    setSelectedRows((current) => {
      const next = new Set<string>();
      invoiceRows.forEach((row) => {
        if (current.has(row.id)) {
          next.add(row.id);
        }
      });
      return next;
    });
  }, [invoiceRows]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const uniqueVendors = useMemo(() => {
    const vendorNames = new Set<string>();
    invoiceRows.forEach((row) => {
      if (row.vendor) {
        vendorNames.add(row.vendor);
      }
    });
    return Array.from(vendorNames).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [invoiceRows]);

  const filteredData = useMemo(() => {
    return invoiceRows.filter((row) => {
      if (filters.status && row.status !== filters.status) {
        return false;
      }
      if (filters.vendor && !row.vendor.toLowerCase().includes(filters.vendor.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [filters, invoiceRows]);

  const selectedData = useMemo(() => {
    return filteredData.filter((row) => selectedRows.has(row.id));
  }, [filteredData, selectedRows]);

  const activeFiltersCount = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters]
  );

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
    () => filteredData.length > 0 && filteredData.every((row) => selectedRows.has(row.id)),
    [filteredData, selectedRows]
  );

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredData.forEach((row) => next.delete(row.id));
        return next;
      });
    } else {
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredData.forEach((row) => next.add(row.id));
        return next;
      });
    }
  };

  const setFeedbackMessage = (message: string) => {
    setFeedback(message);
  };

  const handleBulkPrint = () => {
    if (!selectedData.length) {
      return;
    }
    setFeedbackMessage(`${selectedData.length} facture(s) prêt(s) à imprimer.`);
  };

  const handleExport = () => {
    if (!filteredData.length) {
      setFeedbackMessage('Aucune facture à exporter.');
      return;
    }
    const header = [
      'N°',
      'Fournisseur',
      'Émise le',
      'Échéance',
      'Montant TTC',
      'Statut',
    ];
    const rows = filteredData.map((row) => [
      row.number,
      row.vendor,
      row.issueDate ? formatDate(row.issueDate) : '—',
      row.dueDate ? formatDate(row.dueDate) : '—',
      formatCurrency(row.amountTtc),
      STATUS_LABELS[row.status],
    ]);
    downloadCsv({ fileName: 'factures-fournisseurs.csv', header, rows });
    setFeedbackMessage(`${rows.length} facture(s) exportée(s).`);
  };

  const totalAmount = useMemo(
    () => filteredData.reduce((acc, row) => acc + row.amountTtc, 0),
    [filteredData]
  );

  const paidAmount = useMemo(
    () => filteredData.filter((row) => row.status === 'Payée').reduce((acc, row) => acc + row.amountTtc, 0),
    [filteredData]
  );

  const invoiceKpis = useMemo(() => {
    const totalInvoices = filteredData.length;
    const paidInvoices = filteredData.filter((row) => row.status === 'Payée').length;
    const averageAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;

    return [
      {
        id: 'total',
        label: 'Factures actives',
        value: totalInvoices.toLocaleString('fr-FR'),
        helper: `${paidInvoices.toLocaleString('fr-FR')} payées`,
      },
      {
        id: 'pending',
        label: 'À payer',
        value: formatCurrency(totalAmount - paidAmount),
        helper: 'En attente de règlement',
      },
      {
        id: 'avg-amount',
        label: 'Montant moyen',
        value: formatCurrency(averageAmount),
        helper: `Total ${formatCurrency(totalAmount)}`,
      },
    ];
  }, [filteredData, totalAmount, paidAmount]);

  const resetCreateInvoiceForm = () => {
    setCreateInvoiceForm({ ...CREATE_INVOICE_DEFAULTS });
    setCreateInvoiceError(null);
  };

  const openCreateInvoiceModal = () => {
    resetCreateInvoiceForm();
    setShowCreateInvoiceModal(true);
  };

  const closeCreateInvoiceModal = () => {
    setShowCreateInvoiceModal(false);
    resetCreateInvoiceForm();
  };

  const handleSubmitCreateInvoice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateInvoiceError(null);
    setIsSubmitting(true);

    const normalizedAmount = Number.parseFloat(createInvoiceForm.amount.replace(',', '.'));
    if (!createInvoiceForm.vendor.trim()) {
      setCreateInvoiceError('Le nom du fournisseur est requis.');
      setIsSubmitting(false);
      return;
    }
    if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
      setCreateInvoiceError('Le montant TTC doit être un nombre positif.');
      setIsSubmitting(false);
      return;
    }
    const issue = new Date(createInvoiceForm.issueDate);
    const due = new Date(createInvoiceForm.dueDate);
    if (due < issue) {
      setCreateInvoiceError('La date d\'échéance doit être postérieure à la date de facture.');
      setIsSubmitting(false);
      return;
    }

    const nextNumber = computeNextInvoiceNumber(invoices);
    const newInvoice: VendorInvoice = {
      id: `vi-${Date.now()}`,
      number: nextNumber,
      vendor: createInvoiceForm.vendor.trim(),
      issueDate: createInvoiceForm.issueDate,
      dueDate: createInvoiceForm.dueDate,
      amountTtc: Math.round(normalizedAmount * 100) / 100,
      status: createInvoiceForm.status,
    };

    try {
      // Synchroniser avec le backend
      const response = await VendorInvoiceService.create(newInvoice);
      if (!response.success) {
        throw new Error(response.error || 'Erreur lors de la synchronisation avec le serveur.');
      }

      // Mettre à jour avec les données du backend si nécessaire
      if (response.data) {
        setInvoices((previous) => [response.data!, ...previous]);
      } else {
        setInvoices((previous) => [newInvoice, ...previous]);
      }

      setFeedbackMessage(`Facture « ${newInvoice.number} » créée avec succès.`);
      closeCreateInvoiceModal();
    } catch (error) {
      setCreateInvoiceError(
        error instanceof Error
          ? error.message
          : 'Impossible d\'enregistrer la facture. Veuillez réessayer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!showCreateInvoiceModal) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCreateInvoiceModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCreateInvoiceModal]);

  return (
    <div className="dashboard-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Comptabilité</p>
            <h1 className="dashboard-hero__title">Factures fournisseurs</h1>
            <p className="dashboard-hero__subtitle">
              Suivez vos dépenses, gardez de la visibilité sur vos paiements à venir et sécurisez vos marges.
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      <CRMFeedback message={feedback} />

      <section className="space-y-4">
        <CRMBackendStatus
          loading={isLoading}
          error={error}
          loadingMessage="Synchronisation des factures avec le serveur…"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {invoiceKpis.map((kpi, index) => {
            const Icon = [FileText, Clock, CheckCircle][index] ?? FileText;
            return (
              <div key={kpi.label} className="dashboard-kpi group">
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
                    label: 'Imprimer',
                    icon: <Printer className="h-4 w-4" />,
                    onClick: handleBulkPrint,
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
                onClick={openCreateInvoiceModal}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Nouvelle facture
              </button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Statut</label>
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((state) => ({
                      ...state,
                      status: event.target.value as FilterState['status'],
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">Tous</option>
                  <option value="Brouillon">Brouillon</option>
                  <option value="À payer">À payer</option>
                  <option value="Payée">Payée</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Fournisseur</label>
                <input
                  type="text"
                  value={filters.vendor}
                  onChange={(event) =>
                    setFilters((state) => ({ ...state, vendor: event.target.value }))
                  }
                  placeholder="Rechercher un fournisseur..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    status: '',
                    vendor: '',
                  })
                }
                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <X className="h-4 w-4" />
                Effacer les filtres
              </button>
            )}
          </div>
        )}
      </section>

      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)] lg:block">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-4 w-12" />
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  N°
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Fournisseur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Émise le
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Échéance
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Montant TTC
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((row) => {
                return (
                  <tr
                    key={row.id}
                    className={clsx(
                      'group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/10',
                      selectedRows.has(row.id) && 'bg-blue-50/50 dark:bg-blue-500/10'
                    )}
                  >
                    <td className="px-6 py-5">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300/70 bg-white px-3 py-1 font-mono text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-black/0 transition dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">#</span>
                        {row.number}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {row.vendor}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Conditions 30 jours</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {row.issueDate ? formatDate(row.issueDate) : '—'}
                      </p>
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {row.dueDate ? formatDate(row.dueDate) : '—'}
                      </p>
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(row.amountTtc)}
                      </p>
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                          STATUS_BADGE_CLASSES[row.status]
                        )}
                      >
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {filteredData.map((row) => {
          return (
            <div
              key={row.id}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 items-start gap-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(row.id)}
                    onChange={() => toggleRowSelection(row.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300/70 bg-white px-3 py-1 font-mono text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-black/0 transition dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">#</span>
                        {row.number}
                      </span>
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                          STATUS_BADGE_CLASSES[row.status]
                        )}
                      >
                        {STATUS_LABELS[row.status]}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                      {row.vendor}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Conditions 30 jours</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Émise le</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {row.issueDate ? formatDate(row.issueDate) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Échéance</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {row.dueDate ? formatDate(row.dueDate) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="font-medium">Montant TTC</span>
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {formatCurrency(row.amountTtc)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredData.length === 0 && (
        <CRMEmptyState
          message="Ajustez votre recherche ou vos filtres pour retrouver vos factures."
        />
      )}

      <CRMModal isOpen={showCreateInvoiceModal} onClose={closeCreateInvoiceModal}>
        <form
          onSubmit={handleSubmitCreateInvoice}
          className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          <CRMModalHeader
            eyebrow="CRÉER UNE FACTURE FOURNISSEUR"
            title="Nouvelle facture fournisseur"
            description="Renseignez les informations essentielles pour enregistrer une nouvelle facture fournisseur."
            onClose={closeCreateInvoiceModal}
          />

          <div className="space-y-4">
            <CRMErrorAlert message={createInvoiceError} />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <CRMFormLabel htmlFor="invoice-vendor" required>
                  Fournisseur
                </CRMFormLabel>
                <CRMFormInput
                  id="invoice-vendor"
                  name="vendor"
                  type="text"
                  value={createInvoiceForm.vendor}
                  onChange={(event) => {
                    setCreateInvoiceForm((prev) => ({ ...prev, vendor: event.target.value }));
                    setCreateInvoiceError(null);
                  }}
                  autoFocus
                  placeholder="Ex. LogiTrans Marseille"
                  required
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="invoice-amount" required>
                  Montant TTC (€)
                </CRMFormLabel>
                <CRMFormInput
                  id="invoice-amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={createInvoiceForm.amount}
                  onChange={(event) => {
                    setCreateInvoiceForm((prev) => ({ ...prev, amount: event.target.value }));
                    setCreateInvoiceError(null);
                  }}
                  placeholder="0,00"
                  required
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="invoice-status">Statut</CRMFormLabel>
                <select
                  id="invoice-status"
                  name="status"
                  value={createInvoiceForm.status}
                  onChange={(event) => {
                    setCreateInvoiceForm((prev) => ({ ...prev, status: event.target.value as VendorInvoiceStatus }));
                    setCreateInvoiceError(null);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="À payer">À payer</option>
                  <option value="Payée">Payée</option>
                  <option value="Brouillon">Brouillon</option>
                </select>
              </div>
              <div>
                <CRMFormLabel htmlFor="invoice-issue-date" required>
                  Date de facture
                </CRMFormLabel>
                <CRMFormInput
                  id="invoice-issue-date"
                  name="issueDate"
                  type="date"
                  value={createInvoiceForm.issueDate}
                  onChange={(event) => {
                    setCreateInvoiceForm((prev) => ({ ...prev, issueDate: event.target.value }));
                    setCreateInvoiceError(null);
                  }}
                  required
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="invoice-due-date" required>
                  Date d'échéance
                </CRMFormLabel>
                <CRMFormInput
                  id="invoice-due-date"
                  name="dueDate"
                  type="date"
                  value={createInvoiceForm.dueDate}
                  onChange={(event) => {
                    setCreateInvoiceForm((prev) => ({ ...prev, dueDate: event.target.value }));
                    setCreateInvoiceError(null);
                  }}
                  required
                />
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <CRMCancelButton onClick={closeCreateInvoiceModal} />
            <CRMSubmitButton type="create" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : 'Créer la facture'}
            </CRMSubmitButton>
          </div>
        </form>
      </CRMModal>
    </div>
  );
};

export default VendorInvoicesPage;
