import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Download, X, FileText, CheckCircle, Clock, Plus, Printer, Trash2 } from 'lucide-react';
import clsx from 'clsx';

import { useAppData, type CommercialDocumentStatus, type EngagementStatus, type Engagement } from '../../store/useAppData';
import { ClientInvoiceService, type ClientInvoice } from '../../api';
import { formatCurrency, formatDate } from '../../lib/format';
import { downloadCsv } from '../../lib/csv';
import { generateInvoicePdfWithMultipleServices, generateInvoiceFileName, type QuoteServiceItem } from '../../lib/invoice';
import {
  CRMFeedback,
  CRMBackendStatus,
  CRMBulkActions,
  CRMEmptyState,
} from '../../components/crm';

type FilterState = {
  status: '' | CommercialDocumentStatus;
  client: string;
};

type InvoiceRow = {
  id: string;
  number: string;
  clientName: string;
  companyName: string;
  issueDate: string | null;
  dueDate: string | null;
  amountTtc: number;
  status: CommercialDocumentStatus;
};

const STATUS_BADGE_CLASSES: Record<CommercialDocumentStatus, string> = {
  brouillon: 'bg-slate-200 text-slate-700 border border-slate-300 shadow-[0_1px_0_rgba(148,163,184,0.35)]',
  envoyé: 'bg-blue-200 text-blue-800 border border-blue-300 shadow-[0_1px_0_rgba(59,130,246,0.35)]',
  accepté: 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)]',
  refusé: 'bg-rose-200 text-rose-800 border border-rose-300 shadow-[0_1px_0_rgba(244,63,94,0.35)]',
  payé: 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)]',
};

const STATUS_LABELS: Record<CommercialDocumentStatus, string> = {
  brouillon: 'Brouillon',
  envoyé: 'Envoyée',
  accepté: 'Acceptée',
  refusé: 'Refusée',
  payé: 'Payée',
};

