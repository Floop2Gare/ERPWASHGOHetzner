import { type AppPageKey } from '../lib/rbac';

export type SidebarNavigationLink = {
  to: string;
  label: string;
  page: AppPageKey;
};

export const SIDEBAR_NAVIGATION_LINKS: SidebarNavigationLink[] = [
  { to: '/tableau-de-bord', label: 'Tableau de bord', page: 'dashboard' },
  { to: '/clients', label: 'Clients', page: 'clients' },
  { to: '/lead', label: 'Prospects', page: 'leads' },
  { to: '/service', label: 'Services', page: 'service' },
  { to: '/workspace/comptabilite/achats', label: 'Achats', page: 'comptabilite.achats' },
  { to: '/workspace/crm/planning', label: 'Planning', page: 'planning' },
  { to: '/stats', label: 'Statistiques', page: 'stats' },
];
