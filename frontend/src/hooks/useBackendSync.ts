/**
 * Hook pour la synchronisation avec le Backend
 * Architecture: Frontend → Backend (API Postgres)
 */

import { useEffect, useCallback } from 'react';
import { useAppData } from '../store/useAppData';
import { 
  ClientService, 
  ServiceService, 
  AppointmentService, 
  CompanyService,
  HealthService as BackendHealthService 
} from '../api';

export function useBackendSync() {
  const {
    companies,
    clients,
    services,
    engagements,
    // Synchronisation automatique désactivée pour l'instant
    // leads,
    // purchases,
    // vehicles,
    // documents,
    // authUsers
  } = useAppData();

  /**
   * Tester la connexion au backend
   */
  const testBackendConnection = useCallback(async () => {
    try {
      console.log('[BackendSync] Test de connexion au backend...');
      const result = await BackendHealthService.testConnection();
      
      if (result.success) {
        console.log('[BackendSync] ✅ Connexion backend OK');
        return true;
      } else {
        console.error('[BackendSync] ❌ Erreur de connexion backend:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[BackendSync] ❌ Erreur de test de connexion:', error);
      return false;
    }
  }, []);

  /**
   * Synchroniser les entreprises
   */
  const syncCompanies = useCallback(async () => {
    try {
      console.log('[BackendSync] Synchronisation des entreprises...');
      
      for (const company of companies) {
        // Essayer d'abord de récupérer l'entreprise
        const existingResult = await CompanyService.getCompanies();
        
        if (existingResult.success && existingResult.data.some(c => c.id === company.id)) {
          // L'entreprise existe, la mettre à jour
          const result = await CompanyService.updateCompany(company.id, company);
          if (result.success) {
            console.log('[BackendSync] ✅ Entreprise mise à jour:', company.id);
          } else {
            console.error('[BackendSync] ❌ Erreur mise à jour entreprise:', result.error);
          }
        } else {
          // L'entreprise n'existe pas, la créer
          const result = await CompanyService.createCompany(company);
          if (result.success) {
            console.log('[BackendSync] ✅ Entreprise créée:', company.id);
          } else {
            console.error('[BackendSync] ❌ Erreur création entreprise:', result.error);
          }
        }
      }
    } catch (error) {
      console.error('[BackendSync] ❌ Erreur de synchronisation des entreprises:', error);
    }
  }, [companies]);

  /**
   * Synchroniser les clients
   */
  const syncClients = useCallback(async () => {
    try {
      console.log('[BackendSync] Synchronisation des clients...');
      
      for (const client of clients) {
        const result = await ClientService.updateClient(client.id, client);
        
        if (result.success) {
          console.log('[BackendSync] ✅ Client synchronisé:', client.id);
        } else {
          console.error('[BackendSync] ❌ Erreur sync client:', result.error);
        }
      }
    } catch (error) {
      console.error('[BackendSync] ❌ Erreur de synchronisation des clients:', error);
    }
  }, [clients]);

  /**
   * Synchroniser les services
   */
  const syncServices = useCallback(async () => {
    try {
      console.log('[BackendSync] Synchronisation des services...');
      
      for (const service of services) {
        const result = await ServiceService.updateService(service.id, service);
        
        if (result.success) {
          console.log('[BackendSync] ✅ Service synchronisé:', service.id);
        } else {
          console.error('[BackendSync] ❌ Erreur sync service:', result.error);
        }
      }
    } catch (error) {
      console.error('[BackendSync] ❌ Erreur de synchronisation des services:', error);
    }
  }, [services]);

  /**
   * Synchroniser les engagements
   */
  const syncEngagements = useCallback(async () => {
    try {
      console.log('[BackendSync] Synchronisation des engagements...');
      
      for (const engagement of engagements) {
        const result = await AppointmentService.updateAppointment(engagement.id, engagement);
        
        if (result.success) {
          console.log('[BackendSync] ✅ Engagement synchronisé:', engagement.id);
        } else {
          console.error('[BackendSync] ❌ Erreur sync engagement:', result.error);
        }
      }
    } catch (error) {
      console.error('[BackendSync] ❌ Erreur de synchronisation des engagements:', error);
    }
  }, [engagements]);

  /**
   * Synchronisation complète avec throttling - COMPLÈTEMENT DÉSACTIVÉE
   */
  const syncWithThrottling = useCallback(async () => {
    console.log('[BackendSync] Synchronisation COMPLÈTEMENT DÉSACTIVÉE');
    console.log('[BackendSync] Test de connexion uniquement...');
    
    try {
      // Test de connexion seulement
      const isConnected = await testBackendConnection();
      if (isConnected) {
        console.log('[BackendSync] ✅ Connexion backend OK - Synchronisation désactivée');
      } else {
        console.warn('[BackendSync] ❌ Connexion backend échouée');
      }
    } catch (error) {
      console.error('[BackendSync] ❌ Erreur de test de connexion:', error);
    }
  }, [testBackendConnection]);

  /**
   * Synchronisation automatique au montage du composant - TEMPORAIREMENT DÉSACTIVÉE
   */
  useEffect(() => {
    // Vérifier si on a déjà testé la connexion (protection globale)
    if ((window as any).__backendConnectionTested) {
      return;
    }
    (window as any).__backendConnectionTested = true;
    
    // Test de connexion seulement, une seule fois
    const testConnection = setTimeout(async () => {
      await testBackendConnection();
    }, 2000);

    return () => {
      clearTimeout(testConnection);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Une seule fois au montage

  /**
   * Synchronisation immédiate quand les données changent - DÉSACTIVÉE
   */
  useEffect(() => {
    // Synchronisation désactivée - Les données sont gérées directement via les appels API
    // Ce message est informatif uniquement, pas une erreur
    if (companies.length > 0 || clients.length > 0 || services.length > 0 || engagements.length > 0) {
      // Message silencieux - les données sont gérées via les appels API directs
      // console.log('[BackendSync] Données détectées, mais synchronisation DÉSACTIVÉE');
      // syncWithThrottling(); // DÉSACTIVÉ - Les données sont synchronisées via les appels API
    }
  }, [companies.length, clients.length, services.length, engagements.length]);

  return {
    testBackendConnection,
    syncCompanies,
    syncClients,
    syncServices,
    syncEngagements,
    syncWithThrottling
  };
}
