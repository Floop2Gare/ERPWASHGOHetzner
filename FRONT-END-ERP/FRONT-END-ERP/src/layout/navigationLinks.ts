import { type AppPageKey } from '../lib/rbac';

export type SidebarNavigationLink = {
  to: string;
  label: string;
  page: AppPageKey;
};

export const SIDEBAR_NAVIGATION_LINKS: SidebarNavigationLink[] = [
  { to: '/', label: 'Tableau de bord', page: 'dashboard' },
  { to: '/clients', label: 'Clients', page: 'clients' },
  { to: '/lead', label: 'Leads', page: 'leads' },
  { to: '/service', label: 'Services', page: 'service' },
  { to: '/achats', label: 'Achats', page: 'achats' },
  { to: '/documents', label: 'Documents', page: 'documents' },
  { to: '/planning', label: 'Planning', page: 'planning' },
  { to: '/stats', label: 'Statistiques', page: 'stats' },
  { to: '/parametres', label: 'Paramètres', page: 'parametres' },
];
