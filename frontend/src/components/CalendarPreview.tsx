import React from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

// Types

export type CalendarPreviewEvent = {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  time?: string | null;
  duration?: string | null;
  status?: string | null;
  type?: string | null;
  location?: string | null;
  accent: {
    base: string;
    bg: string;
    shadow: string;
  };
};

export type CalendarPreviewProps = {
  className?: string;
  month: Date;
  weekdayLabels: string[];
  days: Date[];
  eventsByDay: Map<string, CalendarPreviewEvent[]>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToday: () => void;
  onOpenPlanning: (date?: string) => void;
  onEventHover?: (
    hovered: boolean,
    event: CalendarPreviewEvent | null,
    rect: DOMRect | null
  ) => void;
};

/**
 * Badge d'événement simplifié
 */
const CalendarEventBadge = ({
  event,
  onHoverChange,
}: {
  event: CalendarPreviewEvent;
  onHoverChange: (
    hovered: boolean,
    event: CalendarPreviewEvent | null,
    rect: DOMRect | null
  ) => void;
}) => {
  const badgeRef = React.useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      onHoverChange(true, event, rect);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHoverChange(false, null, null);
  };

  return (
    <div
      ref={badgeRef}
      className="group/badge relative z-20"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="relative overflow-hidden rounded-md bg-white dark:bg-slate-900"
        style={{
          backgroundColor: `${event.accent.base}12`,
        }}
      >
        <div className="flex items-center gap-1.5 px-2 py-1">
          {event.time && (
            <span
              className="shrink-0 font-mono text-[10px] font-bold"
              style={{ color: event.accent.base }}
            >
              {event.time}
            </span>
          )}
          <span
            className="truncate text-[11px] font-semibold leading-tight"
            style={{ color: event.accent.base }}
          >
            {event.title}
          </span>
        </div>

      </div>
    </div>
  );
};

/**
 * Fenêtre de détails d'événement - Positionnée au-dessus de l'événement
 */
