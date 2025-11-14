/**
 * Point d'entrée principal pour tous les services API
 * Exporte tous les services de manière centralisée
 */

// Configuration
export { getBackendUrl, API_CONFIG, DEBUG_MODE } from './config/api';

// Utilitaires
export { httpClient, type ApiResponse, type RequestOptions } from './utils/httpClient';
export { logError, logRequest, logResponse } from './utils/logger';

// Services
export { ClientService, type Client } from './services/clients';
export { ServiceService, type Service } from './services/services';
export { AppointmentService, type Appointment } from './services/appointments';
export { CompanyService, type Company } from './services/companies';
export { CalendarService, type GoogleCalendarEvent } from './services/calendar';
export { HealthService, type HealthStatus } from './services/health';

// Exports de compatibilité avec l'ancien code
export { ClientService as ClientServiceLegacy } from './services/clients';
export { ServiceService as ServiceServiceLegacy } from './services/services';
export { AppointmentService as AppointmentServiceLegacy } from './services/appointments';
export { CompanyService as CompanyServiceLegacy } from './services/companies';
export { CalendarService as CalendarServiceLegacy } from './services/calendar';
export { HealthService as BackendHealthService } from './services/health';

