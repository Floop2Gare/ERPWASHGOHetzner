/**
 * Service API pour la page TVA
 */

import { httpClient, ApiResponse } from '../utils/httpClient';
import type { VatSnapshot, VatHistoryPoint } from '../../pages/comptabilite/accountingTypes';

export interface AccountingVatData {
  snapshot: VatSnapshot;
  history: VatHistoryPoint[];
}

export class AccountingVatService {
  /**
   * Récupère les données TVA (snapshot et historique)
   */
  static async getVatData(): Promise<ApiResponse<AccountingVatData>> {
    const result = await httpClient.get<AccountingVatData>('/accounting/vat');
    if (!result.success) {
      // Retourner des données par défaut en cas d'erreur
      const now = new Date();
      const defaultSnapshot: VatSnapshot = {
        periodLabel: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        collected: 0,
        deductible: 0,
        declarationFrequency: 'Mensuelle',
        nextDeclarationDate: new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString(),
        lastDeclarationDate: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
        paymentDeadline: new Date(now.getFullYear(), now.getMonth() + 1, 30).toISOString(),
      };
      return {
        ...result,
        data: {
          snapshot: defaultSnapshot,
          history: [],
        },
      };
    }
    return result;
  }
}


