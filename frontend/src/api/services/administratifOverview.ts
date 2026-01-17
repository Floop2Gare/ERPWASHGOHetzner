/**
 * Service API pour la Vue d'ensemble Administrative
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface AdministratifStat {
  label: string;
  value: string;
  hint: string;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  category: string;
  owner: string;
  tags: string[];
  nextReview: string | null;
  daysRemaining: number | null;
}

export interface SupplierHighlight {
  vendor: string;
  purchaseCount: number;
  totalTtc: number;
  lastPurchase: string | null;
  categories: string[];
}

export interface HrFocus {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  lastPasswordUpdate: string | null;
}

export interface AdministratifOverviewData {
  stats: AdministratifStat[];
  upcomingDeadlines: UpcomingDeadline[];
  supplierHighlights: SupplierHighlight[];
  hrFocus: HrFocus[];
}

export class AdministratifOverviewService {
  /**
   * Récupère les données de la vue d'ensemble administrative
   */
  static async getOverview(): Promise<ApiResponse<AdministratifOverviewData>> {
    const result = await httpClient.get<AdministratifOverviewData>('/administratif/overview');
    
    if (!result.success) {
      return {
        ...result,
        data: {
          stats: [],
          upcomingDeadlines: [],
          supplierHighlights: [],
          hrFocus: [],
        },
      };
    }
    return result;
  }
}

