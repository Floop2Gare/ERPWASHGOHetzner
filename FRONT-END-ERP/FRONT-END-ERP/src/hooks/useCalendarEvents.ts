import { useState, useCallback } from 'react';
import { CalendarEventService, type CalendarEventData, type CalendarEventResponse, type ConnectionTestResponse, type EventListResponse } from '../lib/calendarEventService';

export const useCalendarEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEvent = useCallback(async (eventData: CalendarEventData): Promise<CalendarEventResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await CalendarEventService.createEvent(eventData);
      if (!result.success) {
        setError(result.error || 'Erreur lors de la création de l\'événement');
      }
      return result;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const testConnection = useCallback(async (user: string): Promise<ConnectionTestResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await CalendarEventService.testConnection(user);
      if (!result.success) {
        setError(result.error || 'Erreur de connexion');
      }
      return result;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const listEvents = useCallback(async (user: string, maxResults: number = 10): Promise<EventListResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await CalendarEventService.listEvents(user, maxResults);
      return result;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      return { events: [], count: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteEvent = useCallback(async (user: string, eventId: string): Promise<CalendarEventResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await CalendarEventService.deleteEvent(user, eventId);
      if (!result.success) {
        setError(result.error || 'Erreur lors de la suppression');
      }
      return result;
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    createEvent,
    testConnection,
    listEvents,
    deleteEvent,
    loading,
    error,
    clearError
  };
};
