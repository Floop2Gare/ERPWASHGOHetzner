/**
 * Service API pour les Statistiques
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface StatsKpis {
  totalVolume: number;
  totalRevenue: number;
  averageTicket: number;
  totalDuration: number;
  revenuePerHour: number;
  uniqueClients: number;
}

export interface TrendPoint {
  label: string;
  start: string;
  end: string;
  revenue: number;
  volume: number;
  duration: number;
  averageTicket: number;
}

export interface CategoryBreakdown {
  category: string;
  revenue: number;
  volume: number;
  duration: number;
}

export interface CityStats {
  city: string;
  interventions: number;
  revenue: number;
  duration: number;
}

export interface StatsOverviewData {
  period: {
    start: string;
    end: string;
  };
  kpis: StatsKpis;
  trendData: TrendPoint[];
  categoryBreakdown: CategoryBreakdown[];
  cityStats: CityStats[];
  availableCities: string[];
}

export interface StatsOverviewParams {
  start?: string;
  end?: string;
  category?: string;
  city?: string;
}

export class StatsService {
  /**
   * Récupère les statistiques d'activité
   */
  static async getOverview(params?: StatsOverviewParams): Promise<ApiResponse<StatsOverviewData>> {
    const queryParams = new URLSearchParams();
    if (params?.start) queryParams.append('start', params.start);
    if (params?.end) queryParams.append('end', params.end);
    if (params?.category && params.category !== 'all') queryParams.append('category', params.category);
    if (params?.city && params.city !== 'all') queryParams.append('city', params.city);

    const url = `/stats/overview${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const result = await httpClient.get<StatsOverviewData>(url);
    
    if (!result.success) {
      return {
        ...result,
        data: {
          period: {
            start: params?.start || new Date().toISOString().split('T')[0],
            end: params?.end || new Date().toISOString().split('T')[0],
          },
          kpis: {
            totalVolume: 0,
            totalRevenue: 0,
            averageTicket: 0,
            totalDuration: 0,
            revenuePerHour: 0,
            uniqueClients: 0,
          },
          trendData: [],
          categoryBreakdown: [],
          cityStats: [],
          availableCities: [],
        },
      };
    }
    return result;
  }
}

