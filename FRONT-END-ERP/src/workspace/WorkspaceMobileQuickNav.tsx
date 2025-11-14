import type { CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAppData } from '../store/useAppData';
import { useWorkspaceModule } from './WorkspaceLayout';

export const WorkspaceMobileQuickNav = () => {
  const module = useWorkspaceModule();
  const hasPageAccess = useAppData((state) => state.hasPageAccess);

  const items = module.nav
    .flatMap((section) => section.items)
    .filter((item) => hasPageAccess(item.page));

  if (!items.length) {
    return null;
  }

  return (
    <nav className="lg:hidden border-b border-slate-200/70 bg-gradient-to-r from-white/92 via-slate-50/65 to-white/92 backdrop-blur-md dark:border-slate-800/70 dark:from-slate-950/92 dark:via-slate-900/88 dark:to-slate-950/94">
      <div className="mobile-nav-scroll w-full overflow-x-auto px-3 py-2 sm:px-5 md:px-6 lg:px-6">
        <ul className="flex w-max gap-3 text-xs text-slate-500">
          {items.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'inline-flex items-center gap-2 border-b pb-1 text-[12px] font-semibold uppercase tracking-[0.28em] transition',
                    isActive
                      ? 'border-[color:var(--module-accent)] text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  )
                }
                style={{ '--module-accent': module.accentColor } as CSSProperties}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

