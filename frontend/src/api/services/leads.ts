/**
 * Service API pour les Leads
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface Lead {
  id?: string;
  company: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status?: string;
  [key: string]: any;
}

export class LeadService {
  /**
   * Crée un nouveau lead
   */
  static async create(leadData: Lead): Promise<ApiResponse<Lead>> {
    return httpClient.post<Lead>('/leads/', leadData);
  }

  /**
   * Récupère tous les leads
   */
  static async getAll(): Promise<ApiResponse<Lead[]>> {
    const result = await httpClient.get<Lead[]>('/leads/');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Met à jour un lead
   */
  static async update(leadId: string, leadData: Lead): Promise<ApiResponse<Lead>> {
    const result = await httpClient.put<Lead>(`/leads/${leadId}`, leadData);
    if (!result.success && result.error?.includes('404')) {
      return this.create(leadData);
    }
    return result;
  }

  /**
   * Supprime un lead
   */
  static async delete(leadId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/leads/${leadId}`);
  }

  /**
   * Transfère un lead vers une autre entreprise
   */
  static async transfer(leadId: string, targetCompanyId: string): Promise<ApiResponse<Lead>> {
    return httpClient.post<Lead>(`/leads/${leadId}/transfer`, { targetCompanyId });
  }
}


