/**
 * Service API pour les Utilisateurs
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface User {
  id?: string;
  username: string;
  passwordHash?: string;
  role: string;
  pages: (string | '*')[];
  permissions: (string | '*')[];
  active: boolean;
  companyId?: string | null;
  fullName?: string;
  profile?: any;
  notificationPreferences?: any;
  [key: string]: any;
}

export class UserService {
  /**
   * Crée un nouvel utilisateur
   */
  static async create(userData: User): Promise<ApiResponse<User>> {
    return httpClient.post<User>('/users/', userData);
  }

  /**
   * Crée un nouvel utilisateur (alias pour compatibilité)
   */
  static async createUser(userData: User): Promise<ApiResponse<User>> {
    return this.create(userData);
  }

  /**
   * Récupère tous les utilisateurs
   */
  static async getAll(): Promise<ApiResponse<User[]>> {
    const result = await httpClient.get<User[]>('/users/');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Récupère tous les utilisateurs (alias pour compatibilité)
   */
  static async getUsers(): Promise<ApiResponse<User[]>> {
    return this.getAll();
  }

  /**
   * Récupère un utilisateur par ID
   */
  static async getById(userId: string): Promise<ApiResponse<User>> {
    return httpClient.get<User>(`/users/${userId}`);
  }

  /**
   * Récupère un utilisateur par ID (alias pour compatibilité)
   */
  static async getUser(userId: string): Promise<ApiResponse<User>> {
    return this.getById(userId);
  }

  /**
   * Met à jour un utilisateur
   */
  static async update(userId: string, userData: User): Promise<ApiResponse<User>> {
    const result = await httpClient.put<User>(`/users/${userId}`, userData);
    
    // Si PUT échoue avec 404, essayer POST (création)
    if (!result.success && result.error?.includes('404')) {
      return this.create(userData);
    }
    
    return result;
  }

  /**
   * Met à jour un utilisateur (alias pour compatibilité)
   */
  static async updateUser(userId: string, userData: User): Promise<ApiResponse<User>> {
    return this.update(userId, userData);
  }

  /**
   * Supprime un utilisateur
   */
  static async delete(userId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/users/${userId}`);
  }

  /**
   * Supprime un utilisateur (alias pour compatibilité)
   */
  static async deleteUser(userId: string): Promise<ApiResponse<void>> {
    return this.delete(userId);
  }

  /**
   * Change le mot de passe d'un utilisateur
   */
  static async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<ApiResponse<User>> {
    return httpClient.post<User>(`/users/${userId}/change-password`, {
      oldPassword,
      newPassword,
    });
  }
}




