/**
 * Service API pour les Rendez-vous/Engagements
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface Appointment {
  id?: string;
  client_id?: string;
  service_id?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  [key: string]: any;
}

export class AppointmentService {
  /**
   * Crée un nouveau rendez-vous
   */
  static async create(appointmentData: Appointment): Promise<ApiResponse<Appointment>> {
    return httpClient.post<Appointment>('/appointments/', appointmentData);
  }

  /**
   * Crée un nouveau rendez-vous (alias pour compatibilité)
   */
  static async createAppointment(appointmentData: Appointment): Promise<ApiResponse<Appointment>> {
    return this.create(appointmentData);
  }

  /**
   * Récupère tous les rendez-vous
   */
  static async getAll(): Promise<ApiResponse<Appointment[]>> {
    const result = await httpClient.get<Appointment[]>('/appointments/');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Récupère tous les rendez-vous (alias pour compatibilité)
   */
  static async getAppointments(): Promise<ApiResponse<Appointment[]>> {
    return this.getAll();
  }

  /**
   * Récupère un rendez-vous par ID
   */
  static async getById(appointmentId: string): Promise<ApiResponse<Appointment>> {
    return httpClient.get<Appointment>(`/appointments/${appointmentId}`);
  }

  /**
   * Récupère un rendez-vous par ID (alias pour compatibilité)
   */
  static async getAppointment(appointmentId: string): Promise<ApiResponse<Appointment>> {
    return this.getById(appointmentId);
  }

  /**
   * Met à jour un rendez-vous
   */
  static async update(appointmentId: string, appointmentData: Appointment): Promise<ApiResponse<Appointment>> {
    const result = await httpClient.put<Appointment>(`/appointments/${appointmentId}`, appointmentData);
    
    // Si PUT échoue avec 404, essayer POST (création)
    if (!result.success && result.error?.includes('404')) {
      return this.create(appointmentData);
    }
    
    return result;
  }

  /**
   * Met à jour un rendez-vous (alias pour compatibilité)
   */
  static async updateAppointment(appointmentId: string, appointmentData: Appointment): Promise<ApiResponse<Appointment>> {
    return this.update(appointmentId, appointmentData);
  }

  /**
   * Supprime un rendez-vous
   */
  static async delete(appointmentId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/appointments/${appointmentId}`);
  }

  /**
   * Supprime un rendez-vous (alias pour compatibilité)
   */
  static async deleteAppointment(appointmentId: string): Promise<ApiResponse<void>> {
    return this.delete(appointmentId);
  }
}

