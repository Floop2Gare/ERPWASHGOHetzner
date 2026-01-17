/**
 * Utilitaires pour la gestion du localStorage
 * Centralise l'accès au localStorage pour éviter les duplications
 */

/**
 * Clés de stockage utilisées dans l'application
 */
export const StorageKeys = {
  ACCESS_TOKEN: 'erp_washgo_access_token',
  ACTIVE_COMPANY_ID: 'erp_active_company_id',
} as const;

/**
 * Récupère une valeur du localStorage
 * 
 * @param key - Clé de stockage
 * @returns Valeur stockée ou null si non trouvée ou en environnement non-navigateur
 */
export const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`[storage] Erreur lors de la récupération de ${key}:`, error);
    return null;
  }
};

/**
 * Stocke une valeur dans le localStorage
 * 
 * @param key - Clé de stockage
 * @param value - Valeur à stocker
 */
export const setStorageItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`[storage] Erreur lors du stockage de ${key}:`, error);
  }
};

/**
 * Supprime une valeur du localStorage
 * 
 * @param key - Clé de stockage
 */
export const removeStorageItem = (key: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[storage] Erreur lors de la suppression de ${key}:`, error);
  }
};

/**
 * Récupère le token d'authentification
 */
export const getAuthToken = (): string | null => {
  return getStorageItem(StorageKeys.ACCESS_TOKEN);
};

/**
 * Stocke le token d'authentification
 */
export const setAuthToken = (token: string): void => {
  setStorageItem(StorageKeys.ACCESS_TOKEN, token);
};

/**
 * Supprime le token d'authentification
 */
export const removeAuthToken = (): void => {
  removeStorageItem(StorageKeys.ACCESS_TOKEN);
};

/**
 * Récupère l'ID de l'entreprise active
 */
export const getActiveCompanyId = (): string | null => {
  return getStorageItem(StorageKeys.ACTIVE_COMPANY_ID);
};

/**
 * Stocke l'ID de l'entreprise active
 */
export const setActiveCompanyId = (companyId: string): void => {
  setStorageItem(StorageKeys.ACTIVE_COMPANY_ID, companyId);
};

/**
 * Supprime l'ID de l'entreprise active
 */
export const removeActiveCompanyId = (): void => {
  removeStorageItem(StorageKeys.ACTIVE_COMPANY_ID);
};



