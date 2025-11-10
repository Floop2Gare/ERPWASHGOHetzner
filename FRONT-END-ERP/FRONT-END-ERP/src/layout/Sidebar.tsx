import { useMemo, type ElementType } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import DesignServicesRoundedIcon from '@mui/icons-material/DesignServicesRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import { SIDEBAR_NAVIGATION_LINKS, type SidebarNavigationLink } from './navigationLinks';
import { useAppData } from '../store/useAppData';
import { BRAND_BASELINE, BRAND_NAME } from '../lib/branding';

interface SidebarProps {
  variant?: 'desktop' | 'mobile';
  open?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  compact?: boolean;
  hidden?: boolean;
  onToggleVisibility?: () => void;
}

const SIDEBAR_ICON_MAP: Partial<Record<SidebarNavigationLink['page'], ElementType>> = {
  dashboard: SpaceDashboardRoundedIcon,
  clients: PeopleAltRoundedIcon,
  leads: TrendingUpRoundedIcon,
  service: DesignServicesRoundedIcon,
  achats: ShoppingBagRoundedIcon,
  documents: DescriptionRoundedIcon,
  planning: EventNoteRoundedIcon,
  stats: InsightsRoundedIcon,
  parametres: SettingsRoundedIcon,
};

export const Sidebar = ({
  variant = 'desktop',
  open = false,
  onClose,
  onNavigate,
  compact = false,
  hidden = false,
  onToggleVisibility,
}: SidebarProps) => {
  const sidebarTitlePreference = useAppData((state) => state.sidebarTitlePreference);
  const hasPageAccess = useAppData((state) => state.hasPageAccess);
  const companies = useAppData((state) => state.companies);
  const activeCompanyId = useAppData((state) => state.activeCompanyId);
  const baseline = BRAND_BASELINE.trim();
  const showBaselineText = baseline.length > 0;

  const activeCompany = useMemo(() => {
    if (!companies.length) {
      return null;
    }
    return companies.find((company) => company.id === activeCompanyId) ?? companies[0];
  }, [companies, activeCompanyId]);

  const brandInitials = useMemo(() => {
    const source = activeCompany?.name?.trim() || BRAND_NAME;
    const chunks = source
      .split(/\s+/)
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase());
    if (chunks.length === 0) {
      return 'WA';
    }
    return chunks.slice(0, 2).join('');
  }, [activeCompany]);

  const activeCompanyLocation = useMemo(() => {
    if (!activeCompany) {
      return null;
    }
    const parts = [activeCompany.city, activeCompany.country].filter(Boolean);
    if (!parts.length) {
      return null;
    }
    return parts.join(' · ');
  }, [activeCompany]);

  const orderedLinks = useMemo(
    () => SIDEBAR_NAVIGATION_LINKS.filter((link) => hasPageAccess(link.page)),
    [hasPageAccess]
  );

  const handleNavigate = () => {
    onNavigate?.();
    if (variant === 'mobile') {
      onClose?.();
    }
  };

  const showSidebarHeader = !sidebarTitlePreference.hidden;
  const isCollapsed = variant === 'desktop' && compact;

  if (variant === 'desktop' && hidden) {
    return null;
  }

  const content = (
    <div
      className={clsx(
        'sidebar-panel flex h-full min-h-screen flex-col overflow-y-auto',
        variant === 'mobile' ? 'sidebar-panel--mobile' : 'sidebar-panel--desktop',
        isCollapsed && 'sidebar-panel--collapsed'
      )}
      data-collapsed={isCollapsed ? 'true' : undefined}
    >
      <header className="sidebar-panel__header">
        <div className="sidebar-panel__brand">
          <div className="sidebar-brand" aria-hidden="true">
            {activeCompany?.logoUrl ? (
              <img
                src={activeCompany.logoUrl}
                alt={`Logo ${activeCompany.name}`}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="sidebar-brand__fallback" aria-hidden>
                {brandInitials}
              </span>
            )}
          </div>
          {showSidebarHeader && (
            <div className="sidebar-panel__identity">
              <p className="sidebar-panel__app-name">{BRAND_NAME}</p>
              {showBaselineText && !isCollapsed && (
                <p className="sidebar-panel__baseline">{baseline}</p>
              )}
            </div>
          )}
          {variant === 'desktop' && onToggleVisibility && (
            <button
              type="button"
              className="sidebar-panel__toggle"
              onClick={() => onToggleVisibility?.()}
              aria-label="Masquer la navigation"
            >
              <MenuOpenRoundedIcon fontSize="small" />
            </button>
          )}
        </div>
        {activeCompany && !isCollapsed && (
          <div className="sidebar-panel__company" aria-label="Entreprise active">
            <p className="sidebar-panel__company-name">{activeCompany.name}</p>
            {activeCompanyLocation ? (
              <p className="sidebar-panel__company-meta">{activeCompanyLocation}</p>
            ) : null}
          </div>
        )}
        {variant === 'mobile' && (
          <button type="button" onClick={onClose} className="sidebar-panel__close">
            Fermer
          </button>
        )}
      </header>
      <nav className="sidebar-panel__nav" aria-label="Navigation principale">
        <ul className="sidebar-panel__list">
          {orderedLinks.map((link) => {
            const IconComponent = SIDEBAR_ICON_MAP[link.page];
            const fallbackInitial = link.label.trim().charAt(0).toUpperCase() || '•';
            return (
              <li key={link.to} className="sidebar-panel__item">
                <div className="sidebar-link-wrapper group">
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    aria-label={link.label}
                    title={isCollapsed ? link.label : undefined}
                    className={({ isActive }) =>
                      clsx(
                        'sidebar-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                        isActive ? 'sidebar-link--active' : 'sidebar-link--idle'
                      )
                    }
                    onClick={handleNavigate}
                  >
                    <span className="sidebar-link__icon" aria-hidden="true">
                      {IconComponent ? (
                        <IconComponent fontSize="small" />
                      ) : (
                        <span className="sidebar-link__icon-fallback">{fallbackInitial}</span>
                      )}
                    </span>
                    {!isCollapsed && (
                      <span className="sidebar-link__label flex-1 truncate">
                        {link.label}
                      </span>
                    )}
                  </NavLink>
                  {isCollapsed && (
                    <span className="sidebar-link__tooltip" role="tooltip">
                      {link.label}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="sidebar-panel__footer" />
    </div>
  );

  if (variant === 'mobile') {
    return (
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-transparent transition duration-200 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        aria-hidden={!open}
      >
        <div
          className={clsx(
            'absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity',
            open ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden
          onClick={onClose}
        />
        <div
          className={clsx(
            'absolute inset-y-0 left-0 w-72 max-w-[calc(100%-3rem)] transform transition-transform',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <aside
      className={clsx(
        'sidebar-desktop hidden flex-shrink-0 transition-[width] duration-200 lg:block',
        isCollapsed ? 'sidebar-desktop--collapsed' : 'sidebar-desktop--expanded'
      )}
      data-collapsed={isCollapsed ? 'true' : undefined}
    >
      {content}
    </aside>
  );
};
