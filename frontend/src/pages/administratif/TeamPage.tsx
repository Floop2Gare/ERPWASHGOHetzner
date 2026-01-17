import { useMemo, useState, FormEvent, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UsersRound, Mail, Phone, Calendar, TrendingUp, X, Plus, Trash2, Pencil } from 'lucide-react';

import { useAppData, type ProjectMember, type UserRole, type AppPageKey, type PermissionKey } from '../../store/useAppData';
import { getWorkspaceModule } from '../../workspace/modules';
import { ProjectMemberService, UserService } from '../../api';
import { useMobileDetection } from '../../hooks/useMobileDetection';

const TeamPage = () => {
  const module = getWorkspaceModule('crm');
  const { projectMembers, projects, addProjectMember, removeProjectMember, updateProjectMember, companies, getCompany, authUsers } = useAppData();
  const isMobile = useMobileDetection();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: '',
    email: '',
    phone: '',
    capacity: 35,
    companyId: '',
    profileId: '',
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createMemberError, setCreateMemberError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const teamStats = useMemo(() => {
    const total = projectMembers.length;
    const totalCapacity = projectMembers.reduce((acc, member) => acc + member.capacity, 0);
    const avgCapacity = total > 0 ? Math.round(totalCapacity / total) : 0;

    const membersWithProjects = projectMembers.filter((member) => {
      return projects.some((project) => project.memberIds.includes(member.id));
    });

    return [
      {
        label: 'Membres de l\'équipe',
        value: total.toString(),
        helper: `${membersWithProjects.length} affecté(s) à un projet`,
        icon: UsersRound,
      },
      {
        label: 'Capacité moyenne',
        value: `${avgCapacity}h`,
        helper: 'Par semaine',
        icon: Calendar,
      },
      {
        label: 'Projets actifs',
        value: projects.filter((p) => p.status === 'En cours').length.toString(),
        helper: 'Avec membres assignés',
        icon: TrendingUp,
      },
    ];
  }, [projectMembers, projects]);

  const membersWithProjects = useMemo(() => {
    return projectMembers.map((member) => {
      const assignedProjects = projects.filter((project) =>
        project.memberIds.includes(member.id)
      );
      const activeProjects = assignedProjects.filter((p) => p.status === 'En cours');
      const totalTasks = assignedProjects.reduce(
        (acc, p) => acc + p.tasks.filter((t) => t.assigneeId === member.id).length,
        0
      );
      const completedTasks = assignedProjects.reduce(
        (acc, p) =>
          acc +
          p.tasks.filter((t) => t.assigneeId === member.id && t.status === 'Terminé').length,
        0
      );

      return {
        ...member,
        assignedProjects,
        activeProjects,
        totalTasks,
        completedTasks,
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      };
    });
  }, [projectMembers, projects]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleCreateMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateMemberError(null);
    setIsSubmitting(true);

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.role.trim() || !formData.email.trim()) {
      setCreateMemberError('Veuillez remplir tous les champs obligatoires.');
      setIsSubmitting(false);
      return;
    }
    if (!formData.companyId) {
      setCreateMemberError('Veuillez sélectionner une entreprise.');
      setIsSubmitting(false);
      return;
    }
    if (!formData.profileId) {
      setCreateMemberError('Veuillez sélectionner un profil.');
      setIsSubmitting(false);
      return;
    }
    
    // Si un profil est sélectionné, utiliser ses informations
    let memberData: any = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      role: formData.role.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      capacity: formData.capacity,
      companyId: formData.companyId || null,
      profileId: formData.profileId || null, // Sauvegarder le profileId
    };
    
    if (formData.profileId) {
      const selectedProfile = authUsers.find((user) => user.id === formData.profileId);
      if (selectedProfile) {
        // Utiliser les informations du profil sélectionné
        memberData.firstName = selectedProfile.profile.firstName;
        memberData.lastName = selectedProfile.profile.lastName;
        memberData.email = selectedProfile.profile.email;
        memberData.phone = selectedProfile.profile.phone;
        if (!formData.companyId && selectedProfile.companyId) {
          memberData.companyId = selectedProfile.companyId;
        }
        // S'assurer que le profileId est bien sauvegardé (utiliser l'ID de l'authUser)
        memberData.profileId = selectedProfile.id;
      }
    }

    let rollbackMemberId: string | null = null;

    try {
      // Créer le membre localement d'abord
      const newMember = addProjectMember(memberData);
      rollbackMemberId = newMember.id;

      // Synchroniser avec le backend Docker
      const response = await ProjectMemberService.create(newMember);
      if (!response.success) {
        throw new Error(response.error || 'Erreur lors de la synchronisation avec le serveur.');
      }

      // Mettre à jour le membre avec les données du backend (au cas où l'ID ou d'autres champs diffèrent)
      if (response.data) {
        const backendMember = response.data as ProjectMember;
        // Si l'ID est différent, remplacer le membre local par celui du backend
        if (backendMember.id !== newMember.id) {
          removeProjectMember(newMember.id);
          addProjectMember(backendMember);
        } else {
          // Sinon, mettre à jour avec les données du backend
          updateProjectMember(newMember.id, backendMember);
        }
      }

      // Recharger tous les membres depuis le backend pour s'assurer de la cohérence
      const membersResponse = await ProjectMemberService.getMembers();
      if (membersResponse.success && membersResponse.data) {
        useAppData.setState({ projectMembers: membersResponse.data as ProjectMember[] });
      }

      setFeedback(`Collaborateur "${newMember.firstName} ${newMember.lastName}" créé avec succès.`);
      setIsCreateModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        role: '',
        email: '',
        phone: '',
        capacity: 35,
        companyId: '',
        profileId: '',
      });
      setCreateMemberError(null);
      setTimeout(() => setFeedback(null), 4000);
    } catch (error) {
      // Rollback en cas d'erreur
      if (rollbackMemberId) {
        removeProjectMember(rollbackMemberId);
      }

      setCreateMemberError(
        error instanceof Error
          ? error.message
          : 'Impossible de créer le collaborateur. Veuillez réessayer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setEditingMemberId(null);
    setFormData({
      firstName: '',
      lastName: '',
      role: '',
      email: '',
      phone: '',
      capacity: 35,
      companyId: '',
      profileId: '',
    });
    setCreateMemberError(null);
  };

  const handleEditMember = (member: ProjectMember) => {
    // Vérifier que le membre existe toujours (n'est pas supprimé)
    const memberExists = projectMembers.some(m => m.id === member.id);
    if (!memberExists) {
      setFeedback('Ce membre a été supprimé et ne peut pas être modifié.');
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    setEditingMemberId(member.id);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role,
      email: member.email,
      phone: member.phone || '',
      capacity: member.capacity,
      companyId: member.companyId || '',
      profileId: (member as any).profileId || '',
    });
    setIsEditModalOpen(true);
    setCreateMemberError(null);
  };

  const handleUpdateMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingMemberId) return;

    setCreateMemberError(null);
    setIsSubmitting(true);

    // Vérifier que le membre existe toujours
    const memberExists = projectMembers.some(m => m.id === editingMemberId);
    if (!memberExists) {
      setCreateMemberError('Ce membre a été supprimé et ne peut pas être modifié.');
      setIsSubmitting(false);
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.role.trim() || !formData.email.trim()) {
      setCreateMemberError('Veuillez remplir tous les champs obligatoires.');
      setIsSubmitting(false);
      return;
    }
    if (!formData.companyId) {
      setCreateMemberError('Veuillez sélectionner une entreprise.');
      setIsSubmitting(false);
      return;
    }

    const updateData: Partial<ProjectMember> & { profileId?: string | null } = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      role: formData.role.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      capacity: formData.capacity,
      companyId: formData.companyId || null,
      profileId: formData.profileId || null,
    };

    try {
      // Mettre à jour localement d'abord pour un feedback immédiat
      updateProjectMember(editingMemberId, updateData);

      // Synchroniser avec le backend Docker
      const response = await ProjectMemberService.update(editingMemberId, updateData);
      if (!response.success) {
        throw new Error(response.error || 'Erreur lors de la synchronisation avec le serveur.');
      }

      // Mettre à jour avec les données du backend
      if (response.data) {
        const backendMember = response.data as ProjectMember;
        updateProjectMember(editingMemberId, backendMember);
      }

      // Recharger tous les membres depuis le backend pour s'assurer de la cohérence
      const membersResponse = await ProjectMemberService.getMembers();
      if (membersResponse.success && membersResponse.data) {
        useAppData.setState({ projectMembers: membersResponse.data as ProjectMember[] });
      }

      const member = projectMembers.find(m => m.id === editingMemberId);
      setFeedback(`Collaborateur "${member?.firstName} ${member?.lastName}" modifié avec succès.`);
      setIsEditModalOpen(false);
      setEditingMemberId(null);
      setFormData({
        firstName: '',
        lastName: '',
        role: '',
        email: '',
        phone: '',
        capacity: 35,
        companyId: '',
        profileId: '',
      });
      setCreateMemberError(null);
      setTimeout(() => setFeedback(null), 4000);
    } catch (error) {
      // Rollback en cas d'erreur - recharger depuis le backend
      try {
        const membersResponse = await ProjectMemberService.getMembers();
        if (membersResponse.success && membersResponse.data) {
          useAppData.setState({ projectMembers: membersResponse.data as ProjectMember[] });
        }
      } catch (reloadError) {
        console.error('Erreur lors du rechargement des membres:', reloadError);
      }

      setCreateMemberError(
        error instanceof Error
          ? error.message
          : 'Impossible de modifier le collaborateur. Veuillez réessayer.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${memberName}" ? Cette action est irréversible.`)) {
      return;
    }

    setDeletingMemberId(memberId);
    let rollbackNeeded = false;

    try {
      // Supprimer localement d'abord pour un feedback immédiat
      removeProjectMember(memberId);
      rollbackNeeded = true;

      // Synchroniser avec le backend Docker
      const response = await ProjectMemberService.delete(memberId);
      if (!response.success) {
        throw new Error(response.error || 'Erreur lors de la suppression sur le serveur.');
      }

      // Recharger tous les membres depuis le backend pour s'assurer de la cohérence
      const membersResponse = await ProjectMemberService.getMembers();
      if (membersResponse.success && membersResponse.data) {
        useAppData.setState({ projectMembers: membersResponse.data as ProjectMember[] });
      }

      setFeedback(`Collaborateur "${memberName}" supprimé avec succès.`);
      setTimeout(() => setFeedback(null), 4000);
      rollbackNeeded = false;
    } catch (error) {
      // Rollback en cas d'erreur - re-ajouter le membre localement
      if (rollbackNeeded) {
        // Recharger depuis le backend pour récupérer l'état correct
        try {
          const membersResponse = await ProjectMemberService.getMembers();
          if (membersResponse.success && membersResponse.data) {
            // Mettre à jour le store avec les données du backend
            const { projectMembers: currentMembers } = useAppData.getState();
            const backendMembers = membersResponse.data as ProjectMember[];
            
            // Si le membre existe toujours dans le backend, on ne fait rien
            // Sinon, on doit le ré-ajouter localement (mais ça ne devrait pas arriver)
            const memberStillExists = backendMembers.some(m => m.id === memberId);
            if (!memberStillExists) {
              // Le membre a été supprimé du backend mais l'opération a échoué
              // On garde la suppression locale
              console.warn('Membre supprimé du backend mais erreur lors de la confirmation');
            } else {
              // Le membre existe encore, on doit restaurer l'état
              const memberToRestore = backendMembers.find(m => m.id === memberId);
              if (memberToRestore) {
                const { addProjectMember } = useAppData.getState();
                addProjectMember(memberToRestore);
              }
            }
          }
        } catch (reloadError) {
          console.error('Erreur lors du rechargement des membres:', reloadError);
          // En cas d'erreur de rechargement, on affiche juste l'erreur
        }
      }

      setFeedback(
        error instanceof Error
          ? `Erreur: ${error.message}. Veuillez rafraîchir la page.`
          : 'Impossible de supprimer le collaborateur. Veuillez réessayer.'
      );
      setTimeout(() => setFeedback(null), 5000);
    } finally {
      setDeletingMemberId(null);
    }
  };

  // Charger les membres depuis le backend au montage de la page
  useEffect(() => {
    const loadMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const response = await ProjectMemberService.getMembers();
        if (response.success && response.data) {
          const backendMembers = response.data as ProjectMember[];
          
          // Mettre à jour le store avec les membres du backend
          // Remplacer les membres existants par ceux du backend pour éviter les doublons
          useAppData.setState({ projectMembers: backendMembers });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des membres:', error);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    loadMembers();
  }, []);

  // Charger tous les utilisateurs depuis le backend au montage de la page
  useEffect(() => {
    const loadUsersFromBackend = async () => {
      try {
        const result = await UserService.getUsers();
        if (result.success && result.data && Array.isArray(result.data)) {
          // Mapper les utilisateurs du backend vers le format du store (même logique que dans useAppData)
          const mappedUsers = result.data.map((apiUser: any) => ({
            id: apiUser.id || `auth-${Date.now()}`,
            username: apiUser.username || '',
            fullName: apiUser.fullName || apiUser.username || '',
            passwordHash: apiUser.passwordHash || '',
            role: (apiUser.role as UserRole) || 'agent',
            pages: (apiUser.pages as (AppPageKey | '*')[]) || [],
            permissions: (apiUser.permissions as (PermissionKey | '*')[]) || [],
            active: apiUser.active !== undefined ? apiUser.active : true,
            profile: apiUser.profile || {
              id: `user-${Date.now()}`,
              firstName: apiUser.username || '',
              lastName: '',
              email: '',
              phone: '',
              role: '',
              avatarUrl: undefined,
              password: '',
              emailSignatureHtml: '',
              emailSignatureUseDefault: true,
              emailSignatureUpdatedAt: new Date().toISOString(),
            },
            notificationPreferences: apiUser.notificationPreferences || {
              emailAlerts: true,
              internalAlerts: true,
              smsAlerts: false,
            },
            companyId: apiUser.companyId !== undefined ? apiUser.companyId : null,
          }));
          
          // Mettre à jour le store avec tous les utilisateurs
          useAppData.setState((prevState) => {
            // Sauvegarder dans localStorage
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(
                  'erp_auth_state',
                  JSON.stringify({
                    authUsers: mappedUsers,
                    currentUserId: prevState.currentUserId,
                  })
                );
              } catch (error) {
                console.warn('Impossible de sauvegarder les informations de connexion.', error);
              }
            }
            
            return {
              authUsers: mappedUsers,
            };
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
      }
    };
    loadUsersFromBackend();
  }, []);

  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreateModalOpen, isEditModalOpen]);

  return (
    <div className="space-y-6">
      <header className="dashboard-hero">
          <div className="dashboard-hero__content lg:flex lg:items-start lg:justify-between lg:gap-6">
            <div className="dashboard-hero__intro">
              <p className="dashboard-hero__eyebrow">{module?.name ?? 'Gestion de projet et équipe'}</p>
              <h1 className="dashboard-hero__title">Équipe</h1>
              <p className="dashboard-hero__subtitle">
                Gérez les membres de votre équipe, leurs affectations et leur charge de travail.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-[1px] hover:bg-blue-700 hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <Plus className="h-4 w-4" />
                Nouveau collaborateur
              </button>
            </div>
          </div>
          <div className="dashboard-hero__glow" aria-hidden />
        </header>

        {feedback && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 shadow-sm dark:border-blue-900/40 dark:bg-blue-900/30 dark:text-blue-200">
            {feedback}
          </div>
        )}

        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teamStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="dashboard-kpi group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="dashboard-kpi__eyebrow">{stat.label}</p>
                      <p className="dashboard-kpi__value">{stat.value}</p>
                      <p className="dashboard-kpi__description">{stat.helper}</p>
                    </div>
                    <div className="dashboard-kpi__icon">
                      <Icon />
                    </div>
                  </div>
                  <div className="dashboard-kpi__glow" aria-hidden />
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors md:p-5 dark:border-[var(--border)] dark:bg-[var(--surface)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Membres de l'équipe</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Vue d'ensemble des membres et de leurs affectations
              </p>
            </div>
          </div>

          {membersWithProjects.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <UsersRound className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                Aucun membre trouvé
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ajoutez des membres à votre équipe pour commencer.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {membersWithProjects.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: member.avatarColor }}
                      >
                        {getInitials(member.firstName, member.lastName)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                              {member.firstName} {member.lastName}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                              {member.role}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isMobile && (
                              <button
                                type="button"
                                onClick={() => handleEditMember(member)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-600 transition hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                aria-label={`Modifier ${member.firstName} ${member.lastName}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member.id, `${member.firstName} ${member.lastName}`)}
                              disabled={deletingMemberId === member.id}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-800 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-900/20"
                              aria-label={`Supprimer ${member.firstName} ${member.lastName}`}
                            >
                              {deletingMemberId === member.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Phone className="h-4 w-4" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Calendar className="h-4 w-4" />
                        <span>{member.capacity}h/semaine</span>
                      </div>
                      {member.companyId && getCompany(member.companyId) && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <UsersRound className="h-4 w-4" />
                          <span className="truncate">{getCompany(member.companyId)?.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Projets actifs</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {member.activeProjects.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400">Tâches assignées</span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {member.completedTasks}/{member.totalTasks}
                        </span>
                      </div>
                      {member.totalTasks > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400">Progression</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {member.progress}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                              className="h-full bg-blue-600 transition-all dark:bg-blue-500"
                              style={{ width: `${member.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {member.assignedProjects.length > 0 && (
                      <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Projets assignés
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {member.assignedProjects.slice(0, 3).map((project) => (
                            <span
                              key={project.id}
                              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {project.name.length > 20 ? `${project.name.substring(0, 20)}...` : project.name}
                            </span>
                          ))}
                          {member.assignedProjects.length > 3 && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              +{member.assignedProjects.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {(isCreateModalOpen || isEditModalOpen) &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md px-4 py-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby={isEditModalOpen ? "edit-member-title" : "create-member-title"}
              onClick={handleCloseModal}
            >
              <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 transition dark:border-slate-700 dark:bg-slate-900"
                onClick={(event) => event.stopPropagation()}
              >
                <form
                  onSubmit={isEditModalOpen ? handleUpdateMember : handleCreateMember}
                  className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
                        {isEditModalOpen ? 'MODIFIER UN COLLABORATEUR' : 'CRÉER UN COLLABORATEUR'}
                      </span>
                      <h2 id={isEditModalOpen ? "edit-member-title" : "create-member-title"} className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {isEditModalOpen ? 'Modifier le collaborateur' : 'Nouveau collaborateur'}
                      </h2>
                      <p className="max-w-lg text-xs text-slate-500 dark:text-slate-400">
                        {isEditModalOpen 
                          ? 'Modifiez les informations du membre de votre équipe.'
                          : 'Renseignez les informations essentielles pour ajouter un nouveau membre à votre équipe.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      aria-label="Fermer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {createMemberError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-100">
                      {createMemberError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="member-profile">
                        Profil existant
                      </label>
                      <select
                        id="member-profile"
                        value={formData.profileId}
                        onChange={(e) => {
                          const profileId = e.target.value;
                          setFormData({ ...formData, profileId });
                          setCreateMemberError(null);
                          
                          // Si un profil est sélectionné, remplir automatiquement les champs
                          if (profileId) {
                            const selectedProfile = authUsers.find((user) => user.id === profileId);
                            if (selectedProfile) {
                              setFormData((prev) => ({
                                ...prev,
                                profileId: selectedProfile.id, // Utiliser l'ID de l'authUser
                                firstName: selectedProfile.profile.firstName,
                                lastName: selectedProfile.profile.lastName,
                                email: selectedProfile.profile.email,
                                phone: selectedProfile.profile.phone,
                                companyId: selectedProfile.companyId || prev.companyId,
                              }));
                            }
                          }
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        autoFocus={!isEditModalOpen}
                        required={!isEditModalOpen}
                      >
                        <option value="">Sélectionnez un profil {!isEditModalOpen && '*'}</option>
                        {authUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.profile.firstName} {user.profile.lastName} ({user.username})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="member-company">
                        Entreprise *
                      </label>
                      <select
                        id="member-company"
                        value={formData.companyId}
                        onChange={(e) => {
                          setFormData({ ...formData, companyId: e.target.value });
                          setCreateMemberError(null);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      >
                        <option value="">Sélectionner une entreprise</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="member-firstname">
                          Prénom *
                        </label>
                        <input
                          id="member-firstname"
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => {
                            setFormData({ ...formData, firstName: e.target.value });
                            setCreateMemberError(null);
                          }}
                          placeholder="Ex: Marion"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="member-lastname">
                          Nom *
                        </label>
                        <input
                          id="member-lastname"
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => {
                            setFormData({ ...formData, lastName: e.target.value });
                            setCreateMemberError(null);
                          }}
                          placeholder="Ex: Lefèvre"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="member-role">
                        Rôle *
                      </label>
                      <input
                        id="member-role"
                        type="text"
                        value={formData.role}
                        onChange={(e) => {
                          setFormData({ ...formData, role: e.target.value });
                          setCreateMemberError(null);
                        }}
                        placeholder="Ex: Directrice de projet"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="member-email">
                        E-mail *
                      </label>
                      <input
                        id="member-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          setCreateMemberError(null);
                        }}
                        placeholder="marion.lefevre@atelier-proprete.fr"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        required
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="member-phone">
                          Téléphone
                        </label>
                        <input
                          id="member-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            setFormData({ ...formData, phone: e.target.value });
                            setCreateMemberError(null);
                          }}
                          placeholder="+33 6 52 11 32 74"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400" htmlFor="member-capacity">
                          Capacité (h/semaine) *
                        </label>
                        <input
                          id="member-capacity"
                          type="number"
                          min="0"
                          max="50"
                          value={formData.capacity}
                          onChange={(e) => {
                            setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 });
                            setCreateMemberError(null);
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      disabled={isSubmitting}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEditModalOpen ? (
                        <>
                          <Pencil className="h-4 w-4" />
                          {isSubmitting ? 'Modification…' : 'Modifier le collaborateur'}
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          {isSubmitting ? 'Création…' : 'Créer le collaborateur'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}
    </div>
  );
};

export default TeamPage;

