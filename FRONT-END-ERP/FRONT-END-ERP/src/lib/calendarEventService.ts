/**
 * Service pour gérer les événements Google Calendar
 */

const BACKEND_URL = ((import.meta as any).env?.VITE_BACKEND_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:8000')) as string;

export interface CalendarEventData {
  planning_user: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location?: string;
}

export interface CalendarEventResponse {
  success: boolean;
  event_id?: string;
  event_link?: string;
  error?: string;
}

export interface ConnectionTestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface EventListResponse {
  events: Array<{
    id: string;
    summary: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
    htmlLink?: string;
  }>;
  count: number;
}

export class CalendarEventService {
  /**
   * Valide et formate les dates pour Google Calendar API
   */
  private static formatDateTime(dateTime: string): string {
    // Nettoyer la date si elle contient des caractères invalides
    let cleanDateTime = dateTime.trim();
    
    // Vérifier si la date contient déjà un timezone
    if (cleanDateTime.includes('+') || cleanDateTime.includes('Z') || cleanDateTime.includes('-', 10)) {
      return cleanDateTime;
    }
    
    // Si pas de timezone, ajouter +01:00 par défaut (Europe/Paris)
    return cleanDateTime + '+01:00';
  }

  /**
   * Valide les données d'événement avant envoi
   */
  private static validateEventData(eventData: CalendarEventData): CalendarEventData {
    const validated = { ...eventData };
    
    // Valider et formater les dates
    if (validated.start_time) {
      validated.start_time = this.formatDateTime(validated.start_time);
    }
    if (validated.end_time) {
      validated.end_time = this.formatDateTime(validated.end_time);
    }
    
    // S'assurer que le titre n'est pas vide
    if (!validated.title || validated.title.trim() === '') {
      validated.title = 'Service Wash&Go';
    }
    
    // Valider que les dates sont valides
    try {
      if (validated.start_time) {
        new Date(validated.start_time);
      }
      if (validated.end_time) {
        new Date(validated.end_time);
      }
    } catch (error) {
      console.error('[CalendarEventService] Date invalide:', error);
      throw new Error('Format de date invalide');
    }
    
    return validated;
  }

  /**
   * Crée un événement Google Calendar
   */
  static async createEvent(eventData: CalendarEventData): Promise<CalendarEventResponse> {
    try {
      // Valider et formater les données
      const validatedData = this.validateEventData(eventData);
      
      console.log('[CalendarEventService] Création d\'événement avec données:', validatedData);
      
      const response = await fetch(`${BACKEND_URL}/calendar/create-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CalendarEventService] Erreur HTTP:', response.status, errorText);
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[CalendarEventService] Réponse du serveur:', result);
      
      if (result.success) {
        return {
          success: true,
          event_id: result.event_id,
          event_link: result.event_link
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la création de l\'événement');
      }
    } catch (error) {
      console.error('[CalendarEventService] Erreur lors de la création de l\'événement:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Teste la connexion Google Calendar pour un utilisateur
   */
  static async testConnection(user: string): Promise<ConnectionTestResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/calendar/test-connection/${user}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur de test de connexion:', error);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }

  /**
   * Liste les événements d'un utilisateur
   */
  static async listEvents(user: string, maxResults: number = 10): Promise<EventListResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/calendar/list-events/${user}?max_results=${maxResults}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération des événements:', error);
      return { events: [], count: 0 };
    }
  }

  /**
   * Supprime un événement
   */
  static async deleteEvent(user: string, eventId: string): Promise<CalendarEventResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/calendar/delete-event/${user}/${eventId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      return { 
        success: false, 
        error: (error as Error).message 
      };
    }
  }
}
