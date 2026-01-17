/**
 * Service API pour les Services (catalogue)
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface Service {
  id?: string;
  name: string;
  description?: string;
  status?: string;
  [key: string]: any;
}

export class ServiceService {
  /**
   * Crée un nouveau service
   */
  static async create(serviceData: Service): Promise<ApiResponse<Service>> {
    return httpClient.post<Service>('/services/', serviceData);
  }

  /**
   * Crée un nouveau service (alias pour compatibilité)
   */
  static async createService(serviceData: Service): Promise<ApiResponse<Service>> {
    return this.create(serviceData);
  }

  /**
   * Récupère tous les services
   */
  static async getAll(): Promise<ApiResponse<Service[]>> {
    const result = await httpClient.get<Service[]>('/services/');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Récupère tous les services (alias pour compatibilité)
   */
  static async getServices(): Promise<ApiResponse<Service[]>> {
    return this.getAll();
  }

  /**
   * Récupère un service par ID
   */
  static async getById(serviceId: string): Promise<ApiResponse<Service>> {
    return httpClient.get<Service>(`/services/${serviceId}`);
  }

  /**
   * Récupère un service par ID (alias pour compatibilité)
   */
  static async getService(serviceId: string): Promise<ApiResponse<Service>> {
    return this.getById(serviceId);
  }

  /**
   * Met à jour un service
   */
  static async update(serviceId: string, serviceData: Service): Promise<ApiResponse<Service>> {
    const result = await httpClient.put<Service>(`/services/${serviceId}`, serviceData);
    
    // Si PUT échoue avec 404, essayer POST (création)
    if (!result.success && result.error?.includes('404')) {
      return this.create(serviceData);
    }
    
    return result;
  }

  /**
   * Met à jour un service (alias pour compatibilité)
   */
  static async updateService(serviceId: string, serviceData: Service): Promise<ApiResponse<Service>> {
    return this.update(serviceId, serviceData);
  }

  /**
   * Supprime un service
   */
  static async delete(serviceId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/services/${serviceId}`);
  }

  /**
   * Supprime un service (alias pour compatibilité)
   */
  static async deleteService(serviceId: string): Promise<ApiResponse<void>> {
    return this.delete(serviceId);
  }
}

