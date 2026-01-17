import { useEffect, useState, useCallback, useRef } from 'react';
import { UserBackpackService, type UserBackpack } from '../api/services/userBackpack';
import { useAppData } from '../store/useAppData';
import { AuthService } from '../api';

export const useUserBackpack = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backpack, setBackpack] = useState<UserBackpack | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const hydrateBackpack = useAppData((state) => state.hydrateFromBackpack);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  
  const loadBackpack = useCallback(async () => {
    console.log('📦 [loadBackpack] Appelé', {
      __loadingUserBackpack: (window as any).__loadingUserBackpack,
      isLoadingRef: isLoadingRef.current,
      isAuthenticated: AuthService.isAuthenticated()
    });
    
    // Protection globale pour éviter les appels multiples même si le hook est monté plusieurs fois
    if ((window as any).__loadingUserBackpack) {
      console.log('⚠️ [loadBackpack] DÉJÀ EN COURS - IGNORÉ');
      return;
    }
    
    // Éviter les appels multiples simultanés
    if (isLoadingRef.current) {
      console.log('⚠️ [loadBackpack] isLoadingRef.current = true - IGNORÉ');
      return;
    }
    
    if (!AuthService.isAuthenticated()) {
      console.log('⚠️ [loadBackpack] NON AUTHENTIFIÉ - IGNORÉ');
      setIsLoading(false);
      return;
    }
    
    console.log('🚀 [loadBackpack] DÉMARRAGE DU CHARGEMENT API');
    (window as any).__loadingUserBackpack = true;
    isLoadingRef.current = true;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await UserBackpackService.loadBackpack();
      console.log('📥📥📥 [loadBackpack] Réponse API complète:', JSON.stringify(result, null, 2));
      console.log('📥📥📥 [loadBackpack] result.success:', result.success);
      console.log('📥📥📥 [loadBackpack] result.data:', result.data);
      console.log('📥📥📥 [loadBackpack] result.data.companies:', result.data?.companies);
      console.log('📥📥📥 [loadBackpack] Type de result.data.companies:', typeof result.data?.companies);
      console.log('📥📥📥 [loadBackpack] Est un array?:', Array.isArray(result.data?.companies));
      console.log('📥📥📥 [loadBackpack] Nombre d\'entreprises:', Array.isArray(result.data?.companies) ? result.data.companies.length : 'N/A');
      
      if (result.success && result.data) {
        console.log('📥📥📥 [loadBackpack] Appel hydrateBackpack avec:', result.data);
        hydrateBackpack(result.data);
        setBackpack(result.data);
        setLastRefresh(new Date());
        console.log('📥📥📥 [loadBackpack] hydrateBackpack appelé, backpack mis à jour');
      } else {
        console.error('❌❌❌ [loadBackpack] Erreur:', result.error || 'Erreur lors du chargement');
        setError(result.error || 'Erreur lors du chargement');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du sac à dos:', error);
      setError('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      // Libérer le verrou immédiatement après le chargement
      (window as any).__loadingUserBackpack = false;
    }
  }, [hydrateBackpack]);
  
  useEffect(() => {
    console.log('🔵 [useUserBackpack] useEffect déclenché', {
      hasLoadedRef: hasLoadedRef.current,
      __userBackpackLoaded: (window as any).__userBackpackLoaded,
      __loadingUserBackpack: (window as any).__loadingUserBackpack,
      stack: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });
    
    // Protection globale STRICTE - ne charger qu'une seule fois pour toute l'application
    if ((window as any).__userBackpackLoaded) {
      console.log('🟢 [useUserBackpack] DÉJÀ CHARGÉ - IGNORÉ');
      setIsLoading(false);
      return;
    }
    
    if ((window as any).__loadingUserBackpack) {
      console.log('🟡 [useUserBackpack] EN COURS DE CHARGEMENT - IGNORÉ');
      return;
    }
    
    console.log('🔴 [useUserBackpack] DÉMARRAGE DU CHARGEMENT');
    // Marquer comme en cours de chargement AVANT de charger
    (window as any).__loadingUserBackpack = true;
    hasLoadedRef.current = true;
    
    loadBackpack().then(() => {
      console.log('✅ [useUserBackpack] CHARGEMENT RÉUSSI');
      // Marquer comme chargé seulement après succès
      (window as any).__userBackpackLoaded = true;
    }).catch(() => {
      console.log('❌ [useUserBackpack] ERREUR DE CHARGEMENT');
      // En cas d'erreur, permettre de réessayer
      (window as any).__userBackpackLoaded = false;
      hasLoadedRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Charger une seule fois au montage
  
  return { 
    isLoading, 
    error, 
    backpack, 
    lastRefresh,
    refresh: loadBackpack 
  };
};

