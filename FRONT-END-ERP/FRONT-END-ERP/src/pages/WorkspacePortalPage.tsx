import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppData } from '../store/useAppData';
import { Topbar } from '../layout/Topbar';
import { WORKSPACE_MODULES } from '../workspace/modules';

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

      const event: CalendarPreviewEvent = {
        id: engagement.id,
        date: dayKey,
        title: service?.name ?? 'Intervention',
        subtitle: resolveClientName(client),
        time,
        accent,
      };

      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)!.push(event);
    });

    map.forEach((events) => {
      events.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
    });

    return map;
  }, [calendarMonth, clients, engagements, services]);

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

      <main className="relative flex w-full flex-1 items-start justify-center px-6 pb-20 pt-24 sm:px-8 sm:pt-28 lg:px-16 lg:pt-32">
        <div className="flex w-full max-w-[120rem] flex-col gap-12 lg:flex-row lg:items-start lg:justify-center lg:gap-16 lg:px-0">
          <div className="flex w-full max-w-[880px] flex-col gap-10">
            <section className="grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-8">
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
            className="hidden min-h-[640px] flex-1 lg:ml-auto lg:max-w-[1000px] lg:flex"
            month={calendarMonth}
            weekdayLabels={weekdayLabels}
            days={calendarDays}
            eventsByDay={eventsByDay}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onGoToday={handleGoToday}
            onOpenPlanning={openPlanning}
          />
        </div>
      </main>
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
        'group relative flex h-full w-full min-w-[300px] cursor-pointer flex-col overflow-hidden rounded-3xl bg-transparent text-left text-slate-800 transition-all duration-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--accent)]/20 dark:bg-transparent dark:text-white sm:min-w-[360px]',
        isDisabled && 'cursor-not-allowed opacity-60 grayscale'
      )}
      style={
        {
          '--accent': card.accentColor,
        } as CSSProperties
      }
      onHoverStart={() => onHoverChange(true)}
      onHoverEnd={() => onHoverChange(false)}
      whileHover={isDisabled ? undefined : { y: -8, scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
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
        className="pointer-events-none absolute bottom-5 left-0 top-5 w-1 rounded-r-full bg-gradient-to-b from-[color:var(--accent)]/60 via-[color:var(--accent)] to-[color:var(--accent)]/60 shadow-[0_0_20px_rgba(0,0,0,0.2)]"
        initial={{ scaleY: 0.3, opacity: 0.5 }}
        animate={{
          scaleY: isHovered && !isDisabled ? 1 : 0.3,
          opacity: isHovered && !isDisabled ? 1 : 0.5,
        }}
        transition={{ duration: 0.4 }}
      />

      <div className="relative z-10 flex h-full flex-col gap-5 p-7">
        <div className="flex items-start justify-between">
          <motion.span
            className={clsx(
              'inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl shadow-lg',
              isDisabled && 'grayscale'
            )}
            style={{
              background: `linear-gradient(135deg, ${card.accentColor}20 0%, ${card.accentColor}08 100%)`,
              boxShadow: `0 10px 24px -12px ${card.accentColor}55, inset 0 1px 2px ${card.accentColor}30`,
            }}
            whileHover={isDisabled ? undefined : { scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Icon className="h-8 w-8 text-[color:var(--accent)]" strokeWidth={1.8} />
          </motion.span>
        </div>

        <div className="flex flex-1 flex-col gap-2.5">
          <div className="space-y-2">
            <h2 className="text-[26px] font-black uppercase leading-tight tracking-tight text-slate-900 dark:text-white">
              {card.category}
            </h2>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[color:var(--accent)]">
              {card.strapline}
            </p>
          </div>

          <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
            {card.description}
          </p>

          {card.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {card.highlights.map((highlight, index) => (
                <motion.span
                  key={highlight}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="inline-flex items-center rounded-lg bg-[color:var(--accent)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[color:var(--accent)]"
                >
                  {highlight}
                </motion.span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto flex justify-end">
          <motion.button
            type="button"
            whileHover={isDisabled ? undefined : { scale: 1.05 }}
            whileTap={isDisabled ? undefined : { scale: 0.95 }}
            className={clsx(
              'group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
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
              className="relative text-base leading-none"
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

type CalendarPreviewEvent = {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  time?: string | null;
  accent: {
    base: string;
    bg: string;
    shadow: string;
  };
};

type CalendarPreviewProps = {
  className?: string;
  month: Date;
  weekdayLabels: string[];
  days: Date[];
  eventsByDay: Map<string, CalendarPreviewEvent[]>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToday: () => void;
  onOpenPlanning: (date?: string) => void;
};

const CalendarPreview = ({
  className,
  month,
  weekdayLabels,
  days,
  eventsByDay,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  onOpenPlanning,
}: CalendarPreviewProps) => {
  const monthLabelRaw = format(month, 'LLLL yyyy', { locale: fr });
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

  return (
    <aside
      className={clsx(
        'flex h-full w-full flex-col gap-6 rounded-[28px] bg-transparent p-8 dark:text-white',
        className
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400 dark:text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            Planning
          </span>
          <h3 className="text-[26px] font-black leading-tight text-slate-900 dark:text-white">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoToday}
            className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-slate-900 bg-white px-6 text-sm font-black uppercase tracking-[0.22em] text-slate-900 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.55)] transition hover:bg-slate-900 hover:text-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:border-white/80 dark:bg-transparent dark:text-white dark:hover:bg-white dark:hover:text-slate-900 dark:focus-visible:outline-white"
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={onPrevMonth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(dayKey) ?? [];
          const visibleEvents = dayEvents.slice(0, 2);
          const extraEvents = dayEvents.length - visibleEvents.length;
          const inCurrentMonth = isSameMonth(day, month);
          const today = isToday(day);

          return (
            <button
              type="button"
              key={dayKey}
              onClick={() => onOpenPlanning(dayEvents.length ? dayKey : undefined)}
              className={clsx(
                'group relative flex h-28 flex-col gap-1 rounded-2xl px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                inCurrentMonth
                  ? 'bg-transparent hover:-translate-y-[1px] hover:bg-slate-200/30 dark:hover:bg-slate-800/40'
                  : 'bg-transparent text-slate-300 hover:bg-slate-200/20 dark:text-slate-600 dark:hover:bg-slate-800/40',
                dayEvents.length === 0 && 'cursor-default',
                today && 'ring-2 ring-slate-900/30 shadow-[0_10px_32px_-18px_rgba(15,23,42,0.45)] dark:ring-white/20 dark:shadow-[0_10px_32px_-18px_rgba(15,23,42,0.45)]'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-xl text-base font-semibold transition',
                    today
                      ? 'bg-white text-slate-900 shadow-[0_10px_25px_-15px_rgba(15,23,42,0.55)] dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white'
                  )}
                >
                  {format(day, 'd', { locale: fr })}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-300 dark:text-slate-500">
                    {dayEvents.length} RDV
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1 pt-1">
                {visibleEvents.map((event) => (
                  <span
                    key={event.id}
                    className="inline-flex items-center gap-2 rounded-xl px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={
                      {
                        color: event.accent.base,
                        backgroundColor: event.accent.bg,
                        boxShadow: event.accent.shadow,
                      } as CSSProperties
                    }
                  >
                    <span>{event.time}</span>
                    <span className="truncate">{event.title}</span>
                  </span>
                ))}
                {extraEvents > 0 && (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    + {extraEvents} autres
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

    </aside>
  );
};

