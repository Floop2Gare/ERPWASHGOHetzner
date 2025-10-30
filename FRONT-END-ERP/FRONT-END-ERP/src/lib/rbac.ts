export type UserRole = 'superAdmin' | 'admin' | 'manager' | 'agent' | 'lecture';

export type AppPageKey =
  | 'dashboard'
  | 'clients'
  | 'leads'
  | 'service'
  | 'achats'
  | 'documents'
  | 'planning'
  | 'stats'
  | 'parametres'
  | 'parametres.utilisateurs';

export const APP_PAGE_OPTIONS: { key: AppPageKey; label: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'clients', label: 'Clients' },
  { key: 'leads', label: 'Leads' },
  { key: 'service', label: 'Services' },
  { key: 'achats', label: 'Achats' },
  { key: 'documents', label: 'Documents' },
  { key: 'planning', label: 'Planning' },
  { key: 'stats', label: 'Statistiques' },
  { key: 'parametres', label: 'Paramètres' },
  { key: 'parametres.utilisateurs', label: 'Paramètres · Utilisateurs' },
];

export type PermissionKey =
  | 'service.create'
  | 'service.edit'
  | 'service.duplicate'
  | 'service.invoice'
  | 'service.print'
  | 'service.email'
  | 'service.archive'
  | 'lead.edit'
  | 'lead.contact'
  | 'lead.convert'
  | 'lead.delete'
  | 'client.edit'
  | 'client.contact.add'
  | 'client.invoice'
  | 'client.quote'
  | 'client.email'
  | 'client.archive'
  | 'documents.view'
  | 'documents.edit'
  | 'documents.send'
  | 'settings.profile'
  | 'settings.companies'
  | 'settings.signatures'
  | 'settings.catalog'
  | 'settings.users'
  | 'settings.sidebar';

export const PERMISSION_OPTIONS: { key: PermissionKey; label: string }[] = [
  { key: 'service.create', label: 'Créer un service' },
  { key: 'service.edit', label: 'Modifier un service' },
  { key: 'service.duplicate', label: 'Dupliquer un service' },
  { key: 'service.invoice', label: 'Créer une facture' },
  { key: 'service.print', label: 'Imprimer une facture' },
  { key: 'service.email', label: 'Envoyer une facture' },
  { key: 'service.archive', label: 'Archiver un service' },
  { key: 'lead.edit', label: 'Modifier un lead' },
  { key: 'lead.contact', label: 'Contacter un lead' },
  { key: 'lead.convert', label: 'Convertir un lead' },
  { key: 'lead.delete', label: 'Supprimer un lead' },
  { key: 'client.edit', label: 'Modifier un client' },
  { key: 'client.contact.add', label: 'Ajouter un contact client' },
  { key: 'client.invoice', label: 'Créer une facture client' },
  { key: 'client.quote', label: 'Créer un devis client' },
  { key: 'client.email', label: 'Envoyer un email client' },
  { key: 'client.archive', label: 'Archiver un client' },
  { key: 'documents.view', label: 'Consulter les documents' },
  { key: 'documents.edit', label: 'Modifier les documents' },
  { key: 'documents.send', label: 'Envoyer des documents' },
  { key: 'settings.profile', label: 'Gérer le profil utilisateur' },
  { key: 'settings.companies', label: 'Gérer les entreprises' },
  { key: 'settings.signatures', label: 'Gérer les signatures email' },
  { key: 'settings.catalog', label: 'Gérer le catalogue services' },
  { key: 'settings.users', label: 'Gérer les utilisateurs' },
  { key: 'settings.sidebar', label: 'Configurer la sidebar' },
];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  superAdmin: 'Super administrateur',
  admin: 'Administrateur',
  manager: 'Manager',
  agent: 'Agent',
  lecture: 'Lecture seule',
};

export const normalizePages = (
  pages: readonly (AppPageKey | '*' | string)[]
): AppPageKey[] => {
  const allowed = new Set<AppPageKey>(APP_PAGE_OPTIONS.map((item) => item.key));
  const normalized: AppPageKey[] = [];
  for (const page of pages) {
    if (page === '*' || typeof page !== 'string') {
      continue;
    }
    const cast = page as AppPageKey;
    if (allowed.has(cast) && !normalized.includes(cast)) {
      normalized.push(cast);
    }
  }
  return normalized;
};

export const normalizePermissions = (
  permissions: readonly (PermissionKey | '*' | string)[]
): PermissionKey[] => {
  const allowed = new Set<PermissionKey>(PERMISSION_OPTIONS.map((item) => item.key));
  const normalized: PermissionKey[] = [];
  for (const permission of permissions) {
    if (permission === '*' || typeof permission !== 'string') {
      continue;
    }
    const cast = permission as PermissionKey;
    if (allowed.has(cast) && !normalized.includes(cast)) {
      normalized.push(cast);
    }
  }
  return normalized;
};
