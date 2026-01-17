import { useLocation } from 'react-router-dom';
import { ProfileSection } from './settings/ProfileSection';
import { CompaniesSection } from './settings/CompaniesSection';
import { CatalogSection } from './settings/CatalogSection';
import { useAppData } from '../store/useAppData';
import { BRAND_FULL_TITLE } from '../lib/branding';

const sections = [
  { id: 'profile', label: 'Profil utilisateur' },
  { id: 'companies', label: 'Entreprises' },
  { id: 'catalog', label: 'Catalogue de prestations' },
  { id: 'users', label: 'Utilisateurs' },
] as const;

type SectionId = (typeof sections)[number]['id'];

const SettingsPage = () => {
  const { getCurrentUser } = useAppData();
  const currentUser = getCurrentUser();
  const location = useLocation();
  const sectionFromPath = location.pathname.split('/').pop() || 'profile';

  // Fonction pour vérifier l'accès aux onglets Paramètres
  const hasSettingsPermission = (sectionId: SectionId): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'superAdmin') return true;
    
    switch (sectionId) {
      case 'profile':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.profile');
      case 'companies':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.companies');
      case 'catalog':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.catalog');
      case 'users':
        return currentUser.permissions.includes('*') || currentUser.permissions.includes('settings.users');
      default:
        return false;
    }
  };

  // Filtrer les sections selon les permissions
  const availableSections = sections.filter(section => hasSettingsPermission(section.id));
  
  const fallbackSection: SectionId = availableSections[0]?.id ?? 'profile';
  const requestedSection = sections.find((section) => section.id === sectionFromPath)?.id ?? null;
  const activeSection: SectionId = requestedSection ?? fallbackSection;

  return (
    <div className="space-y-10">
      <div className="space-y-12">
        {availableSections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200">Accès restreint</h3>
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                Vous n'avez pas les permissions nécessaires pour accéder aux paramètres.
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Contactez votre administrateur pour obtenir les permissions appropriées.
              </p>
            </div>
          </div>
        )}

        {availableSections.length > 0 && !hasSettingsPermission(activeSection) && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-700 shadow-sm dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-100">Accès restreint</h3>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              Vous n&apos;avez pas les permissions nécessaires pour consulter cette section.
            </p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Contactez votre administrateur pour obtenir les accès appropriés.
            </p>
          </div>
        )}

        {activeSection === 'profile' && hasSettingsPermission('profile') && <ProfileSection />}
        {activeSection === 'companies' && hasSettingsPermission('companies') && <CompaniesSection />}
        {activeSection === 'catalog' && hasSettingsPermission('catalog') && <CatalogSection />}
        {activeSection === 'users' && hasSettingsPermission('users') && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-700 shadow-sm dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-100">Section Utilisateurs</h3>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              La gestion des utilisateurs sera implémentée prochainement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;

