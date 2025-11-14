/**
 * Service API pour Google Calendar
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  [key: string]: any;
}

export class CalendarService {
  /**
   * Récupère les événements Google Calendar
   */
  static async getGoogleCalendarEvents(): Promise<ApiResponse<GoogleCalendarEvent[]>> {
    const result = await httpClient.get<GoogleCalendarEvent[]>('/planning/google-calendar');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Crée un événement Google Calendar
   */
  static async createGoogleCalendarEvent(eventData: GoogleCalendarEvent): Promise<ApiResponse<GoogleCalendarEvent>> {
    return httpClient.post<GoogleCalendarEvent>('/calendar/create-event', eventData);
  }
}

