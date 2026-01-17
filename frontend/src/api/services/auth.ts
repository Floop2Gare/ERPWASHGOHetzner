/**
 * Service API pour l'Authentification
 */

import { httpClient, ApiResponse } from '../utils/httpClient';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName?: string;
  email?: string;
  role?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
    active: boolean;
  };
}

export interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: string;
  active: boolean;
}

export class AuthService {
  private static readonly TOKEN_KEY = 'erp_washgo_access_token';
  private static readonly USER_KEY = 'erp_washgo_user';

  /**
   * Stocke le token dans le localStorage
   */
  static setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  /**
   * Récupère le token depuis le localStorage
   */
  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  /**
   * Supprime le token du localStorage
   */
  static removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  /**
   * Stocke les informations utilisateur
   */
  static setUser(user: UserInfo): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * Récupère les informations utilisateur
   */
  static getUser(): UserInfo | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(this.USER_KEY);
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  static isAuthenticated(): boolean {
    return this.getToken() !== null;
  }


  /**
   * Connexion d'un utilisateur
   */
  static async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const result = await httpClient.post<AuthResponse>('/auth/login', credentials);
    
    if (result.success && result.data) {
      this.setToken(result.data.access_token);
      this.setUser(result.data.user);
    }
    
    return result;
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  static async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const result = await httpClient.post<AuthResponse>('/auth/register', data);
    
    if (result.success && result.data) {
      this.setToken(result.data.access_token);
      this.setUser(result.data.user);
    }
    
    return result;
  }

  /**
   * Récupère les informations de l'utilisateur actuel
   */
  static async getCurrentUser(): Promise<ApiResponse<UserInfo>> {
    const token = this.getToken();
    if (!token) {
      return {
        success: false,
        error: 'Non authentifié',
        data: null,
      };
    }

    try {
      // Le token sera ajouté automatiquement par httpClient
      const result = await httpClient.get<UserInfo>('/auth/me');

      if (result.success && result.data) {
        this.setUser(result.data);
        return result;
      } else {
        // Token invalide ou expiré - httpClient a déjà géré la déconnexion
        // On retourne juste l'erreur
        return result;
      }
    } catch (error: any) {
      // httpClient a déjà géré la déconnexion et la redirection
      // On retourne juste l'erreur
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération de l\'utilisateur',
        data: null,
      };
    }
  }

  /**
   * Déconnexion
   */
  static logout(): void {
    this.removeToken();
  }
}

