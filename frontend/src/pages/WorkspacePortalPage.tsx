import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type LucideIcon,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppData } from '../store/useAppData';
import { Topbar } from '../layout/Topbar';
import { WORKSPACE_MODULES } from '../workspace/modules';
import useGoogleCalendarEvents from '../hooks/useGoogleCalendarEvents';
import type { CalendarEvent } from '../lib/calendar';
import { CalendarPreview, EventDetailOverlay, type CalendarPreviewEvent } from '../components/CalendarPreview';

type AccueilCardData = {
  id: string;
  category: string;
  strapline: string;
  description: string;
  icon: LucideIcon;
  accentColor: string;
  disabled: boolean;
  href: string;
  highlights: string[];
};

type AccueilCardProps = {
  card: AccueilCardData;
  isHovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  onSelect: () => void;
};

const WorkspacePortalPage = () => {
  const navigate = useNavigate();
  const hasPageAccess = useAppData((state) => state.hasPageAccess);
  const userProfile = useAppData((state) => state.userProfile);
  const engagements = useAppData((state) => state.engagements);
  const clients = useAppData((state) => state.clients);
  const services = useAppData((state) => state.services);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isDesktopSidebarHidden, setIsDesktopSidebarHidden] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [hoveredEvent, setHoveredEvent] = useState<CalendarPreviewEvent | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);

  const {
    events: calendarEvents,
    loading: calendarLoading,
  } = useGoogleCalendarEvents({
    pastDays: 30,
    rangeDays: 90,
    autoRefresh: true,
  });

  const displayName =
    `${userProfile.firstName ?? ''} ${userProfile.lastName ?? ''}`.trim() || userProfile.email || 'Utilisateur';

  const cards = useMemo<AccueilCardData[]>(() => {
    return WORKSPACE_MODULES.map((module) => {
      const canAccess = module.accessPages.some((page) => hasPageAccess(page));
      const highlights = module.nav.flatMap((section) => section.items).slice(0, 2).map((item) => item.label);

      return {
        id: module.id,
        category: module.name,
        strapline: module.strapline,
        description: module.description,
        icon: module.icon,
        accentColor: module.accentColor,
        disabled: !canAccess,
        href: module.basePath,
        highlights,
      };
    });
  }, [hasPageAccess]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { locale: fr, weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarMonth), { locale: fr, weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(calendarMonth, { locale: fr, weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(start, index);
      const label = format(day, 'EEEEE', { locale: fr });
      return label.toUpperCase();
    });
  }, [calendarMonth]);

  const eventsByDay = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const serviceById = new Map(services.map((service) => [service.id, service]));
    const clientById = new Map(clients.map((client) => [client.id, client]));

    const accentByCategory: Record<string, { base: string; bg: string; shadow: string }> = {
      Voiture: {
        base: '#2563eb',
        bg: 'rgba(37, 99, 235, 0.12)',
        shadow: '0 12px 30px -18px rgba(37, 99, 235, 0.45)',
      },
      Canapé: {
        base: '#ec4899',
        bg: 'rgba(236, 72, 153, 0.12)',
        shadow: '0 12px 30px -18px rgba(236, 72, 153, 0.45)',
      },
      Textile: {
        base: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        shadow: '0 12px 30px -18px rgba(16, 185, 129, 0.45)',
      },
      default: {
        base: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        shadow: '0 12px 30px -18px rgba(245, 158, 11, 0.45)',
      },
    };

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

    const resolveClientName = (client: (typeof clients)[number] | undefined) => {
      if (!client) {
        return 'Client';
      }
      if (client.name) {
        return client.name;
      }
      const fullName = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim();
      return fullName || client.companyName || 'Client';
    };

    const map = new Map<string, CalendarPreviewEvent[]>();

    // Ajouter les engagements
    engagements.forEach((engagement) => {
      if (!engagement.scheduledAt) {
        return;
      }
      const parsed = parseISO(engagement.scheduledAt);
      if (Number.isNaN(parsed.getTime())) {
        return;
      }
      if (parsed < monthStart || parsed > monthEnd) {
        return;
      }

      const dayKey = format(parsed, 'yyyy-MM-dd');
      const service = serviceById.get(engagement.serviceId);
      const client = clientById.get(engagement.clientId);
      const accent = accentByCategory[service?.category ?? 'default'] ?? accentByCategory.default;
      const time = engagement.startTime ?? format(parsed, 'HH:mm');
      
      // Calculer la durée si disponible
      let duration: string | null = null;
      if (engagement.mobileDurationMinutes) {
        const hours = Math.floor(engagement.mobileDurationMinutes / 60);
        const minutes = engagement.mobileDurationMinutes % 60;
        if (hours > 0) {
          duration = `${hours}h${minutes > 0 ? `${minutes}min` : ''}`;
        } else {
          duration = `${minutes}min`;
        }
      }

      const event: CalendarPreviewEvent = {
        id: engagement.id,
        date: dayKey,
        title: service?.name ?? 'Intervention',
        subtitle: resolveClientName(client),
        time,
        duration,
        status: engagement.status,
        type: engagement.kind === 'service' ? 'Service' : engagement.kind === 'devis' ? 'Devis' : 'Facture',
        location: client?.address || null,
        accent,
      };

      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)!.push(event);
    });

    // Ajouter les événements Google Calendar
    calendarEvents.forEach((event: CalendarEvent) => {
      const startValue = event.start ?? event.startDate;
      if (!startValue) {
        return;
      }
      const startDate = new Date(startValue);
      if (Number.isNaN(startDate.getTime())) {
        return;
      }
      
      const eventDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      if (eventDateOnly < monthStart || eventDateOnly > monthEnd) {
        return;
      }

      const dayKey = format(eventDateOnly, 'yyyy-MM-dd');
      const time = format(startDate, 'HH:mm');
      
      // Calculer la durée si disponible
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
      
      // Identifier l'utilisateur (Adrien ou Clément) à partir du calendarKey ou calendarId
      // IDs de calendrier pour détection même si l'alias n'est pas présent
      const ADRIEN_CALENDAR_ID = 'd80d949e6ac7edb23fb3a7d5b9628505b2ae36800054ecc7de9916224afdc9ca';
      const CLEMENT_CALENDAR_ID = 'e4db0cbc6bb0659826b99b93caa4dfeb8d809805ec92015848d0fafea0cc5466';
      
      const calendarKey = (event.calendarKey || '').toLowerCase();
      const calendarId = (event.calendarId || '').toLowerCase();
      
      const isAdrien = calendarKey === 'adrien' || calendarKey.includes('adrien') || calendarId.includes('adrien') || calendarId.includes(ADRIEN_CALENDAR_ID);
      const isClement = calendarKey === 'clement' || calendarKey === 'clément' || calendarKey.includes('clement') || calendarKey.includes('clément') || calendarId.includes('clement') || calendarId.includes(CLEMENT_CALENDAR_ID);
      
      // Priorité : couleur par utilisateur si identifié, sinon par catégorie
      let accent;
      if (isAdrien) {
        accent = accentByUser.adrien;
      } else if (isClement) {
        accent = accentByUser.clement;
      } else {
        // Déterminer la catégorie basée sur le titre
        let category = 'default';
        const titleLower = (event.summary || '').toLowerCase();
        if (titleLower.includes('voiture') || titleLower.includes('véhicule')) {
          category = 'Voiture';
        } else if (titleLower.includes('canapé') || titleLower.includes('canape')) {
          category = 'Canapé';
        } else if (titleLower.includes('tapis') || titleLower.includes('textile')) {
          category = 'Textile';
        }
        accent = accentByCategory[category] ?? accentByCategory.default;
      }

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
  }, [calendarMonth, clients, engagements, services, calendarEvents]);

  const handlePrevMonth = useCallback(() => {
    setCalendarMonth((prev) => addMonths(prev, -1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCalendarMonth((prev) => addMonths(prev, 1));
  }, []);

  const handleGoToday = useCallback(() => {
    setCalendarMonth(startOfMonth(new Date()));
  }, []);

  const openPlanning = useCallback(
    (date?: string) => {
      const basePath = '/workspace/crm/planning';
      navigate(date ? `${basePath}?date=${date}` : basePath);
    },
    [navigate]
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-white text-slate-900 transition-colors duration-500 dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-white dark:bg-slate-950" />
      <Topbar
        onMenuToggle={() => {}}
        isDesktopSidebarHidden={isDesktopSidebarHidden}
        onToggleDesktopSidebar={() => setIsDesktopSidebarHidden((value) => !value)}
        searchInputId="workspace-accueil-search"
        variant="floating"
        welcomeTitle={`Bienvenue, ${displayName}`}
      />

      <main className="relative flex w-full flex-1 items-center justify-center px-6 pb-20 pt-20 sm:px-8 sm:pt-24 lg:px-12 lg:pt-28 xl:px-16">
        <div className="flex w-full max-w-[160rem] flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-center lg:gap-12 xl:gap-16 lg:px-0">
          <div className="flex w-full max-w-[640px] flex-col gap-10 lg:max-w-[680px] xl:max-w-[720px]">
            <section className="flex flex-col gap-4">
              <AnimatePresence>
                {cards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.1,
                      duration: 0.5,
                      ease: [0.21, 0.47, 0.32, 0.98],
                    }}
                    className="flex"
                  >
                    <AccueilCard
                      card={card}
                      isHovered={hoveredCard === card.id}
                      onHoverChange={(hovered) => setHoveredCard(hovered ? card.id : null)}
                      onSelect={() => {
                        if (!card.disabled) {
                          navigate(card.href);
                        }
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </section>
          </div>

          <CalendarPreview
            className="hidden w-full lg:flex lg:flex-1 lg:max-w-[900px] xl:max-w-[1000px]"
            month={calendarMonth}
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
        </div>
      </main>

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
  );
};

export default WorkspacePortalPage;

const AccueilCard = ({ card, isHovered, onHoverChange, onSelect }: AccueilCardProps) => {
  const Icon = card.icon;
  const isDisabled = card.disabled;

  const handleSelect = () => {
    if (isDisabled) {
      return;
    }
    onSelect();
  };

  return (
    <motion.article
      layout
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled}
      className={clsx(
        'group relative flex w-full cursor-pointer flex-row items-center overflow-hidden rounded-2xl bg-transparent text-left text-slate-800 transition-all duration-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--accent)]/20 dark:bg-transparent dark:text-white',
        isDisabled && 'cursor-not-allowed opacity-60 grayscale'
      )}
      style={
        {
          '--accent': card.accentColor,
        } as CSSProperties
      }
      onHoverStart={() => onHoverChange(true)}
      onHoverEnd={() => onHoverChange(false)}
      whileHover={isDisabled ? undefined : { x: 4, scale: 1.01 }}
      whileTap={isDisabled ? undefined : { scale: 0.99 }}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (isDisabled) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelect();
        }
      }}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${card.accentColor}12 0%, transparent 70%)`,
        }}
        animate={{
          opacity: isHovered && !isDisabled ? 1 : 0,
        }}
      />

      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500"
        style={{
          boxShadow: `inset 0 0 18px ${card.accentColor}25`,
        }}
        animate={{
          opacity: isHovered && !isDisabled ? 1 : 0,
        }}
      />

      <motion.span
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-5 top-0 h-1 w-auto rounded-b-full bg-gradient-to-r from-[color:var(--accent)]/60 via-[color:var(--accent)] to-[color:var(--accent)]/60 shadow-[0_0_20px_rgba(0,0,0,0.2)]"
        initial={{ scaleX: 0.3, opacity: 0.5 }}
        animate={{
          scaleX: isHovered && !isDisabled ? 1 : 0.3,
          opacity: isHovered && !isDisabled ? 1 : 0.5,
        }}
        transition={{ duration: 0.4 }}
      />

      <div className="relative z-10 flex min-h-[32] w-full flex-row items-center gap-5 px-6 py-5">
        <motion.span
          className={clsx(
            'inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-lg',
            isDisabled && 'grayscale'
          )}
          style={{
            background: `linear-gradient(135deg, ${card.accentColor}20 0%, ${card.accentColor}08 100%)`,
            boxShadow: `0 10px 24px -12px ${card.accentColor}55, inset 0 1px 2px ${card.accentColor}30`,
          }}
          whileHover={isDisabled ? undefined : { scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Icon className="h-6 w-6 text-[color:var(--accent)]" strokeWidth={1.8} />
        </motion.span>

        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-black uppercase leading-tight tracking-tight text-slate-900 dark:text-white">
              {card.category}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--accent)]">
              {card.strapline}
            </p>
          </div>

          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            {card.description}
          </p>

          {card.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {card.highlights.map((highlight, index) => (
                <motion.span
                  key={highlight}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="inline-flex items-center rounded-md bg-[color:var(--accent)]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[color:var(--accent)]"
                >
                  {highlight}
                </motion.span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          <motion.button
            type="button"
            whileHover={isDisabled ? undefined : { scale: 1.05 }}
            whileTap={isDisabled ? undefined : { scale: 0.95 }}
            className={clsx(
              'group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-lg px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
              isDisabled
                ? 'cursor-not-allowed bg-slate-200/40 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500'
                : 'bg-[color:var(--accent)] text-white hover:opacity-90 focus-visible:outline-[color:var(--accent)]'
            )}
            onClick={(event) => {
              event.stopPropagation();
              handleSelect();
            }}
            disabled={isDisabled}
          >
            {!isDisabled && (
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0"
                initial={{ x: '-100%' }}
                animate={{ x: isHovered ? '100%' : '-100%' }}
                transition={{ duration: 0.6 }}
              />
            )}
            <span className="relative">Accéder</span>
            <motion.span
              aria-hidden
              className="relative text-sm leading-none"
              animate={{ x: isHovered && !isDisabled ? 3 : 0 }}
            >
              →
            </motion.span>
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
};


