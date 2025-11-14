/**
 * Configuration de l'API Backend
 * Gère l'URL du backend et les paramètres de connexion
 */

// Configuration Backend pour déploiement sur serveur unique (Nginx proxy /api)
let BACKEND_URL: string | undefined = (import.meta as any).env?.VITE_BACKEND_URL;

if (!BACKEND_URL) {
  if (typeof window !== 'undefined') {
    BACKEND_URL = `${window.location.origin}/api`;
  } else {
    BACKEND_URL = 'http://localhost:8000';
  }
}

// Normalisation: pas de double slash en concaténation
if (BACKEND_URL.endsWith('/')) {
  BACKEND_URL = BACKEND_URL.slice(0, -1);
}

// Configuration de debug pour la production
export const DEBUG_MODE = (import.meta as any).env?.DEV || false;

export const getBackendUrl = (): string => BACKEND_URL || 'http://localhost:8000';

export const API_CONFIG = {
  baseUrl: BACKEND_URL || 'http://localhost:8000',
  timeout: 10000, // 10 secondes
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

