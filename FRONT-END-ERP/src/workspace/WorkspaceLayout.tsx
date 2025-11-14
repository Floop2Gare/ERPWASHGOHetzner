import {
  createContext,
  useContext,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import clsx from 'clsx';
import { Topbar } from '../layout/Topbar';
import { Sidebar } from '../layout/Sidebar';
import type { WorkspaceModuleConfig } from './modules';
import { WorkspaceMobileQuickNav } from './WorkspaceMobileQuickNav';
import type { SidebarNavigationLink } from '../layout/navigationLinks';

type WorkspaceLayoutProps = {
  module: WorkspaceModuleConfig;
  children: ReactNode;
};

const WorkspaceModuleContext = createContext<WorkspaceModuleConfig | null>(null);

export const useWorkspaceModule = () => {
  const context = useContext(WorkspaceModuleContext);
  if (!context) {
    throw new Error('useWorkspaceModule doit être utilisé à l’intérieur de WorkspaceLayout');
  }
  return context;
};

export const WorkspaceLayout = ({ module, children }: WorkspaceLayoutProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth <= 1366;
  });
  const [isDesktopSidebarHidden, setIsDesktopSidebarHidden] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 1366px)');
    const updateMatches = (matches: boolean) => {
      setIsCompactViewport(matches);
    };

    updateMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      updateMatches(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleScroll = () => {
      setHasScrolled(window.scrollY > 48);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showFloatingTopbar = !isCompactViewport && hasScrolled;

  const memoizedModule = useMemo(() => module, [module]);

  const moduleSidebarLinks = useMemo<SidebarNavigationLink[]>(
    () =>
      memoizedModule.nav.flatMap((section) =>
        section.items.map((item) => ({
          to: item.to,
          label: item.label,
          page: item.page,
        }))
      ),
    [memoizedModule]
  );

  return (
    <WorkspaceModuleContext.Provider value={memoizedModule}>
      <div
        className={clsx(
          'workspace-shell min-h-screen transition-colors duration-200',
          isCompactViewport && 'workspace-shell--compact'
        )}
        data-viewport={isCompactViewport ? 'compact' : 'regular'}
      >
        <Sidebar
          variant="mobile"
          open={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          onNavigate={() => setIsMobileSidebarOpen(false)}
          links={moduleSidebarLinks}
        />
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Sidebar
            variant="desktop"
            onNavigate={() => setIsMobileSidebarOpen(false)}
            compact={isCompactViewport}
            hidden={isDesktopSidebarHidden}
            onToggleVisibility={() => setIsDesktopSidebarHidden((value) => !value)}
            links={moduleSidebarLinks}
          />
          <div className="flex flex-1 flex-col">
            <Topbar
              onMenuToggle={() => setIsMobileSidebarOpen(true)}
              isDesktopSidebarHidden={isDesktopSidebarHidden}
              onToggleDesktopSidebar={() => setIsDesktopSidebarHidden((value) => !value)}
              searchInputId={`workspace-${module.id}-search`}
            />
            {showFloatingTopbar && (
              <Topbar
                variant="floating"
                searchInputId={`workspace-${module.id}-search-floating`}
                onMenuToggle={() => setIsMobileSidebarOpen(true)}
                isDesktopSidebarHidden={isDesktopSidebarHidden}
                onToggleDesktopSidebar={() => setIsDesktopSidebarHidden((value) => !value)}
              />
            )}
            <WorkspaceMobileQuickNav />
            <main className="flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pb-14 lg:pt-10">
              {children}
            </main>
          </div>
        </div>
      </div>
    </WorkspaceModuleContext.Provider>
  );
};

