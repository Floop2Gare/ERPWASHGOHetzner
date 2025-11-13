import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceToNow,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAppData } from '../store/useAppData';
import type { AuthUser, EngagementStatus } from '../store/useAppData';
import { BRAND_NAME } from '../lib/branding';
import { useGoogleCalendarEvents } from '../hooks/useGoogleCalendarEvents';
import { resolveCalendarKeyForUser } from '../lib/calendar';

const parseTimeToMinutes = (time: string) => {
  const [hours, minutes] = time.split('h');
  return Number(hours) * 60 + Number(minutes ?? '0');
};

const formatHourLabel = (hour: number) => `${hour.toString().padStart(2, '0')}h00`;

const slotHeight = 64;

const numberFormatter = new Intl.NumberFormat('fr-FR');

const formatNumber = (value: number) => numberFormatter.format(value);

const userOptions: Array<{ label: string; value: string | null }> = [
  { label: 'Clément', value: 'clement' },
  { label: 'Adrien', value: 'adrien' },
];

const viewOptions: Array<{ label: string; value: 'mois' | 'semaine' | 'jour' }> = [
  { label: 'Mois', value: 'mois' },
  { label: 'Semaine', value: 'semaine' },
  { label: 'Jour', value: 'jour' },
];

// Démo : ajuster la date et les créneaux de test si besoin pour valider le rendu visuel.
const planningTestDate = '2025-10-16';
const planningTestDefinitions: { start: string; end: string; status: EngagementStatus }[] = [
  { start: '09h00', end: '10h30', status: 'planifié' },
  { start: '11h00', end: '12h00', status: 'réalisé' },
  { start: '14h00', end: '16h00', status: 'envoyé' },
];

const mapCalendarStatusToEngagementStatus = (status: string | null | undefined): EngagementStatus => {
  switch (status) {
    case 'cancelled':
      return 'annulé';
    case 'tentative':
      return 'envoyé';
    case 'confirmed':
    default:
      return 'planifié';
  }
};

const getSlotToneClasses = (status: EngagementStatus | undefined) => {
  switch (status) {
    case 'planifié':
      return 'border-primary/40 bg-primary/10 text-primary dark:border-primary/50 dark:bg-primary/20 dark:text-primary';
    case 'réalisé':
      return 'border-emerald-400/50 bg-emerald-50 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-500/20 dark:text-emerald-100';
    case 'envoyé':
      return 'border-amber-400/50 bg-amber-50 text-amber-700 dark:border-amber-400/60 dark:bg-amber-500/20 dark:text-amber-100';
    case 'annulé':
      return 'border-rose-400/50 bg-rose-50 text-rose-700 dark:border-rose-500/60 dark:bg-rose-500/20 dark:text-rose-100';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100';
  }
};

const getStatusColor = (status: EngagementStatus | undefined): 'blue' | 'green' | 'yellow' | 'red' | 'gray' => {
  switch (status) {
    case 'planifié':
      return 'blue';
    case 'réalisé':
      return 'green';
    case 'envoyé':
      return 'yellow';
    case 'annulé':
      return 'red';
    default:
      return 'gray';
  }
};

const colorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
  gray: 'bg-slate-500',
};

