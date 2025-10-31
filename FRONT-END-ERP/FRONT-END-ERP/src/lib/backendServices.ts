/**
 * Services Backend pour ERP Wash&Go
 * Architecture: Frontend → Backend (Postgres via API)
 */

// Configuration Backend pour déploiement sur serveur unique (Nginx proxy /api)
let BACKEND_URL: string | undefined = (import.meta as any).env?.VITE_BACKEND_URL;

if (!BACKEND_URL) {
  if (typeof window !== 'undefined') {
    BACKEND_URL = `${window.location.origin}/api`;
  } else {
    BACKEND_URL = 'http://localhost:8000';
  }
}

// Normalisation: pas de double slash en concaténation
if (BACKEND_URL.endsWith('/')) {
  BACKEND_URL = BACKEND_URL.slice(0, -1);
}

// Configuration de debug pour la production
const DEBUG_MODE = (import.meta as any).env?.DEV || false;

// Helper pour logger les erreurs en production
const logError = (context: string, error: any) => {
  if (DEBUG_MODE) {
    console.error(`[${context}]`, error);
  }
};

// Helper pour logger les requêtes en production
const logRequest = (method: string, url: string, data?: any) => {
  if (DEBUG_MODE) {
    console.log(`[API] ${method} ${url}`, data ? { data } : '');
  }
};

// Helper pour gérer les réponses HTTP avec gestion d'erreurs détaillée
const handleHttpResponse = async (response: Response, context: string) => {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  let data: any;
  try {
    data = isJson ? await response.json() : await response.text();
  } catch (error) {
    console.error(`[${context}] Erreur de parsing de la réponse:`, error);
    throw new Error(`Erreur de parsing de la réponse HTTP ${response.status}`);
  }

  // Log détaillé pour le debug
  if (DEBUG_MODE) {
    console.group(`[${context}] Réponse HTTP ${response.status}`);
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Data:', data);
    console.groupEnd();
  }

  // Gestion des erreurs spécifiques
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    if (response.status === 422) {
      errorMessage = 'Erreur de validation des données (422)';
      if (data && data.detail) {
        errorMessage += `: ${JSON.stringify(data.detail)}`;
      }
    } else if (response.status === 404) {
      errorMessage = 'Ressource non trouvée (404)';
    } else if (response.status === 500) {
      errorMessage = 'Erreur serveur interne (500)';
    } else if (response.status === 0) {
      errorMessage = 'Erreur réseau: Impossible de joindre le serveur';
    }
    
    throw new Error(errorMessage);
  }

  return data;
};

/**
 * Service pour les Clients
 */
