import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { AccountingPageLayout } from './AccountingPageLayout';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import { useAppData, type CommercialDocumentStatus, type EngagementStatus } from '../../store/useAppData';
import { formatCurrency, formatDate } from '../../lib/format';

const STATUS_BADGE_CLASSES: Record<CommercialDocumentStatus, string> = {
  brouillon: 'border-slate-300 text-slate-500 bg-white',
  envoyé: 'border-blue-300 text-blue-700 bg-blue-50/50',
  accepté: 'border-emerald-300 text-emerald-600 bg-emerald-50/50',
  refusé: 'border-rose-300 text-rose-600 bg-rose-50/50',
  payé: 'border-emerald-400 text-emerald-700 bg-emerald-50',
};

const STATUS_LABELS: Record<CommercialDocumentStatus, string> = {
  brouillon: 'Brouillon',
  envoyé: 'Envoyée',
  accepté: 'Acceptée',
  refusé: 'Refusée',
  payé: 'Payée',
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

const ClientInvoicesPage = () => {
  const navigate = useNavigate();
  const { engagements, clients, companies, computeEngagementTotals, vatEnabled, vatRate } = useAppData();

  const invoiceRows = useMemo<InvoiceRow[]>(() => {
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
        const vatAmount = vatEnabledForRow ? Math.round(totals.price * effectiveVatRate * 100) / 100 : 0;
        const totalTtc = totals.price + totals.surcharge + vatAmount;

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
  }, [clients, companies, computeEngagementTotals, engagements, vatEnabled, vatRate]);

  const totals = useMemo(() => {
    const aggregated = invoiceRows.reduce(
      (acc, invoice) => {
        acc.total += invoice.amountTtc;
        if (invoice.status === 'payé') {
          acc.paid += invoice.amountTtc;
        } else {
          acc.pending += invoice.amountTtc;
        }
        return acc;
      },
      { total: 0, pending: 0, paid: 0 }
    );
    return {
      total: formatCurrency(aggregated.total),
      pending: formatCurrency(aggregated.pending),
      paid: formatCurrency(aggregated.paid),
      count: invoiceRows.length,
    };
  }, [invoiceRows]);

  const columns = ['N°', 'Client', 'Entreprise', 'Émise le', 'Échéance', 'Montant TTC', 'Statut'];
  const tableRows = invoiceRows.map((invoice) => [
    <span
      key="number"
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300/70 bg-white px-3 py-1 font-mono text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-black/0 transition dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-white"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">#</span>
      {invoice.number}
    </span>,
    <div key="client" className="space-y-1">
      <p className="text-sm font-medium text-slate-900 dark:text-white">{invoice.clientName}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Document lié au CRM</p>
    </div>,
    <span key="company" className="text-sm text-slate-600 dark:text-slate-300">
      {invoice.companyName}
    </span>,
    <span key="issue" className="text-sm text-slate-600 dark:text-slate-300">
      {invoice.issueDate ? formatDate(invoice.issueDate) : '—'}
    </span>,
    <span key="due" className="text-sm text-slate-600 dark:text-slate-300">
      {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
    </span>,
    <span key="amount" className="text-sm font-semibold text-slate-900 dark:text-white">
      {formatCurrency(invoice.amountTtc)}
    </span>,
    <span
      key="status"
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em]',
        STATUS_BADGE_CLASSES[invoice.status]
      )}
    >
      {STATUS_LABELS[invoice.status]}
    </span>,
  ]);

  const hasInvoices = invoiceRows.length > 0;

  return (
    <AccountingPageLayout
      title="Factures clients"
      description="Pilotez vos factures émises, anticipez les encaissements et assurez un suivi précis de votre chiffre d’affaires."
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/workspace/crm/services')}
          className="uppercase tracking-[0.18em]"
        >
          <Plus className="h-4 w-4" />
          Générer une facture
        </Button>
      }
      heroChips={[
        {
          id: 'total',
          label: 'Total facturé TTC',
          value: totals.total,
        },
        {
          id: 'paid',
          label: 'Encaissements',
          value: totals.paid,
        },
        {
          id: 'pending',
          label: 'À encaisser',
          value: totals.pending,
        },
        {
          id: 'count',
          label: 'Factures actives',
          value: `${totals.count}`,
        },
      ]}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Total facturé (TTC)" description="Somme des factures générées depuis le CRM">
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">{totals.total}</p>
        </Card>
        <Card title="Encaissements" description="Factures marquées comme payées">
          <p className="text-2xl font-semibold text-emerald-500 dark:text-emerald-300">{totals.paid}</p>
        </Card>
        <Card title="À encaisser" description="Factures en attente de règlement">
          <p className="text-2xl font-semibold text-amber-500 dark:text-amber-300">{totals.pending}</p>
        </Card>
        <Card title="Factures actives" description="Documents générés depuis la page Services">
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">{totals.count}</p>
        </Card>
      </section>

      {hasInvoices ? (
        <Table columns={columns} rows={tableRows} density="regular" />
      ) : (
        <Card tone="surface" padding="lg" title="Aucune facture enregistrée">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Créez vos factures depuis la page Services (CRM). Elles seront automatiquement listées ici dès leur
            génération.
          </p>
          <div className="mt-4">
            <Button variant="primary" onClick={() => navigate('/workspace/crm/services')}>
              Accéder à la page Services
            </Button>
          </div>
        </Card>
      )}
    </AccountingPageLayout>
  );
};

export default ClientInvoicesPage;



