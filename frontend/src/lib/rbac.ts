export type UserRole = 'superAdmin' | 'admin' | 'manager' | 'agent' | 'lecture';

export type AppPageKey =
  | 'dashboard'
  | 'clients'
  | 'leads'
  | 'devis'
  | 'service'
  | 'abonnement'
  | 'achats'
  | 'documents'
  | 'planning'
  | 'stats'
  | 'administratif'
  | 'administratif.overview'
  | 'administratif.fournisseurs'
  | 'administratif.team'
  | 'comptabilite'
  | 'comptabilite.achats'
  | 'comptabilite.facturesClients'
  | 'comptabilite.tva'
  | 'comptabilite.export'
  | 'comptabilite.documents'
  | 'parametres'
  | 'parametres.utilisateurs';

export const APP_PAGE_OPTIONS: { key: AppPageKey; label: string }[] = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'clients', label: 'Clients' },
  { key: 'leads', label: 'Prospects' },
  { key: 'devis', label: 'Devis' },
  { key: 'service', label: 'Services' },
  { key: 'abonnement', label: 'Abonnements' },
  { key: 'achats', label: 'Achats' },
  { key: 'documents', label: 'Documents' },
  { key: 'planning', label: 'Planning' },
  { key: 'stats', label: 'Statistiques' },
  { key: 'administratif', label: 'Planning Interventions' },
  { key: 'administratif.overview', label: 'Planning Interventions · Synthèse' },
  { key: 'administratif.fournisseurs', label: 'Planning Interventions · Fournisseurs' },
  { key: 'administratif.team', label: 'Planning Interventions · Équipe' },
  { key: 'comptabilite', label: 'Suivi Financier' },
  { key: 'comptabilite.achats', label: 'Suivi Financier · Achats' },
  { key: 'comptabilite.facturesClients', label: 'Suivi Financier · Factures clients' },
  { key: 'comptabilite.tva', label: 'Suivi Financier · TVA' },
  { key: 'comptabilite.export', label: 'Suivi Financier · Export' },
  { key: 'comptabilite.documents', label: 'Suivi Financier · Documents' },
  { key: 'parametres', label: 'Réglages Système' },
  { key: 'parametres.utilisateurs', label: 'Paramètres · Utilisateurs' },
];

export type PermissionKey =
  // Services
  | 'service.create'
  | 'service.edit'
  | 'service.duplicate'
  | 'service.invoice'
  | 'service.print'
  | 'service.email'
  | 'service.archive'
  | 'service.export'
  // Abonnements
  | 'abonnement.create'
  | 'abonnement.edit'
  | 'abonnement.delete'
  | 'abonnement.export'
  // Leads
  | 'lead.edit'
  | 'lead.contact'
  | 'lead.convert'
  | 'lead.delete'
  | 'lead.export'
  // Clients
  | 'client.edit'
  | 'client.contact.add'
  | 'client.invoice'
  | 'client.quote'
  | 'client.email'
  | 'client.archive'
  | 'client.export'
  // Achats
  | 'purchase.create'
  | 'purchase.edit'
  | 'purchase.delete'
  | 'purchase.export'
  // Documents
  | 'documents.view'
  | 'documents.create'
  | 'documents.edit'
  | 'documents.delete'
  | 'documents.send'
  // Planning
  | 'planning.view'
  | 'planning.create'
  | 'planning.edit'
  | 'planning.delete'
  // Comptabilité
  | 'accounting.view'
  | 'accounting.export'
  | 'accounting.invoice.create'
  | 'accounting.invoice.edit'
  | 'accounting.invoice.delete'
  | 'accounting.vat.view'
  // Statistiques
  | 'stats.view'
  // Paramètres
  | 'settings.view'
  | 'settings.profile'
  | 'settings.companies'
  | 'settings.catalog'
  | 'settings.users';

export const PERMISSION_OPTIONS: { key: PermissionKey; label: string }[] = [
  // Services
  { key: 'service.create', label: 'Créer un service' },
  { key: 'service.edit', label: 'Modifier un service' },
  { key: 'service.duplicate', label: 'Dupliquer un service' },
  { key: 'service.invoice', label: 'Créer une facture depuis un service' },
  { key: 'service.print', label: 'Imprimer une facture' },
  { key: 'service.email', label: 'Envoyer une facture par email' },
  { key: 'service.archive', label: 'Archiver un service' },
  { key: 'service.export', label: 'Exporter les services' },
  // Abonnements
  { key: 'abonnement.create', label: 'Créer un abonnement' },
  { key: 'abonnement.edit', label: 'Modifier un abonnement' },
  { key: 'abonnement.delete', label: 'Supprimer un abonnement' },
  { key: 'abonnement.export', label: 'Exporter les abonnements' },
  // Leads
  { key: 'lead.edit', label: 'Modifier un prospect' },
  { key: 'lead.contact', label: 'Contacter un prospect' },
  { key: 'lead.convert', label: 'Convertir un prospect en client' },
  { key: 'lead.delete', label: 'Supprimer un prospect' },
  { key: 'lead.export', label: 'Exporter les prospects' },
  // Clients
  { key: 'client.edit', label: 'Modifier un client' },
  { key: 'client.contact.add', label: 'Ajouter un contact client' },
  { key: 'client.invoice', label: 'Créer une facture client' },
  { key: 'client.quote', label: 'Créer un devis client' },
  { key: 'client.email', label: 'Envoyer un email client' },
  { key: 'client.archive', label: 'Archiver un client' },
  { key: 'client.export', label: 'Exporter les clients' },
  // Achats
  { key: 'purchase.create', label: 'Créer un achat' },
  { key: 'purchase.edit', label: 'Modifier un achat' },
  { key: 'purchase.delete', label: 'Supprimer un achat' },
  { key: 'purchase.export', label: 'Exporter les achats' },
  // Documents
  { key: 'documents.view', label: 'Consulter les documents' },
  { key: 'documents.create', label: 'Créer un document' },
  { key: 'documents.edit', label: 'Modifier un document' },
  { key: 'documents.delete', label: 'Supprimer un document' },
  { key: 'documents.send', label: 'Envoyer des documents' },
  // Planning
  { key: 'planning.view', label: 'Consulter le planning' },
  { key: 'planning.create', label: 'Créer un événement planning' },
  { key: 'planning.edit', label: 'Modifier un événement planning' },
  { key: 'planning.delete', label: 'Supprimer un événement planning' },
  // Comptabilité
  { key: 'accounting.view', label: 'Consulter la comptabilité' },
  { key: 'accounting.export', label: 'Exporter les données comptables' },
  { key: 'accounting.invoice.create', label: 'Créer une facture fournisseur' },
  { key: 'accounting.invoice.edit', label: 'Modifier une facture fournisseur' },
  { key: 'accounting.invoice.delete', label: 'Supprimer une facture fournisseur' },
  { key: 'accounting.vat.view', label: 'Consulter la TVA' },
  // Statistiques
  { key: 'stats.view', label: 'Consulter les statistiques' },
  // Paramètres
  { key: 'settings.view', label: 'Accéder aux paramètres' },
  { key: 'settings.profile', label: 'Gérer le profil utilisateur' },
  { key: 'settings.companies', label: 'Gérer les entreprises' },
  { key: 'settings.catalog', label: 'Gérer le catalogue services' },
  { key: 'settings.users', label: 'Gérer les utilisateurs' },
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
