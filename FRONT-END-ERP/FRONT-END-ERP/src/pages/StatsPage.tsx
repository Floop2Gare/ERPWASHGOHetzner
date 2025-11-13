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
import { useAppData } from '../store/useAppData';
import type { Service } from '../store/useAppData';
import { formatCurrency, formatDuration } from '../lib/format';

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
  const { engagements, services, clients, computeEngagementTotals } = useAppData();

  const initialRange = getPresetRange('trimestre');
  const [activePreset, setActivePreset] = useState<ActivePreset>('trimestre');
  const [rangeStart, setRangeStart] = useState(() => format(initialRange.start, 'yyyy-MM-dd'));
  const [rangeEnd, setRangeEnd] = useState(() => format(initialRange.end, 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedCity, setSelectedCity] = useState<'all' | string>('all');

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

  const bucketMode = useMemo(
    () => deriveBucketMode(activePreset, currentRange.start, currentRange.end),
    [activePreset, currentRange.start, currentRange.end]
  );

  const serviceIndex = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const clientIndex = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  const enrichedEngagements = useMemo(() => {
    return engagements.map((engagement) => {
      const totals = computeEngagementTotals(engagement);
      const service = serviceIndex.get(engagement.serviceId);
      const client = clientIndex.get(engagement.clientId);
      return {
        id: engagement.id,
        serviceId: engagement.serviceId,
        serviceName: service?.name ?? 'Service',
        category: (service?.category ?? 'Voiture') as Service['category'],
        clientName: client?.name ?? 'Client',
        city: client?.city ?? 'Non renseigné',
        scheduledAt: parseISO(engagement.scheduledAt),
        status: engagement.status,
        revenue: totals.price + totals.surcharge,
        duration: totals.duration,
      };
    });
  }, [engagements, computeEngagementTotals, serviceIndex, clientIndex]);

  const datasetRange = useMemo(() => {
    if (enrichedEngagements.length === 0) {
      return null;
    }
    let minDate = enrichedEngagements[0].scheduledAt;
    let maxDate = minDate;
    enrichedEngagements.forEach((entry) => {
      if (entry.scheduledAt.getTime() < minDate.getTime()) {
        minDate = entry.scheduledAt;
      }
      if (entry.scheduledAt.getTime() > maxDate.getTime()) {
        maxDate = entry.scheduledAt;
      }
    });
    return {
      start: startOfDay(minDate),
      end: endOfDay(maxDate),
    };
  }, [enrichedEngagements]);

  const availableCities = useMemo(() => {
    return Array.from(new Set(enrichedEngagements.map((entry) => entry.city))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [enrichedEngagements]);

  const filteredEngagements = useMemo(() => {
    const startTime = currentRange.start.getTime();
    const endTime = currentRange.end.getTime();
    return enrichedEngagements.filter((entry) => {
      const time = entry.scheduledAt.getTime();
      if (time < startTime || time > endTime) {
        return false;
      }
      if (selectedCategory !== 'all' && entry.category !== selectedCategory) {
        return false;
      }
      if (selectedCity !== 'all' && entry.city !== selectedCity) {
        return false;
      }
      return true;
    });
  }, [enrichedEngagements, currentRange.start, currentRange.end, selectedCategory, selectedCity]);

  const nonCancelled = filteredEngagements.filter((entry) => entry.status !== 'annulé');

  const totalRevenue = nonCancelled.reduce((acc, entry) => acc + entry.revenue, 0);
  const totalDuration = nonCancelled.reduce((acc, entry) => acc + entry.duration, 0);
  const averageTicket = nonCancelled.length ? totalRevenue / nonCancelled.length : 0;
  const totalVolume = nonCancelled.length;
  const revenuePerHour = totalDuration > 0 ? totalRevenue / (totalDuration / 60) : 0;
  const uniqueClients = new Set(nonCancelled.map((e) => e.clientName)).size;

  const buckets = useMemo(
    () => buildBuckets(bucketMode, currentRange.start, currentRange.end),
    [bucketMode, currentRange.start, currentRange.end]
  );

  const trendData = useMemo(() => {
    return buckets.map((bucket) => {
      const entries = filteredEngagements.filter((entry) => {
        const time = entry.scheduledAt.getTime();
        return time >= bucket.start.getTime() && time <= bucket.end.getTime();
      });
      const valid = entries.filter((entry) => entry.status !== 'annulé');
      const revenue = valid.reduce((acc, entry) => acc + entry.revenue, 0);
      const volume = valid.length;
      const duration = valid.reduce((acc, entry) => acc + entry.duration, 0);
      const averageTicket = volume ? revenue / volume : 0;
      return {
        label: bucket.label,
        start: bucket.start,
        end: bucket.end,
        revenue,
        volume,
        duration,
        averageTicket,
      } satisfies TrendPoint;
    });
  }, [buckets, filteredEngagements]);

  const revenueTrendData = useMemo(
    () => trendData.map((point) => ({ label: point.label, value: point.revenue })),
    [trendData]
  );

  const volumeTrendData = useMemo(
    () => trendData.map((point) => ({ label: point.label, value: point.volume })),
    [trendData]
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map<
      Service['category'],
      { category: Service['category']; revenue: number; volume: number; duration: number }
    >();
    filteredEngagements.forEach((entry) => {
      const current = map.get(entry.category) ?? {
        category: entry.category,
        revenue: 0,
        volume: 0,
        duration: 0,
      };
      if (entry.status !== 'annulé') {
        current.revenue += entry.revenue;
        current.volume += 1;
        current.duration += entry.duration;
      }
      map.set(entry.category, current);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredEngagements]);

  const categoryBarData = useMemo(
    () => categoryBreakdown.map((entry) => ({ label: entry.category, value: entry.revenue })),
    [categoryBreakdown]
  );

  const categoryPieData = useMemo(
    () => categoryBreakdown.map((entry) => ({ label: entry.category, value: entry.revenue })),
    [categoryBreakdown]
  );

  const cityStats = useMemo(() => {
    const map = new Map<
      string,
      { city: string; interventions: number; revenue: number; duration: number }
    >();
    filteredEngagements.forEach((entry) => {
      const current = map.get(entry.city) ?? {
        city: entry.city,
        interventions: 0,
        revenue: 0,
        duration: 0,
      };
      if (entry.status !== 'annulé') {
        current.interventions += 1;
        current.revenue += entry.revenue;
        current.duration += entry.duration;
      }
      map.set(entry.city, current);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredEngagements]);

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

  useEffect(() => {
    if (!datasetRange) {
      return;
    }
    const startDate = startOfDay(parseISO(rangeStart));
    const endDate = endOfDay(parseISO(rangeEnd));
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return;
    }

    const rangeHasData = enrichedEngagements.some((entry) => {
      const time = entry.scheduledAt.getTime();
      return time >= startDate.getTime() && time <= endDate.getTime();
    });

    if (!rangeHasData) {
      const datasetStartStr = format(datasetRange.start, 'yyyy-MM-dd');
      const datasetEndStr = format(datasetRange.end, 'yyyy-MM-dd');
      if (rangeStart !== datasetStartStr) {
        setRangeStart(datasetStartStr);
      }
      if (rangeEnd !== datasetEndStr) {
        setRangeEnd(datasetEndStr);
      }
      if (activePreset !== 'custom') {
        setActivePreset('custom');
      }
    }
  }, [enrichedEngagements, datasetRange, rangeEnd, rangeStart, activePreset]);

  const hasData = filteredEngagements.some((entry) => entry.status !== 'annulé');

  return (
    <div className="stats-page space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistiques</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Analysez vos performances et suivez l'évolution de votre activité
          </p>
        </div>
      </div>

      {/* Filtres */}
      <Card padding="lg">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Période :</span>
            {presetPeriods.map((option) => (
              <Button
                key={option.value}
                size="xs"
                variant={activePreset === option.value ? 'primary' : 'ghost'}
                onClick={() => applyPreset(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">Début de période</span>
              <input
                type="date"
                value={rangeStart}
                onChange={(event) => handleStartChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">Fin de période</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(event) => handleEndChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">Catégorie</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value as CategoryFilter)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">Toutes</option>
                <option value="Voiture">Voiture</option>
                <option value="Canapé">Canapé</option>
                <option value="Textile">Textile</option>
                <option value="Autre">Autre</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300">Ville</span>
              <select
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">Toutes</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {hasFilters && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-600 dark:text-slate-400">Filtres actifs :</span>
                {selectedCategory !== 'all' && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {selectedCategory}
                  </span>
                )}
                {selectedCity !== 'all' && (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {selectedCity}
                  </span>
                )}
              </div>
              <Button size="xs" variant="ghost" onClick={clearFilters}>
                Réinitialiser
              </Button>
            </div>
          )}
        </div>
      </Card>

      {!hasData ? (
        <Card padding="sm" className="border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <svg className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Aucune donnée disponible</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ajustez vos filtres ou élargissez la période</p>
            </div>
            <Button size="sm" variant="primary" onClick={() => applyPreset('trimestre')}>
              Voir le trimestre
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* KPIs - Indicateurs calculables uniquement */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card padding="sm">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Prestations</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(totalVolume)}</p>
              </div>
            </Card>
            <Card padding="sm">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</p>
              </div>
            </Card>
            <Card padding="sm">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Panier moyen</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {averageTicket ? formatCurrency(averageTicket) : '—'}
                </p>
              </div>
            </Card>
            <Card padding="sm">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Durée totale</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalDuration ? formatDuration(totalDuration) : '—'}
                </p>
              </div>
            </Card>
            <Card padding="sm">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">CA / heure</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {revenuePerHour ? formatCurrency(revenuePerHour) : '—'}
                </p>
              </div>
            </Card>
            <Card padding="sm">
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Clients uniques</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(uniqueClients)}</p>
              </div>
            </Card>
          </div>

          {/* Performance temporelle */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Performance temporelle</h2>
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
          </div>

          {/* Répartition par catégorie */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Répartition par catégorie</h2>
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
          </div>

          {/* Géographie */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Zones & villes</h2>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPage;
