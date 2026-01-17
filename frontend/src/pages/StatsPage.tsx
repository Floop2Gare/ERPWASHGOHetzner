import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import { PieChart } from '../components/charts/PieChart';
import { StatsService, type StatsOverviewData } from '../api';
import { useAppData, type Service, type Engagement, type Subscription } from '../store/useAppData';
import { formatCurrency, formatDuration } from '../lib/format';
import {
  CRMFeedback,
  CRMBackendStatus,
  CRMEmptyState,
} from '../components/crm';
import { Filter, X, TrendingUp, DollarSign, Clock, Users, ShoppingCart, BarChart3, Calendar, CreditCard } from 'lucide-react';
import clsx from 'clsx';

const presetPeriods = [
  { value: 'semaine', label: 'Semaine' },
  { value: 'mois', label: 'Mois' },
  { value: 'trimestre', label: 'Trimestre' },
] as const;

type PresetPeriod = (typeof presetPeriods)[number]['value'];
type ActivePreset = PresetPeriod | 'custom';

type BucketMode = 'day' | 'week' | 'month';

type CategoryFilter = 'all' | Service['category'];

type TimeBucket = {
  label: string;
  start: Date;
  end: Date;
};

type TrendPoint = {
  label: string;
  start: Date;
  end: Date;
  revenue: number;
  volume: number;
  duration: number;
  averageTicket: number;
};

const numberFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
});

const formatNumber = (value: number) => numberFormatter.format(value);

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

const getPresetRange = (preset: PresetPeriod, reference = new Date()) => {
  if (preset === 'semaine') {
    const start = startOfWeek(reference, { weekStartsOn: 1 });
    return { start, end: endOfWeek(reference, { weekStartsOn: 1 }) };
  }
  if (preset === 'mois') {
    const start = startOfMonth(reference);
    return { start, end: endOfMonth(reference) };
  }
  const start = startOfQuarter(reference);
  return { start, end: endOfQuarter(reference) };
};

const buildBuckets = (mode: BucketMode, start: Date, end: Date): TimeBucket[] => {
  const buckets: TimeBucket[] = [];
  const rangeEnd = endOfDay(end);
  if (mode === 'day') {
    let cursor = startOfDay(start);
    while (cursor <= rangeEnd) {
      const bucketEnd = endOfDay(cursor);
      buckets.push({
        label: format(cursor, 'EEE d MMM', { locale: fr }),
        start: cursor,
        end: bucketEnd <= rangeEnd ? bucketEnd : rangeEnd,
      });
      cursor = addDays(cursor, 1);
    }
    return buckets;
  }

  if (mode === 'week') {
    let cursor = startOfWeek(start, { weekStartsOn: 1 });
    while (cursor <= rangeEnd) {
      const bucketEnd = endOfDay(addDays(cursor, 6));
      buckets.push({
        label: `Sem. ${format(cursor, 'II', { locale: fr })}`,
        start: cursor,
        end: bucketEnd <= rangeEnd ? bucketEnd : rangeEnd,
      });
      cursor = addDays(cursor, 7);
    }
    return buckets;
  }

  let cursor = startOfMonth(start);
  while (cursor <= rangeEnd) {
    const bucketEnd = endOfDay(endOfMonth(cursor));
    buckets.push({
      label: format(cursor, 'MMM yyyy', { locale: fr }),
      start: cursor,
      end: bucketEnd <= rangeEnd ? bucketEnd : rangeEnd,
    });
    cursor = addMonths(cursor, 1);
  }
  return buckets;
};

const deriveBucketMode = (
  preset: ActivePreset,
  start: Date,
  end: Date
): BucketMode => {
  if (preset === 'semaine') return 'day';
  if (preset === 'mois') return 'week';
  if (preset === 'trimestre') return 'week';
  const diffDays = Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  if (diffDays <= 14) return 'day';
  if (diffDays <= 90) return 'week';
  return 'month';
};

