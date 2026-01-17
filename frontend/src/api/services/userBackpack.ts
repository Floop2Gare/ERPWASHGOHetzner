import { httpClient, type ApiResponse } from '../utils/httpClient';

export interface UserBackpack {
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    companyId: string | null;
    pages: (string | '*')[];
    permissions: (string | '*')[];
    active: boolean;
    profile?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      role?: string;
      avatarUrl?: string;
      password?: string;
      emailSignatureHtml?: string;
      emailSignatureUseDefault?: boolean;
      emailSignatureUpdatedAt?: string;
    };
    notificationPreferences?: {
      emailAlerts?: boolean;
      internalAlerts?: boolean;
      smsAlerts?: boolean;
    };
  };
  company: BackendCompany | null;
  companies: BackendCompany[];
  settings: {
    vatEnabled: boolean;
    vatRate: number;
  };
  stats: {
    totalClients?: number;
    totalClientInvoices?: number;
    totalVendorInvoices?: number;
    totalPurchases?: number;
    totalServices?: number;
  };
}

export interface BackendCompany {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  siret?: string;
  vatNumber?: string;
  legalNotes?: string;
  vatEnabled?: boolean;
  vatRate?: number;
  website?: string;
  isDefault?: boolean;
  documentHeaderTitle?: string;
  documentHeaderSubtitle?: string;
  documentHeaderNote?: string;
  logoUrl?: string;
  invoiceLogoUrl?: string;
  bankName?: string;
  bankAddress?: string;
  iban?: string;
  bic?: string;
  planningUser?: string | null;
  [key: string]: any;
}

export class UserBackpackService {
  /**
   * Charge toutes les données essentielles pour l'utilisateur
   */
  static async loadBackpack(): Promise<ApiResponse<UserBackpack>> {
    // Utiliser httpClient qui gère automatiquement le préfixe /api et l'authentification
    return await httpClient.get<UserBackpack>('/user/backpack');
  }
}

