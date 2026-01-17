import { useState, useRef, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  Email as EmailIcon, 
  Phone as PhoneIcon, 
  Business as BusinessIcon, 
  People as PeopleIcon, 
  Work as WorkIcon, 
  PersonSearch as PersonSearchIcon, 
  Description as DescriptionIcon 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';

import { Button } from '../../components/Button';
import { useAppData } from '../../store/useAppData';
import { buildProfileForm, type ProfileFormState } from './types';
import { UserService } from '../../api';
import {
  CRMModal,
  CRMModalHeader,
  CRMFormLabel,
  CRMFormInput,
  CRMFormSelect,
  CRMErrorAlert,
  CRMSubmitButton,
  CRMCancelButton,
} from '../../components/crm';

const getInitials = (firstName: string, lastName: string) => {
  const first = firstName?.trim().charAt(0).toUpperCase() ?? '';
  const last = lastName?.trim().charAt(0).toUpperCase() ?? '';
  return `${first}${last}`.trim() || '👤';
};

export const ProfileSection = () => {
  const navigate = useNavigate();
  const { userProfile, updateUserProfile, updateUserAvatar, getCurrentUser, companies, leads, engagements, clients, services, authUsers } = useAppData();
  const currentUser = getCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => 
    buildProfileForm(userProfile, currentUser?.companyId)
  );
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setProfileForm(buildProfileForm(userProfile, currentUser?.companyId));
  }, [userProfile, currentUser?.companyId]);

  // Ouvrir automatiquement la modale du profil depuis l'URL (?openProfile=true)
  useEffect(() => {
    const openProfile = searchParams.get('openProfile');
    if (openProfile === 'true') {
      // Nettoyer le paramètre IMMÉDIATEMENT pour éviter la boucle
      const next = new URLSearchParams(searchParams);
      next.delete('openProfile');
      setSearchParams(next, { replace: true });

      // Vérifier si la modale n'est pas déjà ouverte
      if (!showProfileModal) {
        setShowProfileModal(true);
      }
    }
  }, [searchParams, setSearchParams, showProfileModal]);

  const handleProfileChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarSelect = () => {
    avatarFileInputRef.current?.click();
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setProfileForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClear = () => {
    setProfileForm((prev) => ({ ...prev, avatarUrl: '' }));
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setProfileSubmitting(true);

    try {
      if (!currentUser?.id) {
        setProfileError('Utilisateur non trouvé.');
        setProfileSubmitting(false);
        return;
      }

      const result = await UserService.updateUser(currentUser.id, {
        ...currentUser,
        profile: {
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim(),
          role: profileForm.role.trim(),
          avatarUrl: profileForm.avatarUrl.trim(),
        },
        companyId: profileForm.companyId.trim() || null,
      });

      if (result.success && result.data) {
        updateUserProfile({
          ...userProfile,
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim(),
          role: profileForm.role.trim(),
        });
        updateUserAvatar(profileForm.avatarUrl.trim());
        setShowProfileModal(false);
      } else {
        setProfileError(result.error || 'Erreur lors de la mise à jour du profil.');
      }
    } catch (error: any) {
      setProfileError(error?.message || 'Erreur lors de la mise à jour du profil.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const closeProfileModal = useCallback(() => {
    setShowProfileModal(false);
    setProfileForm(buildProfileForm(userProfile, currentUser?.companyId));
    setProfileError(null);
  }, [userProfile, currentUser?.companyId]);

  useEffect(() => {
    if (!showProfileModal) {
      return;
    }
    const body = document.body;
    const originalOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeProfileModal();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [showProfileModal, closeProfileModal]);

  const companyName = profileForm.companyId
    ? companies.find((c) => c.id === profileForm.companyId)?.name ?? 'Aucune'
    : 'Aucune';

  // Membres de l'équipe (utilisateurs de la même entreprise)
  const teamMembers = currentUser?.companyId
    ? authUsers.filter((user) => 
        user.id !== currentUser.id && 
        user.companyId === currentUser.companyId &&
        user.active
      )
    : [];

  // Calcul des statistiques de l'utilisateur
  const userStats = (() => {
    if (!currentUser?.id) {
      return {
        leadsCount: 0,
        engagementsCount: 0,
        clientsCount: 0,
        servicesCount: 0,
      };
    }

    const userId = currentUser.id;
    
    // Leads assignés à l'utilisateur
    const userLeads = leads.filter((lead) => lead.owner === userId);
    
    // Engagements assignés à l'utilisateur
    const userEngagements = engagements.filter((engagement) => 
      engagement.assignedUserIds?.includes(userId)
    );
    
    // Clients liés aux engagements de l'utilisateur
    const userEngagementClientIds = new Set(
      userEngagements.flatMap((e) => e.contactIds || [])
    );
    const userClients = clients.filter((client) => 
      userEngagementClientIds.has(client.id)
    );
    
    // Services utilisés dans les engagements de l'utilisateur
    const userEngagementServiceIds = new Set(
      userEngagements.map((e) => e.serviceId).filter(Boolean)
    );
    const userServices = services.filter((service) => 
      userEngagementServiceIds.has(service.id)
    );

    return {
      leadsCount: userLeads.length,
      engagementsCount: userEngagements.length,
      clientsCount: userClients.length,
      servicesCount: userServices.length,
    };
  })();

  return (
    <>
      <div className="dashboard-page space-y-6">
        <header className="dashboard-hero">
          <div className="dashboard-hero__content">
            <div className="dashboard-hero__intro">
              <h1 className="dashboard-hero__title">Profil utilisateur</h1>
              <p className="dashboard-hero__subtitle">
                Consultez vos informations personnelles et votre activité dans l'application.
              </p>
            </div>
          </div>
          <div className="dashboard-hero__glow" aria-hidden />
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors md:p-8 dark:border-[var(--border)] dark:bg-[var(--surface)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
            {/* Avatar et informations principales */}
            <div className="flex flex-col items-center gap-4 lg:items-start">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 text-2xl font-semibold text-slate-500 shadow-inner dark:border-slate-700 dark:bg-slate-800">
                {userProfile.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span>{getInitials(userProfile.firstName, userProfile.lastName)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Modifier le profil
              </button>
            </div>

            {/* Informations détaillées */}
            <div className="flex-1 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {userProfile.firstName} {userProfile.lastName}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {userProfile.role || 'Rôle non défini'}
                </p>
              </div>

              <div className="grid gap-6 border-t border-slate-200 pt-6 dark:border-slate-800 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <EmailIcon className="!h-4 !w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.12em]">E-mail</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {userProfile.email || '—'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <PhoneIcon className="!h-4 !w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.12em]">Téléphone</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {userProfile.phone || '—'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <BusinessIcon className="!h-4 !w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.12em]">Entreprise</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {companyName}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <PeopleIcon className="!h-4 !w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.12em]">Équipe</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {teamMembers.length > 0 
                      ? `${teamMembers.length} membre${teamMembers.length > 1 ? 's' : ''}`
                      : 'Aucun membre'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Actions rapides */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Actions rapides</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/workspace/crm/devis?create=true')}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <FileText className="h-4 w-4" />
              Créer un devis
            </button>
          </div>
        </section>

        {/* Statistiques de l'utilisateur */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Activité</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white dark:bg-blue-500">
                  <PersonSearchIcon className="!h-5 !w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Prospects
                  </p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {userStats.leadsCount.toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white dark:bg-emerald-500">
                  <WorkIcon className="!h-5 !w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Interventions
                  </p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {userStats.engagementsCount.toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white dark:bg-purple-500">
                  <PeopleIcon className="!h-5 !w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Clients
                  </p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {userStats.clientsCount.toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-white dark:bg-amber-500">
                  <DescriptionIcon className="!h-5 !w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Services
                  </p>
                  <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    {userStats.servicesCount.toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <CRMModal isOpen={showProfileModal} onClose={closeProfileModal}>
        <form
          onSubmit={handleProfileSubmit}
          className="flex flex-col gap-4 bg-white p-4 md:p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          <CRMModalHeader
            eyebrow="MODIFIER MON PROFIL"
            title={`${userProfile.firstName} ${userProfile.lastName}`}
            description="Mettez à jour vos informations personnelles et votre photo de profil."
            onClose={closeProfileModal}
          />

          <div className="space-y-4">
            <CRMErrorAlert message={profileError} />

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <CRMFormLabel htmlFor="profile-first-name" required>
                  Prénom
                </CRMFormLabel>
                <CRMFormInput
                  id="profile-first-name"
                  name="firstName"
                  type="text"
                  value={profileForm.firstName}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="profile-last-name" required>
                  Nom
                </CRMFormLabel>
                <CRMFormInput
                  id="profile-last-name"
                  name="lastName"
                  type="text"
                  value={profileForm.lastName}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="profile-email" required>
                  E-mail
                </CRMFormLabel>
                <CRMFormInput
                  id="profile-email"
                  name="email"
                  type="email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <CRMFormLabel htmlFor="profile-phone">Téléphone</CRMFormLabel>
                <CRMFormInput
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={handleProfileChange}
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="profile-role">Rôle</CRMFormLabel>
                <CRMFormInput
                  id="profile-role"
                  name="role"
                  type="text"
                  value={profileForm.role}
                  onChange={handleProfileChange}
                />
              </div>
              <div>
                <CRMFormLabel htmlFor="profile-company">Entreprise</CRMFormLabel>
                <CRMFormSelect
                  id="profile-company"
                  name="companyId"
                  value={profileForm.companyId}
                  onChange={handleProfileChange}
                >
                  <option value="">Aucune entreprise</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </CRMFormSelect>
                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                  Associez votre profil à une entreprise pour faciliter la gestion des données.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <CRMFormLabel>Photo de profil</CRMFormLabel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-500 shadow-inner dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  {profileForm.avatarUrl ? (
                    <img src={profileForm.avatarUrl} alt="Aperçu avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span>{getInitials(profileForm.firstName, profileForm.lastName)}</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 text-xs text-slate-500">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleAvatarSelect}>
                      Choisir une image
                    </Button>
                    {profileForm.avatarUrl && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleAvatarClear}>
                        Retirer
                      </Button>
                    )}
                  </div>
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <CRMFormLabel htmlFor="profile-avatar-url">
                    Lien externe (optionnel)
                  </CRMFormLabel>
                  <CRMFormInput
                    id="profile-avatar-url"
                    name="avatarUrl"
                    type="text"
                    value={profileForm.avatarUrl}
                    onChange={handleProfileChange}
                    placeholder="https://…"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Les fichiers importés sont convertis en data URL et conservés pour vos prochaines connexions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            <CRMCancelButton onClick={closeProfileModal} disabled={profileSubmitting} />
            <CRMSubmitButton type="submit" disabled={profileSubmitting}>
              {profileSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </CRMSubmitButton>
          </div>
        </form>
      </CRMModal>
    </>
  );
};
