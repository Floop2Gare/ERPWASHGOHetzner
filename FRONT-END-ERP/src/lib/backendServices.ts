/**
 * @deprecated Ce fichier est conservé pour la compatibilité avec l'ancien code
 * Utilisez les services depuis '../api' à la place
 * 
 * Services Backend pour ERP Wash&Go
 * Architecture: Frontend → Backend (Postgres via API)
 */

// Réexportation des services depuis la nouvelle structure
export {
  ClientService,
  ServiceService,
  AppointmentService,
  CompanyService,
  CalendarService,
  BackendHealthService,
  type Client,
  type Service,
  type Appointment,
  type Company,
  type GoogleCalendarEvent,
  type HealthStatus,
} from '../api';

// Réexportation des utilitaires pour compatibilité
export { getBackendUrl, DEBUG_MODE } from '../api/config/api';
