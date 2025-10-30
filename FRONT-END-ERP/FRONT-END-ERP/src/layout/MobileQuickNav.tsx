import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAppData } from '../store/useAppData';

const links = [
  { to: '/', label: 'Tableau', page: 'dashboard' as const },
  { to: '/service', label: 'Services', page: 'service' as const },
  { to: '/achats', label: 'Achats', page: 'achats' as const },
  { to: '/documents', label: 'Documents', page: 'documents' as const },
  { to: '/clients', label: 'Clients', page: 'clients' as const },
  { to: '/planning', label: 'Planning', page: 'planning' as const },
  { to: '/lead', label: 'Leads', page: 'leads' as const },
  { to: '/stats', label: 'Analyses', page: 'stats' as const },
  { to: '/parametres', label: 'Paramètres', page: 'parametres' as const },
];

export const MobileQuickNav = () => {
  const hasPageAccess = useAppData((state) => state.hasPageAccess);
  const accessibleLinks = links.filter((link) => hasPageAccess(link.page));
  return (
    <nav className="lg:hidden border-b border-slate-200/70 bg-gradient-to-r from-white/92 via-sky-50/65 to-white/92 backdrop-blur-md dark:border-slate-800/70 dark:from-slate-950/92 dark:via-slate-900/88 dark:to-slate-950/94">
      <div className="mobile-nav-scroll w-full overflow-x-auto px-3 py-2 sm:px-5 md:px-6 lg:px-6">
        <ul className="flex w-max gap-4 text-xs text-slate-500">
          {accessibleLinks.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'inline-flex items-center border-b pb-1 text-[12px] font-medium uppercase tracking-[0.28em] transition',
                    isActive
                      ? 'border-primary text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  )
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};
