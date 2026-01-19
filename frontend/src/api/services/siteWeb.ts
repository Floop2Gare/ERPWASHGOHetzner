/**
 * Service API pour les clients Site Web
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface SiteWebUser {
  id: string;
  user_id?: string;
  email: string;
  prenom: string;
  nom: string;
  name?: string;
  phone?: string;
  profile_photo_url?: string;
  address_full?: string;
  address_street?: string;
  address_city?: string;
  address_postal_code?: string;
  address_latitude?: number;
  address_longitude?: number;
  referral_code: string;
  account_status: 'active' | 'inactive' | 'suspended' | 'deleted';
  account_created_at?: string;
  last_login_at?: string;
  total_orders_count?: number;
  total_orders_amount?: number;
  total_credit_balance?: number;
  linked_crm_client_id?: string;
  [key: string]: any;
}

export interface SiteWebOrder {
  id: string;
  order_id: string;
  user_id: string;
  order_date: string;
  service_type: string;
  service_title: string;
  service_formula?: string;
  order_price: number;
  order_status: string;
  [key: string]: any;
}

export class SiteWebService {
  /**
   * Récupère tous les clients site web
   */
  static async getAll(params?: { skip?: number; limit?: number; search?: string }): Promise<ApiResponse<SiteWebUser[]>> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    const endpoint = `/api/site-web/users${query ? `?${query}` : ''}`;
    
    return httpClient.get<SiteWebUser[]>(endpoint);
  }

  /**
   * Récupère un client site web par ID
   */
  static async getById(userId: string): Promise<ApiResponse<SiteWebUser>> {
    return httpClient.get<SiteWebUser>(`/api/site-web/users/${userId}`);
  }

  /**
   * Crée un nouveau client site web
   */
  static async create(userData: Partial<SiteWebUser>): Promise<ApiResponse<SiteWebUser>> {
    return httpClient.post<SiteWebUser>('/api/site-web/users', userData);
  }

  /**
   * Met à jour un client site web
   */
  static async update(userId: string, userData: Partial<SiteWebUser>): Promise<ApiResponse<SiteWebUser>> {
    return httpClient.put<SiteWebUser>(`/api/site-web/users/${userId}`, userData);
  }

  /**
   * Récupère les commandes d'un client
   */
  static async getUserOrders(userId: string, params?: { skip?: number; limit?: number }): Promise<ApiResponse<SiteWebOrder[]>> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    const endpoint = `/api/site-web/users/${userId}/orders${query ? `?${query}` : ''}`;
    
    return httpClient.get<SiteWebOrder[]>(endpoint);
  }

  /**
   * Récupère une commande par ID
   */
  static async getOrderById(orderId: string): Promise<ApiResponse<SiteWebOrder>> {
    return httpClient.get<SiteWebOrder>(`/api/site-web/orders/${orderId}`);
  }

  /**
   * Récupère les statistiques de parrainage d'un client
   */
  static async getReferralStats(userId: string): Promise<ApiResponse<any>> {
    return httpClient.get<any>(`/api/site-web/referrals/${userId}`);
  }

  /**
   * Récupère les crédits d'un client
   */
  static async getUserCredits(userId: string): Promise<ApiResponse<any>> {
    return httpClient.get<any>(`/api/site-web/users/${userId}/credits`);
  }
}