export class ClientService {
  static async createClient(clientData: any) {
    try {
      logRequest('POST', `${BACKEND_URL}/clients/`, clientData);
      
      const response = await fetch(`${BACKEND_URL}/clients/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData)
      });
      
      const result = await handleHttpResponse(response, 'ClientService.createClient');
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la création du client');
      }
    } catch (error) {
      logError('ClientService.createClient', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getClients() {
    try {
      logRequest('GET', `${BACKEND_URL}/clients/`);
      
      const response = await fetch(`${BACKEND_URL}/clients/`);
      const result = await handleHttpResponse(response, 'ClientService.getClients');
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la récupération des clients');
      }
    } catch (error) {
      logError('ClientService.getClients', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  static async getClient(clientId: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/clients/${clientId}`);
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la récupération du client');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du client:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async updateClient(clientId: string, clientData: any) {
    try {
      const response = await fetch(`${BACKEND_URL}/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData)
      });
      
      // Si PUT échoue avec 404, essayer POST (création)
      if (response.status === 404) {
        console.log('[ClientService] Client non trouvé, tentative de création...');
        return await this.createClient(clientData);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la mise à jour du client');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du client:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async deleteClient(clientId: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/clients/${clientId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la suppression du client');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Service pour les Services
 */
export class ServiceService {
  static async createService(serviceData: any) {
    try {
      const response = await fetch(`${BACKEND_URL}/services/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la création du service');
      }
    } catch (error) {
      console.error('Erreur lors de la création du service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getServices() {
    try {
      const response = await fetch(`${BACKEND_URL}/services/`);
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la récupération des services');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des services:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  static async getService(serviceId: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/services/${serviceId}`);
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la récupération du service');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async updateService(serviceId: string, serviceData: any) {
    try {
      const response = await fetch(`${BACKEND_URL}/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData)
      });
      
      // Si PUT échoue avec 404, essayer POST (création)
      if (response.status === 404) {
        console.log('[ServiceService] Service non trouvé, tentative de création...');
        return await this.createService(serviceData);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la mise à jour du service');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async deleteService(serviceId: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/services/${serviceId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la suppression du service');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du service:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Service pour les Rendez-vous/Engagements
 */
export class AppointmentService {
  static async createAppointment(appointmentData: any) {
    try {
      const response = await fetch(`${BACKEND_URL}/appointments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la création du rendez-vous');
      }
    } catch (error) {
      console.error('Erreur lors de la création du rendez-vous:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getAppointments() {
    try {
      const response = await fetch(`${BACKEND_URL}/appointments/`);
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la récupération des rendez-vous');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des rendez-vous:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  static async getAppointment(appointmentId: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/appointments/${appointmentId}`);
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la récupération du rendez-vous');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du rendez-vous:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async updateAppointment(appointmentId: string, appointmentData: any) {
    try {
      const response = await fetch(`${BACKEND_URL}/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData)
      });
      
      // Si PUT échoue avec 404, essayer POST (création)
      if (response.status === 404) {
        console.log('[AppointmentService] Rendez-vous non trouvé, tentative de création...');
        return await this.createAppointment(appointmentData);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la mise à jour du rendez-vous');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rendez-vous:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async deleteAppointment(appointmentId: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/appointments/${appointmentId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la suppression du rendez-vous');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du rendez-vous:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Service pour les Entreprises
 */
export class CompanyService {
  static async createCompany(companyData: any) {
    try {
      const response = await fetch(`${BACKEND_URL}/companies/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la création de l\'entreprise');
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'entreprise:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  static async getCompanies() {
    try {
      const response = await fetch(`${BACKEND_URL}/companies/`);
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la récupération des entreprises');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des entreprises:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  static async updateCompany(companyId: string, companyData: any) {
    try {
      const response = await fetch(`${BACKEND_URL}/companies/${companyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(companyData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la mise à jour de l\'entreprise');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'entreprise:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Service pour Google Calendar
 */
export class CalendarService {
  static async getGoogleCalendarEvents() {
    try {
      const response = await fetch(`${BACKEND_URL}/planning/google-calendar`);
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la récupération des événements Google Calendar');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des événements Google Calendar:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  static async createGoogleCalendarEvent(eventData: any) {
    try {
      const response = await fetch(`${BACKEND_URL}/calendar/create-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Erreur lors de la création de l\'événement Google Calendar');
      }
    } catch (error) {
      console.error('Erreur lors de la création de l\'événement Google Calendar:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Service pour tester la connexion Backend
 */
export class BackendHealthService {
  static async testConnection() {
    try {
      logRequest('GET', `${BACKEND_URL}/health`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`${BACKEND_URL}/health`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      logRequest('GET', `${BACKEND_URL}/health`, { status: response.status });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Accepter les deux formats de réponse
      if (result.success || result.status === 'ok') {
        return {
          success: true,
          data: result.data || result,
          url: BACKEND_URL
        };
      } else {
        throw new Error(result.error || 'Erreur de connexion au backend');
      }
    } catch (error) {
      logError('BackendHealth', error);
      
      // Gestion spécifique des erreurs
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Timeout: Le backend ne répond pas dans les 10 secondes',
          url: BACKEND_URL
        };
      }
      
      if (error.message.includes('Failed to fetch')) {
        return {
          success: false,
          error: 'Erreur réseau: Impossible de joindre le backend',
          url: BACKEND_URL
        };
      }
      
      return {
        success: false,
        error: error.message,
        url: BACKEND_URL
      };
    }
  }
}
