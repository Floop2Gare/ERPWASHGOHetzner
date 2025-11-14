/**
 * Client HTTP réutilisable pour les appels API
 * Gère les erreurs, les timeouts et la normalisation des réponses
 */

import { getBackendUrl, API_CONFIG } from '../config/api';
import { logError, logRequest, logResponse } from './logger';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Gère les réponses HTTP avec gestion d'erreurs détaillée
 */
const handleHttpResponse = async (response: Response, context: string): Promise<any> => {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  
  let data: any;
  try {
    data = isJson ? await response.json() : await response.text();
  } catch (error) {
    console.error(`[${context}] Erreur de parsing de la réponse:`, error);
    throw new Error(`Erreur de parsing de la réponse HTTP ${response.status}`);
  }

  logResponse(context, response.status, data);

  // Gestion des erreurs spécifiques
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    if (response.status === 422) {
      errorMessage = 'Erreur de validation des données (422)';
      if (data && data.detail) {
        errorMessage += `: ${JSON.stringify(data.detail)}`;
      }
    } else if (response.status === 404) {
      errorMessage = 'Ressource non trouvée (404)';
    } else if (response.status === 500) {
      errorMessage = 'Erreur serveur interne (500)';
    } else if (response.status === 0) {
      errorMessage = 'Erreur réseau: Impossible de joindre le serveur';
    }
    
    throw new Error(errorMessage);
  }

  return data;
};

/**
 * Effectue une requête HTTP
 */
async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = API_CONFIG.timeout,
  } = options;

  const url = `${getBackendUrl()}${endpoint}`;
  
  try {
    logRequest(method, url, body);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method,
      headers: {
        ...API_CONFIG.headers,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await handleHttpResponse(response, `httpClient.${method}`);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      throw new Error(result.error || `Erreur lors de la requête ${method} ${endpoint}`);
    }
  } catch (error: any) {
    logError(`httpClient.${method}`, error);

    // Gestion spécifique des erreurs
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: `Timeout: Le backend ne répond pas dans les ${timeout}ms`,
      };
    }

    if (error.message.includes('Failed to fetch')) {
      return {
        success: false,
        error: 'Erreur réseau: Impossible de joindre le backend',
      };
    }

    return {
      success: false,
      error: error.message || 'Erreur inconnue',
    };
  }
}

/**
 * Client HTTP pour les appels API
 */
export const httpClient = {
  /**
   * Effectue une requête HTTP
   */
  request,

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { ...options, method: 'POST', body });
  },

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { ...options, method: 'PUT', body });
  },

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { ...options, method: 'PATCH', body });
  },
};

