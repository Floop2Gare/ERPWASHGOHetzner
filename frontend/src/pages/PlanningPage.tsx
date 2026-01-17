import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useGoogleCalendarEvents from '../hooks/useGoogleCalendarEvents';
import type { CalendarEvent } from '../lib/calendar';
import { CalendarPreview, EventDetailOverlay, type CalendarPreviewEvent } from '../components/CalendarPreview';
import { useAppData } from '../store/useAppData';

const parseTimeToMinutes = (value: string) => {
  const [hours, minutes] = value.split('h');
  return Number(hours) * 60 + Number(minutes ?? '0');
};

const CalendarEventBadge = ({ 
  slot, 
  isTodayDate, 
  badgeColorsByUser 
}: { 
  slot: PlanningSlot; 
  isTodayDate: boolean; 
  badgeColorsByUser: Record<string, string>;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div className="relative overflow-visible z-10">
      <div
        className={clsx(
          'text-[10px] font-bold px-2 py-1.5 rounded-lg shadow-sm transition-all duration-300 cursor-pointer',
          isTodayDate 
            ? 'bg-white/25 text-white backdrop-blur-sm border border-white/30' 
            : badgeColorsByUser[slot.owner] + ' border',
          isHovered && 'absolute left-0 top-0 z-[9999] whitespace-nowrap shadow-2xl py-2 px-3'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={isHovered ? { overflow: 'visible' } : undefined}
      >
        <div className="flex items-center gap-1.5">
          <span className={clsx(
            'font-mono text-[9px] font-extrabold flex-shrink-0',
            isTodayDate ? 'text-white/90' : ''
          )}>
            {slot.start}
          </span>
          <span className={clsx(
            isHovered ? '' : 'truncate flex-1'
          )}>
            {slot.title}
          </span>
        </div>
        {isHovered && slot.detail && (
          <div className="mt-1.5 text-[9px] font-medium opacity-90 border-t border-current/20 pt-1 whitespace-normal">
            {slot.detail}
          </div>
        )}
      </div>
    </div>
  );
};

const formatHourLabel = (hour: number) => `${hour.toString().padStart(2, '0')}h00`;
const slotHeight = 64;

const userOptions: Array<{ label: string; value: string | null }> = [
  { label: 'Tous', value: null },
  { label: 'Clément', value: 'clement' },
  { label: 'Adrien', value: 'adrien' },
];

const viewOptions: Array<{ label: string; value: 'mois' | 'semaine' | 'jour' }> = [
  { label: 'Mois', value: 'mois' },
  { label: 'Semaine', value: 'semaine' },
  { label: 'Jour', value: 'jour' },
];

type PlanningSlotStatus = 'planifié' | 'réalisé' | 'envoyé' | 'annulé';

const badgeColorsByStatus: Record<PlanningSlotStatus, string> = {
  planifié: 'bg-blue-50 text-blue-900 border-blue-400 border-2',
  réalisé: 'bg-emerald-50 text-emerald-900 border-emerald-400 border-2',
  envoyé: 'bg-amber-50 text-amber-900 border-amber-400 border-2',
  annulé: 'bg-red-50 text-red-900 border-red-400 border-2',
};

const badgeColorsByUser: Record<'adrien' | 'clement', string> = {
  adrien: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 border-blue-500 border-2 shadow-blue-200/50',
  clement: 'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-900 border-amber-500 border-2 shadow-amber-200/50',
};

const dotColorsByStatus: Record<PlanningSlotStatus, string> = {
  planifié: 'bg-blue-500',
  réalisé: 'bg-emerald-500',
  envoyé: 'bg-amber-500',
  annulé: 'bg-red-500',
};

const dotColorsByUser: Record<'adrien' | 'clement', string> = {
  adrien: 'bg-blue-500',
  clement: 'bg-amber-500',
};

type PlanningSlot = {
  id: string;
  owner: 'clement' | 'adrien';
  date: string;
  start: string;
  end: string;
  title: string;
  detail: string;
  status: 'planifié' | 'réalisé' | 'envoyé' | 'annulé';
};

const mapCalendarEventToSlot = (event: CalendarEvent): PlanningSlot | null => {
  const startValue = event.start ?? event.startDate;
  if (!startValue) return null;
  const startDate = new Date(startValue);
  if (Number.isNaN(startDate.getTime())) return null;

  const endValue = event.end ?? event.endDate;
  const endDate = endValue ? new Date(endValue) : new Date(startDate.getTime() + 60 * 60 * 1000);
  
  // Identifier l'utilisateur de manière plus précise
  // Les IDs de calendrier d'Adrien et Clément pour détection même si l'alias n'est pas présent
  const ADRIEN_CALENDAR_ID = 'd80d949e6ac7edb23fb3a7d5b9628505b2ae36800054ecc7de9916224afdc9ca';
  const CLEMENT_CALENDAR_ID = 'e4db0cbc6bb0659826b99b93caa4dfeb8d809805ec92015848d0fafea0cc5466';
  
  const calendarKey = (event.calendarKey || '').toLowerCase();
  const calendarId = (event.calendarId || '').toLowerCase();
  
  // Détection par alias
  const isAdrienByAlias = calendarKey === 'adrien' || calendarKey.includes('adrien');
  const isClementByAlias = calendarKey === 'clement' || calendarKey === 'clément' || calendarKey.includes('clement') || calendarKey.includes('clément');
  
  // Détection par ID de calendrier (fallback si alias non présent)
  const isAdrienById = calendarId.includes(ADRIEN_CALENDAR_ID);
  const isClementById = calendarId.includes(CLEMENT_CALENDAR_ID);
  
  const isAdrien = isAdrienByAlias || isAdrienById;
  const isClement = isClementByAlias || isClementById;
  
  const owner: 'clement' | 'adrien' = isClement ? 'clement' : isAdrien ? 'adrien' : 'clement'; // Par défaut clement si non identifié
  
  const statusMap: Record<string, 'planifié' | 'réalisé' | 'envoyé' | 'annulé'> = {
    confirmed: 'planifié',
    tentative: 'planifié',
    cancelled: 'annulé',
  };
  const status = statusMap[event.status || ''] || 'planifié';

  // Utiliser la date locale pour formater le jour (sans heure)
  const eventDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  return {
    id: event.id,
    owner,
    date: format(eventDateOnly, 'yyyy-MM-dd'),
    start: format(startDate, "HH'h'mm"),
    end: format(endDate, "HH'h'mm"),
    title: event.summary || 'Sans titre',
    detail: event.location || event.calendarKey || 'Planning',
    status,
  };
};

const PlanningPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState<'mois' | 'semaine' | 'jour'>('mois');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<CalendarPreviewEvent | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const engagements = useAppData((state) => state.engagements);
  const clients = useAppData((state) => state.clients);
  const services = useAppData((state) => state.services);
  const projectMembers = useAppData((state) => state.projectMembers);
  const authUsers = useAppData((state) => state.authUsers);

  const {
    events: calendarEvents,
    loading: calendarLoading,
    error: calendarError,
  } = useGoogleCalendarEvents({
    userKey: selectedUser || undefined,
    pastDays: 30,
    rangeDays: 90,
    autoRefresh: true,
  });

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

  // Préparation des données pour CalendarPreview (comme sur la page d'accueil)
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { locale: fr, weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(visibleMonth), { locale: fr, weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(visibleMonth, { locale: fr, weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(start, index);
      const label = format(day, 'EEEEE', { locale: fr });
      return label.toUpperCase();
    });
  }, [visibleMonth]);

  // Créer un mapping entre profileId (authUser.id) et projectMember.id
  const profileIdToMemberId = useMemo(() => {
    const map = new Map<string, string>();
    projectMembers.forEach((member) => {
      if (member.profileId) {
        map.set(member.profileId, member.id);
      }
    });
    return map;
  }, [projectMembers]);

  // Créer un mapping entre authUser.id et username pour identifier l'utilisateur dans le planning
  const userIdToUsername = useMemo(() => {
    const map = new Map<string, string>();
    authUsers.forEach((user) => {
      map.set(user.id, user.username.toLowerCase());
    });
    return map;
  }, [authUsers]);

  const eventsByDay = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const serviceById = new Map(services.map((service) => [service.id, service]));
    const clientById = new Map(clients.map((client) => [client.id, client]));

    const accentByUser: Record<string, { base: string; bg: string; shadow: string }> = {
      adrien: {
        base: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.15)',
        shadow: '0 12px 30px -18px rgba(59, 130, 246, 0.5)',
      },
      clement: {
        base: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.15)',
        shadow: '0 12px 30px -18px rgba(245, 158, 11, 0.5)',
      },
    };

    const map = new Map<string, CalendarPreviewEvent[]>();

    // Ajouter les engagements assignés aux collaborateurs
    engagements.forEach((engagement) => {
      if (!engagement.scheduledAt) return;
      
      const engagementDate = new Date(engagement.scheduledAt);
      if (Number.isNaN(engagementDate.getTime())) return;
      
      const eventDateOnly = new Date(engagementDate.getFullYear(), engagementDate.getMonth(), engagementDate.getDate());
      if (eventDateOnly < monthStart || eventDateOnly > monthEnd) return;

      const dayKey = format(eventDateOnly, 'yyyy-MM-dd');
      
      // Pour chaque collaborateur assigné à cet engagement
      engagement.assignedUserIds?.forEach((memberId) => {
        const member = projectMembers.find((m) => m.id === memberId);
        if (!member || !member.profileId) return;
        
        // Trouver l'authUser correspondant
        const username = userIdToUsername.get(member.profileId);
        if (!username) return;
        
        // Déterminer si c'est Adrien ou Clément (ou autre)
        const isAdrien = username === 'adrien' || username.includes('adrien');
        const isClement = username === 'clement' || username === 'clément' || username.includes('clement') || username.includes('clément');
        
        const client = clientById.get(engagement.clientId);
        const service = serviceById.get(engagement.serviceId);
        
        // Formater l'heure de début si disponible
        let time = '';
        if ((engagement as any).startTime) {
          time = (engagement as any).startTime;
        } else {
          time = format(engagementDate, 'HH:mm');
        }
        
        // Déterminer le titre et le type
        const title = engagement.kind === 'devis' 
          ? `Devis ${engagement.quoteNumber || ''}`.trim()
          : service?.name || 'Prestation';
        const subtitle = client?.name || 'Client';
        
        const accent = isAdrien ? accentByUser.adrien : isClement ? accentByUser.clement : accentByUser.clement;
        
        const engagementEvent: CalendarPreviewEvent = {
          id: `engagement-${engagement.id}-${memberId}`,
          date: dayKey,
          title,
          subtitle,
          time,
          duration: null,
          status: engagement.status === 'confirmed' ? 'confirmed' : engagement.status === 'cancelled' ? 'cancelled' : 'tentative',
          type: isAdrien ? 'Adrien' : isClement ? 'Clément' : 'Prestation',
          location: null,
          accent,
        };
        
        if (!map.has(dayKey)) {
          map.set(dayKey, []);
        }
        map.get(dayKey)!.push(engagementEvent);
      });
    });

    // Ajouter les événements Google Calendar
    calendarEvents.forEach((event: CalendarEvent) => {
      const startValue = event.start ?? event.startDate;
      if (!startValue) return;
      
      const startDate = new Date(startValue);
      if (Number.isNaN(startDate.getTime())) return;
      
      const eventDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      if (eventDateOnly < monthStart || eventDateOnly > monthEnd) return;

      const dayKey = format(eventDateOnly, 'yyyy-MM-dd');
      const time = format(startDate, 'HH:mm');
      
      // Calculer la durée
      let duration: string | null = null;
      if (event.end) {
        const endDate = new Date(event.end);
        if (!Number.isNaN(endDate.getTime()) && endDate.getTime() > startDate.getTime()) {
          const diffMs = endDate.getTime() - startDate.getTime();
          const diffMinutes = Math.round(diffMs / (1000 * 60));
          const hours = Math.floor(diffMinutes / 60);
          const minutes = diffMinutes % 60;
          if (hours > 0) {
            duration = `${hours}h${minutes > 0 ? `${minutes}min` : ''}`;
          } else {
            duration = `${minutes}min`;
          }
        }
      }
      
      // Identifier l'utilisateur
      const ADRIEN_CALENDAR_ID = 'd80d949e6ac7edb23fb3a7d5b9628505b2ae36800054ecc7de9916224afdc9ca';
      const CLEMENT_CALENDAR_ID = 'e4db0cbc6bb0659826b99b93caa4dfeb8d809805ec92015848d0fafea0cc5466';
      
      const calendarKey = (event.calendarKey || '').toLowerCase();
      const calendarId = (event.calendarId || '').toLowerCase();
      
      const isAdrien = calendarKey === 'adrien' || calendarKey.includes('adrien') || calendarId.includes('adrien') || calendarId.includes(ADRIEN_CALENDAR_ID);
      const isClement = calendarKey === 'clement' || calendarKey === 'clément' || calendarKey.includes('clement') || calendarKey.includes('clément') || calendarId.includes('clement') || calendarId.includes(CLEMENT_CALENDAR_ID);
      
      const accent = isAdrien ? accentByUser.adrien : isClement ? accentByUser.clement : accentByUser.clement;

      const calendarEvent: CalendarPreviewEvent = {
        id: `calendar-${event.id}`,
        date: dayKey,
        title: event.summary || 'Événement',
        subtitle: event.location || event.calendarKey || 'Planning',
        time,
        duration,
        status: event.status || null,
        type: isAdrien ? 'Adrien' : isClement ? 'Clément' : 'Google Calendar',
        location: event.location || null,
        accent,
      };

      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)!.push(calendarEvent);
    });

    map.forEach((events) => {
      events.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
    });

    return map;
  }, [visibleMonth, calendarEvents, services, clients, engagements, projectMembers, userIdToUsername]);

  const filteredSlots = useMemo(() => {
    const slots = calendarEvents
      .map(mapCalendarEventToSlot)
      .filter((slot): slot is PlanningSlot => slot !== null);
    
    if (!selectedUser) {
      return slots;
    }
    return slots.filter((slot) => slot.owner === selectedUser);
  }, [calendarEvents, selectedUser]);

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
    const map = new Map<string, PlanningSlot[]>();
    filteredSlots.forEach((slot) => {
      if (!map.has(slot.date)) {
        map.set(slot.date, []);
      }
      map.get(slot.date)!.push(slot);
    });
    return map;
  }, [filteredSlots]);

  const today = new Date();
  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const slotsForSelectedDay = slotsByDate.get(selectedDateKey) ?? [];

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  const weeklySlots = useMemo(
    () =>
      weekDays.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        return { date: day, key, slots: slotsByDate.get(key) ?? [] };
      }),
    [weekDays, slotsByDate]
  );

  const hourBounds = useMemo(() => {
    let minHour = 8;
    let maxHour = 19;
    weeklySlots.forEach(({ slots }) => {
      slots.forEach((slot) => {
        const startHour = Math.floor(parseTimeToMinutes(slot.start) / 60);
        const endHour = Math.ceil(parseTimeToMinutes(slot.end) / 60);
        minHour = Math.min(minHour, startHour);
        maxHour = Math.max(maxHour, endHour);
      });
    });
    if (minHour >= maxHour) {
      maxHour = minHour + 1;
    }
    return { minHour, maxHour };
  }, [weeklySlots]);

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let hour = hourBounds.minHour; hour <= hourBounds.maxHour; hour += 1) {
      list.push(hour);
    }
    return list;
  }, [hourBounds]);

  const monthEventsCount = useMemo(
    () =>
      monthDays.filter((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const hasEvents = (slotsByDate.get(key) ?? []).length > 0;
        return hasEvents && isSameMonth(day, visibleMonth);
      }).length,
    [monthDays, slotsByDate, visibleMonth]
  );

  const goToToday = () => {
    const current = new Date();
    setSelectedDate(current);
    setVisibleMonth(startOfMonth(current));
  };

  const handleDaySelection = (day: Date) => {
    setSelectedDate(day);
    setView('jour');
  };

  const handlePrevMonth = useCallback(() => {
    setVisibleMonth((prev) => addMonths(prev, -1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setVisibleMonth((prev) => addMonths(prev, 1));
  }, []);

  const handleGoToday = useCallback(() => {
    setVisibleMonth(startOfMonth(new Date()));
  }, []);

  const openPlanning = useCallback(
    (date?: string) => {
      if (date) {
        const parsed = new Date(date);
        if (!Number.isNaN(parsed.getTime())) {
          setSelectedDate(parsed);
          setView('jour');
        }
      }
    },
    []
  );

  const shiftMonth = (delta: number) => {
    setVisibleMonth(addMonths(visibleMonth, delta));
  };

  const shiftWeek = (delta: number) => {
    setSelectedDate(addWeeks(selectedDate, delta));
  };

  const shiftDay = (delta: number) => {
    setSelectedDate((prev) => addDays(prev, delta));
  };

  return (
    <div className="space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Planning opérationnel</p>
            <h1 className="dashboard-hero__title">Pilotez vos interventions</h1>
            <p className="dashboard-hero__subtitle">
              Consultez et gérez vos événements Google Calendar en temps réel.
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      {calendarError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Erreur lors du chargement du planning : {calendarError}
        </div>
      )}

      <div>
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
                      view === option.value ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-50'
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
                    key={option.label}
                    type="button"
                    onClick={() => setSelectedUser(option.value)}
                    className={clsx(
                      'px-4 py-2 text-sm font-medium transition-colors',
                      index === 0 ? 'rounded-l-xl' : '',
                      index === userOptions.length - 1 ? 'rounded-r-xl' : '',
                      selectedUser === option.value ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-50'
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
            Aujourd&apos;hui
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_320px]">
          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 relative z-0">
            {view === 'mois' && (
              <div className="h-full">
                <CalendarPreview
                  className="w-full"
                  month={visibleMonth}
                  weekdayLabels={weekdayLabels}
                  days={calendarDays}
                  eventsByDay={eventsByDay}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onGoToday={handleGoToday}
                  onOpenPlanning={openPlanning}
                  onEventHover={(hovered, event, rect) => {
                    if (hovered && event && rect) {
                      setHoveredEvent(event);
                      setPopupPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    } else {
                      setHoveredEvent(null);
                      setPopupPosition(null);
                    }
                  }}
                />
                {hoveredEvent && popupPosition && (
                  <EventDetailOverlay
                    event={hoveredEvent}
                    position={popupPosition}
                    onClose={() => {
                      setHoveredEvent(null);
                      setPopupPosition(null);
                    }}
                  />
                )}
              </div>
            )}

            {view === 'semaine' && (
              <div className="space-y-4">
                <div className="mb-6 flex items-center justify-between">
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
                      {weeklySlots.map(({ date }) => (
                        <div
                          key={date.toISOString()}
                          className={clsx(
                            'flex h-12 items-center justify-center border-b border-r border-gray-200 px-3',
                            isSameDay(date, today) ? 'bg-blue-50' : 'bg-gray-50'
                          )}
                        >
                          <div className="text-center">
                            <div className="text-xs font-medium text-gray-700">{format(date, 'EEE', { locale: fr })}</div>
                            <div
                              className={clsx(
                                'mt-1 text-lg font-light',
                                isSameDay(date, today) ? 'text-blue-600' : 'text-gray-900'
                              )}
                            >
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
                                key={`hour-${hour}`}
                                className="flex h-[64px] items-start border-b border-r border-gray-200 px-2 pt-3 text-xs text-gray-500"
                              >
                                {formatHourLabel(hour)}
                              </div>
                            ))}
                          </div>
                          {weeklySlots.map(({ key, slots }) => {
                            const columnHeight = Math.max(hours.length * slotHeight, slotHeight);
                            return (
                              <div key={key} className="relative border-b border-r border-gray-200" style={{ height: columnHeight }}>
                                {hours.map((_, index) => (
                                  <div
                                    key={`${key}-grid-${index}`}
                                    className="absolute left-0 right-0 border-b border-gray-100"
                                    style={{ top: (index + 1) * slotHeight }}
                                  />
                                ))}
                                {slots.map((slot) => {
                                  const startMinutes = parseTimeToMinutes(slot.start);
                                  const endMinutes = parseTimeToMinutes(slot.end);
                                  const offsetMinutes = hourBounds.minHour * 60;
                                  const top = ((startMinutes - offsetMinutes) / 60) * slotHeight;
                                  const height = Math.max(((endMinutes - startMinutes) / 60) * slotHeight, slotHeight / 1.5);
                                  return (
                                    <div
                                      key={slot.id}
                                      className={clsx(
                                        'absolute left-2 right-2 rounded-xl border-2 px-3 py-2.5 text-xs leading-tight shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] cursor-pointer',
                                        badgeColorsByUser[slot.owner]
                                      )}
                                      style={{ top, height }}
                                    >
                                      <span className="block truncate font-bold text-sm mb-1">{slot.title}</span>
                                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider font-mono">
                                        {slot.start} – {slot.end}
                                      </span>
                                      <span className="mt-1 block text-[10px] font-medium opacity-80">{slot.detail}</span>
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
                <div className="mb-6 flex items-center justify-between">
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
                <div className="space-y-3">
                  {calendarLoading ? (
                    <div className="py-12 text-center text-gray-400">Chargement...</div>
                  ) : calendarError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                      Erreur : {calendarError}
                    </div>
                  ) : slotsForSelectedDay.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">Aucun créneau planifié pour cette journée</div>
                  ) : (
                    slotsForSelectedDay.map((slot) => (
                      <div 
                        key={slot.id} 
                        className={clsx(
                          'group relative overflow-hidden rounded-2xl border-2 p-6 shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.01] cursor-pointer',
                          badgeColorsByUser[slot.owner]
                        )}
                      >
                        {/* Barre colorée verticale à gauche */}
                        <div 
                          className={clsx(
                            'absolute left-0 top-0 bottom-0 w-1',
                            slot.owner === 'adrien' ? 'bg-blue-500' : 'bg-amber-500'
                          )}
                        />
                        
                        <div className="flex items-start gap-4 pl-3">
                          {/* Badge horaire amélioré */}
                          <div className="flex-shrink-0">
                            <div className="flex flex-col items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm border-2 border-current/30 px-4 py-3 min-w-[80px]">
                              <p className="text-sm font-extrabold text-slate-900 font-mono leading-none">{slot.start}</p>
                              <div className="w-6 h-px bg-current/40 my-1.5" />
                              <p className="text-sm font-extrabold text-slate-900 font-mono leading-none">{slot.end}</p>
                            </div>
                          </div>
                          
                          {/* Contenu principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="text-xl font-bold text-slate-900 leading-tight">{slot.title}</h3>
                              {/* Indicateur utilisateur */}
                              <div className={clsx(
                                'flex-shrink-0 h-2 w-2 rounded-full shadow-sm',
                                dotColorsByUser[slot.owner]
                              )} />
                            </div>
                            {slot.detail && (
                              <p className="text-sm font-medium text-slate-700 leading-relaxed">{slot.detail}</p>
                            )}
                            
                            {/* Badge statut si disponible */}
                            {slot.status && (
                              <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 bg-white/60 backdrop-blur-sm">
                                <div className={clsx('h-1.5 w-1.5 rounded-full', dotColorsByStatus[slot.status])} />
                                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                  {slot.status}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50">
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </h3>
            {calendarLoading ? (
              <div className="flex h-40 items-center justify-center rounded-2xl bg-slate-50">
                <p className="text-sm text-slate-400">Chargement...</p>
              </div>
            ) : slotsForSelectedDay.length === 0 ? (
              <div className="flex h-40 items-center justify-center rounded-2xl bg-slate-50">
                <p className="text-sm text-slate-400">Aucun événement</p>
              </div>
            ) : (
              <div className="space-y-3">
                {slotsForSelectedDay.map((slot) => (
                  <div
                    key={slot.id}
                    className={clsx('group rounded-2xl border-2 p-4 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] cursor-pointer', badgeColorsByUser[slot.owner])}
                  >
                    <div className="flex items-start gap-3">
                      <span className={clsx('mt-1.5 h-5 w-5 rounded-full shadow-sm', dotColorsByUser[slot.owner])} />
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-600 uppercase tracking-wider font-mono mb-1.5">
                          {slot.start} – {slot.end}
                        </div>
                        <div className="text-base font-bold text-slate-900 mb-1.5">{slot.title}</div>
                        <div className="text-sm font-medium text-slate-700">{slot.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3">
                <span className="text-sm font-medium text-blue-900">Total de prestations ce mois</span>
                <span className="text-lg font-bold text-blue-600">{monthEventsCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3">
                <span className="text-sm font-medium text-emerald-900">Total événements</span>
                <span className="text-lg font-bold text-emerald-600">{filteredSlots.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningPage;

