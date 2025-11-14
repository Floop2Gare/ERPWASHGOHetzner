import { AccountingPageLayout } from './AccountingPageLayout';
import { Card } from '../../components/Card';
import { LineChart } from '../../components/charts/LineChart';
import { Table } from '../../components/Table';
import {
  vatSnapshot,
  vatHistory,
  formatCurrency,
} from './mockData';

const VatPage = () => {
  const netVat = vatSnapshot.collected - vatSnapshot.deductible;
  const netHistory = vatHistory.map((point) => ({
    label: point.period,
    value: point.collected - point.deductible,
  }));

  const columns = ['Période', 'TVA collectée', 'TVA déductible', 'Solde'];
  const rows = vatHistory.map((point) => [
    <span key="period" className="text-sm font-semibold text-slate-900 dark:text-white">
      {point.period}
    </span>,
    <span key="collected" className="text-sm text-slate-600 dark:text-slate-300">
      {formatCurrency(point.collected)}
    </span>,
    <span key="deductible" className="text-sm text-slate-600 dark:text-slate-300">
      {formatCurrency(point.deductible)}
    </span>,
    <span
      key="net"
      className={`text-sm font-semibold ${
        point.collected - point.deductible >= 0
          ? 'text-emerald-500 dark:text-emerald-300'
          : 'text-rose-500 dark:text-rose-300'
      }`}
    >
      {formatCurrency(point.collected - point.deductible)}
    </span>,
  ]);

  return (
    <AccountingPageLayout
      title="TVA"
      description="Visualisez votre TVA collectée et déductible, sécurisez vos échéances déclaratives et anticipez les flux de trésorerie."
      heroChips={[
        {
          id: 'collected',
          label: 'TVA collectée',
          value: formatCurrency(vatSnapshot.collected),
        },
        {
          id: 'deductible',
          label: 'TVA déductible',
          value: formatCurrency(vatSnapshot.deductible),
        },
        {
          id: 'net',
          label: 'Solde estimé',
          value: formatCurrency(netVat),
        },
        {
          id: 'frequency',
          label: 'Fréquence',
          value: vatSnapshot.declarationFrequency,
        },
      ]}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title="TVA collectée" description={vatSnapshot.periodLabel}>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(vatSnapshot.collected)}</p>
        </Card>
        <Card title="TVA déductible" description={vatSnapshot.periodLabel}>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">
            {formatCurrency(vatSnapshot.deductible)}
          </p>
        </Card>
        <Card title="Solde estimé" description="À payer / À récupérer">
          <p
            className={`text-2xl font-semibold ${
              netVat >= 0 ? 'text-emerald-500 dark:text-emerald-300' : 'text-rose-500 dark:text-rose-300'
            }`}
          >
            {formatCurrency(netVat)}
          </p>
        </Card>
        <Card title="Fréquence" description="Cadence de déclaration" tone="surface">
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">{vatSnapshot.declarationFrequency}</p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <Card
          tone="surface"
          padding="lg"
          className="lg:col-span-3"
          title={
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Solde TVA
              </span>
              <span className="text-base font-semibold text-slate-900 dark:text-white">Évolution sur 4 périodes</span>
            </div>
          }
        >
          <LineChart
            data={netHistory}
            className="mt-6"
            getTooltip={(point) => `${point.label} · ${formatCurrency(point.value)}`}
          />
        </Card>
        <Card
          tone="surface"
          padding="lg"
          className="lg:col-span-2"
          title={
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                Prochaines échéances
              </span>
              <span className="text-base font-semibold text-slate-900 dark:text-white">À surveiller</span>
            </div>
          }
        >
          <ul className="mt-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <li className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800/70">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Déclaration
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                {new Date(vatSnapshot.nextDeclarationDate).toLocaleDateString('fr-FR')}
              </p>
              <p className="mt-2 leading-5">
                Préparez la déclaration CA3 {vatSnapshot.periodLabel.toLowerCase()}. Vérifiez les factures fournisseur
                avant soumission.
              </p>
            </li>
            <li className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800/70">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Paiement
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                {new Date(vatSnapshot.paymentDeadline).toLocaleDateString('fr-FR')}
              </p>
              <p className="mt-2 leading-5">
                Prévoyez la provision de trésorerie. Estimation : {formatCurrency(netVat)} à régler.
              </p>
            </li>
          </ul>
        </Card>
      </section>

      <Table columns={columns} rows={rows} density="regular" />
    </AccountingPageLayout>
  );
};

export default VatPage;