const PlanningPage = () => {
  const slots = useAppData((state) => state.slots);
  const engagements = useAppData((state) => state.engagements);
  const clients = useAppData((state) => state.clients);
  const services = useAppData((state) => state.services);
  const authUsers = useAppData((state) => state.authUsers);
  const currentUserId = useAppData((state) => state.currentUserId);
  const location = useLocation();
  const [view, setView] = useState<'mois' | 'semaine' | 'jour'>('mois');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const currentUser: AuthUser | null = useMemo(() => {
    if (!currentUserId) {
      return null;
    }
    return authUsers.find((user) => user.id === currentUserId && user.active) ?? null;
  }, [authUsers, currentUserId]);

  // Utiliser selectedUser si défini, sinon currentUser
  const activeUser = useMemo(() => {
    if (selectedUser) {
      // Si un utilisateur est sélectionné, utiliser sa clé
      return selectedUser;
    }
    // Sinon, utiliser la clé de l'utilisateur actuel
    return resolveCalendarKeyForUser(currentUser);
  }, [selectedUser, currentUser]);

  const calendarKey = activeUser;

  const {
    events: googleEvents,
    slots: googleSlots,
    eventsBySlotId,
    loading: calendarLoading,
    error: calendarError,
    fetchedAt: calendarFetchedAt,
    warnings: calendarWarnings,
    refresh: refreshCalendar,
  } = useGoogleCalendarEvents({
    userKey: calendarKey,
    rangeDays: 365, // 1 an dans le futur
    pastDays: 365,  // 1 an dans le passé
  });

  const baseSlots = googleSlots.length > 0 ? googleSlots : slots;

  const calendarLastSyncLabel = useMemo(() => {
    if (!calendarFetchedAt) {
      return null;
    }
    const parsed = new Date(calendarFetchedAt);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return formatDistanceToNow(parsed, { addSuffix: true, locale: fr });
  }, [calendarFetchedAt]);

  const engagementsById = useMemo(
    () => new Map(engagements.map((engagement) => [engagement.id, engagement])),
    [engagements]
  );
  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const servicesById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);

  const { effectiveSlots, slotStatusOverrides } = useMemo(() => {
    const overrides = new Map<string, EngagementStatus>();
    const resolvedSlots = [...baseSlots];
    if (!planningTestDate || planningTestDefinitions.length === 0) {
      return { effectiveSlots: resolvedSlots, slotStatusOverrides: overrides };
    }

    const eligibleEngagements = engagements.filter((item) => item.status !== 'annulé');
    const pool = eligibleEngagements.length > 0 ? eligibleEngagements : engagements;
    const fallbackEngagement = pool[0];

    planningTestDefinitions.forEach((definition, index) => {
      const engagement = pool[index] ?? fallbackEngagement;
      const slotId = `planning-demo-${index}`;
      resolvedSlots.push({
        id: slotId,
        date: planningTestDate,
        start: definition.start,
        end: definition.end,
        engagementId: engagement?.id,
      });
      overrides.set(slotId, definition.status);
    });

    return { effectiveSlots: resolvedSlots, slotStatusOverrides: overrides };
  }, [baseSlots, engagements]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!Number.isNaN(parsed.getTime())) {
        setSelectedDate(parsed);
        setVisibleMonth(startOfMonth(parsed));
        setView('jour');
      }
    }
  }, [location.search]);

  const monthLabel = useMemo(() => format(visibleMonth, 'LLLL yyyy', { locale: fr }), [visibleMonth]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
    const days: Date[] = [];
    let cursor = start;
    while (cursor <= end) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [visibleMonth]);

  const slotsByDate = useMemo(() => {
    const map = new Map<string, typeof slots>();
    effectiveSlots.forEach((slot) => {
      if (!map.has(slot.date)) {
        map.set(slot.date, []);
      }
      map.get(slot.date)!.push(slot);
    });
    return map;
  }, [effectiveSlots]);

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const slotsForSelectedDay = slotsByDate.get(selectedDateKey) ?? [];

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const weeklySlots = useMemo(() => {
    return weekDays.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      return { date: day, key, slots: slotsByDate.get(key) ?? [] };
    });
  }, [weekDays, slotsByDate]);

  const hourBounds = useMemo(() => {
    let minHour = 7;
    let maxHour = 20;
    weeklySlots.forEach(({ slots: daySlots }) => {
      daySlots.forEach((slot) => {
        const start = Math.floor(parseTimeToMinutes(slot.start) / 60);
        const end = Math.ceil(parseTimeToMinutes(slot.end) / 60);
        minHour = Math.min(minHour, start);
        maxHour = Math.max(maxHour, end);
      });
    });
    if (minHour >= maxHour) {
      maxHour = minHour + 1;
    }
    return { minHour, maxHour };
  }, [weeklySlots]);

  const hours = useMemo(() => {
    const hoursList: number[] = [];
    for (let hour = hourBounds.minHour; hour <= hourBounds.maxHour; hour += 1) {
      hoursList.push(hour);
    }
    return hoursList;
  }, [hourBounds]);

  const handleDaySelection = (day: Date) => {
    setSelectedDate(day);
    setView('jour');
  };

  const shiftMonth = (delta: number) => {
    const next = addMonths(visibleMonth, delta);
    setVisibleMonth(next);
  };

  const shiftWeek = (delta: number) => {
    const next = addWeeks(selectedDate, delta);
    setSelectedDate(next);
  };

  const shiftDay = (delta: number) => {
    setSelectedDate((value) => addDays(value, delta));
  };

  const weeklySlotCount = useMemo(
    () => weeklySlots.reduce((total, day) => total + day.slots.length, 0),
    [weeklySlots]
  );

  const summaryItems = useMemo(
    () => [
      { label: 'Créneaux consolidés', value: formatNumber(effectiveSlots.length) },
      { label: 'Cette semaine', value: formatNumber(weeklySlotCount) },
      { label: 'Événements Google', value: formatNumber(googleEvents.length) },
    ],
    [effectiveSlots, weeklySlotCount, googleEvents.length]
  );

  const selectedUserLabel = selectedUser
    ? userOptions.find((option) => option.value === selectedUser)?.label ?? selectedUser
    : null;

  const selectedDayEvents = useMemo(() => {
    return slotsForSelectedDay.map((slot) => {
      const engagement = slot.engagementId ? engagementsById.get(slot.engagementId) : undefined;
      const service = engagement ? servicesById.get(engagement.serviceId) : undefined;
      const client = engagement ? clientsById.get(engagement.clientId) : undefined;
      const calendarEvent = eventsBySlotId.get(slot.id);
      const slotStatus =
        slotStatusOverrides.get(slot.id) ??
        (engagement
          ? engagement.status
          : mapCalendarStatusToEngagementStatus(calendarEvent?.status ?? null));
      
      return {
        id: slot.id,
        time: slot.start,
        title: service?.name ?? calendarEvent?.summary ?? 'Prestation',
        client: client?.name ?? calendarEvent?.location,
        status: slotStatus,
        color: getStatusColor(slotStatus),
        end: slot.end,
      };
    });
  }, [slotsForSelectedDay, engagementsById, servicesById, clientsById, eventsBySlotId, slotStatusOverrides]);

  const monthEventsCount = useMemo(() => {
    return monthDays.filter((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const daySlots = slotsByDate.get(key) ?? [];
      return daySlots.length > 0 && isSameMonth(day, visibleMonth);
    }).length;
  }, [monthDays, slotsByDate, visibleMonth]);

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setVisibleMonth(startOfMonth(today));
  };

  return (
    <div className="planning-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Planning opérationnel</p>
            <h1 className="dashboard-hero__title">Pilotez vos interventions</h1>
            <p className="dashboard-hero__subtitle">
              Synchronisez vos créneaux avec Google Agenda et passez d'une vue mensuelle à une vue détaillée en un coup d'œil.
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      <div className="mx-auto max-w-[95rem] px-6 md:px-12">
        {/* Contrôles */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Vue:</span>
              <div className="inline-flex rounded-xl bg-white shadow-sm">
                {viewOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setView(option.value)}
                    className={clsx(
                      'px-4 py-2 text-sm font-medium transition-colors',
                      option.value === viewOptions[0].value ? 'rounded-l-xl' : '',
                      option.value === viewOptions[viewOptions.length - 1].value ? 'rounded-r-xl' : '',
                      view === option.value
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Planning:</span>
              <div className="inline-flex rounded-xl bg-white shadow-sm">
                {userOptions.map((option, index) => (
                  <button
                    key={option.value ?? 'all'}
                    type="button"
                    onClick={() => setSelectedUser(option.value)}
                    className={clsx(
                      'px-4 py-2 text-sm font-medium transition-colors',
                      index === 0 ? 'rounded-l-xl' : '',
                      index === userOptions.length - 1 ? 'rounded-r-xl' : '',
                      selectedUser === option.value
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={goToToday}
            className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:shadow-md"
          >
            Aujourd'hui
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_320px]">
          {/* Calendrier principal */}
          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50">
            {view === 'mois' && (
              <>
                {/* Navigation du mois */}
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">{monthLabel}</h2>

                  <div className="flex gap-2">
                    <button
                      onClick={() => shiftMonth(-1)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-all hover:bg-slate-200"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => shiftMonth(1)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-all hover:bg-slate-200"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Jours de la semaine */}
                <div className="mb-3 grid grid-cols-7 gap-2">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                    <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grille des jours */}
                <div className="grid grid-cols-7 gap-2">
                  {monthDays.map((day, idx) => {
                    const key = format(day, 'yyyy-MM-dd');
                    const daySlots = slotsByDate.get(key) ?? [];
                    const sortedSlots = [...daySlots].sort(
                      (a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start)
                    );
                    const hasEvents = sortedSlots.length > 0;
                    const isTodayDate = isSameDay(day, new Date());
                    const isSelectedDate = isSameDay(day, selectedDate);
                    const inMonth = isSameMonth(day, visibleMonth);

                    // Obtenir les couleurs des événements pour les indicateurs
                    const eventColors = sortedSlots.slice(0, 3).map((slot) => {
                      const engagement = slot.engagementId ? engagementsById.get(slot.engagementId) : undefined;
                      const calendarEvent = eventsBySlotId.get(slot.id);
                      const slotStatus =
                        slotStatusOverrides.get(slot.id) ??
                        (engagement
                          ? engagement.status
                          : mapCalendarStatusToEngagementStatus(calendarEvent?.status ?? null));
                      return getStatusColor(slotStatus);
                    });

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedDate(day);
                          handleDaySelection(day);
                        }}
                        className={clsx(
                          'relative aspect-square rounded-2xl p-2 text-sm font-medium transition-all',
                          !inMonth ? 'text-slate-300' : 'text-slate-900',
                          isTodayDate ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : '',
                          isSelectedDate && !isTodayDate ? 'bg-slate-100 ring-2 ring-blue-500' : '',
                          !isTodayDate && !isSelectedDate ? 'hover:bg-slate-50' : ''
                        )}
                      >
                        <span className="block">{format(day, 'd')}</span>

                        {/* Indicateurs d'événements */}
                        {hasEvents && (
                          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
                            {eventColors.map((color, i) => (
                              <div
                                key={i}
                                className={clsx(
                                  'h-1 w-1 rounded-full',
                                  isTodayDate ? 'bg-white' : colorClasses[color]
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {view === 'semaine' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Semaine du {format(weekStart, 'd MMMM', { locale: fr })}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => shiftWeek(-1)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-all hover:bg-slate-200"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => shiftWeek(1)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-all hover:bg-slate-200"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[960px] rounded-lg border border-gray-200 bg-white">
                    <div className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(140px, 1fr))` }}>
                      <div className="h-12 border-b border-r border-gray-200" />
                      {weeklySlots.map(({ date, slots: daySlots }) => (
                        <div
                          key={date.toISOString()}
                          className={clsx(
                            'flex h-12 items-center justify-center border-b border-r border-gray-200 px-3',
                            isSameDay(date, new Date()) ? 'bg-blue-50' : 'bg-gray-50'
                          )}
                        >
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-700">
                              {format(date, 'EEE', { locale: fr })}
                            </div>
                            <div className={clsx(
                              'text-lg font-light mt-1',
                              isSameDay(date, new Date()) ? 'text-blue-600' : 'text-gray-900'
                            )}>
                              {format(date, 'd')}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="col-span-8">
                        <div className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(140px, 1fr))` }}>
                          <div>
                            {hours.map((hour) => (
                              <div
                                key={`label-${hour}`}
                                className="flex h-[64px] items-start border-b border-r border-gray-200 px-2 pt-3 text-xs text-gray-500"
                              >
                                {formatHourLabel(hour)}
                              </div>
                            ))}
                          </div>
                          {weeklySlots.map(({ key, slots: daySlots }) => {
                            const columnHeight = Math.max(hours.length * slotHeight, slotHeight);
                            return (
                              <div key={key} className="relative border-b border-r border-gray-200" style={{ height: columnHeight }}>
                                {hours.map((_, index) => (
                                  <div
                                    key={`${key}-bg-${index}`}
                                    className="absolute left-0 right-0 border-b border-gray-100"
                                    style={{ top: (index + 1) * slotHeight }}
                                  />
                                ))}
                                {daySlots.map((slot) => {
                                  const engagement = engagements.find((item) => item.id === slot.engagementId);
                                  const client = clients.find((item) => item.id === engagement?.clientId);
                                  const service = services.find((item) => item.id === engagement?.serviceId);
                                  const calendarEvent = eventsBySlotId.get(slot.id);
                                  const startMinutes = parseTimeToMinutes(slot.start);
                                  const endMinutes = parseTimeToMinutes(slot.end);
                                  const offsetMinutes = hourBounds.minHour * 60;
                                  const top = ((startMinutes - offsetMinutes) / 60) * slotHeight;
                                  const height = Math.max(((endMinutes - startMinutes) / 60) * slotHeight, slotHeight / 1.5);
                                  const statusOverride = slotStatusOverrides.get(slot.id);
                                  const slotStatus =
                                    statusOverride ??
                                    (engagement
                                      ? engagement.status
                                      : mapCalendarStatusToEngagementStatus(calendarEvent?.status ?? null));

                                  const statusColor = {
                                    'planifié': 'bg-blue-100 text-blue-800 border-blue-200',
                                    'réalisé': 'bg-green-100 text-green-800 border-green-200',
                                    'envoyé': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                    'annulé': 'bg-red-100 text-red-800 border-red-200',
                                  }[slotStatus] || 'bg-gray-100 text-gray-800 border-gray-200';

                                  const baseLabel = service?.name ?? calendarEvent?.summary ?? `Créneau ${BRAND_NAME}`;
                                  const detailLabel = client?.name ?? calendarEvent?.location;
                                  const labelParts = [baseLabel, detailLabel].filter(Boolean) as string[];
                                  const slotLabel = labelParts.length > 0 ? labelParts.join(' – ') : baseLabel;
                                  const titleParts = [slotLabel, `${slot.start} – ${slot.end}`];
                                  if (calendarEvent?.description) {
                                    titleParts.push(calendarEvent.description);
                                  }
                                  const slotTitle = titleParts.join(' • ');
                                  return (
                                    <div
                                      key={slot.id}
                                      className={`absolute left-2 right-2 flex h-fit flex-col justify-center gap-1 overflow-hidden rounded-lg border px-3 py-2 text-[11px] leading-tight shadow-sm transition ${statusColor}`}
                                      style={{ top, height }}
                                      title={slotTitle}
                                    >
                                      <span className="truncate font-semibold">{slotLabel}</span>
                                      <span className="text-[10px] font-medium uppercase tracking-[0.3em] opacity-75">
                                        {slot.start} – {slot.end}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {view === 'jour' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => shiftDay(-1)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-all hover:bg-slate-200"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => shiftDay(1)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-all hover:bg-slate-200"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {slotsForSelectedDay.length > 0 ? (
                    slotsForSelectedDay.map((slot) => {
                      const engagement = engagements.find((item) => item.id === slot.engagementId);
                      const client = clients.find((item) => item.id === engagement?.clientId);
                      const service = services.find((item) => item.id === engagement?.serviceId);
                      const statusOverride = slotStatusOverrides.get(slot.id);
                      const calendarEvent = eventsBySlotId.get(slot.id);
                      const slotStatus =
                        statusOverride ??
                        (engagement
                          ? engagement.status
                          : mapCalendarStatusToEngagementStatus(calendarEvent?.status ?? null));

                      const statusColor = {
                        'planifié': 'bg-blue-50 border-blue-200 text-blue-800',
                        'réalisé': 'bg-green-50 border-green-200 text-green-800',
                        'envoyé': 'bg-yellow-50 border-yellow-200 text-yellow-800',
                        'annulé': 'bg-red-50 border-red-200 text-red-800',
                      }[slotStatus] || 'bg-gray-50 border-gray-200 text-gray-800';

                      const baseLabel = service?.name ?? calendarEvent?.summary ?? `Créneau ${BRAND_NAME}`;
                      const detailLabel = client?.name ?? calendarEvent?.location;

                      return (
                        <div
                          key={slot.id}
                          className={`p-4 rounded-lg border ${statusColor}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-lg">{baseLabel}</h3>
                              <p className="text-sm mt-1 opacity-75">{detailLabel ?? 'Client à confirmer'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{slot.start} – {slot.end}</p>
                              <p className="text-xs mt-1 opacity-75">{new Date(slot.date).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-lg font-light">Aucun créneau planifié pour cette journée</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Événements du jour */}
          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50">
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </h3>

            {selectedDayEvents.length > 0 ? (
              <div className="space-y-3">
                {selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="group rounded-2xl border border-slate-100 p-4 transition-all hover:border-slate-200 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className={clsx('mt-0.5 h-3 w-3 rounded-full', colorClasses[event.color])} />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-slate-500">{event.time} – {event.end}</div>
                        <div className="mt-1 font-semibold text-slate-900">{event.title}</div>
                        {event.client && (
                          <div className="mt-1 text-xs text-slate-500">{event.client}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-2xl bg-slate-50">
                <p className="text-sm text-slate-400">Aucun événement</p>
              </div>
            )}

            {/* Statistiques rapides */}
            <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3">
                <span className="text-sm font-medium text-blue-900">Ce mois</span>
                <span className="text-lg font-bold text-blue-600">{monthEventsCount}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3">
                <span className="text-sm font-medium text-emerald-900">Total créneaux</span>
                <span className="text-lg font-bold text-emerald-600">{formatNumber(effectiveSlots.length)}</span>
              </div>

              {googleEvents.length > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-purple-50 p-3">
                  <span className="text-sm font-medium text-purple-900">Événements Google</span>
                  <span className="text-lg font-bold text-purple-600">{formatNumber(googleEvents.length)}</span>
                </div>
              )}
            </div>

            {/* Informations de synchronisation */}
            {calendarLoading || calendarError || calendarWarnings.length > 0 ? (
              <div className="mt-6 space-y-2 border-t border-slate-100 pt-6">
                {calendarLoading && (
                  <div className="text-xs text-slate-500">Synchronisation Google Agenda en cours…</div>
                )}
                {calendarError && (
                  <div className="text-xs text-red-600">{calendarError}</div>
                )}
                {!calendarError && calendarWarnings.length > 0 && (
                  <div className="space-y-1">
                    {calendarWarnings.map((warning) => (
                      <div key={warning} className="text-xs text-amber-600">• {warning}</div>
                    ))}
                  </div>
                )}
                {calendarLastSyncLabel && !calendarLoading && (
                  <div className="text-xs text-slate-400">Dernière sync: {calendarLastSyncLabel}</div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningPage;
