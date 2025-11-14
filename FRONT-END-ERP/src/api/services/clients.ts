/**
 * Service API pour les Clients
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface Client {
  id?: string;
  type: 'individual' | 'company';
  name: string;
  email?: string;
  phone?: string;
  status: string;
  [key: string]: any;
}

export class ClientService {
  /**
   * Crée un nouveau client
   */
  static async create(clientData: Client): Promise<ApiResponse<Client>> {
    return httpClient.post<Client>('/clients/', clientData);
  }

  /**
   * Crée un nouveau client (alias pour compatibilité)
   */
  static async createClient(clientData: Client): Promise<ApiResponse<Client>> {
    return this.create(clientData);
  }

  /**
   * Récupère tous les clients
   */
  static async getAll(): Promise<ApiResponse<Client[]>> {
    const result = await httpClient.get<Client[]>('/clients/');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Récupère tous les clients (alias pour compatibilité)
   */
  static async getClients(): Promise<ApiResponse<Client[]>> {
    return this.getAll();
  }

  /**
   * Récupère un client par ID
   */
  static async getById(clientId: string): Promise<ApiResponse<Client>> {
    return httpClient.get<Client>(`/clients/${clientId}`);
  }

  /**
   * Récupère un client par ID (alias pour compatibilité)
   */
  static async getClient(clientId: string): Promise<ApiResponse<Client>> {
    return this.getById(clientId);
  }

  /**
   * Met à jour un client
   */
  static async update(clientId: string, clientData: Client): Promise<ApiResponse<Client>> {
    const result = await httpClient.put<Client>(`/clients/${clientId}`, clientData);
    
    // Si PUT échoue avec 404, essayer POST (création)
    if (!result.success && result.error?.includes('404')) {
      return this.create(clientData);
    }
    
    return result;
  }

  /**
   * Met à jour un client (alias pour compatibilité)
   */
  static async updateClient(clientId: string, clientData: Client): Promise<ApiResponse<Client>> {
    return this.update(clientId, clientData);
  }

  /**
   * Supprime un client
   */
  static async delete(clientId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/clients/${clientId}`);
  }

  /**
   * Supprime un client (alias pour compatibilité)
   */
  static async deleteClient(clientId: string): Promise<ApiResponse<void>> {
    return this.delete(clientId);
  }
}

