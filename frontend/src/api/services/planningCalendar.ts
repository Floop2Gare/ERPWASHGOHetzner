import { httpClient } from '../utils/httpClient';

export type PlanningCalendarAttendee = {
  name: string | null;
  email: string | null;
  responseStatus: string | null;
};

export type PlanningCalendarEvent = {
  id: string;
  title: string;
  description: string | null;  // Description complète maintenant disponible
  start: string;
  end: string;
  allDay: boolean;
  recurrence: string;
  location: string | null;
  organizer: string | null;
  attendees: PlanningCalendarAttendee[];
  htmlLink: string | null;
  hangoutLink?: string | null;  // Lien Google Meet
  status: string;
  updatedAt: string | null;
  createdAt: string | null;
  calendar: string;
  // Champs supplémentaires
  colorId?: string | null;
  recurrenceRules?: string[];
  recurringEventId?: string | null;
  iCalUID?: string | null;
  transparency?: string | null;
  visibility?: string | null;
  attachments?: Array<{
    fileUrl?: string;
    title?: string;
    mimeType?: string;
    iconLink?: string;
    fileId?: string;
  }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method?: string;
      minutes?: number;
    }>;
  };
  conferenceData?: any;
  extendedProperties?: Record<string, any>;
};

export type CalendarEventsApiResponse = {
  success: boolean;
  events: PlanningCalendarEvent[];
  nextPageToken: string | null;
  range: {
    from: string;
    to: string;
    timezone: string;
  };
  source: {
    calendars: string[];
    aggregated: boolean;
    lastSync: string;
    warnings?: string[];
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    hasNext: boolean;
  };
};

export type FetchPlanningEventsParams = {
  from: string;
  to: string;
  calendars?: string;
  pageSize?: number;
  pageToken?: string;
};

export async function fetchPlanningEvents(
  params: FetchPlanningEventsParams
): Promise<CalendarEventsApiResponse> {
  const search = new URLSearchParams();
  search.set('from', params.from);
  search.set('to', params.to);
  if (params.calendars) {
    search.set('calendars', params.calendars);
  }
  if (params.pageSize) {
    search.set('pageSize', String(params.pageSize));
  }
  if (params.pageToken) {
    search.set('pageToken', params.pageToken);
  }

  const result = await httpClient.get<CalendarEventsApiResponse>(
    `/planning/calendar/events?${search.toString()}`
  );

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Erreur lors du chargement des événements de planning');
  }

  return result.data;
}

