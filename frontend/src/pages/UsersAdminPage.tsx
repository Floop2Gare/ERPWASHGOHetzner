import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Trash2, KeyRound, Filter, Download, Users, Shield, Settings, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../components/Button';
import { useAppData } from '../store/useAppData';
import { UserService } from '../api';
import {
  APP_PAGE_OPTIONS,
  PERMISSION_OPTIONS,
  USER_ROLE_LABELS,
  type AppPageKey,
  type PermissionKey,
  type UserRole,
} from '../lib/rbac';
import { IconArchive } from '../components/icons';
import { BRAND_NAME } from '../lib/branding';
import {
  CRMFeedback,
  CRMBackendStatus,
  CRMBulkActions,
  CRMEmptyState,
  CRMModal,
  CRMModalHeader,
  CRMFormLabel,
  CRMFormInput,
  CRMFormSelect,
  CRMSubmitButton,
  CRMCancelButton,
  CRMErrorAlert,
} from '../components/crm';

const initialFormState = {
  username: '',
  password: '',
  role: 'agent' as UserRole,
  pages: [] as (AppPageKey | '*')[],
  permissions: [] as (PermissionKey | '*')[],
  active: true,
  resetPassword: '',
  companyId: '',
};

type DetailState =
  | { mode: 'create' }
  | { mode: 'edit'; userId: string; focus?: 'password' };

type UserFormState = typeof initialFormState;

const roleOptions: UserRole[] = ['superAdmin', 'admin', 'manager', 'agent', 'lecture'];

const formatList = (values: string[]) => {
  if (values.length === 0) {
    return '—';
  }
  if (values.length === 1) {
    return values[0];
  }
  if (values.length === 2) {
    return `${values[0]}, ${values[1]}`;
  }
  return `${values.slice(0, 2).join(', ')} +${values.length - 2}`;
};

