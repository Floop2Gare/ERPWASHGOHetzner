/**
 * Client HTTP réutilisable pour les appels API
 * Stratégie: endpoints relatifs via proxy Vite en dev, /api en prod (reverse proxy)
 */

import { API_CONFIG } from '../config/api';
import { logError, logRequest, logResponse } from './logger';
import { AuthService } from '../services/auth';

/**
 * Récupère le token d'authentification depuis le localStorage
 */
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('erp_washgo_access_token');
  }
  return null;
};

/**
 * Récupère l'ID de l'entreprise active depuis le store ou localStorage
 */
const getActiveCompanyId = (): string | null => {
  if (typeof window !== 'undefined') {
    // Essayer d'abord depuis localStorage (plus rapide)
    const stored = localStorage.getItem('erp_active_company_id');
    if (stored) {
      return stored;
    }
    // Sinon, essayer depuis le store (nécessite un import dynamique)
    try {
      // Import dynamique pour éviter les dépendances circulaires
      const { useAppData } = require('../../store/useAppData');
      const state = useAppData.getState();
      return state.activeCompanyId || null;
    } catch (error) {
      // Si le store n'est pas disponible, retourner null
      return null;
    }
  }
  return null;
};

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
const handleHttpResponse = async (response: Response, context: string, url?: string): Promise<any> => {
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
    // Gestion spéciale des erreurs 401 (non autorisé / token expiré)
    if (response.status === 401) {
      // Ne déconnecter que si ce n'est pas une requête vers /auth/login
      // Pour /auth/me, on laisse AuthService.getCurrentUser gérer la déconnexion
      const requestUrl = url || '';
      const responseUrl = response.url || '';
      const isLoginEndpoint = requestUrl.includes('/auth/login') || responseUrl.includes('/auth/login');
      const isLoginPage = typeof window !== 'undefined' && (window.location.pathname.includes('/connexion') || window.location.pathname.includes('/mobile/login'));
      
      // Si on est sur la page de login, ne pas afficher l'erreur (c'est normal)
      if (isLoginPage) {
        // Retourner une réponse vide pour éviter les erreurs dans la console
        return { success: false, data: null, error: 'Non authentifié' };
      }
      
      if (!isLoginEndpoint) {
        // Déconnecter l'utilisateur via AuthService
        AuthService.logout();
        
        // Rediriger vers la page de connexion si on n'y est pas déjà
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/connexion') && !window.location.pathname.includes('/mobile/login')) {
          // Utiliser un timeout pour éviter les boucles de redirection
          setTimeout(() => {
            window.location.href = '/connexion';
          }, 100);
        }
      }
      
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
    
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    if (response.status === 422) {
      errorMessage = 'Erreur de validation des données (422)';
      if (data && data.detail) {
        errorMessage += `: ${JSON.stringify(data.detail)}`;
      }
    } else if (response.status === 409) {
      // Conflit - utilisateur ou ressource déjà existante
      errorMessage = data?.detail || "Cette ressource existe déjà (409)";
    } else if (response.status === 404) {
      errorMessage = 'Ressource non trouvée (404)';
    } else if (response.status === 500) {
      errorMessage = 'Erreur serveur interne (500)';
    } else if (response.status === 0) {
      errorMessage = 'Erreur réseau: Impossible de joindre le serveur';
    } else if (data && data.detail) {
      // Utiliser le message d'erreur du backend si disponible
      errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
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

  // Normaliser endpoint → toujours relatif et préfixé par /api
  let normalizedEndpoint = endpoint || '/';
  if (!normalizedEndpoint.startsWith('/')) {
    normalizedEndpoint = `/${normalizedEndpoint}`;
  }
  if (!normalizedEndpoint.startsWith('/api')) {
    normalizedEndpoint = `/api${normalizedEndpoint}`;
  }
  const url = normalizedEndpoint;
  const isAuthEndpoint = normalizedEndpoint.includes('/auth/login');
  
  const serializedBody = body ? JSON.stringify(body) : undefined;

  const performFetch = async (): Promise<Response> => {
    // Ajouter le token d'authentification si disponible
    const token = getAuthToken();

    const authHeaders: Record<string, string> = {};
    if (token && token.trim() && !headers.Authorization) {
      authHeaders.Authorization = `Bearer ${token.trim()}`;
      console.log(`[httpClient] Token ajouté pour ${method} ${url} (longueur: ${token.length})`);
    } else if (!token && !isAuthEndpoint && !url.includes('/health')) {
      console.warn(`[httpClient] Pas de token pour ${method} ${url}`);
    } else if (token && !token.trim()) {
      console.warn(`[httpClient] Token vide pour ${method} ${url}`);
    }
    
    // Ajouter l'ID de l'entreprise active dans les headers
    const activeCompanyId = getActiveCompanyId();
    if (activeCompanyId && !headers['X-Active-Company-Id']) {
      authHeaders['X-Active-Company-Id'] = activeCompanyId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...API_CONFIG.headers,
          ...authHeaders,
          ...headers,
        },
        body: serializedBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  try {
    logRequest(method, url, body);

    const response = await performFetch();

    const result = await handleHttpResponse(response, `httpClient.${method}`, url);

    // Normalisation: si l'API ne renvoie pas { success, data }, on l'enveloppe
    if (result && typeof result === 'object' && 'success' in result) {
      if (result.success) {
        const payload =
          typeof (result as any).data !== 'undefined' && (result as any).data !== null
            ? (result as any).data
            : result;
        return { success: true, data: payload };
      }
      throw new Error(result.error || `Erreur lors de la requête ${method} ${endpoint}`);
    }
    // Réponse brute (ex: /health) → considérer OK
    return { success: true, data: result };
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

