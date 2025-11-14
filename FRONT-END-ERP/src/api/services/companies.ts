/**
 * Service API pour les Entreprises
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface Company {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  [key: string]: any;
}

export class CompanyService {
  /**
   * Crée une nouvelle entreprise
   */
  static async create(companyData: Company): Promise<ApiResponse<Company>> {
    return httpClient.post<Company>('/companies/', companyData);
  }

  /**
   * Crée une nouvelle entreprise (alias pour compatibilité)
   */
  static async createCompany(companyData: Company): Promise<ApiResponse<Company>> {
    return this.create(companyData);
  }

  /**
   * Récupère toutes les entreprises
   */
  static async getAll(): Promise<ApiResponse<Company[]>> {
    const result = await httpClient.get<Company[]>('/companies/');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Récupère toutes les entreprises (alias pour compatibilité)
   */
  static async getCompanies(): Promise<ApiResponse<Company[]>> {
    return this.getAll();
  }

  /**
   * Récupère une entreprise par ID
   */
  static async getById(companyId: string): Promise<ApiResponse<Company>> {
    return httpClient.get<Company>(`/companies/${companyId}`);
  }

  /**
   * Met à jour une entreprise
   */
  static async update(companyId: string, companyData: Company): Promise<ApiResponse<Company>> {
    return httpClient.put<Company>(`/companies/${companyId}`, companyData);
  }

  /**
   * Met à jour une entreprise (alias pour compatibilité)
   */
  static async updateCompany(companyId: string, companyData: Company): Promise<ApiResponse<Company>> {
    return this.update(companyId, companyData);
  }
}

