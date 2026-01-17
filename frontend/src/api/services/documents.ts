/**
 * Service API pour les Documents
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface DocumentRecord {
  id: string;
  title: string;
  category: string;
  description: string;
  updatedAt: string;
  owner: string;
  companyId: string | null;
  tags: string[];
  source: 'manual' | 'generated';
  url?: string;
  fileType?: string;
  size?: string;
  fileName?: string;
  fileData?: string;
  kind?: 'facture' | 'devis' | 'autre';
}

export class DocumentService {
  /**
   * Récupère tous les documents
   */
  static async getAll(): Promise<ApiResponse<DocumentRecord[]>> {
    const result = await httpClient.get<DocumentRecord[]>('/documents');
    if (!result.success) {
      return {
        ...result,
        data: [],
      };
    }
    return result;
  }

  /**
   * Récupère un document par son ID
   */
  static async getById(id: string): Promise<ApiResponse<DocumentRecord>> {
    return httpClient.get<DocumentRecord>(`/documents/${id}`);
  }

  /**
   * Crée un nouveau document
   */
  static async create(document: Omit<DocumentRecord, 'id'> & { id?: string }): Promise<ApiResponse<DocumentRecord>> {
    return httpClient.post<DocumentRecord>('/documents', document);
  }

  /**
   * Met à jour un document existant
   */
  static async update(id: string, document: Partial<DocumentRecord>): Promise<ApiResponse<DocumentRecord>> {
    return httpClient.put<DocumentRecord>(`/documents/${id}`, document);
  }

  /**
   * Supprime un document
   */
  static async delete(id: string): Promise<ApiResponse<void>> {
    return httpClient.delete<void>(`/documents/${id}`);
  }
}

