import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import { RowActionButton } from '../components/RowActionButton';
import { useAppData } from '../store/useAppData';
import {
  APP_PAGE_OPTIONS,
  PERMISSION_OPTIONS,
  USER_ROLE_LABELS,
  type AppPageKey,
  type PermissionKey,
  type UserRole,
} from '../lib/rbac';
import { IconEdit, IconArchive, IconDocument } from '../components/icons';
import { BRAND_NAME } from '../lib/branding';

const initialFormState = {
  username: '',
  password: '',
  role: 'agent' as UserRole,
  pages: [] as (AppPageKey | '*')[],
  permissions: [] as (PermissionKey | '*')[],
  active: true,
  resetPassword: '',
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

  const currentUser = getCurrentUser();

  const [detail, setDetail] = useState<DetailState | null>(null);
  const [form, setForm] = useState<UserFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const passwordResetRef = useRef<HTMLInputElement | null>(null);

  const orderedUsers = useMemo(
    () =>
      [...authUsers].sort((a, b) => a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' })),
    [authUsers]
  );

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
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Accès restreint</h1>
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

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setFormError('Identifiant et mot de passe requis.');
      return;
    }
    const result = createUserAccount({
      username: form.username,
      password: form.password,
      role: form.role,
      pages: isAllPages ? ['*'] : form.pages,
      permissions: isAllPermissions ? ['*'] : form.permissions,
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
    });
    if (!result.success) {
      setFormError(result.error ?? 'Échec de la mise à jour.');
      return;
    }
    setFormError(null);
    setDetail({ mode: 'edit', userId: detail.userId });
  };

  const handleToggleActive = (userId: string, active: boolean) => {
    const result = setUserActiveState(userId, active);
    if (!result.success) {
      setFormError(result.error ?? 'Action impossible.');
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

  const tableRows = orderedUsers.map((user) => {
    const pageLabels = user.pages.includes('*')
      ? ['Tous les modules']
      : user.pages.map((page) => APP_PAGE_OPTIONS.find((option) => option.key === page)?.label ?? page);
    const permissionLabels = user.permissions.includes('*')
      ? ['Toutes les fonctionnalités']
      : user.permissions.map(
          (permission) => PERMISSION_OPTIONS.find((option) => option.key === permission)?.label ?? permission
        );
    const isCurrent = currentUser?.id === user.id;
    return [
      (
        <div className="space-y-1" key={`user-${user.id}`}>
          <p className="text-sm font-semibold text-slate-900">{user.username}</p>
          <p className="text-xs text-slate-500">{user.fullName}</p>
        </div>
      ),
      <span key={`role-${user.id}`} className="text-xs font-medium text-slate-600">
        {USER_ROLE_LABELS[user.role]}
      </span>,
      <span key={`pages-${user.id}`} className="text-xs text-slate-500">
        {formatList(pageLabels)}
      </span>,
      <span key={`permissions-${user.id}`} className="text-xs text-slate-500">
        {formatList(permissionLabels)}
      </span>,
      <span
        key={`status-${user.id}`}
        className={clsx(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
          user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
        )}
      >
        {user.active ? 'Actif' : 'Désactivé'}
      </span>,
      (
        <div className="flex items-center gap-2" key={`actions-${user.id}`}>
          <RowActionButton label="Modifier" onClick={() => openEdit(user.id)}>
            <IconEdit />
          </RowActionButton>
          <RowActionButton label="Réinitialiser le mot de passe" onClick={() => openPasswordReset(user.id)}>
            <IconDocument />
          </RowActionButton>
          <RowActionButton
            label={user.active ? 'Désactiver' : 'Réactiver'}
            onClick={() => handleToggleActive(user.id, !user.active)}
            tone={user.active ? 'danger' : 'default'}
            {...(isCurrent && user.active ? { disabled: true } : {})}
          >
            <IconArchive />
          </RowActionButton>
        </div>
      ),
    ];
  });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/70">Administration</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Gestion des utilisateurs</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              Créez, mettez à jour et contrôlez les accès des collaborateurs {BRAND_NAME}.
            </p>
          </div>
          {canManageUsers && <Button onClick={openCreate}>Nouvel utilisateur</Button>}
        </div>
      </header>

      <section className="space-y-4">
        <Table
          columns={[
            'Utilisateur',
            'Rôle',
            'Pages',
            'Permissions',
            'Statut',
            'Actions',
          ]}
          rows={tableRows}
          tone="plain"
          bordered
          dividers
        />
      </section>

      {detail && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200/80 bg-[#f7f8fa] px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/70">
              {detail.mode === 'create' ? 'Créer un utilisateur' : 'Mettre à jour un utilisateur'}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {detail.mode === 'create' ? 'Nouvel accès' : form.username}
            </h2>
          </header>
          <form onSubmit={detail.mode === 'create' ? handleCreateSubmit : handleEditSubmit} className="px-6 py-6 text-sm">
            <div className="grid gap-6 lg:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Identifiant</span>
                <input
                  type="text"
                  value={form.username}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  disabled={detail.mode === 'edit'}
                  className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
              {detail.mode === 'create' && (
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Mot de passe</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </label>
              )}
              {detail.mode === 'edit' && (
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Nouveau mot de passe</span>
                  <div className="flex gap-2">
                    <input
                      ref={passwordResetRef}
                      type="password"
                      value={form.resetPassword}
                      onChange={(event) => setForm((prev) => ({ ...prev, resetPassword: event.target.value }))}
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="Saisir un nouveau mot de passe"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handlePasswordReset}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </label>
              )}
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rôle</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
                  className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {USER_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-soft border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pages</span>
                  <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                    <input
                      type="checkbox"
                      checked={isAllPages}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          pages: event.target.checked ? ['*'] : prev.pages.filter((item) => item !== '*'),
                        }))
                      }
                      className="table-checkbox h-3.5 w-3.5 rounded focus:ring-primary/40"
                    />
                    Tous les modules
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {APP_PAGE_OPTIONS.map((page) => (
                    <label key={page.key} className={clsx('flex items-center gap-2 text-xs text-slate-600', isAllPages && 'opacity-50')}>
                      <input
                        type="checkbox"
                        checked={form.pages.includes(page.key) || isAllPages}
                        onChange={() => handlePageToggle(page.key)}
                        disabled={isAllPages}
                        className="table-checkbox h-3.5 w-3.5 rounded focus:ring-primary/40"
                      />
                      {page.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-soft border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Permissions</span>
                  <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
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
                      className="table-checkbox h-3.5 w-3.5 rounded focus:ring-primary/40"
                    />
                    Toutes les fonctionnalités
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {PERMISSION_OPTIONS.map((permission) => (
                    <label
                      key={permission.key}
                      className={clsx('flex items-center gap-2 text-xs text-slate-600', isAllPermissions && 'opacity-50')}
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(permission.key) || isAllPermissions}
                        onChange={() => handlePermissionToggle(permission.key)}
                        disabled={isAllPermissions}
                        className="table-checkbox h-3.5 w-3.5 rounded focus:ring-primary/40"
                      />
                      {permission.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {formError && (
              <p className="mt-6 text-sm font-medium text-rose-600" role="alert">
                {formError}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <Button type="button" variant="ghost" onClick={closeDetail}>
                Fermer
              </Button>
              {detail.mode === 'edit' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleToggleActive(detail.userId, !form.active)}
                  className={clsx(form.active ? 'text-rose-600 border-rose-200 hover:border-rose-300' : undefined)}
                  disabled={detail.userId === currentUser.id && form.active}
                >
                  {form.active ? 'Désactiver' : 'Réactiver'}
                </Button>
              )}
              <Button type="submit">{detail.mode === 'create' ? 'Créer' : 'Enregistrer'}</Button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
};

export default UsersAdminPage;
