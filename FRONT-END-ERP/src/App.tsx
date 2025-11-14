import { useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import LeadPage from './pages/LeadPage';
import ServicePage from './pages/ServicePage';
import PurchasesPage from './pages/PurchasesPage';
import PlanningPage from './pages/PlanningPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import UsersAdminPage from './pages/UsersAdminPage';
import WorkspacePortalPage from './pages/WorkspacePortalPage';
import AccountingDashboardPage from './pages/comptabilite/AccountingDashboardPage';
import ClientInvoicesPage from './pages/comptabilite/ClientInvoicesPage';
import VatPage from './pages/comptabilite/VatPage';
import AccountingExportPage from './pages/comptabilite/AccountingExportPage';
import AdministratifLayout from './pages/administratif/AdministratifLayout';
import AdministratifOverviewPage from './pages/administratif/OverviewPage';
import ProjectsPage from './pages/administratif/ProjectsPage';
import TeamPage from './pages/administratif/TeamPage';
import AdministratifDocumentsPage from './pages/AdministratifDocumentsPage';
import { useAppData } from './store/useAppData';
import type { AppPageKey } from './lib/rbac';
import { useBackendSync } from './hooks/useBackendSync';
import { WorkspaceModuleRoute } from './workspace/WorkspaceModuleRoute';
import { WORKSPACE_MODULES } from './workspace/modules';

const detectMobileUserAgent = (userAgent: string) =>
  /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(
    userAgent
  );

const shouldRenderMobile = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const forcedUi = params.get('ui');

  if (forcedUi === 'mobile') {
    return true;
  }

  if (forcedUi === 'desktop') {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || '';
  if (detectMobileUserAgent(userAgent)) {
    return true;
  }

  return window.matchMedia('(max-width: 768px)').matches;
};

const RequirePage = ({ page, children }: { page: AppPageKey; children: JSX.Element }) => {
  const isAuthenticated = useAppData((state) => state.currentUserId !== null);
  const hasPageAccess = useAppData((state) => state.hasPageAccess);

  const fallbackPath = useMemo(() => {
    if (!isAuthenticated) {
      return '/connexion';
    }
    for (const module of WORKSPACE_MODULES) {
      const accessibleItem = module.nav
        .flatMap((section) => section.items)
        .find((item) => hasPageAccess(item.page));
      if (accessibleItem) {
        return accessibleItem.to;
      }
    }
    return '/';
  }, [hasPageAccess, isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }

  if (!hasPageAccess(page)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

const App = () => {
  const isAuthenticated = useAppData((state) => state.currentUserId !== null);
  const theme = useAppData((state) => state.theme);
  const [renderMobileUI, setRenderMobileUI] = useState(false);
  
  // Synchronisation automatique (legacy Supabase supprimée)
  // Initialiser la synchronisation backend
  useBackendSync();

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const body = document.body;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const evaluate = () => {
      setRenderMobileUI(shouldRenderMobile());
    };

    evaluate();

    window.addEventListener('resize', evaluate);
    window.addEventListener('orientationchange', evaluate);

    return () => {
      window.removeEventListener('resize', evaluate);
      window.removeEventListener('orientationchange', evaluate);
    };
  }, []);

  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequirePage page="dashboard">
            <WorkspacePortalPage />
          </RequirePage>
        }
      />
      <Route path="/workspace/crm" element={<WorkspaceModuleRoute moduleId="crm" />}>
        <Route index element={<Navigate to="tableau-de-bord" replace />} />
        <Route
          path="tableau-de-bord"
          element={
            <RequirePage page="dashboard">
              <DashboardPage />
            </RequirePage>
          }
        />
        <Route
          path="clients"
          element={
            <RequirePage page="clients">
              <ClientsPage />
            </RequirePage>
          }
        />
        <Route
          path="leads"
          element={
            <RequirePage page="leads">
              <LeadPage />
            </RequirePage>
          }
        />
        <Route
          path="services"
          element={
            <RequirePage page="service">
              <ServicePage />
            </RequirePage>
          }
        />
        <Route
          path="achats"
          element={<Navigate to="/workspace/comptabilite/achats" replace />}
        />
        <Route
          path="planning"
          element={
            <RequirePage page="planning">
              <PlanningPage />
            </RequirePage>
          }
        />
        <Route
          path="statistiques"
          element={
            <RequirePage page="stats">
              <StatsPage />
            </RequirePage>
          }
        />
      </Route>
      <Route path="/workspace/administratif" element={<WorkspaceModuleRoute moduleId="administratif" />}>
        <Route
          element={
            <RequirePage page="administratif">
              <AdministratifLayout />
            </RequirePage>
          }
        >
          <Route
            index
            element={
              <RequirePage page="administratif.overview">
                <AdministratifOverviewPage />
              </RequirePage>
            }
          />
          <Route
            path="projets"
            element={
              <RequirePage page="administratif.projects">
                <ProjectsPage />
              </RequirePage>
            }
          />
          <Route
            path="equipe"
            element={
              <RequirePage page="administratif.team">
                <TeamPage />
              </RequirePage>
            }
          />
        </Route>
      </Route>
      <Route path="/workspace/comptabilite" element={<WorkspaceModuleRoute moduleId="comptabilite" />}>
        <Route
          element={
            <RequirePage page="comptabilite">
              <Outlet />
            </RequirePage>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <RequirePage page="comptabilite.dashboard">
                <AccountingDashboardPage />
              </RequirePage>
            }
          />
          <Route
            path="achats"
            element={
              <RequirePage page="comptabilite.achats">
                <PurchasesPage />
              </RequirePage>
            }
          />
          <Route
            path="factures-clients"
            element={
              <RequirePage page="comptabilite.facturesClients">
                <ClientInvoicesPage />
              </RequirePage>
            }
          />
          <Route
            path="tva"
            element={
              <RequirePage page="comptabilite.tva">
                <VatPage />
              </RequirePage>
            }
          />
          <Route
            path="export"
            element={
              <RequirePage page="comptabilite.export">
                <AccountingExportPage />
              </RequirePage>
            }
          />
          <Route
            path="documents"
            element={
              <RequirePage page="comptabilite.documents">
                <AdministratifDocumentsPage />
              </RequirePage>
            }
          />
        </Route>
      </Route>
      <Route path="/workspace/parametres" element={<WorkspaceModuleRoute moduleId="parametres" />}>
        <Route index element={<Navigate to="general?tab=profile" replace />} />
        <Route
          path="general"
          element={
            <RequirePage page="parametres">
              <SettingsPage />
            </RequirePage>
          }
        />
        <Route
          path="utilisateurs"
          element={
            <RequirePage page="parametres.utilisateurs">
              <UsersAdminPage />
            </RequirePage>
          }
        />
      </Route>
      {/* Redirections anciennes URLs */}
      <Route path="/tableau-de-bord" element={<Navigate to="/workspace/crm/tableau-de-bord" replace />} />
      <Route path="/clients" element={<Navigate to="/workspace/crm/clients" replace />} />
      <Route path="/lead" element={<Navigate to="/workspace/crm/leads" replace />} />
      <Route path="/service" element={<Navigate to="/workspace/crm/services" replace />} />
      <Route path="/achats" element={<Navigate to="/workspace/comptabilite/achats" replace />} />
      <Route path="/planning" element={<Navigate to="/workspace/crm/planning" replace />} />
      <Route path="/stats" element={<Navigate to="/workspace/crm/statistiques" replace />} />
      <Route path="/parametres" element={<Navigate to="/workspace/parametres/general?tab=profile" replace />} />
      <Route path="/parametres/utilisateurs" element={<Navigate to="/workspace/parametres/utilisateurs" replace />} />
      <Route path="/administratif/*" element={<Navigate to="/workspace/administratif" replace />} />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/' : '/connexion'} replace />}
      />
    </Routes>
  );
};

export default App;

