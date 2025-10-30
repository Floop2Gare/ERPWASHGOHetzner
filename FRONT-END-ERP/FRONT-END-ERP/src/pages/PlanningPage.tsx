import { useEffect, useMemo, useState } from 'react';
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

  return (
    <div className="space-y-8">
      <Card
        title="Planning"
        description="Vue calendaire consolidée"
        action={
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            {/* Sélecteur d'utilisateur */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Planning :</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedUser(null)}
                  className={`rounded-full border px-3 py-1 font-semibold transition ${
                    selectedUser === null
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setSelectedUser('clement')}
                  className={`rounded-full border px-3 py-1 font-semibold transition ${
                    selectedUser === 'clement'
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  Clément
                </button>
                <button
                  onClick={() => setSelectedUser('adrien')}
                  className={`rounded-full border px-3 py-1 font-semibold transition ${
                    selectedUser === 'adrien'
                      ? 'border-primary bg-primary text-white'
                      : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  Adrien
                </button>
              </div>
            </div>
            
            {/* Sélecteur de vue */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Vue :</span>
              <div className="flex gap-1">
                {[
                  { label: 'Mois', value: 'mois' },
                  { label: 'Semaine', value: 'semaine' },
                  { label: 'Jour', value: 'jour' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setView(option.value as typeof view)}
                    className={`rounded-full border px-3 py-1 font-semibold transition ${
                      view === option.value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      >
        <div className="mb-6 flex flex-col gap-3 text-xs text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span>
              {calendarLoading
                ? 'Synchronisation Google Agenda en cours…'
                : googleSlots.length > 0
                  ? `Synchronisé avec Google Agenda${
                      selectedUser 
                        ? ` (Planning ${selectedUser === 'clement' ? 'Clément' : 'Adrien'})`
                        : ' (Tous les plannings)'
                    }${
                      calendarLastSyncLabel ? ` · ${calendarLastSyncLabel}` : ''
                    }`
                  : 'Aucune donnée Google Agenda reçue'}
            </span>
            {calendarError ? (
              <span className="font-semibold text-rose-600 dark:text-rose-400">{calendarError}</span>
            ) : null}
            {!calendarError && calendarWarnings.length > 0 ? (
              <ul className="space-y-1 text-[11px]">
                {calendarWarnings.map((warning) => (
                  <li key={warning} className="flex items-start gap-1">
                    <span aria-hidden="true">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <Button
              type="button"
              size="xs"
              variant="secondary"
              disabled={calendarLoading}
              onClick={refreshCalendar}
            >
              {calendarLoading ? 'Actualisation…' : 'Rafraîchir'}
            </Button>
            {googleEvents.length > 0 ? (
              <span className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
                {googleEvents.length} événement{googleEvents.length > 1 ? 's' : ''} 
                {selectedUser 
                  ? ` (${selectedUser === 'clement' ? 'Clément' : 'Adrien'})`
                  : ' (Tous)'
                }
              </span>
            ) : null}
          </div>
        </div>
        {view === 'mois' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">{monthLabel}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={() => shiftMonth(-1)}>
                  Mois précédent
                </Button>
                <Button variant="ghost" onClick={() => shiftMonth(1)}>
                  Mois suivant
                </Button>
                <Button variant="secondary" onClick={() => setVisibleMonth(startOfMonth(new Date()))}>
                  Aujourd’hui
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[560px] space-y-2">
                <div className="grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                    <div key={day} className="text-center">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((day) => {
                    const key = format(day, 'yyyy-MM-dd');
                    const daySlots = slotsByDate.get(key) ?? [];
                    const sortedSlots = [...daySlots].sort(
                      (a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start)
                    );
                    const visibleSlots = sortedSlots.slice(0, 3);
                    const hiddenCount = sortedSlots.length - visibleSlots.length;
                    const isToday = isSameDay(day, new Date());
                    const inMonth = isSameMonth(day, visibleMonth);
                    const hasSlots = sortedSlots.length > 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDaySelection(day)}
                        className={`group flex h-32 flex-col rounded-soft border px-3 py-2 text-left text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
                          isToday ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-surface text-text'
                        } ${!inMonth ? 'opacity-60' : ''} hover:border-primary hover:bg-primary/5`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-semibold tracking-wide">{format(day, 'd')}</span>
                          {isToday && (
                            <span className="rounded-full border border-primary/40 px-2 py-[2px] text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                              Aujourd’hui
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex-1 space-y-1 overflow-hidden">
                          {hasSlots ? (
                            <>
                              {visibleSlots.map((slot) => {
                                const engagement = slot.engagementId
                                  ? engagementsById.get(slot.engagementId)
                                  : undefined;
                                const service = engagement ? servicesById.get(engagement.serviceId) : undefined;
                                const client = engagement ? clientsById.get(engagement.clientId) : undefined;
                                const calendarEvent = eventsBySlotId.get(slot.id);
                                const optionLabels =
                                  engagement && service
                                    ? engagement.optionIds
                                        .map((id) => service.options.find((option) => option.id === id)?.label)
                                        .filter((label): label is string => Boolean(label))
                                    : [];
                                const primaryOption = optionLabels[0];
                                const additionalOptions = Math.max(optionLabels.length - 1, 0);
                                const baseServiceLabel = service?.name ?? calendarEvent?.summary ?? 'Prestation';
                                const prestationLabel =
                                  primaryOption
                                    ? `${primaryOption}${additionalOptions > 0 ? ` (+${additionalOptions})` : ''}`
                                    : baseServiceLabel;
                                const slotStatus =
                                  slotStatusOverrides.get(slot.id) ??
                                  (engagement
                                    ? engagement.status
                                    : mapCalendarStatusToEngagementStatus(calendarEvent?.status ?? null));
                                const toneClasses = getSlotToneClasses(slotStatus);
                                const tooltipParts = [
                                  baseServiceLabel,
                                  client?.name ?? calendarEvent?.location,
                                  `${slot.start} – ${slot.end}`,
                                ];
                                if (calendarEvent?.description) {
                                  tooltipParts.push(calendarEvent.description);
                                }
                                const filteredTooltip = tooltipParts.filter(Boolean) as string[];
                                return (
                                  <div
                                    key={slot.id}
                                    className={`flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] leading-tight ${toneClasses}`}
                                    title={filteredTooltip.join(' • ')}
                                  >
                                    <span className="whitespace-nowrap font-semibold">{slot.start}</span>
                                    <span className="truncate font-medium">{prestationLabel}</span>
                                  </div>
                                );
                              })}
                              {hiddenCount > 0 && (
                                <span className="block truncate text-[11px] font-medium text-primary">
                                  +{hiddenCount} prestation(s)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="block text-[11px] text-muted">Aucune prestation</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'semaine' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">
                Semaine du {format(weekStart, 'd MMMM', { locale: fr })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={() => shiftWeek(-1)}>
                  Semaine précédente
                </Button>
                <Button variant="ghost" onClick={() => shiftWeek(1)}>
                  Semaine suivante
                </Button>
                <Button variant="secondary" onClick={() => setSelectedDate(new Date())}>
                  Aujourd’hui
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[960px] rounded-soft border border-slate-200 bg-white">
                <div className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(140px, 1fr))` }}>
                  <div className="h-12 border-b border-r border-slate-200" />
                  {weeklySlots.map(({ date, slots: daySlots }) => (
                    <div
                      key={date.toISOString()}
                      className="flex h-12 items-center justify-between border-b border-r border-slate-200 px-3 text-xs font-semibold text-slate-700"
                    >
                      <span>{format(date, 'EEEE d MMM', { locale: fr })}</span>
                      <span className="text-[11px] font-normal uppercase tracking-wide text-slate-400">
                        {daySlots.length} créneau(x)
                      </span>
                    </div>
                  ))}
                  <div className="col-span-8">
                    <div className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(140px, 1fr))` }}>
                      <div>
                        {hours.map((hour) => (
                          <div
                            key={`label-${hour}`}
                            className="flex h-[64px] items-start border-b border-r border-slate-200 px-2 pt-3 text-xs text-slate-400"
                          >
                            {formatHourLabel(hour)}
                          </div>
                        ))}
                      </div>
                      {weeklySlots.map(({ key, slots: daySlots }) => {
                        const columnHeight = Math.max(hours.length * slotHeight, slotHeight);
                        return (
                          <div key={key} className="relative border-b border-r border-slate-200" style={{ height: columnHeight }}>
                            {hours.map((_, index) => (
                              <div
                                key={`${key}-bg-${index}`}
                                className="absolute left-0 right-0 border-b border-slate-100"
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
                              const toneClasses = getSlotToneClasses(slotStatus);
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
                                  className={`absolute left-2 right-2 flex h-fit flex-col justify-center gap-1 overflow-hidden rounded-soft border px-3 py-2 text-[11px] leading-tight shadow-sm transition ${toneClasses}`}
                                  style={{ top, height }}
                                  title={slotTitle}
                                >
                                  <span className="truncate font-semibold">{slotLabel}</span>
                                  <span className="text-[10px] font-medium uppercase tracking-[0.3em] opacity-80">
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
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={() => shiftDay(-1)}>
                  Jour précédent
                </Button>
                <Button variant="ghost" onClick={() => shiftDay(1)}>
                  Jour suivant
                </Button>
                <Button variant="secondary" onClick={() => setSelectedDate(new Date())}>
                  Aujourd’hui
                </Button>
              </div>
            </div>
            <div className="space-y-3">
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
                  const toneClasses = getSlotToneClasses(slotStatus);
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
                      className={`flex flex-col gap-2 rounded-soft border px-4 py-3 text-sm leading-tight md:flex-row md:items-center md:justify-between ${toneClasses}`}
                      title={slotTitle}
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold md:text-base">{slotLabel}</p>
                        <p className="text-[11px] font-medium uppercase tracking-[0.3em] opacity-80">
                          {slot.start} – {slot.end}
                        </p>
                      </div>
                      <div className="text-left text-[12px] md:text-right">
                        <p className="font-medium">{client?.name ?? calendarEvent?.location ?? 'Client à confirmer'}</p>
                        <p className="text-[11px] opacity-80">{new Date(slot.date).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">Aucun créneau planifié pour cette journée.</p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PlanningPage;
