# Plan d’intégration du design Soft UI dans “nouveau projet”

## Hypothèses de départ
- Le “nouveau projet” est une application React (CRA, Vite ou Next) avec support JSX et bundler moderne.
- La base de code dispose d’un dossier `src/` structuré (ex : `src/components`, `src/pages`, `src/styles`).
- Aucun design system existant, ou possibilité de le faire évoluer pour accueillir les composants Soft.
- Gestion globale de l’état assurée via Context ou autre solution (Redux, Zustand) mais extensible.

## Stratégie pas-à-pas

### 1. Préparation
- Cartographier l’UI actuelle : inventaire des layouts, composants communs, thèmes.
- Créer une branche dédiée `feature/soft-ui-integration`.
- Identifier les dépendances manquantes (MUI v5, emotion, chart.js, react-chartjs-2, react-router-dom@6 si absent).
- Vérifier les contraintes de licences et la compatibilité stylistique (palette, police).

### 2. Import & organisation du design
- Ajouter un dossier `src/soft-ui` (ou équivalent) pour isoler le design importé.
- Copier `src/assets/theme`, `src/components/Soft*`, `src/examples/**` en adaptant les chemins et alias d’import.
- Configurer `ThemeProvider` + `CacheProvider` (RTL) dans l’entrée (`src/App` ou `_app.tsx` pour Next).
- Instaurer le `SoftUIController` dans le composant racine ; ajuster si un autre state manager existe (wrap provider).

### 3. Migration page par page
- Ordre recommandé : `Dashboard` → `Tables` → `Billing` → `Profile` → `Virtual Reality` → `RTL` → `Sign In` → `Sign Up`.
- Pour chaque page :
  - Créer un layout/route cible dans le “nouveau projet”.
  - Importer les composants spécifiques (ex : `layouts/dashboard/components/*`).
  - Brancher la navigation au router existant (React Router, Next routes, etc.).
- Mettre en place des mock data modules pour assurer un rendu avant branchement sur des APIs réelles.

### 4. Adaptation des données & fonctionnalités
- Définir des services (ex : `src/services/billing.ts`) qui renvoient les data attendues par les cartes/tableaux.
- Créer des hooks (`useDashboardStats`, `useBillingData`) encapsulant chargement, loading, erreurs.
- Injecter les hooks dans les pages et remplacer les imports `layouts/.../data/*.js`.
- Pour l’auth, connecter les formulaires aux endpoints (`onSubmit`, gestion des tokens).

### 5. Harmonisation des styles
- Mapper les tokens Soft sur le thème éventuel du “nouveau projet” ; fusionner palettes si nécessaire.
- Vérifier les overrides MUI existants pour éviter conflits (ex : `ThemeProvider` custom).
- Introduire les variables (espacements, breakpoints) dans un fichier central si le “nouveau projet” utilise déjà un design system.
- Prévoir un mécanisme de theming (dark mode) si existant, en ajoutant les variantes dans `assets/theme`.

### 6. Tests visuels et fonctionnels
- Captures de référence (Chromatic, Percy ou Storybook) pour les composants importés.
- Tests fonctionnels légers avec Testing Library pour vérifier le rendering des pages critiques.
- Vérifier l’accessibilité (contrastes, focus) sur les nouveaux écrans.
- Tester la bascule RTL, le mini-sidenav et la navigation mobile.

### 7. Nettoyage & finalisation
- Supprimer les mocks devenus inutiles, documenter les nouveaux services.
- Mettre à jour la documentation interne (Storybook, guides).
- Lancer un audit Lighthouse pour performance et accessibilité.
- Préparer la fusion de branche (PR) avec revue design + QA.

## Conseils spécifiques issus de l’analyse
- Réutiliser `DashboardLayout` et `PageLayout` pour uniformiser marges et paddings.
- Centraliser les assets (images, icônes) ; prévoir un fallback si CDN différent.
- Pour le `Configurator`, décider s’il est utile en production ; sinon, isoler derrière un flag ou le retirer.
- Corriger les petits défauts identifiés (typo `cursor: "poiner"` dans SignUp).
- Anticiper l’évolution des datasets : définir des interfaces/types pour charts et tables afin de garantir la compatibilité.

## Risques & mitigations
- **Conflit de thème MUI** : risque de styles écrasés → isoler `ThemeProvider`, documenter overrides.
- **Croissance bundle (Chart.js)** : lazy-load des charts ou import partiel des chart types utilisés.
- **Responsive cassé** : réaliser des tests sur breakpoints clés, ajuster `Grid` et `SoftBox`.
- **Absence de logique métier** : mock data non remplacées → planifier l’intégration avec backend avant go-live.
- **RTL incomplet** : vérifier toutes les pages custom ; utiliser lins pour repérer `marginLeft` statique.

## Plan de suivi
- Revue design initiale avec l’équipe UI/UX pour valider la fidélité.
- Revues de code hebdomadaires sur la branche d’intégration.
- Validation QA (desktop + mobile) avant fusion.
- Handoff final : documentation + session de transfert vers l’équipe produit.

## Checklist finale “go-live”
- [ ] Thème Soft importé et appliqué sans régression.
- [ ] Pages principales (Dashboard, Tables, Billing, Profile) connectées à des données réelles.
- [ ] Pages d’auth reliées aux endpoints de login/signup.
- [ ] Tests visuels/QA validés (responsive, RTL, mini-sidenav).
- [ ] Documentation (`docs/dashboard/*.md`) partagée et à jour.
- [ ] Nettoyage des mocks et assets inutilisés effectué.

