import { TrendingUp, Wallet, PiggyBank, Percent } from 'lucide-react';
import { AccountingPageLayout } from './AccountingPageLayout';
import { Card } from '../../components/Card';
import { LineChart } from '../../components/charts/LineChart';
import { BarChart } from '../../components/charts/BarChart';
import {
  accountingKpis,
  revenueTrend,
  expenseCategories,
  cashFlowProjection,
  topClients,
  upcomingDeadlines,
  vatSnapshot,
  formatCurrency,
} from './mockData';

const chartCurrencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const formatChartCurrency = (value: number) => chartCurrencyFormatter.format(Math.round(value));

const chartCompactCurrencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const formatChartCompactCurrency = (value: number) => chartCompactCurrencyFormatter.format(value);

const KPI_ICON: Record<typeof accountingKpis[number]['id'], React.ComponentType<{ className?: string }>> = {
  revenue: TrendingUp,
  expenses: Wallet,
  profit: PiggyBank,
  vat: Percent,
};

const AccountingDashboardPage = () => {
  return (
    <AccountingPageLayout
      title="Dashboard comptable"
      description="Gardez un œil sur vos indicateurs clés, anticipez vos besoins de trésorerie et préparez vos déclarations à venir."
    >
      <section className="space-y-4">
        <div>
          <h2 className="dashboard-section-title">Chiffres clés</h2>
          <p className="dashboard-section-subtitle">Suivez vos indicateurs financiers consolidés.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {accountingKpis.map((kpi) => {
            const Icon = KPI_ICON[kpi.id];
            const isPositive = kpi.trend >= 0;
            const formattedTrend = `${isPositive ? '+' : '−'}${Math.abs(kpi.trend).toLocaleString('fr-FR', {
              maximumFractionDigits: 1,
            })}% ${kpi.trendLabel}`;
            return (
              <div key={kpi.id} className="dashboard-kpi group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="dashboard-kpi__eyebrow">{kpi.label}</p>
                    <p className="dashboard-kpi__value">{formatCurrency(kpi.value)}</p>
                    <p className="dashboard-kpi__description">
                      {isPositive ? 'En hausse' : 'En baisse'} · {formattedTrend}
                    </p>
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

      <section className="space-y-4">
        <div>
          <h2 className="dashboard-section-title">Tendances financières</h2>
          <p className="dashboard-section-subtitle">Visualisez vos courbes de chiffre d’affaires et de dépenses.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <Card
            padding="lg"
            className="lg:col-span-3"
            title={
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Évolution du chiffre d’affaires
                </span>
                <span className="text-base font-semibold text-slate-900 dark:text-white">6 derniers mois</span>
              </div>
            }
          >
            <LineChart
              data={revenueTrend}
              className="mt-6"
              getTooltip={(point) => `${point.label} · ${formatCurrency(point.value)}`}
              variant="ultraThin"
              yTicks={6}
              showXAxisLabels
              formatYAxisLabel={formatChartCompactCurrency}
              formatPointLabel={(point) => formatChartCompactCurrency(point.value)}
            />
          </Card>
          <Card
            padding="lg"
            className="lg:col-span-2"
            title={
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Répartition des dépenses
                </span>
                <span className="text-base font-semibold text-slate-900 dark:text-white">M-1</span>
              </div>
            }
          >
            <BarChart
              data={expenseCategories}
              className="mt-6"
              getTooltip={(point) => `${point.label} · ${formatCurrency(point.value)}`}
              valueFormatter={(value) => formatCurrency(value)}
            />
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="dashboard-section-title">Prévisions et obligations</h2>
          <p className="dashboard-section-subtitle">Anticipez vos besoins de trésorerie et vos déclarations à venir.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <Card
            padding="lg"
            className="lg:col-span-3"
            title={
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Projection de trésorerie
                </span>
                <span className="text-base font-semibold text-slate-900 dark:text-white">5 prochaines semaines</span>
              </div>
            }
          >
            <LineChart
              data={cashFlowProjection}
              className="mt-6"
              getTooltip={(point) => `${point.label} · ${formatCurrency(point.value)}`}
            />
          </Card>
          <Card
            padding="lg"
            className="lg:col-span-2"
            title={
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  TVA à déclarer
                </span>
                <span className="text-base font-semibold text-slate-900 dark:text-white">{vatSnapshot.periodLabel}</span>
              </div>
            }
          >
            <div className="mt-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span>TVA collectée</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(vatSnapshot.collected)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>TVA déductible</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(vatSnapshot.deductible)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Solde estimé</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(vatSnapshot.collected - vatSnapshot.deductible)}
                </span>
              </div>
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Prochaines échéances
                </p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-white">
                  Déclaration · {new Date(vatSnapshot.nextDeclarationDate).toLocaleDateString('fr-FR')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  Paiement avant le {new Date(vatSnapshot.paymentDeadline).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="dashboard-section-title">Clients et rappels</h2>
          <p className="dashboard-section-subtitle">Identifiez vos clients clés et vos échéances prioritaires.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <Card
            padding="lg"
            className="lg:col-span-3"
            title={
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Top clients
                </span>
                <span className="text-base font-semibold text-slate-900 dark:text-white">Récapitulatif YTD</span>
              </div>
            }
          >
            <ul className="mt-6 space-y-4">
              {topClients.map((client) => (
                <li key={client.name} className="flex items-center justify-between gap-4 border-b border-slate-200/60 pb-3 last:border-b-0 last:pb-0 dark:border-slate-800/60">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{client.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {Math.round(client.share * 100)}% du chiffre d’affaires clients
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(client.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card
            padding="lg"
            className="lg:col-span-2"
            title={
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  Échéances à venir
                </span>
                <span className="text-base font-semibold text-slate-900 dark:text-white">30 prochains jours</span>
              </div>
            }
          >
            <ul className="mt-6 space-y-4">
              {upcomingDeadlines.map((deadline) => (
                <li key={deadline.label} className="rounded-xl border border-slate-200/60 p-4 dark:border-slate-800/60">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-900 dark:text-white">
                    <span>{deadline.label}</span>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-primary dark:bg-primary/20">
                      {deadline.date}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-300">{deadline.description}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>
    </AccountingPageLayout>
  );
};

export default AccountingDashboardPage;


