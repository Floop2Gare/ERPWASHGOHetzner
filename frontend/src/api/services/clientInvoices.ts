/**
 * Service API pour les Factures Clients
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface ClientInvoice {
  id?: string;
  number: string;
  clientId: string;
  clientName: string;
  companyId?: string | null;
  companyName?: string;
  engagementId?: string | null;
  issueDate: string;
  dueDate?: string | null;
  amountHt: number;
  amountTtc: number;
  vatAmount?: number;
  vatRate?: number;
  vatEnabled: boolean;
  status: 'brouillon' | 'envoyé' | 'accepté' | 'refusé' | 'payé';
  [key: string]: any;
}

export class ClientInvoiceService {
  /**
   * Crée une nouvelle facture client
   */
  static async create(invoiceData: ClientInvoice): Promise<ApiResponse<ClientInvoice>> {
    return httpClient.post<ClientInvoice>('/client-invoices/', invoiceData);
  }

  /**
   * Récupère toutes les factures clients
   */
  static async getAll(): Promise<ApiResponse<ClientInvoice[]>> {
    const result = await httpClient.get<ClientInvoice[]>('/client-invoices/');
    if (!result.success) {
      return { ...result, data: [] };
    }
    return result;
  }

  /**
   * Récupère une facture client par ID
   */
  static async getById(invoiceId: string): Promise<ApiResponse<ClientInvoice>> {
    return httpClient.get<ClientInvoice>(`/client-invoices/${invoiceId}`);
  }

  /**
   * Met à jour une facture client
   */
  static async update(invoiceId: string, invoiceData: ClientInvoice): Promise<ApiResponse<ClientInvoice>> {
    return httpClient.put<ClientInvoice>(`/client-invoices/${invoiceId}`, invoiceData);
  }

  /**
   * Supprime une facture client
   */
  static async delete(invoiceId: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/client-invoices/${invoiceId}`);
  }
}


