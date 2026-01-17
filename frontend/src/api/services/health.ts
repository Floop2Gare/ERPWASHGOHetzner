/**
 * Service API pour la santé du backend
 */

import { httpClient, ApiResponse } from '../utils/httpClient';
import { getBackendUrl } from '../config/api';

export interface HealthStatus {
  status?: string;
  [key: string]: any;
}

export class HealthService {
  /**
   * Teste la connexion au backend
   */
  static async testConnection(): Promise<ApiResponse<HealthStatus> & { url?: string }> {
    try {
      const result = await httpClient.get<HealthStatus>('/health');
      
      // Accepter les deux formats de réponse
      if (result.success || (result.data as any)?.status === 'ok') {
        return {
          ...result,
          url: getBackendUrl(),
        };
      }
      
      return {
        ...result,
        url: getBackendUrl(),
        error: result.error || 'Erreur de connexion au backend',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur de connexion au backend',
        url: getBackendUrl(),
      };
    }
  }
}


