/**
 * Service API pour les Abonnements
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface Subscription {
  id?: string;
  clientId: string;
  vehicleInfo: string;
  startDate: string;
  endDate: string | null;
  status: 'actif' | 'suspendu' | 'terminé' | 'annulé';
  frequency: 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel';
  priceHT: number;
  vatEnabled: boolean;
  vatRate?: number;
  documentId: string | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export class SubscriptionService {
  /**
   * Crée un nouvel abonnement
   */
  static async create(subscriptionData: Subscription): Promise<ApiResponse<Subscription>> {
    return httpClient.post<Subscription>('/subscriptions/', subscriptionData);
  }

  /**
   * Crée un nouvel abonnement (alias pour compatibilité)
   */
  static async createSubscription(subscriptionData: Subscription): Promise<ApiResponse<Subscription>> {
    return this.create(subscriptionData);
  }

  /**
   * Récupère tous les abonnements
   */
  static async getAll(): Promise<ApiResponse<Subscription[]>> {
    const result = await httpClient.get<Subscription[]>('/subscriptions/');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Récupère tous les abonnements (alias pour compatibilité)
   */
  static async getSubscriptions(): Promise<ApiResponse<Subscription[]>> {
    return this.getAll();
  }

  /**
   * Récupère un abonnement par ID
   */
  static async getById(subscriptionId: string): Promise<ApiResponse<Subscription>> {
    return httpClient.get<Subscription>(`/subscriptions/${subscriptionId}`);
  }

  /**
   * Récupère un abonnement par ID (alias pour compatibilité)
   */
  static async getSubscription(subscriptionId: string): Promise<ApiResponse<Subscription>> {
    return this.getById(subscriptionId);
  }

  /**
   * Met à jour un abonnement
   */
  static async update(subscriptionId: string, subscriptionData: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
    const result = await httpClient.put<Subscription>(`/subscriptions/${subscriptionId}`, subscriptionData);
    
    // Si PUT échoue avec 404, essayer POST (création)
    if (!result.success && result.error?.includes('404')) {
      return this.create(subscriptionData as Subscription);
    }
    
    return result;
  }

  /**
   * Met à jour un abonnement (alias pour compatibilité)
   */
  static async updateSubscription(subscriptionId: string, subscriptionData: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
    return this.update(subscriptionId, subscriptionData);
  }

  /**
   * Supprime un abonnement
   */
  static async delete(subscriptionId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/subscriptions/${subscriptionId}`);
  }

  /**
   * Supprime un abonnement (alias pour compatibilité)
   */
  static async deleteSubscription(subscriptionId: string): Promise<ApiResponse<void>> {
    return this.delete(subscriptionId);
  }

  /**
   * Transfère un abonnement vers une autre entreprise
   */
  static async transfer(subscriptionId: string, targetCompanyId: string): Promise<ApiResponse<Subscription>> {
    return httpClient.post<Subscription>(`/subscriptions/${subscriptionId}/transfer`, { targetCompanyId });
  }
}













