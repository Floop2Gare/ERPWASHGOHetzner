/**
 * Hook personnalisé pour créer des Maps d'entités pour accès rapide
 * Évite la duplication du code useMemo pour clientsById, servicesById, etc.
 */

import { useMemo } from 'react';

/**
 * Crée une Map pour accès rapide aux entités par leur ID
 * 
 * @param entities - Tableau d'entités avec une propriété `id`
 * @returns Map<string, T> - Map indexée par ID
 * 
 * @example
 * const clientsById = useEntityMaps(clients);
 * const client = clientsById.get(clientId);
 */
export function useEntityMaps<T extends { id: string }>(
  entities: T[]
): Map<string, T> {
  return useMemo(() => {
    const map = new Map<string, T>();
    entities.forEach((entity) => {
      map.set(entity.id, entity);
    });
    return map;
  }, [entities]);
}

/**
 * Crée plusieurs Maps en une seule fois pour éviter plusieurs useMemo
 * 
 * @param entitiesMap - Objet avec des tableaux d'entités
 * @returns Objet avec les Maps correspondantes
 * 
 * @example
 * const { clientsById, servicesById, companiesById } = useMultipleEntityMaps({
 *   clientsById: clients,
 *   servicesById: services,
 *   companiesById: companies,
 * });
 */
export function useMultipleEntityMaps<T extends { id: string }>(
  entitiesMap: Record<string, T[]>
): Record<string, Map<string, T>> {
  return useMemo(() => {
    const result: Record<string, Map<string, T>> = {};
    Object.entries(entitiesMap).forEach(([key, entities]) => {
      const map = new Map<string, T>();
      entities.forEach((entity) => {
        map.set(entity.id, entity);
      });
      result[key] = map;
    });
    return result;
  }, [entitiesMap]);
}