const StatsPage = () => {
  const { engagements, subscriptions, computeEngagementTotals, vatEnabled, vatRate, authUsers, services, clients } = useAppData();
  const initialRange = getPresetRange('trimestre');
  const [activePreset, setActivePreset] = useState<ActivePreset>('trimestre');
  const [rangeStart, setRangeStart] = useState(() => format(initialRange.start, 'yyyy-MM-dd'));
  const [rangeEnd, setRangeEnd] = useState(() => format(initialRange.end, 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedCity, setSelectedCity] = useState<'all' | string>('all');
  const [statsData, setStatsData] = useState<StatsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentRange = useMemo(() => {
    const start = parseISO(rangeStart);
    const end = parseISO(rangeEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const fallback = getPresetRange('semaine');
      return fallback;
    }
    if (start.getTime() > end.getTime()) {
      return { start: startOfDay(end), end: endOfDay(start) };
    }
    return { start: startOfDay(start), end: endOfDay(end) };
  }, [rangeStart, rangeEnd]);

  // Charger et calculer les statistiques depuis les engagements réels
  useEffect(() => {
    setLoading(false);
    setError(null);
  }, [rangeStart, rangeEnd, selectedCategory, selectedCity]);

  // Filtrer les engagements réalisés dans la période sélectionnée
  const filteredEngagements = useMemo(() => {
    return engagements.filter((engagement) => {
      // Ne garder que les engagements réalisés
      if (engagement.status !== 'réalisé') return false;

      // Filtrer par période
      if (!engagement.scheduledAt) return false;
      const engagementDate = new Date(engagement.scheduledAt);
      if (engagementDate < currentRange.start || engagementDate > currentRange.end) return false;

      // Filtrer par catégorie
      if (selectedCategory !== 'all') {
        const service = services.find((s) => s.id === engagement.serviceId);
        if (!service || service.category !== selectedCategory) return false;
      }

      // Filtrer par ville
      if (selectedCity !== 'all') {
        const client = clients.find((c) => c.id === engagement.clientId);
        if (!client || client.city !== selectedCity) return false;
      }

      return true;
    });
  }, [engagements, currentRange, selectedCategory, selectedCity, services, clients]);

  // Calculer les KPIs depuis les engagements filtrés
  const kpis = useMemo(() => {
    const totalVolume = filteredEngagements.length;
    let totalRevenue = 0;
    let totalDuration = 0;
    const uniqueClientIds = new Set<string>();

    filteredEngagements.forEach((engagement) => {
      uniqueClientIds.add(engagement.clientId);
      const totals = computeEngagementTotals(engagement);
      totalRevenue += totals.price + (totals.surcharge || 0);
      totalDuration += totals.duration || 0;
    });

    const averageTicket = totalVolume > 0 ? totalRevenue / totalVolume : 0;
    const revenuePerHour = totalDuration > 0 ? (totalRevenue / totalDuration) * 60 : 0;

    return {
      totalVolume,
      totalRevenue,
      averageTicket,
      totalDuration,
      revenuePerHour,
      uniqueClients: uniqueClientIds.size,
    };
  }, [filteredEngagements, computeEngagementTotals]);

  // Calculer les données de tendance
  const trendData = useMemo(() => {
    const bucketMode = deriveBucketMode(activePreset, currentRange.start, currentRange.end);
    const buckets = buildBuckets(bucketMode, currentRange.start, currentRange.end);

    return buckets.map((bucket) => {
      const bucketEngagements = filteredEngagements.filter((engagement) => {
        if (!engagement.scheduledAt) return false;
        const engagementDate = new Date(engagement.scheduledAt);
        return engagementDate >= bucket.start && engagementDate <= bucket.end;
      });

      let revenue = 0;
      let duration = 0;
      bucketEngagements.forEach((engagement) => {
        const totals = computeEngagementTotals(engagement);
        revenue += totals.price + (totals.surcharge || 0);
        duration += totals.duration || 0;
      });

      const volume = bucketEngagements.length;
      const averageTicket = volume > 0 ? revenue / volume : 0;

      return {
        label: bucket.label,
        start: bucket.start,
        end: bucket.end,
        revenue,
        volume,
        duration,
        averageTicket,
      };
    });
  }, [filteredEngagements, currentRange, activePreset, computeEngagementTotals]);

  const revenueTrendData = trendData.map((point) => ({ label: point.label, value: point.revenue }));
  const volumeTrendData = trendData.map((point) => ({ label: point.label, value: point.volume }));

  // Calculer la répartition par catégorie
  const categoryBreakdown = useMemo(() => {
    const categoryMap = new Map<string, { revenue: number; volume: number }>();

    filteredEngagements.forEach((engagement) => {
      const service = services.find((s) => s.id === engagement.serviceId);
      const category = service?.category || 'Autre';
      const totals = computeEngagementTotals(engagement);
      const revenue = totals.price + (totals.surcharge || 0);

      const existing = categoryMap.get(category) || { revenue: 0, volume: 0 };
      categoryMap.set(category, {
        revenue: existing.revenue + revenue,
        volume: existing.volume + 1,
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredEngagements, services, computeEngagementTotals]);

  const categoryBarData = categoryBreakdown.map((entry) => ({ label: entry.category, value: entry.revenue }));
  const categoryPieData = categoryBreakdown.map((entry) => ({ label: entry.category, value: entry.revenue }));

  // Calculer les statistiques par ville
  const cityStats = useMemo(() => {
    const cityMap = new Map<string, { revenue: number; volume: number }>();

    filteredEngagements.forEach((engagement) => {
      const client = clients.find((c) => c.id === engagement.clientId);
      if (!client || !client.city) return;

      const totals = computeEngagementTotals(engagement);
      const revenue = totals.price + (totals.surcharge || 0);

      const existing = cityMap.get(client.city) || { revenue: 0, volume: 0 };
      cityMap.set(client.city, {
        revenue: existing.revenue + revenue,
        volume: existing.volume + 1,
      });
    });

    return Array.from(cityMap.entries())
      .map(([city, data]) => ({ city, revenue: data.revenue, interventions: data.volume }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 villes
  }, [filteredEngagements, clients, computeEngagementTotals]);

  // Extraire les villes disponibles depuis les clients
  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    clients.forEach((client) => {
      if (client.city) cities.add(client.city);
    });
    return Array.from(cities).sort();
  }, [clients]);

  const cityBarData = useMemo(
    () => cityStats.map((entry) => ({ label: entry.city, value: entry.revenue })),
    [cityStats]
  );

  const applyPreset = (preset: PresetPeriod) => {
    const presetRange = getPresetRange(preset);
    setActivePreset(preset);
    setRangeStart(format(presetRange.start, 'yyyy-MM-dd'));
    setRangeEnd(format(presetRange.end, 'yyyy-MM-dd'));
  };

  const handleStartChange = (value: string) => {
    setActivePreset('custom');
    setRangeStart(value);
  };

  const handleEndChange = (value: string) => {
    setActivePreset('custom');
    setRangeEnd(value);
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedCity('all');
  };

  const hasFilters = selectedCategory !== 'all' || selectedCity !== 'all';

  const hasData = kpis.totalVolume > 0;

  // Extraire les catégories disponibles depuis les services
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    services.forEach((service) => {
      if (service.category) categories.add(service.category);
    });
    return Array.from(categories).sort();
  }, [services]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedCity !== 'all') count++;
    if (activePreset === 'custom') count++;
    return count;
  }, [selectedCategory, selectedCity, activePreset]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  // Calcul du CA mensuel
  const monthlyRevenue = useMemo(() => {
    const start = parseISO(rangeStart);
    const end = parseISO(rangeEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }
    
    const daysDiff = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const months = daysDiff / 30.44; // Nombre moyen de jours par mois
    return months > 0 ? kpis.totalRevenue / months : 0;
  }, [kpis.totalRevenue, rangeStart, rangeEnd]);

  // Calcul des statistiques d'abonnements - RETOURNE DES VALEURS VIDES
  const subscriptionStats = useMemo(() => {
    return { count: 0, revenue: 0, activeCount: 0 };
  }, []);

  // Calcul de la répartition par membre de l'équipe - RETOURNE UN TABLEAU VIDE
  const teamStats = useMemo(() => {
    return [];
  }, []);

  const statsKpis = useMemo(() => {
    return [
      {
        id: 'volume',
        label: 'Prestations',
        value: formatNumber(kpis.totalVolume),
        helper: `${formatNumber(kpis.uniqueClients)} clients uniques`,
      },
      {
        id: 'revenue',
        label: 'Chiffre d\'affaires',
        value: formatCurrency(kpis.totalRevenue),
        helper: `Panier moyen ${kpis.averageTicket ? formatCurrency(kpis.averageTicket) : '—'}`,
      },
      {
        id: 'monthly',
        label: 'CA mensuel',
        value: formatCurrency(monthlyRevenue),
        helper: `Sur la période sélectionnée`,
      },
      {
        id: 'subscriptions',
        label: 'Abonnements',
        value: formatNumber(subscriptionStats.activeCount),
        helper: `${formatCurrency(subscriptionStats.revenue)} générés`,
      },
      {
        id: 'efficiency',
        label: 'CA / heure',
        value: kpis.revenuePerHour ? formatCurrency(kpis.revenuePerHour) : '—',
        helper: `Durée totale ${kpis.totalDuration ? formatDuration(kpis.totalDuration) : '—'}`,
      },
    ];
  }, [kpis, monthlyRevenue, subscriptionStats]);

  return (
    <div className="dashboard-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Gestion CRM</p>
            <h1 className="dashboard-hero__title">Statistiques</h1>
            <p className="dashboard-hero__subtitle">
              Analysez vos performances et suivez l'évolution de votre activité
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      <CRMFeedback message={feedback} />

      <section className="space-y-4">
        <CRMBackendStatus
          loading={loading}
          error={error}
          loadingMessage="Chargement des statistiques…"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statsKpis.map((kpi, index) => {
            const Icon = [ShoppingCart, DollarSign, Calendar, CreditCard, TrendingUp][index] ?? ShoppingCart;
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Filtres et période</h2>
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
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Période :</span>
            {presetPeriods.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => applyPreset(option.value)}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  activePreset === option.value
                    ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {showFilters && (
            <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Début de période</label>
                  <input
                    type="date"
                    value={rangeStart}
                    onChange={(event) => handleStartChange(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Fin de période</label>
                  <input
                    type="date"
                    value={rangeEnd}
                    onChange={(event) => handleEndChange(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Catégorie</label>
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value as CategoryFilter)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="all">Toutes</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">Ville</label>
                  <select
                    value={selectedCity}
                    onChange={(event) => setSelectedCity(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="all">Toutes</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearFilters();
                    applyPreset('trimestre');
                  }}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <X className="h-4 w-4" />
                  Effacer les filtres
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {!hasData && !loading && !error && (
        <CRMEmptyState
          message="Ajustez vos filtres ou élargissez la période pour voir vos statistiques."
        />
      )}

      {hasData && (
        <div className="space-y-6">

          {/* Performance temporelle */}
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Performance temporelle</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Évolution du chiffre d'affaires et du volume de prestations
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card
                padding="lg"
                title={
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                      Évolution du chiffre d'affaires
                    </span>
                    <span className="text-base font-semibold text-slate-900 dark:text-white">
                      Du {format(currentRange.start, 'd MMM', { locale: fr })} au {format(currentRange.end, 'd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                }
              >
                <LineChart
                  data={revenueTrendData}
                  className="mt-6"
                  variant="ultraThin"
                  yTicks={6}
                  showXAxisLabels
                  formatYAxisLabel={formatChartCurrency}
                  formatPointLabel={(point) => formatChartCompactCurrency(point.value)}
                  getTooltip={(point) => `${point.label} · ${formatCurrency(point.value)}`}
                />
              </Card>

              <Card
                padding="lg"
                title={
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                      Évolution du volume
                    </span>
                    <span className="text-base font-semibold text-slate-900 dark:text-white">
                      Nombre de prestations
                    </span>
                  </div>
                }
              >
                <LineChart
                  data={volumeTrendData}
                  className="mt-6"
                  variant="ultraThin"
                  yTicks={6}
                  showXAxisLabels
                  formatYAxisLabel={(value) => formatNumber(value)}
                  formatPointLabel={(point) => formatNumber(point.value)}
                  getTooltip={(point) => `${point.label} · ${formatNumber(point.value)} prestations`}
                />
              </Card>
            </div>
          </section>

          {/* Répartition par catégorie */}
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Répartition par catégorie</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Analyse du chiffre d'affaires par type de prestation
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card
                padding="lg"
                title={
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                      Répartition par catégorie
                    </span>
                    <span className="text-base font-semibold text-slate-900 dark:text-white">Chiffre d'affaires</span>
                  </div>
                }
              >
                <BarChart
                  data={categoryBarData}
                  className="mt-6"
                  getTooltip={(point) => `${point.label} · ${formatCurrency(point.value)}`}
                  valueFormatter={(value) => formatCurrency(value)}
                />
              </Card>

              <Card
                padding="lg"
                title={
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                      Répartition par catégorie
                    </span>
                    <span className="text-base font-semibold text-slate-900 dark:text-white">Pourcentage</span>
                  </div>
                }
              >
                <PieChart
                  data={categoryPieData}
                  className="mt-6"
                  getTooltip={(point) => `${point.label} · ${formatCurrency(point.value)}`}
                  valueFormatter={(value) => formatCurrency(value)}
                />
              </Card>
            </div>
          </section>

          {/* Géographie */}
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Zones & villes</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Performance géographique de votre activité
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card
                padding="lg"
                title={
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                      Top 5 villes
                    </span>
                    <span className="text-base font-semibold text-slate-900 dark:text-white">Par chiffre d'affaires</span>
                  </div>
                }
              >
                <BarChart
                  data={cityBarData}
                  className="mt-6"
                  getTooltip={(point) => `${point.label} · ${formatCurrency(point.value)}`}
                  valueFormatter={(value) => formatCurrency(value)}
                />
              </Card>

              <Card padding="lg">
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                      Détail par ville
                    </span>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Ville
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            CA
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Prestations
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            CA moyen
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {cityStats.map((city) => (
                          <tr key={city.city}>
                            <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">{city.city}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                              {formatCurrency(city.revenue)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                              {formatNumber(city.interventions)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                              {formatCurrency(city.interventions > 0 ? city.revenue / city.interventions : 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        </div>
      )}

      {/* Répartition par membre de l'équipe - Toujours visible */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Performance par membre de l'équipe</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Répartition des prestations et du chiffre d'affaires par collaborateur
          </p>
        </div>
        {teamStats.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card
              padding="lg"
              title={
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    Répartition par membre
                  </span>
                  <span className="text-base font-semibold text-slate-900 dark:text-white">Chiffre d'affaires</span>
                </div>
              }
            >
              <BarChart
                data={teamStats.map((stat) => ({ label: stat.name, value: stat.revenue }))}
                className="mt-6"
                getTooltip={(point) => `${point.label} · ${formatCurrency(point.value)}`}
                valueFormatter={(value) => formatCurrency(value)}
              />
            </Card>

            <Card padding="lg">
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                    Détail par membre
                  </span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Membre
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          CA
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Prestations
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Panier moyen
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Durée
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {teamStats.map((member) => (
                        <tr key={member.name}>
                          <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">{member.name}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                            {formatCurrency(member.revenue)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                            {formatNumber(member.volume)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                            {formatCurrency(member.averageTicket)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300">
                            {formatDuration(member.duration)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card padding="lg" className="border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <Users className="h-12 w-12 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucune donnée d'équipe disponible</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Les prestations doivent être assignées à des membres de l'équipe pour apparaître ici
                </p>
              </div>
            </div>
          </Card>
        )}
      </section>
    </div>
  );
};

export default StatsPage;