const UsersAdminPage = () => {
  const authUsers = useAppData((state) => state.authUsers);
  const getCurrentUser = useAppData((state) => state.getCurrentUser);
  const createUserAccount = useAppData((state) => state.createUserAccount);
  const updateUserAccount = useAppData((state) => state.updateUserAccount);
  const setUserActiveState = useAppData((state) => state.setUserActiveState);
  const resetUserPassword = useAppData((state) => state.resetUserPassword);
  const deleteUser = useAppData((state) => state.deleteUser);
  const companies = useAppData((state) => state.companies);
  const getCompany = useAppData((state) => state.getCompany);

  const currentUser = getCurrentUser();

  const [detail, setDetail] = useState<DetailState | null>(null);
  const [form, setForm] = useState<UserFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const passwordResetRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const orderedUsers = useMemo(
    () =>
      [...authUsers].sort((a, b) => a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' })),
    [authUsers]
  );

  const filteredUsers = useMemo(() => {
    return orderedUsers;
  }, [orderedUsers]);

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
    setSelectedRows((current) => {
      const next = new Set<string>();
      filteredUsers.forEach((user) => {
        if (current.has(user.id)) {
          next.add(user.id);
        }
      });
      return next;
    });
  }, [filteredUsers]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const toggleRowSelection = (id: string) => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected = useMemo(
    () => filteredUsers.length > 0 && filteredUsers.every((user) => selectedRows.has(user.id)),
    [filteredUsers, selectedRows]
  );

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredUsers.forEach((user) => next.delete(user.id));
        return next;
      });
    } else {
      setSelectedRows((current) => {
        const next = new Set(current);
        filteredUsers.forEach((user) => next.add(user.id));
        return next;
      });
    }
  };

  const userKpis = useMemo(() => {
    const totalUsers = filteredUsers.length;
    const activeUsers = filteredUsers.filter((user) => user.active).length;
    const adminUsers = filteredUsers.filter((user) => user.role === 'admin' || user.role === 'superAdmin').length;

    return [
      {
        id: 'total',
        label: 'Utilisateurs',
        value: totalUsers.toLocaleString('fr-FR'),
        helper: `${activeUsers.toLocaleString('fr-FR')} actifs`,
      },
      {
        id: 'admins',
        label: 'Administrateurs',
        value: adminUsers.toLocaleString('fr-FR'),
        helper: 'Accès complet',
      },
      {
        id: 'roles',
        label: 'Rôles configurés',
        value: new Set(filteredUsers.map((u) => u.role)).size.toLocaleString('fr-FR'),
        helper: 'Différents niveaux',
      },
    ];
  }, [filteredUsers]);

  useEffect(() => {
    if (detail && detail.mode === 'edit') {
      const target = authUsers.find((user) => user.id === detail.userId);
      if (target) {
        setForm({
          username: target.username,
          password: '',
          role: target.role,
          pages: target.pages.includes('*') ? ['*'] : [...target.pages],
          permissions: target.permissions.includes('*') ? ['*'] : [...target.permissions],
          active: target.active,
          resetPassword: '',
          companyId: target.companyId || '',
        });
        setFormError(null);
      }
    }
    if (detail && detail.mode === 'create') {
      setForm({ ...initialFormState });
      setFormError(null);
    }
  }, [detail, authUsers]);

  useEffect(() => {
    if (detail && detail.mode === 'edit' && detail.focus === 'password') {
      passwordResetRef.current?.focus();
    }
  }, [detail]);

  if (!currentUser || currentUser.role !== 'superAdmin') {
    return (
      <div className="space-y-4">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">Sécurité</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Accès restreint</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cette section est réservée aux administrateurs principaux.
          </p>
        </header>
      </div>
    );
  }

  const isAllPages = form.pages.includes('*');
  const isAllPermissions = form.permissions.includes('*');

  const handlePageToggle = (page: AppPageKey) => {
    setForm((prev) => {
      if (prev.pages.includes('*')) {
        return { ...prev, pages: [page] };
      }
      const exists = prev.pages.includes(page);
      const nextPages = exists ? prev.pages.filter((item) => item !== page) : [...prev.pages, page];
      return { ...prev, pages: nextPages };
    });
  };

  const handlePermissionToggle = (permission: PermissionKey) => {
    setForm((prev) => {
      if (prev.permissions.includes('*')) {
        return { ...prev, permissions: [permission] };
      }
      const exists = prev.permissions.includes(permission);
      const nextPermissions = exists
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions: nextPermissions };
    });
  };

  const canManageUsers = currentUser.role === 'superAdmin';

  const openCreate = () => {
    if (!canManageUsers) {
      return;
    }
    setDetail({ mode: 'create' });
  };

  const openEdit = (userId: string) => setDetail({ mode: 'edit', userId });

  const openPasswordReset = (userId: string) => setDetail({ mode: 'edit', userId, focus: 'password' });

  const closeDetail = () => {
    setDetail(null);
    setForm({ ...initialFormState });
    setFormError(null);
  };

  useEffect(() => {
    if (!detail) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetail();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [detail, closeDetail]);

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setFormError('Identifiant et mot de passe requis.');
      return;
    }
    const result = await createUserAccount({
      username: form.username,
      password: form.password,
      role: form.role,
      pages: isAllPages ? ['*'] : form.pages,
      permissions: isAllPermissions ? ['*'] : form.permissions,
      companyId: form.companyId || null,
    });
    if (!result.success) {
      setFormError(result.error ?? "Impossible de créer l'utilisateur.");
      return;
    }
    closeDetail();
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail || detail.mode !== 'edit') {
      return;
    }
    const result = updateUserAccount(detail.userId, {
      role: form.role,
      pages: isAllPages ? ['*'] : form.pages,
      permissions: isAllPermissions ? ['*'] : form.permissions,
      companyId: form.companyId || null,
    });
    if (!result.success) {
      setFormError(result.error ?? 'Échec de la mise à jour.');
      return;
    }
    setFormError(null);
    closeDetail();
  };

  const handleToggleActive = (userId: string, active: boolean) => {
    const result = setUserActiveState(userId, active);
    if (!result.success) {
      setFormError(result.error ?? 'Action impossible.');
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
      return;
    }
    const result = deleteUser(userId);
    if (!result.success) {
      setFormError(result.error ?? 'Impossible de supprimer l\'utilisateur.');
      setFeedback(result.error ?? 'Impossible de supprimer l\'utilisateur.');
    } else {
      setFormError(null);
      setFeedback('Utilisateur supprimé avec succès.');
    }
  };

  const handlePasswordReset = () => {
    if (!detail || detail.mode !== 'edit') {
      return;
    }
    if (!form.resetPassword.trim()) {
      setFormError('Merci de saisir un nouveau mot de passe.');
      return;
    }
    const result = resetUserPassword(detail.userId, form.resetPassword);
    if (!result.success) {
      setFormError(result.error ?? 'Échec de la réinitialisation.');
      return;
    }
    setForm((prev) => ({ ...prev, resetPassword: '' }));
    setFormError(null);
  };


  return (
    <div className="dashboard-page space-y-10">
      <header className="dashboard-hero">
        <div className="dashboard-hero__content">
          <div className="dashboard-hero__intro">
            <p className="dashboard-hero__eyebrow">Administration</p>
            <h1 className="dashboard-hero__title">Utilisateurs</h1>
            <p className="dashboard-hero__subtitle">
              Créez, mettez à jour et contrôlez les accès des collaborateurs {BRAND_NAME}
            </p>
          </div>
        </div>
        <div className="dashboard-hero__glow" aria-hidden />
      </header>

      <CRMFeedback message={feedback} />

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {userKpis.map((kpi, index) => {
            const Icon = [Users, Shield, Settings][index] ?? Users;
            return (
              <div key={kpi.label} className="dashboard-kpi group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="dashboard-kpi__eyebrow">{kpi.label}</p>
                    <p className="dashboard-kpi__value">{kpi.value}</p>
                    <p className="dashboard-kpi__description">{kpi.helper}</p>
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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleToggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tout sélectionner</span>
              </div>
              <CRMBulkActions
                selectedCount={selectedRows.size}
                actions={[]}
              />
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
              {canManageUsers && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700"
                >
                  Nouvel utilisateur
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-[var(--border)] dark:bg-[var(--surface)] lg:block">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-4 w-12" />
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Utilisateur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Rôle
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Pages
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Permissions
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                  const pageLabels = user.pages.includes('*')
                    ? ['Tous les modules']
                    : user.pages.map((page) => APP_PAGE_OPTIONS.find((option) => option.key === page)?.label ?? page);
                  const permissionLabels = user.permissions.includes('*')
                    ? ['Toutes les fonctionnalités']
                    : user.permissions.map(
                        (permission) => PERMISSION_OPTIONS.find((option) => option.key === permission)?.label ?? permission
                      );
                  const isCurrent = currentUser?.id === user.id;
                  return (
                    <tr
                      key={user.id}
                      className={clsx(
                        'group transition hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer',
                        selectedRows.has(user.id) && 'bg-blue-50/50 dark:bg-blue-500/10'
                      )}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('input[type="checkbox"]') ||
                          target.closest('button') ||
                          target.closest('a')
                        ) {
                          return;
                        }
                        openEdit(user.id);
                      }}
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.has(user.id)}
                          onChange={() => toggleRowSelection(user.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.username}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{user.fullName || '—'}</p>
                          {user.companyId && getCompany(user.companyId) && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">{getCompany(user.companyId)?.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.username}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{user.fullName || '—'}</p>
                          {user.companyId && getCompany(user.companyId) && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">{getCompany(user.companyId)?.name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {USER_ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formatList(pageLabels)}
                        </p>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {formatList(permissionLabels)}
                        </p>
                      </td>
                      <td className="px-6 py-5 align-middle">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                            user.active
                              ? 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)] dark:bg-emerald-500 dark:text-white dark:border-emerald-600'
                              : 'bg-slate-200 text-slate-700 border border-slate-300 shadow-[0_1px_0_rgba(148,163,184,0.35)] dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500'
                          )}
                        >
                          {user.active ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-middle" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 text-slate-600 dark:text-slate-300">
                          <button
                            type="button"
                            onClick={() => openEdit(user.id)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                            title="Modifier"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openPasswordReset(user.id)}
                            className="rounded-lg p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-900/30 dark:hover:text-blue-200"
                            title="Réinitialiser le mot de passe"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(user.id, !user.active)}
                            disabled={isCurrent && user.active}
                            className={clsx(
                              'rounded-lg p-2 text-slate-600 transition',
                              user.active
                                ? 'hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200'
                                : 'hover:bg-green-100 hover:text-green-700 dark:text-slate-300 dark:hover:bg-green-900/30 dark:hover:text-green-200',
                              isCurrent && user.active && 'opacity-50 cursor-not-allowed'
                            )}
                            title={user.active ? 'Désactiver' : 'Réactiver'}
                          >
                            <IconArchive className="h-4 w-4" />
                          </button>
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id)}
                              className="rounded-lg p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-200"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      <div className="space-y-4 lg:hidden">
        {filteredUsers.map((user) => {
          const pageLabels = user.pages.includes('*')
            ? ['Tous les modules']
            : user.pages.map((page) => APP_PAGE_OPTIONS.find((option) => option.key === page)?.label ?? page);
          const permissionLabels = user.permissions.includes('*')
            ? ['Toutes les fonctionnalités']
            : user.permissions.map(
                (permission) => PERMISSION_OPTIONS.find((option) => option.key === permission)?.label ?? permission
              );
          const isCurrent = currentUser?.id === user.id;
          return (
            <div
              key={user.id}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors cursor-pointer dark:border-[var(--border)] dark:bg-[var(--surface)]"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (
                  target.closest('input[type="checkbox"]') ||
                  target.closest('button') ||
                  target.closest('a')
                ) {
                  return;
                }
                openEdit(user.id);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-1 items-start gap-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(user.id)}
                    onChange={() => toggleRowSelection(user.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{user.username}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.fullName || '—'}</p>
                    {user.companyId && getCompany(user.companyId) && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">{getCompany(user.companyId)?.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Rôle</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {USER_ROLE_LABELS[user.role]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pages</span>
                  <span className="text-slate-800 dark:text-slate-100">{formatList(pageLabels)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Permissions</span>
                  <span className="text-slate-800 dark:text-slate-100">{formatList(permissionLabels)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span>Statut</span>
                  <span
                    className={clsx(
                      'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium',
                      user.active
                        ? 'bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-[0_1px_0_rgba(16,185,129,0.35)] dark:bg-emerald-500 dark:text-white dark:border-emerald-600'
                        : 'bg-slate-200 text-slate-700 border border-slate-300 shadow-[0_1px_0_rgba(148,163,184,0.35)] dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500'
                    )}
                  >
                    {user.active ? 'Actif' : 'Désactivé'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => openEdit(user.id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/40"
                >
                  <Edit2 className="h-4 w-4" />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => openPasswordReset(user.id)}
                  className="rounded-lg bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="Réinitialiser le mot de passe"
                >
                  <KeyRound className="h-4 w-4" />
                </button>
                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user.id)}
                    className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/40"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <CRMEmptyState
          message="Aucun utilisateur trouvé. Créez votre premier utilisateur pour commencer."
        />
      )}

      <CRMModal isOpen={detail !== null} onClose={closeDetail} maxWidth="7xl">
        <form
          onSubmit={detail?.mode === 'create' ? handleCreateSubmit : handleEditSubmit}
          className="flex flex-col gap-3 bg-white p-4 md:p-5 text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          <CRMModalHeader
            eyebrow={detail?.mode === 'create' ? 'CRÉER UN UTILISATEUR' : 'MODIFIER UN UTILISATEUR'}
            title={detail?.mode === 'create' ? 'Nouvel utilisateur' : form.username}
            description={
              detail?.mode === 'create'
                ? 'Créez un nouvel accès pour un collaborateur avec des permissions personnalisées.'
                : 'Mettez à jour les informations et les permissions de cet utilisateur.'
            }
            onClose={closeDetail}
            className="px-0 pt-0 [&_h2]:text-slate-900"
          />

          <div className="space-y-2.5">
            <CRMErrorAlert message={formError} />

            <div className="grid gap-2.5 md:grid-cols-2">
              <div>
                <CRMFormLabel htmlFor="user-username">Identifiant</CRMFormLabel>
                <CRMFormInput
                  id="user-username"
                  type="text"
                  value={form.username}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  disabled={detail?.mode === 'edit'}
                  placeholder="nom.utilisateur"
                />
              </div>
              {detail?.mode === 'create' && (
                <div>
                  <CRMFormLabel htmlFor="user-password" required>Mot de passe</CRMFormLabel>
                  <div className="relative">
                    <CRMFormInput
                      id="user-password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                      required
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
              {detail?.mode === 'edit' && (
                <div>
                  <CRMFormLabel htmlFor="user-reset-password">Nouveau mot de passe</CRMFormLabel>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <CRMFormInput
                        id="user-reset-password"
                        ref={passwordResetRef}
                        type={showResetPassword ? 'text' : 'password'}
                        value={form.resetPassword}
                        onChange={(event) => setForm((prev) => ({ ...prev, resetPassword: event.target.value }))}
                        placeholder="Saisir un nouveau mot de passe"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        aria-label={showResetPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-100 hover:border-blue-300 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>
              )}
              <div>
                <CRMFormLabel htmlFor="user-role">Rôle</CRMFormLabel>
                <CRMFormSelect
                  id="user-role"
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {USER_ROLE_LABELS[role]}
                    </option>
                  ))}
                </CRMFormSelect>
              </div>
              <div>
                <CRMFormLabel htmlFor="user-company">Entreprise</CRMFormLabel>
                <CRMFormSelect
                  id="user-company"
                  value={form.companyId}
                  onChange={(event) => setForm((prev) => ({ ...prev, companyId: event.target.value }))}
                >
                  <option value="">Aucune entreprise</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </CRMFormSelect>
              </div>
            </div>

                  <div className="space-y-2">
                    {/* Pages organisées par catégories */}
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-2.5 dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400">Pages accessibles</h3>
                        <label className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                          <input
                            type="checkbox"
                            checked={isAllPages}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                pages: event.target.checked ? ['*'] : prev.pages.filter((item) => item !== '*'),
                              }))
                            }
                            className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500/40"
                          />
                          <span>Tous</span>
                        </label>
                      </div>
                      <div className="space-y-1.5">
                        {/* Catégorie CRM */}
                        <div>
                          <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5 uppercase tracking-wider">CRM & Vente</h4>
                          <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                            {APP_PAGE_OPTIONS.filter(p => 
                              ['dashboard', 'clients', 'leads', 'service', 'abonnement', 'stats'].includes(p.key)
                            ).map((page) => (
                              <label key={page.key} className={clsx(
                                'flex items-center gap-1 px-1 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-all cursor-pointer',
                                isAllPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/10 dark:hover:text-blue-300',
                                form.pages.includes(page.key) && !isAllPages && 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                              )}>
                                <input
                                  type="checkbox"
                                  checked={form.pages.includes(page.key) || isAllPages}
                                  onChange={() => handlePageToggle(page.key)}
                                  disabled={isAllPages}
                                  className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500/40 flex-shrink-0"
                                />
                                <span className="truncate">{page.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        {/* Catégorie Administratif */}
                        <div>
                          <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5 uppercase tracking-wider">Administratif</h4>
                          <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                            {APP_PAGE_OPTIONS.filter(p => 
                              p.key.startsWith('administratif') || ['planning', 'achats', 'documents'].includes(p.key)
                            ).map((page) => (
                              <label key={page.key} className={clsx(
                                'flex items-center gap-1 px-1 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-all cursor-pointer',
                                isAllPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/10 dark:hover:text-blue-300',
                                form.pages.includes(page.key) && !isAllPages && 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                              )}>
                                <input
                                  type="checkbox"
                                  checked={form.pages.includes(page.key) || isAllPages}
                                  onChange={() => handlePageToggle(page.key)}
                                  disabled={isAllPages}
                                  className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500/40 flex-shrink-0"
                                />
                                <span className="truncate">{page.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        {/* Catégorie Comptabilité */}
                        <div>
                          <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5 uppercase tracking-wider">Comptabilité</h4>
                          <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                            {APP_PAGE_OPTIONS.filter(p => p.key.startsWith('comptabilite')).map((page) => (
                              <label key={page.key} className={clsx(
                                'flex items-center gap-1 px-1 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-all cursor-pointer',
                                isAllPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/10 dark:hover:text-blue-300',
                                form.pages.includes(page.key) && !isAllPages && 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                              )}>
                                <input
                                  type="checkbox"
                                  checked={form.pages.includes(page.key) || isAllPages}
                                  onChange={() => handlePageToggle(page.key)}
                                  disabled={isAllPages}
                                  className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500/40 flex-shrink-0"
                                />
                                <span className="truncate">{page.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        {/* Catégorie Paramètres */}
                        <div>
                          <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5 uppercase tracking-wider">Paramètres</h4>
                          <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                            {APP_PAGE_OPTIONS.filter(p => p.key.startsWith('parametres')).map((page) => (
                              <label key={page.key} className={clsx(
                                'flex items-center gap-1 px-1 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-all cursor-pointer',
                                isAllPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/10 dark:hover:text-blue-300',
                                form.pages.includes(page.key) && !isAllPages && 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                              )}>
                                <input
                                  type="checkbox"
                                  checked={form.pages.includes(page.key) || isAllPages}
                                  onChange={() => handlePageToggle(page.key)}
                                  disabled={isAllPages}
                                  className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500/40 flex-shrink-0"
                                />
                                <span className="truncate">{page.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Permissions organisées par catégories */}
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-2.5 dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-700">
                        <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400">Permissions</h3>
                        <label className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-slate-200 bg-white text-[10px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                          <input
                            type="checkbox"
                            checked={isAllPermissions}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                permissions: event.target.checked
                                  ? ['*']
                                  : prev.permissions.filter((item) => item !== '*'),
                              }))
                            }
                            className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500/40"
                          />
                          <span>Toutes</span>
                        </label>
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { title: 'Services', keys: ['service'] },
                          { title: 'Abonnements', keys: ['abonnement'] },
                          { title: 'Prospects', keys: ['lead'] },
                          { title: 'Clients', keys: ['client'] },
                          { title: 'Achats', keys: ['purchase'] },
                          { title: 'Documents', keys: ['documents'] },
                          { title: 'Planning', keys: ['planning'] },
                          { title: 'Comptabilité', keys: ['accounting'] },
                          { title: 'Statistiques', keys: ['stats'] },
                          { title: 'Paramètres', keys: ['settings'] },
                        ].map((category) => {
                          const categoryPermissions = PERMISSION_OPTIONS.filter(p => 
                            category.keys.some(key => p.key.startsWith(key))
                          );
                          if (categoryPermissions.length === 0) return null;
                          
                          return (
                            <div key={category.title}>
                              <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5 uppercase tracking-wider">{category.title}</h4>
                              <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                                {categoryPermissions.map((permission) => (
                                  <label
                                    key={permission.key}
                                    className={clsx(
                                      'flex items-center gap-1 px-1 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-all cursor-pointer',
                                      isAllPermissions ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/10 dark:hover:text-blue-300',
                                      form.permissions.includes(permission.key) && !isAllPermissions && 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700'
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={form.permissions.includes(permission.key) || isAllPermissions}
                                      onChange={() => handlePermissionToggle(permission.key)}
                                      disabled={isAllPermissions}
                                      className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-1 focus:ring-blue-500/40 flex-shrink-0"
                                    />
                                    <span className="truncate">{permission.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white -mx-4 -mb-4 px-4 py-3 rounded-b-lg dark:border-slate-700 dark:bg-slate-900">
            <CRMCancelButton onClick={closeDetail} />
            {detail?.mode === 'edit' && (
              <button
                type="button"
                onClick={() => detail && handleToggleActive(detail.userId, !form.active)}
                className={clsx(
                  'rounded-md border px-4 py-2 text-xs font-semibold shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                  form.active
                    ? 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 hover:shadow dark:border-rose-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-900/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                  detail?.userId === currentUser.id && form.active && 'opacity-50 cursor-not-allowed'
                )}
                disabled={detail?.userId === currentUser.id && form.active}
              >
                {form.active ? 'Désactiver' : 'Réactiver'}
              </button>
            )}
            <CRMSubmitButton type={detail?.mode === 'create' ? 'create' : 'update'}>
              {detail?.mode === 'create' ? 'Créer l\'utilisateur' : 'Enregistrer les modifications'}
            </CRMSubmitButton>
          </div>
        </form>
      </CRMModal>
    </div>
  );
};

export default UsersAdminPage;
