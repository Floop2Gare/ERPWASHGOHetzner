/**
 * Utilitaires de logging pour l'API
 */

import { DEBUG_MODE } from '../config/api';

export const logError = (context: string, error: any) => {
  if (DEBUG_MODE) {
    console.error(`[${context}]`, error);
  }
};

export const logRequest = (method: string, url: string, data?: any) => {
  if (DEBUG_MODE) {
    console.log(`[API] ${method} ${url}`, data ? { data } : '');
  }
};

export const logResponse = (context: string, status: number, data: any) => {
  if (DEBUG_MODE) {
    console.group(`[${context}] Réponse HTTP ${status}`);
    console.log('Status:', status);
    console.log('Data:', data);
    console.groupEnd();
  }
};


