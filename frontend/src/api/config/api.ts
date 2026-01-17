/**
 * Configuration de l'API Backend
 * Gère l'URL du backend et les paramètres de connexion
 */

export const DEBUG_MODE = (import.meta as any).env?.DEV || false;

export const API_CONFIG = {
  timeout: 10000, // 10 secondes
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

/**
 * URL de base du backend (utile pour afficher l'URL courante dans les diagnostics)
 * Note: En dev, les requêtes passent par le proxy Vite sur /api, mais cette valeur
 * sert uniquement d'information et de fallback neutre.
 */
export function getBackendUrl(): string {
  try {
    const { protocol, hostname } = window.location;
    const port = 8000;
    return `${protocol}//${hostname}:${port}`;
  } catch {
    // Fallback pour environnements non-navigateur (tests, SSR éventuel)
    return 'http://127.0.0.1:8000';
  }
}


