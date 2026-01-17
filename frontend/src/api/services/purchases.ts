/**
 * Service API pour la gestion des achats
 */

import { httpClient, ApiResponse } from '../utils/httpClient';
import type { Purchase } from '../../store/useAppData';

export class PurchaseService {
  /**
   * Récupère tous les achats
   */
  static async getAll(): Promise<ApiResponse<Purchase[]>> {
    const result = await httpClient.get<Purchase[]>('/purchases/');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Récupère un achat par son ID
   */
  static async getById(purchaseId: string): Promise<ApiResponse<Purchase>> {
    return httpClient.get<Purchase>(`/purchases/${purchaseId}`);
  }

  /**
   * Crée un nouvel achat
   */
  static async create(purchaseData: Purchase): Promise<ApiResponse<Purchase>> {
    return httpClient.post<Purchase>('/purchases/', purchaseData);
  }

  /**
   * Met à jour un achat existant
   */
  static async update(purchaseId: string, purchaseData: Purchase): Promise<ApiResponse<Purchase>> {
    return httpClient.put<Purchase>(`/purchases/${purchaseId}`, purchaseData);
  }

  /**
   * Supprime un achat
   */
  static async delete(purchaseId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/purchases/${purchaseId}`);
  }
}


