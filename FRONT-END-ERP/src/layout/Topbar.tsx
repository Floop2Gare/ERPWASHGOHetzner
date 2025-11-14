import {
  FormEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

import { useAppData } from '../store/useAppData';
import { BRAND_NAME } from '../lib/branding';
import { formatCurrency, formatDate } from '../lib/format';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { getWorkspaceModule, type WorkspaceModuleId } from '../workspace/modules';

interface TopbarProps {
  onMenuToggle: () => void;
  isDesktopSidebarHidden: boolean;
  onToggleDesktopSidebar: () => void;
  variant?: 'default' | 'floating';
  searchInputId?: string;
  welcomeTitle?: string;
}

const IconSettings = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <circle cx="10" cy="10" r="3" strokeLinecap="round" strokeLinejoin="round" />
    <path
      d="M16.8 12.6a1.5 1.5 0 0 0 .3 1.65l.05.05a1.8 1.8 0 0 1 0 2.55 1.8 1.8 0 0 1-2.55 0l-.05-.05a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.35V18a1.8 1.8 0 0 1-1.8 1.8A1.8 1.8 0 0 1 8.4 18v-.08a1.5 1.5 0 0 0-.9-1.35 1.5 1.5 0 0 0-1.65.3l-.05.05a1.8 1.8 0 0 1-2.55 0 1.8 1.8 0 0 1 0-2.55l.05-.05a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.35-.9H2a1.8 1.8 0 0 1-1.8-1.8A1.8 1.8 0 0 1 2 8.4h.09a1.5 1.5 0 0 0 1.35-.9 1.5 1.5 0 0 0-.3-1.65l-.05-.05a1.8 1.8 0 0 1 0-2.55 1.8 1.8 0 0 1 2.55 0l.05.05a1.5 1.5 0 0 0 1.65.3 1.5 1.5 0 0 0 .9-1.35V2A1.8 1.8 0 0 1 10 0.2 1.8 1.8 0 0 1 11.8 2v.09a1.5 1.5 0 0 0 .9 1.35 1.5 1.5 0 0 0 1.65-.3l.05-.05a1.8 1.8 0 0 1 2.55 0 1.8 1.8 0 0 1 0 2.55l-.05.05a1.5 1.5 0 0 0-.3 1.65 1.5 1.5 0 0 0 1.35.9H18a1.8 1.8 0 0 1 1.8 1.8A1.8 1.8 0 0 1 18 12.2h-.09a1.5 1.5 0 0 0-1.35.9z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconSun = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <circle cx="10" cy="10" r="3.5" />
    <path d="M10 2.5v2" strokeLinecap="round" />
    <path d="M10 15.5v2" strokeLinecap="round" />
    <path d="M3.5 10h2" strokeLinecap="round" />
    <path d="M14.5 10h2" strokeLinecap="round" />
    <path d="M5.2 5.2l1.4 1.4" strokeLinecap="round" />
    <path d="M13.4 13.4l1.4 1.4" strokeLinecap="round" />
    <path d="M5.2 14.8l1.4-1.4" strokeLinecap="round" />
    <path d="M13.4 6.6l1.4-1.4" strokeLinecap="round" />
  </svg>
);

const IconMoon = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path
      d="M10.5 17a6.5 6.5 0 0 1-5.9-9.1A6 6 0 0 0 10 16a6 6 0 0 0 4.8-2.4A6.5 6.5 0 0 1 10.5 17z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BREADCRUMB_LABEL_OVERRIDES = new Map<string, string>([
  ['crm', 'CRM'],
  ['hub', 'Accueil'],
  ['accueil', 'Accueil'],
  ['parametres', 'Paramètres'],
  ['parametres general', 'Paramètres généraux'],
  ['tableau de bord', 'Tableau de bord'],
  ['tableau-de-bord', 'Tableau de bord'],
  ['clients', 'Clients'],
  ['leads', 'Leads'],
  ['services', 'Services'],
  ['documents', 'Documents'],
  ['planning', 'Planning'],
  ['stats', 'Statistiques'],
]);

const formatBreadcrumbLabel = (segment: string) => {
  const cleaned = segment.replace(/[-_]+/g, ' ').trim();
  if (!cleaned) {
    return segment;
  }

  const normalized = cleaned.toLowerCase();
  if (BREADCRUMB_LABEL_OVERRIDES.has(normalized)) {
    return BREADCRUMB_LABEL_OVERRIDES.get(normalized)!;
  }

  if (BREADCRUMB_LABEL_OVERRIDES.has(segment.toLowerCase())) {
    return BREADCRUMB_LABEL_OVERRIDES.get(segment.toLowerCase())!;
  }

  return cleaned.replace(/\b\p{L}/gu, (char) => char.toLocaleUpperCase());
};

