import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useAppData } from '../store/useAppData';
import {
  getWorkspaceModule,
  WORKSPACE_MODULES,
  type WorkspaceModuleId,
} from './modules';
import { WorkspaceLayout } from './WorkspaceLayout';

type WorkspaceModuleRouteProps = {
  moduleId: WorkspaceModuleId;
};

export const WorkspaceModuleRoute = ({ moduleId }: WorkspaceModuleRouteProps) => {
  const module = getWorkspaceModule(moduleId);
  const isAuthenticated = useAppData((state) => state.currentUserId !== null);
  const hasPageAccess = useAppData((state) => state.hasPageAccess);
  const location = useLocation();

  const fallbackModule = useMemo(
    () =>
      WORKSPACE_MODULES.find((candidate) =>
        candidate.accessPages.some((page) => hasPageAccess(page))
      ),
    [hasPageAccess]
  );

  const accessibleItems = useMemo(() => {
    if (!module) {
      return [];
    }
    return module.nav
      .flatMap((section) => section.items)
      .filter((item) => hasPageAccess(item.page));
  }, [module, hasPageAccess]);

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }

  if (!module) {
    return fallbackModule ? (
      <Navigate to={fallbackModule.basePath} replace />
    ) : (
      <Navigate to="/" replace />
    );
  }

  const canAccessModule = module.accessPages.some((page) => hasPageAccess(page));

  if (!canAccessModule) {
    if (fallbackModule && fallbackModule.id !== module.id) {
      return <Navigate to={fallbackModule.basePath} replace />;
    }
    return <Navigate to="/" replace />;
  }

  if (location.pathname === module.basePath || location.pathname === `${module.basePath}/`) {
    const defaultItem = accessibleItems.find((item) => item.to !== module.basePath) ?? accessibleItems[0];
    if (defaultItem && defaultItem.to && defaultItem.to !== module.basePath) {
      return <Navigate to={defaultItem.to} replace />;
    }
  }

  return (
    <WorkspaceLayout module={module}>
      <Outlet />
    </WorkspaceLayout>
  );
};