export const EventDetailOverlay = ({
  event,
  position,
  onClose,
}: {
  event: CalendarPreviewEvent;
  position: { x: number; y: number };
  onClose: () => void;
}) => {
  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: 999999,
      }}
    >
      <div
        className="pointer-events-auto absolute w-[320px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, calc(-100% - 12px))',
          animation: 'popupFadeIn 0.2s ease-out',
        }}
        onMouseLeave={onClose}
      >
        <div className="relative overflow-hidden rounded-lg bg-white dark:bg-slate-900">
          {/* Barre colorée en haut */}
          <div
            className="h-1 w-full"
            style={{
              background: event.accent.base,
            }}
          />

          <div className="relative flex flex-col">
            {/* Header compact */}
            <div className="px-3.5 py-2.5">
              <div className="flex items-start gap-2.5">
                <div
                  className="h-2 w-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{
                    backgroundColor: event.accent.base,
                    boxShadow: `0 0 8px ${event.accent.base}50`,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold leading-tight text-slate-900 dark:text-white truncate">
                    {event.title}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                    {event.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Détails compacts */}
            <div className="px-3.5 py-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                {event.time && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: event.accent.base }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                        Heure
                      </p>
                      <p
                        className="mt-0.5 font-mono text-xs font-bold leading-tight"
                        style={{ color: event.accent.base }}
                      >
                        {event.time}
                      </p>
                    </div>
                  </div>
                )}

                {event.duration && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: event.accent.base }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                        Durée
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                        {event.duration}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <svg
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{ color: event.accent.base }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                      Date
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                      {new Date(event.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>

                {event.status && (
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3.5 w-3.5 flex-shrink-0 rounded"
                      style={{
                        backgroundColor: `${event.accent.base}20`,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                        Statut
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight capitalize">
                        {event.status}
                      </p>
                    </div>
                  </div>
                )}

                {event.location && (
                  <div className="flex items-center gap-2 col-span-2">
                    <svg
                      className="h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: event.accent.base }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                        Lieu
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight truncate">
                        {event.location}
                      </p>
                    </div>
                  </div>
                )}

                {event.type && (
                  <div className="flex items-center gap-2 col-span-2">
                    <div
                      className="h-3.5 w-3.5 flex-shrink-0 rounded"
                      style={{
                        backgroundColor: `${event.accent.base}20`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight">
                        Type
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight">
                        {event.type}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Badge compact */}
              <div className="mt-2.5 pt-2.5 flex items-center justify-between">
                <div
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${event.accent.base}12`,
                    color: event.accent.base,
                  }}
                >
                  <div
                    className="h-1 w-1 rounded-full"
                    style={{ backgroundColor: event.accent.base }}
                  />
                  {event.type || 'Événement'}
                </div>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {new Date(event.date).toLocaleDateString('fr-FR', {
                    weekday: 'short',
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Flèche pointant vers l'événement */}
        <div
          className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1.5 rotate-45 bg-white dark:bg-slate-900"
        />
      </div>
    </div>
  );
};

/**
 * Composant CalendarPreview - Ultra Design Premium
 */
export const CalendarPreview = ({
  className = '',
  month,
  weekdayLabels,
  days,
  eventsByDay,
  onPrevMonth,
  onNextMonth,
  onGoToday,
  onOpenPlanning,
  onEventHover,
}: CalendarPreviewProps) => {
  const handleEventHover = (
    hovered: boolean,
    event: CalendarPreviewEvent | null,
    rect: DOMRect | null
  ) => {
    if (onEventHover) {
      onEventHover(hovered, event, rect);
    }
  };

  const monthLabel = month
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase());

  const formatDay = (day: Date) => day.getDate().toString();
  const isSameMonth = (day: Date, month: Date) =>
    day.getMonth() === month.getMonth();
  const isToday = (day: Date) => {
    const today = new Date();
    return day.toDateString() === today.toDateString();
  };
  const formatDayKey = (day: Date) => format(day, 'yyyy-MM-dd');

  return (
    <aside
      className={`group/calendar relative flex h-full w-full flex-col bg-transparent ${className}`}
    >
      <header className="relative z-10 flex items-center justify-between px-5 py-4 lg:px-6 lg:py-5">
        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {monthLabel}
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGoToday}
            className="rounded-lg bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Aujourd&apos;hui
          </button>

          <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              type="button"
              onClick={onPrevMonth}
              className="group flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-all duration-200 hover:bg-white hover:text-slate-900 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              className="group flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-all duration-200 hover:bg-white hover:text-slate-900 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col gap-3 px-5 pb-5 pt-2 lg:px-5 lg:pb-5">
        <div className="grid grid-cols-7 gap-2.5">
          {weekdayLabels.map((label, index) => (
            <div
              key={`weekday-${index}-${label}`}
              className="flex items-center justify-center text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-2"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-7 gap-2.5 relative">
          {days.map((day) => {
            const dayKey = formatDayKey(day);
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
                className={`group/day relative flex min-h-[120px] flex-col rounded-xl p-2.5 lg:p-3 text-left transition-colors border ${
                  inCurrentMonth
                    ? ''
                    : 'opacity-30'
                } ${
                  today
                    ? 'bg-white border-2 border-blue-400 dark:bg-white dark:border-blue-400'
                    : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800'
                }`}
              >
                <div className="relative mb-2 flex items-center justify-between">
                  <span
                    className={`text-base font-bold tabular-nums ${
                      today
                        ? 'text-slate-900 dark:text-slate-100'
                        : inCurrentMonth
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {formatDay(day)}
                  </span>

                  {today && (
                    <div className="h-2 w-2 rounded-full bg-blue-500/70 dark:bg-blue-400/70" />
                  )}
                </div>

                {dayEvents.length > 0 && (
                  <div className="relative flex flex-1 flex-col gap-1.5">
                    {visibleEvents.map((event) => (
                      <CalendarEventBadge
                        key={event.id}
                        event={event}
                        onHoverChange={handleEventHover}
                      />
                    ))}

                    {extraEvents > 0 && (
                      <div className="mt-auto flex items-center justify-center rounded-md bg-slate-100/60 py-1 px-2 dark:bg-slate-700/20">
                        <span className="text-slate-500 text-[10px] font-bold dark:text-slate-400">
                          +{extraEvents}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
