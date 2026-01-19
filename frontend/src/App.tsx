import { useEffect, useMemo, useState, useRef, lazy, Suspense, memo } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserBackpack } from './hooks/useUserBackpack';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import LeadPage from './pages/LeadPage';
import ServicePage from './pages/ServicePage';
import DevisPage from './pages/DevisPage';
import SiteWebPage from './pages/SiteWebPage';
import PurchasesPage from './pages/PurchasesPage';
import PlanningPage from './pages/PlanningPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import UsersAdminPage from './pages/UsersAdminPage';
import WorkspacePortalPage from './pages/WorkspacePortalPage';
import ClientInvoicesPage from './pages/comptabilite/ClientInvoicesPage';
import VatPage from './pages/comptabilite/VatPage';
import AccountingExportPage from './pages/comptabilite/AccountingExportPage';
import TeamPage from './pages/administratif/TeamPage';
import AdministratifDocumentsPage from './pages/AdministratifDocumentsPage';
import MobileLoginPage from './pages/mobile/MobileLoginPage';
import MobileLayout from './pages/mobile/MobileLayout';
import MobilePrestationsPage from './pages/mobile/MobilePrestationsPage';
import MobileDevisPage from './pages/mobile/MobileDevisPage';
import MobileCreateDevisPage from './pages/mobile/MobileCreateDevisPage';
import MobileCreateProspectPage from './pages/mobile/MobileCreateProspectPage';
import MobileCreateClientPage from './pages/mobile/MobileCreateClientPage';
import MobileProspectsPage from './pages/mobile/MobileProspectsPage';
import MobileClientsPage from './pages/mobile/MobileClientsPage';
import MobileProfilPage from './pages/mobile/MobileProfilPage';
import MobileDashboardPage from './pages/mobile/MobileDashboardPage';
import MobileFacturesPage from './pages/mobile/MobileFacturesPage';

// Lazy load de la page de facturation pour améliorer les performances
const MobileFacturationPage = lazy(() => import('./pages/mobile/MobileFacturationPage'));
import { useAppData } from './store/useAppData';
import type { AppPageKey } from './lib/rbac';
import { useBackendSync } from './hooks/useBackendSync';
import { useMobileDetection } from './hooks/useMobileDetection';
import { WorkspaceModuleRoute } from './workspace/WorkspaceModuleRoute';
import { WORKSPACE_MODULES } from './workspace/modules';
import { AuthService } from './api';

const RequirePage = ({ page, children }: { page: AppPageKey; children: JSX.Element }) => {
  // Vérifier l'authentification via AuthService (JWT)
  const isAuthenticated = AuthService.isAuthenticated();
  const hasPageAccess = useAppData((state) => state.hasPageAccess);
  const getCurrentUser = useAppData((state) => state.getCurrentUser);
  const user = getCurrentUser();

  // Debug logs
  console.log('[RequirePage] Vérification accès:', {
    page,
    isAuthenticated,
    user: user ? { id: user.id, username: user.username, pages: user.pages, permissions: user.permissions } : null,
    hasAccess: hasPageAccess(page),
  });

  // Si pas authentifié, rediriger vers la connexion
  if (!isAuthenticated) {
    console.log('[RequirePage] Non authentifié, redirection vers /connexion');
    return <Navigate to="/connexion" replace />;
  }

  // Vérifier les permissions - si l'utilisateur n'a pas accès, rediriger vers une page accessible
  if (!hasPageAccess(page)) {
    console.warn('[RequirePage] Accès refusé pour la page:', page, 'Pages utilisateur:', user?.pages);
    // Trouver une page accessible
    for (const module of WORKSPACE_MODULES) {
      const accessibleItem = module.nav
        .flatMap((section) => section.items)
        .find((item) => hasPageAccess(item.page));
      if (accessibleItem) {
        console.log('[RequirePage] Redirection vers:', accessibleItem.to);
        return <Navigate to={accessibleItem.to} replace />;
      }
    }
    // Si aucune page accessible, rediriger vers la connexion
    console.warn('[RequirePage] Aucune page accessible, redirection vers /connexion');
    return <Navigate to="/connexion" replace />;
  }

  console.log('[RequirePage] Accès autorisé pour:', page);
  return children;
};

