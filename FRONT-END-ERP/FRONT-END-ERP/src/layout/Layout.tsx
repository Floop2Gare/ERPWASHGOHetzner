import { ReactNode, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileQuickNav } from './MobileQuickNav';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth <= 1366;
  });

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

  return (
    <div
      className={clsx(
        'app-shell min-h-screen transition-colors duration-200',
        isCompactViewport && 'app-shell--compact'
      )}
      data-viewport={isCompactViewport ? 'compact' : 'regular'}
    >
      <Sidebar
        variant="mobile"
        open={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        onNavigate={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar
          variant="desktop"
          onNavigate={() => setIsMobileSidebarOpen(false)}
          compact={isCompactViewport}
        />
        <div className="flex flex-1 flex-col">
          <Topbar onMenuToggle={() => setIsMobileSidebarOpen(true)} />
          <MobileQuickNav />
          <main className="flex-1 px-4 pb-12 pt-4 sm:px-5 md:px-6 lg:px-6 lg:pb-12 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