const ClientInvoicesPage = () => {
  const navigate = useNavigate();
  const { engagements, clients, companies, computeEngagementTotals, vatEnabled, vatRate } = useAppData();
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    client: '',
  });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  // Charger les factures depuis le backend au montage
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await ClientInvoiceService.getAll();
        if (result.success && result.data) {
          setInvoices(result.data);
        } else {
          setError(result.error || 'Erreur lors du chargement des factures');
        }
      } catch (error) {
        console.error('Erreur lors du chargement des factures clients:', error);
        setError('Erreur lors du chargement des factures');
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoices();
  }, []);

  // Fallback: si aucune facture dans le backend, utiliser les engagements (compatibilité)
  const invoiceRows = useMemo<InvoiceRow[]>(() => {
    // Si on a des factures depuis le backend, les utiliser
    if (invoices.length > 0) {
      return invoices.map((invoice) => ({
        id: invoice.id || '',
        number: invoice.number || '',
        clientName: invoice.clientName || 'Client inconnu',
        companyName: invoice.companyName || '—',
        issueDate: invoice.issueDate || null,
        dueDate: invoice.dueDate || null,
        amountTtc: invoice.amountTtc || 0,
        status: invoice.status as CommercialDocumentStatus,
      }));
    }

    // Sinon, fallback sur les engagements (compatibilité)
    const clientsById = new Map(clients.map((client) => [client.id, client]));
    const companiesById = new Map(companies.map((company) => [company.id, company]));

    const normalizeStatus = (status: EngagementStatus): CommercialDocumentStatus => {
      switch (status) {
        case 'réalisé':
          return 'payé';
        case 'envoyé':
          return 'envoyé';
        case 'brouillon':
          return 'brouillon';
        default:
          return 'brouillon';
      }
    };

    return engagements
      .filter((engagement) => engagement.kind === 'facture')
      .map((engagement) => {
        const client = clientsById.get(engagement.clientId) ?? null;
        const company = engagement.companyId ? companiesById.get(engagement.companyId) ?? null : null;
        const totals = computeEngagementTotals(engagement);
        const vatEnabledForRow = engagement.invoiceVatEnabled ?? company?.vatEnabled ?? vatEnabled;
        const effectiveVatRate = vatRate ?? 0;
        // Calculer le sous-total HT (prix + frais complémentaires)
        const subtotalHt = totals.price + totals.surcharge;
        // Calculer la TVA sur le sous-total HT
        const vatAmount = vatEnabledForRow ? Math.round(subtotalHt * effectiveVatRate * 100) / 100 : 0;
        // Total TTC = sous-total HT + TVA
        const totalTtc = subtotalHt + vatAmount;

        return {
          id: engagement.id,
          number: engagement.invoiceNumber ?? engagement.id.toUpperCase(),
          clientName: client?.name ?? 'Client inconnu',
          companyName: company?.name ?? '—',
          issueDate: engagement.scheduledAt ?? null,
          dueDate: null,
          amountTtc: totalTtc,
          status: normalizeStatus(engagement.status),
        };
      })
      .sort((a, b) => {
        const timeA = a.issueDate ? new Date(a.issueDate).getTime() : 0;
        const timeB = b.issueDate ? new Date(b.issueDate).getTime() : 0;
        return timeB - timeA;
      });
  }, [invoices, clients, companies, computeEngagementTotals, engagements, vatEnabled, vatRate]);

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

  const uniqueClients = useMemo(() => {
    const clientNames = new Set<string>();
    invoiceRows.forEach((row) => {
      if (row.clientName) {
        clientNames.add(row.clientName);
      }
    });
    return Array.from(clientNames).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [invoiceRows]);

  const filteredData = useMemo(() => {
    return invoiceRows.filter((row) => {
      if (filters.status && row.status !== filters.status) {
        return false;
      }
      if (filters.client && !row.clientName.toLowerCase().includes(filters.client.toLowerCase())) {
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

  const handlePrintInvoice = async (row: InvoiceRow) => {
    try {
      // Trouver l'engagement facture correspondant
      const invoiceEngagement = engagements.find(e => e.id === row.id && e.kind === 'facture');
      
      if (!invoiceEngagement) {
        // Si pas d'engagement, essayer de trouver la facture dans le backend
        const invoice = invoices.find(inv => inv.id === row.id);
        if (!invoice) {
          setFeedbackMessage('Facture introuvable.');
          return;
        }
        
        // Pour les factures du backend sans engagement, on ne peut pas générer le PDF
        // car on n'a pas toutes les données nécessaires
        setFeedbackMessage('Impossible d\'imprimer cette facture (données incomplètes).');
        return;
      }
      
      const client = clients.find(c => c.id === invoiceEngagement.clientId);
      const company = companies.find(comp => comp.id === invoiceEngagement.companyId) || companies.find(comp => comp.id === useAppData.getState().activeCompanyId);
      const service = useAppData.getState().services.find(s => s.id === invoiceEngagement.serviceId);
      
      if (!client || !company || !service) {
        setFeedbackMessage('Données incomplètes pour générer la facture.');
        return;
      }
      
      const totals = computeEngagementTotals(invoiceEngagement);
      const vatEnabledForInvoice = invoiceEngagement.invoiceVatEnabled ?? company.vatEnabled ?? vatEnabled;
      const effectiveVatRate = vatRate ?? 0;
      const optionsSelected = service.options.filter(opt => invoiceEngagement.optionIds.includes(opt.id));
      
      const issueDate = invoiceEngagement.scheduledAt ? new Date(invoiceEngagement.scheduledAt) : new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + 30);
      
      const invoiceServiceItem: QuoteServiceItem = {
        serviceId: service.id,
        serviceName: service.name,
        serviceDescription: service.description || '',
        supportType: invoiceEngagement.supportType,
        supportDetail: invoiceEngagement.supportDetail || '',
        options: optionsSelected,
        optionOverrides: invoiceEngagement.optionOverrides ?? {},
        additionalCharge: invoiceEngagement.additionalCharge ?? 0,
        mainCategoryId: (invoiceEngagement as any).mainCategoryId,
        subCategoryId: (invoiceEngagement as any).subCategoryId,
        base_price: (service as any).base_price,
        base_duration: (service as any).base_duration,
        quantity: 1,
      };
      
      const contactForInvoice = invoiceEngagement.contactIds && invoiceEngagement.contactIds.length > 0
        ? client.contacts?.find(c => c.active && invoiceEngagement.contactIds.includes(c.id))
        : null;
      
      const pdf = generateInvoicePdfWithMultipleServices({
        documentNumber: invoiceEngagement.invoiceNumber || row.number,
        issueDate,
        serviceDate: invoiceEngagement.scheduledAt ? new Date(invoiceEngagement.scheduledAt) : issueDate,
        dueDate,
        company: {
          ...company,
          vatNumber: company.vatNumber || undefined,
          iban: company.iban || undefined,
          bic: company.bic || undefined,
          invoiceLogoUrl: company.invoiceLogoUrl || undefined,
        },
        client,
        contact: contactForInvoice || undefined,
        services: [invoiceServiceItem],
        vatRate: effectiveVatRate,
        vatEnabled: vatEnabledForInvoice,
        paymentMethod: 'Chèque, virement bancaire, espèces',
        categories: useAppData.getState().categories || [],
      });
      
      // Ouvrir la fenêtre d'impression
      pdf.autoPrint?.();
      const blobUrl = pdf.output('bloburl');
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      
      setFeedbackMessage('Facture prête pour impression.');
    } catch (error) {
      console.error('Erreur lors de l\'impression de la facture:', error);
      setFeedbackMessage('Erreur lors de l\'impression de la facture.');
    }
  };

  const handleBulkPrint = () => {
    if (!selectedData.length) {
      return;
    }
    // Imprimer toutes les factures sélectionnées
    selectedData.forEach(row => {
      handlePrintInvoice(row);
    });
  };

  const handleExport = () => {
    if (!filteredData.length) {
      setFeedbackMessage('Aucune facture à exporter.');
      return;
    }
    const header = [
      'N°',
      'Client',
      'Entreprise',
      'Émise le',
      'Échéance',
      'Montant TTC',
      'Statut',
    ];
    const rows = filteredData.map((row) => [
      row.number,
      row.clientName,
      row.companyName,
      row.issueDate ? formatDate(row.issueDate) : '—',
      row.dueDate ? formatDate(row.dueDate) : '—',
      formatCurrency(row.amountTtc),
      STATUS_LABELS[row.status],
    ]);
    downloadCsv({ fileName: 'factures-clients.csv', header, rows });
    setFeedbackMessage(`${rows.length} facture(s) exportée(s).`);
  };

  const handleDelete = async (row: InvoiceRow) => {
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer la facture #${row.number} de ${row.clientName} ? Cette action est irréversible.`
    );
    if (!confirmed) {
      return;
    }

    try {
      setIsLoading(true);
      const result = await ClientInvoiceService.delete(row.id);
      if (result.success) {
        // Recharger les factures depuis le backend
        const reloadResult = await ClientInvoiceService.getAll();
        if (reloadResult.success && reloadResult.data) {
          setInvoices(reloadResult.data);
        }
        setSelectedRows((current) => {
          const next = new Set(current);
          next.delete(row.id);
          return next;
        });
        setFeedbackMessage(`Facture #${row.number} supprimée avec succès.`);
      } else {
        setFeedbackMessage(`Erreur lors de la suppression: ${result.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la facture:', error);
      setFeedbackMessage('Erreur lors de la suppression de la facture.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedData.length) {
      return;
    }
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer ${selectedData.length} facture(s) sélectionnée(s) ? Cette action est irréversible.`
    );
    if (!confirmed) {
      return;
    }

    try {
      setIsLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const row of selectedData) {
        const result = await ClientInvoiceService.delete(row.id);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      // Recharger les factures depuis le backend
      const reloadResult = await ClientInvoiceService.getAll();
      if (reloadResult.success && reloadResult.data) {
        setInvoices(reloadResult.data);
      }
      setSelectedRows(new Set());
      
      if (successCount > 0) {
        setFeedbackMessage(`${successCount} facture(s) supprimée(s) avec succès.`);
      }
      if (errorCount > 0) {
        setFeedbackMessage(`${errorCount} facture(s) n'ont pas pu être supprimée(s).`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression en masse:', error);
      setFeedbackMessage('Erreur lors de la suppression en masse.');
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = useMemo(
    () => filteredData.reduce((acc, row) => acc + row.amountTtc, 0),
    [filteredData]
  );

  const paidAmount = useMemo(
    () => filteredData.filter((row) => row.status === 'payé').reduce((acc, row) => acc + row.amountTtc, 0),
    [filteredData]
  );

  const invoiceKpis = useMemo(() => {
    const totalInvoices = filteredData.length;
    const paidInvoices = filteredData.filter((row) => row.status === 'payé').length;
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
        label: 'À encaisser',
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

  return (
    <div className="dashboard-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Comptabilité</p>
            <h1 className="dashboard-hero__title">Factures clients</h1>
            <p className="dashboard-hero__subtitle">
              Pilotez vos factures émises, anticipez les encaissements et assurez un suivi précis de votre chiffre d'affaires.
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
                    icon: <FileText className="h-4 w-4" />,
                    onClick: handleBulkPrint,
                  },
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
                onClick={() => navigate('/workspace/crm/services')}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Générer une facture
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
                  <option value="brouillon">Brouillon</option>
                  <option value="envoyé">Envoyée</option>
                  <option value="accepté">Acceptée</option>
                  <option value="refusé">Refusée</option>
                  <option value="payé">Payée</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Client</label>
                <input
                  type="text"
                  value={filters.client}
                  onChange={(event) =>
                    setFilters((state) => ({ ...state, client: event.target.value }))
                  }
                  placeholder="Rechercher un client..."
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
                    client: '',
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
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Entreprise
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
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Actions
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
                          {row.clientName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Document lié au CRM</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 align-middle">
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {row.companyName}
                      </span>
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
                    <td className="px-6 py-5 align-middle">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(row)}
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          title="Imprimer la facture"
                        >
                          <Printer className="h-4 w-4" />
                          <span className="hidden sm:inline">Imprimer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                          title="Supprimer la facture"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Supprimer</span>
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
                      {row.clientName}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{row.companyName}</p>
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

              <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handlePrintInvoice(row)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
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
    </div>
  );
};

export default ClientInvoicesPage;
