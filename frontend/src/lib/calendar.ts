import { format } from 'date-fns';
import type { AuthUser, Slot } from '../store/useAppData';
import { fetchPlanningEvents, type PlanningCalendarEvent } from '../api/services/planningCalendar';

export type CalendarAttendee = {
  email: string | null;
  displayName: string | null;
  responseStatus: string | null;
};

export type CalendarEvent = {
  id: string;
  calendarKey: string;
  calendarId: string;
  summary: string;
  description: string | null;
  location: string | null;
  status: string | null;
  htmlLink: string | null;
  created: string | null;
  updated: string | null;
  hangoutLink: string | null;
  colorId: string | null;
  isAllDay: boolean;
  start: string | null;
  end: string | null;
  startDate: string | null;
  endDate: string | null;
  timeZone: string | null;
  attendees: CalendarAttendee[];
};

export type CalendarRange = {
  timeMin: string;
  timeMax: string;
};

export type CalendarApiResponse = {
  fetchedAt: string;
  range: CalendarRange;
  events: CalendarEvent[];
  warnings?: string[];
};

export type FetchCalendarOptions = {
  user?: string | null;
  rangeDays?: number;
  pastDays?: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const fallbackDurationMs = 60 * 60 * 1000;

const parseDate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

export const calendarEventToSlot = (event: CalendarEvent): Slot => {
  const start = parseDate(event.start) ?? parseDate(event.startDate) ?? new Date();
  const endCandidate = parseDate(event.end) ?? parseDate(event.endDate);
  const end =
    endCandidate && endCandidate.getTime() > start.getTime()
      ? endCandidate
      : new Date(start.getTime() + fallbackDurationMs);
  const slotId = `planning-${event.calendarKey}-${event.id}`;
  return {
    id: slotId,
    date: format(start, 'yyyy-MM-dd'),
    start: format(start, "HH'h'mm"),
    end: format(end, "HH'h'mm"),
  };
};

export const calendarEventsToSlots = (events: CalendarEvent[]) => {
  const eventsBySlotId = new Map<string, CalendarEvent>();
  const slots: Slot[] = [];
  events.forEach((event) => {
    const slot = calendarEventToSlot(event);
    eventsBySlotId.set(slot.id, event);
    slots.push(slot);
  });
  return { slots, eventsBySlotId };
};

const mapPlanningEventToCalendarEvent = (
  event: PlanningCalendarEvent,
  timezone: string | null
): CalendarEvent => ({
  id: event.id,
  calendarKey: event.calendar || 'all',
  calendarId: event.calendar || '',
  summary: event.title || 'Sans titre',
  description: event.description,  // Description complète maintenant disponible
  location: event.location,
  status: event.status,
  htmlLink: event.htmlLink,
  created: event.createdAt,
  updated: event.updatedAt,
  hangoutLink: event.hangoutLink || null,  // Lien Google Meet si disponible
  colorId: event.colorId || null,
  isAllDay: event.allDay,
  start: event.start,
  end: event.end,
  startDate: event.start,
  endDate: event.end,
  timeZone: timezone,
  attendees: (event.attendees || []).map((attendee) => ({
    email: attendee.email,
    displayName: attendee.name || attendee.email,
    responseStatus: attendee.responseStatus,
  })),
});

export const fetchCalendarEvents = async (
  options: FetchCalendarOptions = {}
): Promise<CalendarApiResponse> => {
  const now = new Date();
  const pastDays = options.pastDays ?? 30;
  const rangeDays = options.rangeDays ?? 90;

  const fromDate = new Date(now.getTime() - pastDays * DAY_IN_MS);
  const toDate = new Date(now.getTime() + rangeDays * DAY_IN_MS);

  const planningResponse = await fetchPlanningEvents({
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    calendars: options.user ?? undefined,
    pageSize: 1000,
  });

  const timezone = planningResponse.range?.timezone ?? null;

  const payload: CalendarApiResponse = {
    fetchedAt: new Date().toISOString(),
    range: {
      timeMin: planningResponse.range?.from ?? fromDate.toISOString(),
      timeMax: planningResponse.range?.to ?? toDate.toISOString(),
    },
    events: (planningResponse.events || []).map((event) =>
      mapPlanningEventToCalendarEvent(event, timezone)
    ),
    warnings: planningResponse.source?.warnings ?? [],
  };

  return payload;
};

const normalise = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

export const resolveCalendarKeyForUser = (user: AuthUser | null) => {
  if (!user) {
    return undefined;
  }
  const tokens = [
    normalise(user.fullName),
    normalise(user.username),
    normalise(user.profile?.firstName),
    normalise(user.profile?.lastName),
  ].filter(Boolean);

  if (tokens.some((token) => token.includes('adrien'))) {
    return 'adrien';
  }
  if (tokens.some((token) => token.includes('clément') || token.includes('clement'))) {
    return 'clement';
  }
  return undefined;
};

