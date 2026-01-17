/**
 * Service API pour les Factures Fournisseurs
 */

import { httpClient, ApiResponse } from '../utils/httpClient';
import type { VendorInvoice } from '../../pages/comptabilite/accountingTypes';

export class VendorInvoiceService {
  /**
   * Crée une nouvelle facture fournisseur
   */
  static async create(invoiceData: VendorInvoice): Promise<ApiResponse<VendorInvoice>> {
    return httpClient.post<VendorInvoice>('/vendor-invoices/', invoiceData);
  }

  /**
   * Récupère toutes les factures fournisseurs
   */
  static async getAll(): Promise<ApiResponse<VendorInvoice[]>> {
    const result = await httpClient.get<VendorInvoice[]>('/vendor-invoices/');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Récupère une facture fournisseur par ID
   */
  static async getById(invoiceId: string): Promise<ApiResponse<VendorInvoice>> {
    return httpClient.get<VendorInvoice>(`/vendor-invoices/${invoiceId}`);
  }

  /**
   * Met à jour une facture fournisseur
   */
  static async update(invoiceId: string, invoiceData: VendorInvoice): Promise<ApiResponse<VendorInvoice>> {
    return httpClient.put<VendorInvoice>(`/vendor-invoices/${invoiceId}`, invoiceData);
  }

  /**
   * Supprime une facture fournisseur
   */
  static async delete(invoiceId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/vendor-invoices/${invoiceId}`);
  }
}



