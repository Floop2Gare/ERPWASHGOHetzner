import { useEffect, useMemo, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import { useAppData } from '../store/useAppData';
import type { Project, Service } from '../store/useAppData';
import { formatCurrency, formatDuration } from '../lib/format';
import { exportWorkbook } from '../lib/xlsxExport';

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

type SeriesKey = 'revenue' | 'volume' | 'duration' | 'averageTicket';

const seriesConfig: Record<SeriesKey, { label: string; color: string }> = {
  revenue: { label: 'Chiffre d’affaires', color: '#0049ac' },
  volume: { label: 'Volume prestations', color: '#1e3a8a' },
  duration: { label: 'Durée totale', color: '#0f172a' },
  averageTicket: { label: 'Panier moyen', color: '#475569' },
};

const seriesOrder: SeriesKey[] = ['revenue', 'volume', 'duration', 'averageTicket'];

type MultiSeriesLineChartProps = {
  data: TrendPoint[];
  activeSeries: SeriesKey[];
  onBrush?: (start: Date, end: Date) => void;
};

const MultiSeriesLineChart = ({ data, activeSeries, onBrush }: MultiSeriesLineChartProps) => {
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-400">
        Aucun point à afficher
      </div>
    );
  }

  if (!activeSeries.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-400">
        Sélectionnez au moins une série à afficher
      </div>
    );
  }

  const width = Math.max(1, data.length - 1) * 72;
  const height = 180;
  const horizontalPadding = 28;
  const verticalPadding = 24;
  const viewWidth = width + horizontalPadding * 2;
  const viewHeight = height + verticalPadding * 2;
  const step = width / Math.max(1, data.length - 1);

  const normalizedSeries = activeSeries.map((key) => {
    const values = data.map((point) => point[key]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const span = maxValue - minValue;
    return {
      key,
      minValue,
      maxValue,
      values: values.map((value) => {
        if (span === 0) {
          return 0.5;
        }
        return (value - minValue) / span;
      }),
    };
  });

  const toIndex = (clientX: number, currentTarget: SVGSVGElement) => {
    const rect = currentTarget.getBoundingClientRect();
    const relativeX = clientX - rect.left - horizontalPadding;
    const ratio = Math.max(0, Math.min(1, relativeX / Math.max(1, width)));
    return Math.round(ratio * Math.max(0, data.length - 1));
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const target = event.currentTarget;
    const index = toIndex(event.clientX, target);
    setDragStart(index);
    setDragEnd(index);
    target.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragStart === null) return;
    const target = event.currentTarget;
    const index = toIndex(event.clientX, target);
    setDragEnd(index);
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const target = event.currentTarget;
    if (dragStart !== null && dragEnd !== null && dragStart !== dragEnd && onBrush) {
      const [startIndex, endIndex] = dragStart < dragEnd ? [dragStart, dragEnd] : [dragEnd, dragStart];
      onBrush(data[startIndex].start, data[endIndex].end);
    }
    setDragStart(null);
    setDragEnd(null);
    target.releasePointerCapture(event.pointerId);
  };

  const dragMin = dragStart !== null && dragEnd !== null ? Math.min(dragStart, dragEnd) : null;
  const dragMax = dragStart !== null && dragEnd !== null ? Math.max(dragStart, dragEnd) : null;

  return (
    <div>
      <svg
        className="w-full"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        role="img"
        aria-label="Tendances analytiques"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setDragStart(null);
          setDragEnd(null);
        }}
      >
        <rect
          x={horizontalPadding}
          y={verticalPadding}
          width={width}
          height={height}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        {dragMin !== null && dragMax !== null ? (
          <rect
            x={horizontalPadding + dragMin * step}
            y={verticalPadding}
            width={Math.max(1, dragMax - dragMin) * step}
            height={height}
            fill="#0049ac"
            fillOpacity={0.08}
          />
        ) : null}
        {normalizedSeries.map((serie) => {
          const color = seriesConfig[serie.key].color;
          const path = serie.values
            .map((ratio, index) => {
              const x = horizontalPadding + index * step;
              const y = verticalPadding + (1 - ratio) * height;
              return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
            })
            .join(' ');
          return (
            <g key={serie.key}>
              <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
              {serie.values.map((ratio, index) => {
                const x = horizontalPadding + index * step;
                const y = verticalPadding + (1 - ratio) * height;
                return <circle key={`${serie.key}-${index}`} cx={x} cy={y} r={3} fill={color} />;
              })}
            </g>
          );
        })}
        {data.map((point, index) => {
          const x = horizontalPadding + index * step;
          const tooltipLines = [point.label, ...activeSeries.map((key) => {
            const config = seriesConfig[key];
            const value = point[key];
            if (key === 'duration') {
              return `${config.label} : ${formatDuration(value)}`;
            }
            if (key === 'volume') {
              return `${config.label} : ${formatNumber(value)}`;
            }
            return `${config.label} : ${formatCurrency(value)}`;
          })];
          return (
            <g key={`tooltip-${point.label}`}>
              <rect
                x={x - step / 2}
                y={verticalPadding}
                width={step || 1}
                height={height}
                fill="transparent"
              >
                <title>{tooltipLines.join('\n')}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 grid gap-y-1 text-[11px] uppercase tracking-[0.22em] text-slate-400 sm:grid-cols-2">
        {data.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
};
const StatsPage = () => {
  const { engagements, services, clients, projects, companies, computeEngagementTotals } = useAppData();

  const initialRange = getPresetRange('semaine');
  const [activePreset, setActivePreset] = useState<ActivePreset>('semaine');
  const [rangeStart, setRangeStart] = useState(() => format(initialRange.start, 'yyyy-MM-dd'));
  const [rangeEnd, setRangeEnd] = useState(() => format(initialRange.end, 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [activeKpiCategory, setActiveKpiCategory] = useState<Service['category'] | null>(null);
  const [selectedCity, setSelectedCity] = useState<'all' | string>('all');
  const [selectedCollaborator, setSelectedCollaborator] = useState<'all' | string>('all');
  const [activeSeries, setActiveSeries] = useState<SeriesKey[]>(['revenue', 'volume']);

  useEffect(() => {
    if (selectedCategory !== 'all' && activeKpiCategory) {
      setActiveKpiCategory(null);
    }
  }, [selectedCategory, activeKpiCategory]);

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
  const companyIndex = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  );
  const projectByClient = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((project) => {
      if (!map.has(project.clientId)) {
        map.set(project.clientId, project);
      }
    });
    return map;
  }, [projects]);

  const enrichedEngagements = useMemo(() => {
    return engagements.map((engagement) => {
      const totals = computeEngagementTotals(engagement);
      const service = serviceIndex.get(engagement.serviceId);
      const client = clientIndex.get(engagement.clientId);
      const company = engagement.companyId ? companyIndex.get(engagement.companyId) : null;
      const project = projectByClient.get(engagement.clientId) ?? null;
      return {
        id: engagement.id,
        serviceId: engagement.serviceId,
        serviceName: service?.name ?? 'Service',
        category: (service?.category ?? 'Voiture') as Service['category'],
        clientName: client?.name ?? 'Client',
        city: client?.city ?? 'Non renseigné',
        companyName: company?.name ?? '—',
        scheduledAt: parseISO(engagement.scheduledAt),
        status: engagement.status,
        revenue: totals.price + totals.surcharge,
        duration: totals.duration,
        collaborator: project?.manager ?? 'Non assigné',
        supportType: engagement.supportType,
      };
    });
  }, [
    engagements,
    computeEngagementTotals,
    serviceIndex,
    clientIndex,
    companyIndex,
    projectByClient,
  ]);

  const availableCities = useMemo(() => {
    return Array.from(new Set(enrichedEngagements.map((entry) => entry.city))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [enrichedEngagements]);

  const collaborators = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((project) => {
      set.add(project.manager);
      project.tasks.forEach((task) => set.add(task.owner));
    });
    set.add('Non assigné');
    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const baseFilteredEngagements = useMemo(() => {
    const startTime = currentRange.start.getTime();
    const endTime = currentRange.end.getTime();
    return enrichedEngagements.filter((entry) => {
      const time = entry.scheduledAt.getTime();
      if (time < startTime || time > endTime) {
        return false;
      }
      if (selectedCity !== 'all' && entry.city !== selectedCity) {
        return false;
      }
      if (selectedCollaborator !== 'all' && entry.collaborator !== selectedCollaborator) {
        return false;
      }
      return true;
    });
  }, [
    enrichedEngagements,
    currentRange.start,
    currentRange.end,
    selectedCity,
    selectedCollaborator,
  ]);

  const resolvedCategory =
    selectedCategory !== 'all' ? selectedCategory : activeKpiCategory ?? null;

  const filteredEngagements = useMemo(() => {
    if (!resolvedCategory) {
      return baseFilteredEngagements;
    }
    return baseFilteredEngagements.filter((entry) => entry.category === resolvedCategory);
  }, [baseFilteredEngagements, resolvedCategory]);

  const aggregateByCategory = (entries: typeof baseFilteredEngagements) => {
    const map = new Map<
      Service['category'],
      { category: Service['category']; revenue: number; volume: number; duration: number }
    >();
    entries.forEach((entry) => {
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
  };

  const baseCategoryBreakdown = useMemo(
    () => aggregateByCategory(baseFilteredEngagements),
    [baseFilteredEngagements]
  );

  const categoryBreakdown = useMemo(
    () => aggregateByCategory(filteredEngagements),
    [filteredEngagements]
  );

  const maxCategoryRevenue = categoryBreakdown[0]?.revenue ?? 0;

  const nonCancelled = filteredEngagements.filter((entry) => entry.status !== 'annulé');
  const cancelled = filteredEngagements.length - nonCancelled.length;
  const now = new Date();
  const todayNonCancelled = filteredEngagements.filter(
    (entry) => entry.status !== 'annulé' && isSameDay(entry.scheduledAt, now)
  );
  const todayTotal = filteredEngagements.filter((entry) => isSameDay(entry.scheduledAt, now));
  const todayCancelled = todayTotal.length - todayNonCancelled.length;

  const totalRevenue = nonCancelled.reduce((acc, entry) => acc + entry.revenue, 0);
  const totalDuration = nonCancelled.reduce((acc, entry) => acc + entry.duration, 0);
  const averageTicket = nonCancelled.length ? totalRevenue / nonCancelled.length : 0;
  const todayRevenue = todayNonCancelled.reduce((acc, entry) => acc + entry.revenue, 0);
  const todayDuration = todayNonCancelled.reduce((acc, entry) => acc + entry.duration, 0);
  const todayAverageTicket = todayNonCancelled.length ? todayRevenue / todayNonCancelled.length : 0;
  const topCategory = baseCategoryBreakdown[0]?.category ?? null;

  const kpiCards = [
    {
      key: 'volume',
      label: 'Prestations',
      value: formatNumber(nonCancelled.length),
      dayValue: formatNumber(todayNonCancelled.length),
      filterCategory: topCategory,
    },
    {
      key: 'revenue',
      label: 'Chiffre d’affaires estimé',
      value: formatCurrency(totalRevenue),
      dayValue: todayNonCancelled.length ? formatCurrency(todayRevenue) : '—',
      filterCategory: topCategory,
    },
    {
      key: 'duration',
      label: 'Durée totale',
      value: totalDuration ? formatDuration(totalDuration) : '—',
      dayValue: todayDuration ? formatDuration(todayDuration) : '—',
      filterCategory: topCategory,
    },
    {
      key: 'average',
      label: 'Panier moyen',
      value: nonCancelled.length ? formatCurrency(averageTicket) : '—',
      dayValue: todayAverageTicket ? formatCurrency(todayAverageTicket) : '—',
      filterCategory: topCategory,
    },
  ];

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

  const topServices = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        category: Service['category'];
        revenue: number;
        volume: number;
        duration: number;
      }
    >();
    filteredEngagements.forEach((entry) => {
      const current = map.get(entry.serviceId) ?? {
        id: entry.serviceId,
        name: entry.serviceName,
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
      map.set(entry.serviceId, current);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredEngagements]);

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
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredEngagements]);

  const [cityLimit, setCityLimit] = useState(5);
  const [cityQuery, setCityQuery] = useState('');

  const filteredCities = cityStats
    .filter((entry) =>
      cityQuery ? entry.city.toLowerCase().includes(cityQuery.toLowerCase()) : true
    )
    .slice(0, cityLimit);
  const dailySeries = useMemo(() => {
    const map = new Map<string, { revenue: number; volume: number }>();
    filteredEngagements.forEach((entry) => {
      const key = format(entry.scheduledAt, 'yyyy-MM-dd');
      const current = map.get(key) ?? { revenue: 0, volume: 0 };
      if (entry.status !== 'annulé') {
        current.revenue += entry.revenue;
        current.volume += 1;
      }
      map.set(key, current);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, values]) => ({
        date: dateKey,
        revenue: Number(values.revenue.toFixed(2)),
        volume: values.volume,
      }));
  }, [filteredEngagements]);

  const categorySheet = categoryBreakdown.map((entry) => ({
    category: entry.category,
    revenue: Number(entry.revenue.toFixed(2)),
    volume: entry.volume,
    duration: entry.duration,
    averagePrice: entry.volume ? Number((entry.revenue / entry.volume).toFixed(2)) : 0,
  }));

  const topServiceSheet = topServices.map((service) => ({
    name: service.name,
    category: service.category,
    revenue: Number(service.revenue.toFixed(2)),
    volume: service.volume,
    duration: service.duration,
    averagePrice: service.volume ? Number((service.revenue / service.volume).toFixed(2)) : 0,
  }));

  const citySheet = cityStats.map((entry) => ({
    city: entry.city,
    interventions: entry.interventions,
    revenue: Number(entry.revenue.toFixed(2)),
    duration: entry.duration,
    ticket: entry.interventions ? Number((entry.revenue / entry.interventions).toFixed(2)) : 0,
  }));

  const handleExport = () => {
    const sheets = [
      {
        name: 'KPIs',
        rows: [
          ['Indicateur', 'Valeur période', "Aujourd’hui"],
          ...kpiCards.map((card) => [card.label, card.value, card.dayValue]),
        ],
      },
      {
        name: 'CA_journalier',
        rows: [
          ['Date', 'Chiffre d’affaires'],
          ...dailySeries.map((point) => [point.date, point.revenue]),
        ],
      },
      {
        name: 'Volume_journalier',
        rows: [
          ['Date', 'Prestations'],
          ...dailySeries.map((point) => [point.date, point.volume]),
        ],
      },
      {
        name: 'Top_services',
        rows: [
          ['Service', 'Catégorie', 'CA', 'Volume', 'Durée totale', 'Prix moyen'],
          ...topServiceSheet.map((entry) => [
            entry.name,
            entry.category,
            entry.revenue,
            entry.volume,
            entry.duration,
            entry.averagePrice,
          ]),
        ],
      },
      {
        name: 'Catégories',
        rows: [
          ['Catégorie', 'CA', 'Prestations', 'Durée totale', 'Prix moyen'],
          ...categorySheet.map((entry) => [
            entry.category,
            entry.revenue,
            entry.volume,
            entry.duration,
            entry.averagePrice,
          ]),
        ],
      },
      {
        name: 'Villes',
        rows: [
          ['Ville', 'Prestations', 'CA', 'Durée totale', 'Ticket moyen'],
          ...citySheet.map((entry) => [
            entry.city,
            entry.interventions,
            entry.revenue,
            entry.duration,
            entry.ticket,
          ]),
        ],
      },
    ];

    const dateLabel = format(new Date(), 'yyyy-MM-dd');
    exportWorkbook(sheets, `pilotage-analytique-${dateLabel}.xlsx`);
  };

  const hasData = filteredEngagements.some((entry) => entry.status !== 'annulé');
  const resolvedCategoryLabel = resolvedCategory ?? null;
  const hasFilters =
    selectedCategory !== 'all' ||
    selectedCity !== 'all' ||
    selectedCollaborator !== 'all' ||
    activeKpiCategory !== null;

  const clearFilters = () => {
    setSelectedCategory('all');
    setActiveKpiCategory(null);
    setSelectedCity('all');
    setSelectedCollaborator('all');
  };

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

  const handleBrushRange = (start: Date, end: Date) => {
    setActivePreset('custom');
    setRangeStart(format(startOfDay(start), 'yyyy-MM-dd'));
    setRangeEnd(format(endOfDay(end), 'yyyy-MM-dd'));
  };

  const resetZoom = () => {
    applyPreset('semaine');
  };

  const toggleSeries = (key: SeriesKey) => {
    setActiveSeries((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
    );
  };

  const topServicesPreview = topServices.slice(0, 3);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
            Statistiques
          </p>
          <h1 className="text-[26px] font-semibold text-slate-900">Pilotage analytique</h1>
          <p className="text-sm leading-6 text-slate-500">
            Visualisez les indicateurs clés, suivez vos tendances et exportez vos analyses pour piloter l’activité au quotidien.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          Exporter Excel
        </Button>
      </header>

      <Card padding="sm" className="border-slate-200/70">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
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
            <Button size="xs" variant="ghost" onClick={resetZoom}>
              Aujourd’hui
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <label className="space-y-1 text-xs text-slate-600">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400">Début de période</span>
              <input
                type="date"
                value={rangeStart}
                onChange={(event) => handleStartChange(event.target.value)}
                className="w-full rounded-soft border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-600">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400">Fin de période</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(event) => handleEndChange(event.target.value)}
                className="w-full rounded-soft border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-600">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400">Catégorie</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value as CategoryFilter)}
                className="w-full rounded-soft border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Toutes</option>
                <option value="Voiture">Voiture</option>
                <option value="Canapé">Canapé</option>
                <option value="Textile">Textile</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-600">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400">Ville</span>
              <select
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
                className="w-full rounded-soft border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Toutes</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-slate-600">
              <span className="block text-[11px] uppercase tracking-wide text-slate-400">Collaborateur</span>
              <select
                value={selectedCollaborator}
                onChange={(event) => setSelectedCollaborator(event.target.value)}
                className="w-full rounded-soft border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Tous</option>
                {collaborators.map((collaborator) => (
                  <option key={collaborator} value={collaborator}>
                    {collaborator}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {hasFilters && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-3">
                {resolvedCategoryLabel && (
                  <span className="rounded-soft border border-slate-200 bg-slate-50 px-2 py-1">
                    Focus catégorie&nbsp;: {resolvedCategoryLabel}
                  </span>
                )}
              </div>
              <Button size="xs" variant="ghost" onClick={clearFilters}>
                Effacer les filtres
              </Button>
            </div>
          )}
        </div>
      </Card>

      {!hasData && (
        <Card padding="sm" className="border-dashed border-slate-300 bg-white/70">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <p>Aucune prestation sur cette période. Ajustez vos filtres ou élargissez la fenêtre.</p>
            <Button size="sm" variant="ghost" onClick={() => applyPreset('trimestre')}>
              Élargir la période
            </Button>
          </div>
        </Card>
      )}

      <Card title="Chiffres clés – instantané" padding="sm">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <section>
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Performances</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {kpiCards.map((card) => {
                const isActive = card.filterCategory && activeKpiCategory === card.filterCategory;
                const canFocus = Boolean(card.filterCategory);
                return (
                  <button
                    key={card.key}
                    type="button"
                    disabled={!canFocus}
                    onClick={() => {
                      if (!card.filterCategory) return;
                      setSelectedCategory('all');
                      setActiveKpiCategory((current) =>
                        current === card.filterCategory ? null : card.filterCategory
                      );
                    }}
                    className={`rounded-soft border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      isActive
                        ? 'border-primary/60 bg-primary/5 text-slate-900'
                        : 'border-slate-200/70 bg-white text-slate-700 hover:border-primary/40'
                    } ${!canFocus ? 'cursor-default opacity-80' : ''}`}
                  >
                    <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{card.label}</span>
                    <span className="mt-2 block text-2xl font-semibold text-slate-900">{card.value}</span>
                    <span className="mt-1 block text-xs text-slate-500">Aujourd’hui&nbsp;: {card.dayValue}</span>
                    {card.filterCategory && (
                      <span className="mt-2 block text-[10px] uppercase tracking-wide text-slate-400">
                        {isActive ? 'Filtre actif' : `Focus possible : ${card.filterCategory}`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Top services</p>
            {topServicesPreview.length ? (
              <ol className="space-y-2 text-sm text-slate-700">
                {topServicesPreview.map((service, index) => (
                  <li
                    key={service.id}
                    className="flex items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-400">{index + 1}</span>
                      <span className="font-medium text-slate-900">{service.name}</span>
                    </span>
                    <span className="text-slate-600">{formatCurrency(service.revenue)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-slate-500">Aucun service sur cette période.</p>
            )}
          </section>
          <section className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Analyse par catégories</p>
            {categoryBreakdown.length ? (
              <div className="space-y-2">
                {categoryBreakdown.map((entry) => {
                  const ratio = maxCategoryRevenue ? Math.min(100, (entry.revenue / maxCategoryRevenue) * 100) : 0;
                  const isActive = resolvedCategoryLabel === entry.category;
                  return (
                    <button
                      key={entry.category}
                      type="button"
                      onClick={() => {
                        setActiveKpiCategory(null);
                        setSelectedCategory((current) =>
                          current === entry.category ? 'all' : (entry.category as CategoryFilter)
                        );
                      }}
                      className={`w-full rounded-soft border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        isActive
                          ? 'border-primary/60 bg-primary/5 text-slate-900'
                          : 'border-slate-200/70 bg-white text-slate-700 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                        <span>{entry.category}</span>
                        <span>{formatCurrency(entry.revenue)}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${ratio}%` }}
                          aria-hidden
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-2 text-[11px] uppercase tracking-wide text-slate-400">
                        <span>Volume&nbsp;: {entry.volume}</span>
                        <span>
                          Prix&nbsp;:{' '}
                          {entry.volume ? formatCurrency(entry.revenue / entry.volume) : '—'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Aucune catégorie à afficher.</p>
            )}
          </section>
        </div>
      </Card>

      <Card
        title="Tendances détaillées"
        description="Affinez vos séries en ajustant la période et les indicateurs affichés"
        padding="sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            Fenêtre&nbsp;: {format(currentRange.start, 'd MMM yyyy', { locale: fr })} →{' '}
            {format(currentRange.end, 'd MMM yyyy', { locale: fr })}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {seriesOrder.map((series) => {
              const active = activeSeries.includes(series);
              return (
                <Button
                  key={series}
                  size="xs"
                  variant={active ? 'primary' : 'ghost'}
                  onClick={() => toggleSeries(series)}
                >
                  {seriesConfig[series].label}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="mt-4">
          <MultiSeriesLineChart
            data={trendData}
            activeSeries={activeSeries}
            onBrush={handleBrushRange}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <span>Survolez les points pour le détail. Faites glisser pour zoomer.</span>
          <Button size="xs" variant="ghost" onClick={resetZoom}>
            Réinitialiser le zoom
          </Button>
        </div>
      </Card>

     <Card title="Performance géographique" padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            {[5, 10, 25].map((limit) => (
              <Button
                key={limit}
                size="xs"
                variant={cityLimit === limit ? 'primary' : 'ghost'}
                onClick={() => setCityLimit(limit)}
              >
                Top {limit}
              </Button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Rechercher une ville"
            value={cityQuery}
            onChange={(event) => setCityQuery(event.target.value)}
            className="w-full rounded-soft border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 sm:w-auto"
          />
        </div>
        <div className="mt-3">
          {filteredCities.length ? (
            <Table
              tone="plain"
              density="compact"
              columns={['Ville', 'Prestations', 'CA', 'Durée', 'Ticket']}
              rows={filteredCities.map((city) => [
                <button
                  key={city.city}
                  type="button"
                  onClick={() =>
                    setSelectedCity((current) => (current === city.city ? 'all' : city.city))
                  }
                  className="text-left font-medium text-slate-800 underline-offset-2 hover:underline"
                >
                  {city.city}
                </button>,
                <span key={`${city.city}-vol`}>{city.interventions}</span>,
                <span key={`${city.city}-ca`} className="font-medium text-slate-800">
                  {formatCurrency(city.revenue)}
                </span>,
                <span key={`${city.city}-dur`}>
                  {city.duration ? formatDuration(city.duration) : '—'}
                </span>,
                <span key={`${city.city}-ticket`}>
                  {city.interventions ? formatCurrency(city.revenue / city.interventions) : '—'}
                </span>,
              ])}
            />
          ) : (
            <p className="text-sm text-slate-500">Aucune ville correspondante.</p>
          )}
        </div>
      </Card>

    </div>
  );
};

export default StatsPage;
