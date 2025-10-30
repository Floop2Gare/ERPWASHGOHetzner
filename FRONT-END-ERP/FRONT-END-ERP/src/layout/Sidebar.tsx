import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { SIDEBAR_NAVIGATION_LINKS, SidebarNavigationLink } from './navigationLinks';
import { useSidebarNavigationStore } from '../store/useSidebarNavigationOrder';
import { useAppData } from '../store/useAppData';
import { BRAND_BASELINE, BRAND_NAME } from '../lib/branding';

interface SidebarProps {
  variant?: 'desktop' | 'mobile';
  open?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  compact?: boolean;
}

const moveItem = (items: SidebarNavigationLink[], from: number, to: number) => {
  const next = [...items];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
};

export const Sidebar = ({
  variant = 'desktop',
  open = false,
  onClose,
  onNavigate,
  compact = false,
}: SidebarProps) => {
  const { order, setOrder, resetOrder, ensureLatest } = useSidebarNavigationStore((state) => ({
    order: state.order,
    setOrder: state.setOrder,
    resetOrder: state.resetOrder,
    ensureLatest: state.ensureLatest,
  }));

  const sidebarTitlePreference = useAppData((state) => state.sidebarTitlePreference);
  const hasPageAccess = useAppData((state) => state.hasPageAccess);
  const companies = useAppData((state) => state.companies);
  const activeCompanyId = useAppData((state) => state.activeCompanyId);
  const baseline = BRAND_BASELINE.trim();
  const showBaselineText = baseline.length > 0;

  useEffect(() => {
    ensureLatest();
  }, [ensureLatest]);

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

  const orderedLinks = useMemo(() => {
    const linkMap = new Map(SIDEBAR_NAVIGATION_LINKS.map((link) => [link.to, link]));
    return order
      .map((path) => linkMap.get(path))
      .filter((link): link is SidebarNavigationLink => Boolean(link))
      .filter((link) => hasPageAccess(link.page));
  }, [order, hasPageAccess]);

  const [isEditing, setIsEditing] = useState(false);
  const [draftOrder, setDraftOrder] = useState<SidebarNavigationLink[]>(orderedLinks);
  const [draggingKeyState, setDraggingKeyState] = useState<string | null>(null);
  const draggingKeyRef = useRef<string | null>(null);

  const setDraggingKey = useCallback((value: string | null) => {
    draggingKeyRef.current = value;
    setDraggingKeyState(value);
  }, []);

  useEffect(() => {
    setDraftOrder(orderedLinks);
  }, [orderedLinks]);

  const handleNavigate = useCallback(() => {
    onNavigate?.();
    if (variant === 'mobile') {
      onClose?.();
    }
  }, [onClose, onNavigate, variant]);

  const displayedLinks = isEditing ? draftOrder : orderedLinks;

  const handleStartEditing = () => {
    setDraftOrder(orderedLinks);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setDraftOrder(orderedLinks);
    setIsEditing(false);
    setDraggingKey(null);
  };

  const handleSaveEditing = () => {
    setOrder(draftOrder.map((link) => link.to));
    setIsEditing(false);
    setDraggingKey(null);
  };

  const handleResetOrder = () => {
    resetOrder();
    setDraftOrder(SIDEBAR_NAVIGATION_LINKS.filter((link) => hasPageAccess(link.page)));
    setDraggingKey(null);
  };

  const reorderDraft = useCallback((from: number, to: number) => {
    setDraftOrder((current) => {
      const boundedTo = Math.max(0, Math.min(current.length - 1, to));
      if (from === boundedTo) return current;
      return moveItem(current, from, boundedTo);
    });
  }, []);

  const handleDragStart = useCallback(
    (link: SidebarNavigationLink) => (event: DragEvent<HTMLDivElement>) => {
      if (!isEditing) return;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', link.to);
      setDraggingKey(link.to);
    },
    [isEditing, setDraggingKey]
  );

  const handleDragOver = useCallback(
    (index: number) => (event: DragEvent<HTMLDivElement>) => {
      if (!isEditing) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDraftOrder((current) => {
        const activeKey = draggingKeyRef.current;
        if (!activeKey) return current;
        const activeIndex = current.findIndex((item) => item.to === activeKey);
        if (activeIndex === -1 || activeIndex === index) {
          return current;
        }
        return moveItem(current, activeIndex, index);
      });
    },
    [isEditing]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingKey(null);
  }, [setDraggingKey]);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDraggingKey(null);
    },
    [setDraggingKey]
  );

  const handleMoveUp = (index: number) => {
    reorderDraft(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    reorderDraft(index, index + 1);
  };

  const handleItemKeyDown = (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      handleMoveUp(index);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      handleMoveDown(index);
    }
  };

  const draggingKey = draggingKeyState;

  const showSidebarHeader = !sidebarTitlePreference.hidden;
  const isCollapsed = variant === 'desktop' && compact && !isEditing;

  const content = (
    <div
      className={clsx(
        'sidebar-surface flex h-full min-h-screen flex-col overflow-y-auto pb-10 pt-8',
        variant === 'mobile' ? 'px-5 sidebar-surface--mobile' : 'px-5',
        isCollapsed && 'sidebar-surface--collapsed'
      )}
      data-collapsed={isCollapsed ? 'true' : undefined}
    >
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="sidebar-brand flex h-12 w-12 flex-shrink-0 items-center justify-center" aria-hidden="true">
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
            <div className="sidebar-header-text min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--txt-accent)' }}>
                {BRAND_NAME}
              </p>
              {showBaselineText && (
                <p className="text-xs" style={{ color: 'var(--txt-muted)' }}>
                  {baseline}
                </p>
              )}
            </div>
          )}
        </div>
        {variant === 'mobile' && (
          <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--txt-muted)' }}>
                Navigation
              </span>
            <button
              type="button"
              onClick={onClose}
                className="rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                style={{ color: 'var(--txt-accent)' }}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
      <nav className="space-y-4 text-sm font-medium">
        <ul className="space-y-1.5">
          {displayedLinks.map((link, index) => {
            return (
              <li key={link.to} className="list-none">
                {isEditing ? (
                  <div
                    role="button"
                    tabIndex={0}
                    draggable={isEditing}
                    onDragStart={handleDragStart(link)}
                    onDragOver={handleDragOver(index)}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    onKeyDown={handleItemKeyDown(index)}
                    className={clsx(
                      'sidebar-reorder group flex items-center justify-between rounded-2xl px-3 py-2 transition-all duration-150 ease-out',
                      draggingKey === link.to ? 'ring-1 ring-primary/40' : undefined
                    )}
                    aria-grabbed={draggingKey === link.to}
                    aria-label={`Réordonner ${link.label}`}
                  >
                    <div className="flex items-center gap-3">
                        <span className="select-none text-base" aria-hidden style={{ color: 'var(--txt-muted)' }}>
                          ≡
                        </span>
                        <span className="tracking-[0.06em]" style={{ color: 'var(--txt-primary)' }}>
                          {link.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-40"
                      style={{ color: 'var(--txt-accent)' }}
                      disabled={index === 0}
                      aria-label={`Déplacer ${link.label} vers le haut`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-40"
                      style={{ color: 'var(--txt-accent)' }}
                      disabled={index === displayedLinks.length - 1}
                      aria-label={`Déplacer ${link.label} vers le bas`}
                    >
                      ↓
                    </button>
                  </div>
                </div>
                ) : (
                  <div className="sidebar-link-wrapper group">
                    <NavLink
                      to={link.to}
                      end={link.to === '/'}
                      aria-label={link.label}
                      title={isCollapsed ? link.label : undefined}
                      className={({ isActive }) =>
                        clsx(
                          'sidebar-link flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                          isActive ? 'sidebar-link--active' : 'sidebar-link--idle'
                        )
                      }
                      onClick={handleNavigate}
                    >
                      <span className="sidebar-link__initial" aria-hidden="true">
                        {link.label.trim().charAt(0).toUpperCase() || '•'}
                      </span>
                      <span className="sidebar-link__label flex-1 truncate text-[13px] font-semibold tracking-wide">
                        {link.label}
                      </span>
                    </NavLink>
                    {isCollapsed && (
                      <span className="sidebar-link__tooltip" role="tooltip">
                        {link.label}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="sidebar-footer-actions flex flex-wrap items-center gap-2 pt-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleSaveEditing}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={handleCancelEditing}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600 transition hover:border-slate-300 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleResetOrder}
                className="ml-auto inline-flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary transition hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                Réinitialiser l'ordre
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartEditing}
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              style={{ color: 'var(--txt-accent)' }}
            >
              <span aria-hidden className="text-sm" style={{ color: 'var(--txt-muted)' }}>
                ≡
              </span>
              Modifier l'ordre
            </button>
          )}
        </div>
      </nav>
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
