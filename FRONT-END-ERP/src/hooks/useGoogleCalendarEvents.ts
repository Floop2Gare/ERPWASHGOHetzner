import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calendarEventsToSlots,
  fetchCalendarEvents,
  type CalendarApiResponse,
  type CalendarEvent,
} from '../lib/calendar';
import type { Slot } from '../store/useAppData';

type UseGoogleCalendarEventsOptions = {
  userKey?: string;
  rangeDays?: number;
  pastDays?: number;
  autoRefresh?: boolean;
};

type UseGoogleCalendarEventsState = {
  events: CalendarEvent[];
  slots: Slot[];
  eventsBySlotId: Map<string, CalendarEvent>;
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
  range: CalendarApiResponse['range'] | null;
  warnings: string[];
  refresh: () => void;
};

export const useGoogleCalendarEvents = (
  options: UseGoogleCalendarEventsOptions = {}
): UseGoogleCalendarEventsState => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [range, setRange] = useState<CalendarApiResponse['range'] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const { slots, eventsBySlotId } = useMemo(() => calendarEventsToSlots(events), [events]);

  const performFetch = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchCalendarEvents({
          user: options.userKey,
          rangeDays: options.rangeDays,
          pastDays: options.pastDays,
          signal,
        });
        setEvents(payload.events);
        setFetchedAt(payload.fetchedAt);
        setRange(payload.range);
        setWarnings(payload.warnings ?? []);
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          setError((fetchError as Error).message || 'La synchronisation Google a échoué');
          setEvents([]);
          setFetchedAt(null);
          setRange(null);
          setWarnings([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [options.userKey, options.rangeDays, options.pastDays]
  );

  useEffect(() => {
    const controller = new AbortController();
    void performFetch(controller.signal);
    return () => controller.abort();
  }, [performFetch]);

  useEffect(() => {
    if (!options.autoRefresh) {
      return;
    }
    const interval = window.setInterval(() => {
      void performFetch();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [options.autoRefresh, performFetch]);

  const refresh = useCallback(() => {
    void performFetch();
  }, [performFetch]);

  return {
    events,
    slots,
    eventsBySlotId,
    loading,
    error,
    fetchedAt,
    range,
    warnings,
    refresh,
  };
};

export default useGoogleCalendarEvents;