export const Topbar = ({
  onMenuToggle,
  isDesktopSidebarHidden,
  onToggleDesktopSidebar,
  variant = 'default',
  searchInputId,
  welcomeTitle,
}: TopbarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isElevated, setIsElevated] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { clients, leads, engagements, services, computeEngagementTotals, documents, companies, userProfile, logout } =
    useAppData();
  const theme = useAppData((state) => state.theme);
  const toggleTheme = useAppData((state) => state.toggleTheme);
  const displayName = `${userProfile.firstName} ${userProfile.lastName}`.trim() || 'Utilisateur';
  const displayRole = userProfile.role || BRAND_NAME;
  const initials = `${userProfile.firstName.charAt(0) ?? ''}${userProfile.lastName.charAt(0) ?? ''}`
    .trim()
    .toUpperCase();

  const serviceById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company])), [companies]);

  const normalizedPath = useMemo(() => {
    if (!location.pathname) {
      return '/';
    }
    if (location.pathname.length > 1 && location.pathname.endsWith('/')) {
      return location.pathname.slice(0, -1);
    }
    return location.pathname;
  }, [location.pathname]);

  const breadcrumbItems = useMemo(() => {
    const items: { label: string; to: string | null }[] = [
      { label: 'Accueil', to: normalizedPath === '/' ? null : '/' },
    ];

    if (normalizedPath === '/' || normalizedPath === '') {
      return items;
    }

    const segments = normalizedPath.split('/').filter(Boolean);

    if (segments[0] === 'workspace') {
      const moduleId = segments[1] as WorkspaceModuleId | undefined;
      const module = moduleId ? getWorkspaceModule(moduleId) : undefined;
      if (module) {
        const moduleNavItems = module.nav.flatMap((section) => section.items);
        const isModuleRoot = segments.length <= 2;
        items.push({
          label: module.name,
          to: isModuleRoot ? null : module.basePath,
        });

        if (!isModuleRoot) {
          let cumulative = module.basePath;
          const detailSegments = segments.slice(2);
          detailSegments.forEach((segment, index) => {
            cumulative += `/${segment}`;
            const match = moduleNavItems.find((item) => item.to === cumulative);
            const label = match?.label ?? formatBreadcrumbLabel(segment);
            const isLast = index === detailSegments.length - 1;
            items.push({
              label,
              to: isLast ? null : match?.to ?? cumulative,
            });
          });
        }

        return items;
      }
    }

    let cumulative = '';
    segments.forEach((segment, index) => {
      cumulative += `/${segment}`;
      const isLast = index === segments.length - 1;
      items.push({
        label: formatBreadcrumbLabel(segment),
        to: isLast ? null : cumulative,
      });
    });

    return items;
  }, [normalizedPath]);

  const trimmedQuery = query.trim().toLowerCase();

  type ResultItem = {
    id: string;
    title: string;
    subtitle: string;
    kind: 'client' | 'lead' | 'engagement' | 'document';
    badge?: string;
  };

  const groups = useMemo(() => {
    if (!trimmedQuery) {
      return [] as { label: string; items: ResultItem[] }[];
    }

    const matchText = (value: string | undefined | null) =>
      value ? value.toLowerCase().includes(trimmedQuery) : false;

    const clientItems: ResultItem[] = clients
      .filter((client) => {
        const contactMatch = client.contacts.some((contact) => {
          if (!contact.active) {
            return false;
          }
          const fullName = `${contact.firstName} ${contact.lastName}`.trim();
          return (
            matchText(fullName) ||
            matchText(contact.email) ||
            matchText(contact.mobile) ||
            contact.roles.some((role) => matchText(role))
          );
        });
        return (
          matchText(client.name) ||
          matchText(client.email) ||
          matchText(client.city) ||
          matchText(client.siret) ||
          client.tags.some((tag) => matchText(tag)) ||
          contactMatch
        );
      })
      .slice(0, 6)
      .map((client) => {
        const billingContact = client.contacts.find((contact) => contact.active && contact.isBillingDefault);
        const fallbackContact =
          billingContact ?? client.contacts.find((contact) => contact.active);
        const subtitleParts = [
          client.city || undefined,
          fallbackContact ? `${fallbackContact.firstName} ${fallbackContact.lastName}`.trim() : undefined,
          fallbackContact?.email,
        ].filter(Boolean);
        return {
          id: client.id,
          kind: 'client',
          title: client.name,
          subtitle: subtitleParts.join(' • '),
        } satisfies ResultItem;
      });

    const leadItems: ResultItem[] = leads
      .filter((lead) => matchText(lead.company) || matchText(lead.contact) || matchText(lead.email))
      .slice(0, 6)
      .map((lead) => ({
        id: lead.id,
        kind: 'lead',
        title: lead.company || lead.contact,
        subtitle: [lead.contact || undefined, lead.email].filter(Boolean).join(' • '),
        badge: lead.status,
      }));

    const engagementItems: ResultItem[] = engagements
      .filter((engagement) => {
        const client = clientById.get(engagement.clientId);
        const service = serviceById.get(engagement.serviceId);
        const optionMatch = service?.options.some((option) => matchText(option.label));
        return (
          matchText(client?.name) ||
          matchText(service?.name) ||
          optionMatch ||
          matchText(engagement.kind === 'facture' ? 'facture' : engagement.kind === 'devis' ? 'devis' : 'service')
        );
      })
      .slice(0, 6)
      .map((engagement) => {
        const client = clientById.get(engagement.clientId);
        const service = serviceById.get(engagement.serviceId);
        const totals = computeEngagementTotals(engagement);
        const kindLabel = engagement.kind === 'facture' ? 'Facture' : engagement.kind === 'devis' ? 'Devis' : 'Service';
        return {
          id: engagement.id,
          kind: 'engagement',
          title: `${kindLabel} · ${client?.name ?? 'Client'}`,
          subtitle: [service?.name, formatDate(engagement.scheduledAt), formatCurrency(totals.price + totals.surcharge)]
            .filter(Boolean)
            .join(' • '),
          badge: engagement.status,
        } satisfies ResultItem;
      });

    const documentItems: ResultItem[] = documents
      .filter((document) => {
        const companyName = document.companyId ? companyById.get(document.companyId)?.name : undefined;
        const tagMatch = document.tags.some((tag) => matchText(tag));
        return (
          matchText(document.title) ||
          matchText(document.category) ||
          matchText(document.owner) ||
          matchText(companyName) ||
          tagMatch
        );
      })
      .slice(0, 6)
      .map((document) => {
        const companyName = document.companyId ? companyById.get(document.companyId)?.name : undefined;
        return {
          id: document.id,
          kind: 'document' as const,
          title: document.title,
          subtitle: [document.category, companyName, document.owner].filter(Boolean).join(' • '),
          badge: document.source,
        } satisfies ResultItem;
      });

    const nextGroups: { label: string; items: ResultItem[] }[] = [];
    if (clientItems.length) {
      nextGroups.push({ label: 'Clients', items: clientItems });
    }
    if (leadItems.length) {
      nextGroups.push({ label: 'Leads', items: leadItems });
    }
    if (engagementItems.length) {
      nextGroups.push({ label: 'Documents & prestations', items: engagementItems });
    }
    if (documentItems.length) {
      nextGroups.push({ label: 'Documents', items: documentItems });
    }
    return nextGroups;
  }, [
    clients,
    leads,
    engagements,
    documents,
    clientById,
    serviceById,
    companyById,
    computeEngagementTotals,
    trimmedQuery,
  ]);

  const flatResults = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsFocused(false);
      }
    };

    window.addEventListener('mousedown', handleDocumentClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
      window.removeEventListener('mousedown', handleDocumentClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (flatResults.length > 0) {
      handleSelect(flatResults[0]);
    }
  };

  const handleSelect = (item: ResultItem) => {
    setQuery('');
    setIsFocused(false);
    if (item.kind === 'client') {
      navigate(`/workspace/crm/clients?clientId=${item.id}`);
    } else if (item.kind === 'lead') {
      navigate(`/workspace/crm/leads?leadId=${item.id}`);
    } else if (item.kind === 'engagement') {
      navigate(`/workspace/crm/services?engagementId=${item.id}`);
    } else if (item.kind === 'document') {
      navigate(`/workspace/administratif/documents?documentId=${item.id}`);
    }
  };

  const handleResultMouseDown = (event: ReactMouseEvent<HTMLButtonElement>, item: ResultItem) => {
    event.preventDefault();
    handleSelect(item);
  };

  const handleBlur = () => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsFocused(false);
    }, 120);
  };

  const handleMenuNavigate = (path: string) => {
    setIsUserMenuOpen(false);
    navigate(path);
  };


  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleScroll = () => {
      setIsElevated(window.scrollY > 16);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const topbarDesktopCols = isDesktopSidebarHidden
    ? 'lg:grid-cols-[auto_minmax(0,1fr)_auto]'
    : 'lg:grid-cols-[auto_minmax(0,1fr)_auto]';

  return (
    <header
      className={clsx('topbar-shell', variant === 'floating' && 'topbar-shell--floating')}
      data-elevated={isElevated ? 'true' : undefined}
    >
      <div
        className={clsx(
          'topbar grid w-full gap-3 px-4 py-3 sm:px-6 lg:items-center lg:gap-6',
          topbarDesktopCols,
          variant === 'floating' && 'topbar--floating'
        )}
      >
        <div className="flex items-center gap-3">
          {isDesktopSidebarHidden && (
            <button
              type="button"
              onClick={onToggleDesktopSidebar}
              className="topbar__icon-button hidden h-10 w-10 items-center justify-center rounded-xl text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:inline-flex"
              aria-label="Afficher la navigation"
            >
              <MenuRoundedIcon fontSize="small" />
            </button>
          )}
          <Link to="/" className="topbar__brand lg:hidden">
            <span className="topbar__brand-mark">WF</span>
            <span className="topbar__brand-text">
              <span>Wash&Go</span>
              <small>App</small>
            </span>
          </Link>
          {welcomeTitle && (
            <div className="hidden lg:flex">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {welcomeTitle}
              </h1>
            </div>
          )}
          <button
            type="button"
            onClick={onMenuToggle}
            className="topbar__icon-button inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <span className="sr-only">Ouvrir le menu</span>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="topbar__middle order-3 w-full space-y-2 lg:order-none lg:flex lg:flex-row lg:items-center lg:justify-center lg:gap-6 lg:space-y-0">
          <nav className="topbar__breadcrumbs lg:flex lg:items-center lg:justify-center" aria-label="Fil d’Ariane">
            <ol className="lg:flex lg:items-center lg:justify-center lg:gap-2">
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                return (
                  <li
                    key={`${item.label}-${index}`}
                    className="topbar__breadcrumb-item"
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {index !== 0 && <span className="topbar__breadcrumb-separator">{'>'}</span>}
                    {item.to && !isLast ? (
                      <Link to={item.to} className="topbar__breadcrumb-link">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="topbar__breadcrumb-current">{item.label}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          <form onSubmit={handleSubmit} className="topbar__search w-full lg:max-w-md">
            <label htmlFor={searchInputId} className="sr-only">
              Rechercher
            </label>
            <div className="relative">
              <input
                id={searchInputId}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                placeholder="Rechercher clients, prestations ou documents"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none"
                autoComplete="off"
              />
              {isFocused && trimmedQuery && (
                <div className="absolute left-0 right-0 z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface shadow-sm">
                  {flatResults.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-muted">Aucun résultat</p>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {groups.map((group) => (
                        <div key={group.label} className="py-2">
                          <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
                            {group.label}
                          </p>
                          <ul className="space-y-1">
                            {group.items.map((item) => (
                              <li key={item.id}>
                                <button
                                  type="button"
                                  onMouseDown={(event) => handleResultMouseDown(event, item)}
                                  className="group flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-text transition-colors hover:bg-surface"
                                >
                                  <span>
                                    <span className="block font-medium text-text group-hover:text-primary">{item.title}</span>
                                    <span className="mt-0.5 block text-xs text-muted">{item.subtitle}</span>
                                  </span>
                                  {item.badge && (
                                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted">
                                      {item.badge}
                                    </span>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>
        <div className="topbar__actions flex items-center justify-end gap-3">
          <div className="topbar__identity hidden text-right text-[11px] uppercase tracking-[0.28em] lg:block">
            <p className="topbar__identity-name text-sm font-semibold">{displayName}</p>
            <p className="topbar__identity-role text-[10px]">{displayRole}</p>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((open) => !open)}
              className="topbar__avatar-button flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              aria-label={isUserMenuOpen ? 'Fermer le menu utilisateur' : 'Ouvrir le menu utilisateur'}
            >
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span>{initials || 'WA'}</span>
              )}
            </button>
            {isUserMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-3 w-56 rounded-xl border border-border bg-surface p-2 text-sm text-text shadow-sm"
              >
                <div className="px-3 pb-2 text-xs uppercase tracking-[0.28em] text-muted">{displayName}</div>
                <button
                  type="button"
                  role="menuitem"
          onClick={() => handleMenuNavigate('/workspace/parametres/general?tab=profil')}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface hover:text-primary"
                >
                  Mon profil
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                    navigate('/connexion');
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface hover:text-primary"
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="topbar__icon-button inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <Link
            to="/workspace/parametres/general"
            className="topbar__icon-button inline-flex h-10 w-10 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="Accéder aux paramètres"
            title="Accéder aux paramètres"
          >
            <IconSettings />
          </Link>
        </div>
      </div>
    </header>
  );
};
