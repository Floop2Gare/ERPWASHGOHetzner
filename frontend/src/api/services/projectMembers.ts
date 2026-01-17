import { httpClient } from '../utils/httpClient';
import type { ProjectMember } from '../../store/useAppData';

export interface ProjectMemberApiResponse {
  success: boolean;
  data?: ProjectMember | ProjectMember[];
  error?: string;
}

export const ProjectMemberService = {
  /**
   * Récupère tous les membres d'équipe
   */
  async getMembers(): Promise<ProjectMemberApiResponse> {
    try {
      const response = await httpClient.get<ProjectMember[]>('/project-members/');
      return {
        success: true,
        data: response.data || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des membres d\'équipe',
      };
    }
  },

  /**
   * Crée un nouveau membre d'équipe
   */
  async create(member: ProjectMember): Promise<ProjectMemberApiResponse> {
    try {
      const response = await httpClient.post<ProjectMember>('/project-members/', member);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la création du membre d\'équipe',
      };
    }
  },

  /**
   * Met à jour un membre d'équipe
   */
  async update(memberId: string, member: Partial<ProjectMember>): Promise<ProjectMemberApiResponse> {
    try {
      const response = await httpClient.put<ProjectMember>(`/project-members/${memberId}`, {
        id: memberId,
        ...member,
      });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la mise à jour du membre d\'équipe',
      };
    }
  },

  /**
   * Supprime un membre d'équipe
   */
  async delete(memberId: string): Promise<ProjectMemberApiResponse> {
    try {
      await httpClient.delete<void>(`/project-members/${memberId}`);
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la suppression du membre d\'équipe',
      };
    }
  },
};