const App = () => {
  console.log('🔵 [App] RENDER', {
    timestamp: new Date().toISOString(),
    stack: new Error().stack?.split('\n').slice(1, 3).join('\n')
  });
  
  // Vérifier l'authentification via AuthService (JWT)
  const isAuthenticated = AuthService.isAuthenticated();
  const theme = useAppData((state) => state.theme);
  const isMobile = useMobileDetection();
  
  console.log('🔵 [App] État', { isAuthenticated, isMobile, theme });
  
  // Charger le "sac à dos" utilisateur (entreprise, paramètres, stats)
  const { isLoading: isLoadingBackpack } = useUserBackpack();
  console.log('🔵 [App] useUserBackpack', { isLoading: isLoadingBackpack });
  
  // Vérifier le token au démarrage et récupérer les infos utilisateur
  // Ne PAS vérifier si on vient de se connecter (évite les boucles)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  
  useEffect(() => {
    // Ne vérifier qu'une seule fois au démarrage, pas à chaque changement de isAuthenticated
    if (hasCheckedAuth) {
      return;
    }
    
    // Protection globale pour éviter les appels multiples
    if ((window as any).__checkingAuth) {
      return;
    }
    (window as any).__checkingAuth = true;
    
    const checkAuth = async () => {
      const token = AuthService.getToken();

      if (!token) {
        useAppData.setState({ currentUserId: null });
        setHasCheckedAuth(true);
        (window as any).__checkingAuth = false;
        return;
      }

      if (isAuthenticated) {
        try {
          // Ne pas appeler getCurrentUser si useUserBackpack l'a déjà fait
          // Le backpack contient déjà les infos utilisateur
          const currentUserId = useAppData.getState().currentUserId;
          if (!currentUserId) {
            // Attendre un peu pour laisser useUserBackpack charger les données
            await new Promise((resolve) => setTimeout(resolve, 300));
            
            // Vérifier à nouveau si currentUserId a été défini par useUserBackpack
            const userIdAfterBackpack = useAppData.getState().currentUserId;
            if (!userIdAfterBackpack) {
              // Seulement alors appeler getCurrentUser
              const result = await AuthService.getCurrentUser();
              if (result.success && result.data) {
                useAppData.setState({ currentUserId: result.data.id });
              } else {
                useAppData.setState({ currentUserId: null });
              }
            }
          }
        } catch (error: any) {
          if (!error?.message?.includes('401') && !error?.message?.includes('Session expirée')) {
            console.debug('[App] Erreur lors de la vérification de l\'authentification:', error);
          }
        }
      } else {
        useAppData.setState({ currentUserId: null });
      }

      setHasCheckedAuth(true);
      (window as any).__checkingAuth = false;
    };
    
    // Vérifier uniquement au démarrage
    checkAuth();
  }, [hasCheckedAuth, isAuthenticated]);
  
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


  // Si on est en mode mobile, afficher l'interface mobile complète
  if (isMobile) {
    const MobileRootRedirect = () => {
      // Vérifier le flag de non-rechargement
      const noReload = sessionStorage.getItem('erpwashgo-no-reload');
      if (noReload === 'true') {
        // Ne pas rediriger si on vient de se connecter (évite les boucles)
        sessionStorage.removeItem('erpwashgo-no-reload');
      }
      
      const mobileIsAuth = AuthService.isAuthenticated();
      return <Navigate to={mobileIsAuth ? "/mobile/prestations" : "/mobile/login"} replace />;
    };

    const MobileProtectedRoute = ({ children }: { children: JSX.Element }) => {
      const [isAuth, setIsAuth] = useState(() => AuthService.isAuthenticated());
      const hasCheckedRef = useRef(false);
      
      useEffect(() => {
        // Vérifier l'authentification seulement une fois au montage et après un délai
        if (hasCheckedRef.current) {
          return;
        }
        
        const checkAuth = () => {
          const auth = AuthService.isAuthenticated();
          setIsAuth(auth);
          hasCheckedRef.current = true;
        };
        
        // Vérifier immédiatement
        checkAuth();
        
        // Vérifier une seconde fois après un délai pour capturer les changements de token
        const timeout = setTimeout(() => {
          checkAuth();
        }, 500);
        
        return () => clearTimeout(timeout);
      }, []);
      
      if (!isAuth) {
        return <Navigate to="/mobile/login" replace />;
      }
      
      return children;
    };

    return (
      <Routes>
        <Route path="/" element={<MobileRootRedirect />} />
        <Route path="/connexion" element={<MobileLoginPage />} />
        <Route path="/mobile/login" element={<MobileLoginPage />} />
        <Route path="/mobile/*" element={
          <MobileProtectedRoute>
            <MobileLayout />
          </MobileProtectedRoute>
        }>
          <Route index element={<Navigate to="/mobile/dashboard" replace />} />
          <Route path="dashboard" element={<MobileDashboardPage />} />
          <Route path="prestations" element={<MobilePrestationsPage />} />
          <Route path="devis" element={<MobileDevisPage />} />
          <Route path="devis/create" element={<MobileCreateDevisPage />} />
          <Route 
            path="facturation" 
            element={
              <Suspense fallback={<div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>Chargement...</div>}>
                <MobileFacturationPage />
              </Suspense>
            } 
          />
          <Route path="prospects" element={<MobileProspectsPage />} />
          <Route path="prospects/create" element={<MobileCreateProspectPage />} />
          <Route path="clients" element={<MobileClientsPage />} />
          <Route path="clients/create" element={<MobileCreateClientPage />} />
          <Route path="factures" element={<MobileFacturesPage />} />
          <Route path="profil" element={<MobileProfilPage />} />
          <Route path="*" element={<Navigate to="/mobile/dashboard" replace />} />
        </Route>
      </Routes>
    );
  }

  // Sinon, afficher l'interface desktop normale
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
          path="devis"
          element={
            <RequirePage page="devis">
              <DevisPage />
            </RequirePage>
          }
        />
        <Route
          path="achats"
          element={<Navigate to="/workspace/comptabilite/achats" replace />}
        />
        <Route
          path="statistiques"
          element={
            <RequirePage page="stats">
              <StatsPage />
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
        <Route
          path="planning"
          element={
            <RequirePage page="planning">
              <PlanningPage />
            </RequirePage>
          }
        />
        <Route
          path="site-web"
          element={
            <RequirePage page="siteweb">
              <SiteWebPage />
            </RequirePage>
          }
        />
      </Route>
      <Route path="/workspace/comptabilite" element={<WorkspaceModuleRoute moduleId="comptabilite" />}>
        <Route
          element={
            <RequirePage page="comptabilite">
              <Outlet />
            </RequirePage>
          }
        >
          <Route index element={<Navigate to="factures-clients" replace />} />
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
        <Route index element={<Navigate to="profile" replace />} />
        <Route
          path="profile"
          element={
            <RequirePage page="parametres">
              <SettingsPage />
            </RequirePage>
          }
        />
        <Route
          path="companies"
          element={
            <RequirePage page="parametres">
              <SettingsPage />
            </RequirePage>
          }
        />
        <Route
          path="catalog"
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
      <Route path="/stats" element={<Navigate to="/workspace/crm/statistiques" replace />} />
      <Route path="/parametres" element={<Navigate to="/workspace/parametres/profile" replace />} />
      <Route path="/parametres/utilisateurs" element={<Navigate to="/workspace/parametres/utilisateurs" replace />} />
      {/* Redirections anciennes URLs avec query params */}
      <Route path="/workspace/parametres/general" element={<Navigate to="/workspace/parametres/profile" replace />} />
      <Route path="/administratif/*" element={<Navigate to="/workspace/crm" replace />} />
      <Route path="/workspace/administratif/*" element={<Navigate to="/workspace/crm" replace />} />
      <Route path="/workspace/administratif/equipe" element={<Navigate to="/workspace/crm/equipe" replace />} />
      <Route path="/workspace/administratif/planning" element={<Navigate to="/workspace/crm/planning" replace />} />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/' : '/connexion'} replace />}
      />
    </Routes>
  );
};

export default App;

