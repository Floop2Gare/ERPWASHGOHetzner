import { format } from 'date-fns';
import type { AuthUser, Slot } from '../store/useAppData';

export type CalendarAttendee = {
  email: string | null;
  displayName: string | null;
  responseStatus: string | null;
  optional: boolean;
  organizer: boolean;
  self: boolean;
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
  signal?: AbortSignal;
};

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

const fallbackDurationMs = 60 * 60 * 1000;

export const calendarEventToSlot = (event: CalendarEvent): Slot => {
  const startSource = event.start ?? event.startDate;
  const endSource = event.end ?? event.endDate;
  const start = parseDate(startSource) ?? new Date();
  const endCandidate = parseDate(endSource);
  const end = endCandidate && endCandidate.getTime() > start.getTime()
    ? endCandidate
    : new Date(start.getTime() + fallbackDurationMs);
  const slotId = `gcal-${event.calendarKey}-${event.id}`;
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

export const fetchCalendarEvents = async (
  options: FetchCalendarOptions = {}
): Promise<CalendarApiResponse> => {
  // Utiliser une variable d'environnement pour l'URL de l'API
  const apiUrl: string = (import.meta as any).env?.VITE_BACKEND_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:8000');

  // Utiliser le nouvel endpoint pour récupérer les événements
  let endpoint = `${apiUrl}/planning/google-calendar`;

  // Ajouter le paramètre user si spécifié
  if (options.user) {
    endpoint += `?user=${options.user}`;
  }
  
  console.log('[Calendar] Fetching events from:', endpoint);
  
  const response = await fetch(endpoint, {
    method: 'GET',
    signal: options.signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Calendar] Error response:', response.status, errorText);
    throw new Error(`Calendar sync failed with status ${response.status}: ${errorText}`);
  }

  // Adapter la réponse du backend Python au format attendu
  const backendData = await response.json() as { events: Array<{
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: string;
    end: string;
    status: string;
    htmlLink?: string;
  }>; warnings: string[] };

  console.log('[Calendar] Received events:', backendData.events?.length || 0);

  // Convertir au format attendu par le frontend
  const now = new Date().toISOString();
  const payload: CalendarApiResponse = {
    fetchedAt: now,
    range: {
      // Pour l'endpoint, on récupère les événements disponibles
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours dans le passé
      timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Jusqu'à 1 an dans le futur
    },
    events: backendData.events.map(event => ({
      id: event.id,
      calendarKey: options.user || 'all',
      calendarId: '',
      summary: event.summary,
      description: event.description || null,
      location: event.location || null,
      status: event.status || null,
      htmlLink: event.htmlLink || null,
      created: null,
      updated: null,
      hangoutLink: null,
      colorId: null,
      isAllDay: false,
      start: event.start,
      end: event.end,
      startDate: event.start,
      endDate: event.end,
      timeZone: null,
      attendees: [],
    })),
    warnings: backendData.warnings || [],
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

