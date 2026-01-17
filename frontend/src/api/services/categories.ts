/**
 * Service API pour les Catégories
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface Category {
  id?: string;
  name: string;
  description?: string;
  active: boolean;
  parentId?: string | null;
  priceHT?: number; // Tarif HT (uniquement pour les sous-catégories)
  surcharge?: number; // Supplément (uniquement pour les sous-catégories)
  createdAt?: string;
  updatedAt?: string;
}

export class CategoryService {
  /**
   * Crée une nouvelle catégorie
   */
  static async create(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Category>> {
    return httpClient.post<Category>('/categories/', categoryData);
  }

  /**
   * Récupère toutes les catégories
   */
  static async getAll(): Promise<ApiResponse<Category[]>> {
    const result = await httpClient.get<Category[]>('/categories/');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Récupère toutes les catégories (alias pour compatibilité)
   */
  static async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.getAll();
  }

  /**
   * Récupère une catégorie par ID
   */
  static async getById(categoryId: string): Promise<ApiResponse<Category>> {
    return httpClient.get<Category>(`/categories/${categoryId}`);
  }

  /**
   * Met à jour une catégorie
   */
  static async update(categoryId: string, categoryData: Partial<Category>): Promise<ApiResponse<Category>> {
    return httpClient.put<Category>(`/categories/${categoryId}`, categoryData);
  }

  /**
   * Supprime une catégorie
   */
  static async delete(categoryId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/categories/${categoryId}`);
  }
}

