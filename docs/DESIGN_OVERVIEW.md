# Présentation Générale du Design

## Stack et outils
- **Framework principal** : `react` (app créée avec `react-scripts` / Create React App) ; rendu via `src/index.js`.
- **Langage** : JavaScript ES6+, JSX.
- **Build & tooling** : `react-scripts` fournit webpack, Babel, ESLint ; démarrage avec `npm start`, build avec `npm run build`.
- **Styling** : MUI v5 (`@mui/material`, `@emotion/*`) enrichi par un thème custom sous `src/assets/theme`.
- **Routing** : `react-router-dom@6` gère les routes déclarées dans `src/routes.js`.
- **Charts & widgets** : `chart.js` + `react-chartjs-2`, `react-countup`, `react-flatpickr`.
- **Utilitaires** : `uuid`, `ajv` (validation), `stylis-plugin-rtl` pour le support droite→gauche.

## Organisation du code
- `src/App.js` orchestre thème, contexte, routes et affichage du `Sidenav`/`Configurator`.
- `src/routes.js` décrit la navigation (type, icône, composant associé) ; utilisé par `examples/Sidenav`.
- `src/layouts/**` regroupe chaque page principale du dashboard (dashboard, tables, billing, virtual-reality, rtl, profile, authentication).
- `src/examples/**` contient les briques de design réutilisables (layouts containers, cartes, barres de navigation, tableaux, charts).
- `src/components/**` expose le design system “Soft” (SoftBox, SoftTypography, SoftButton, etc.) en surcouche de MUI.
- `src/assets/theme/**` définit tokens et overrides : couleurs, typos, breakpoints, ombres, composants MUI.
- `src/context/index.js` implémente `SoftUIController` (mini-sidenav, couleurs, layout courant, direction RTL/LTR, configurateur).
- `public/` contient `index.html` et assets statiques ; `src/assets/images` stocke la librairie d’illustrations et logos.

## Charte graphique
- **Palette** (`src/assets/theme/base/colors.js`) : primaire magenta (`#cb0c9f`), info cyan (`#17c1e8`), success vert lime (`#82d616`), warning jaune (`#fbcf33`), error rouge (`#ea0606`), neutres gris 100–900 ; fonds clairs (`#f8f9fa`).
- **Gradients** : set de dégradés par tonalité (primary  → violet/rose, info → bleu/cyan) utilisés sur cartes et boutons.
- **Typographies** : famille `"Roboto", "Helvetica", "Arial"` ; hiérarchie H1–H6 et styles display (`d1` à `d6`) décrits dans `base/typography.js` ; boutons en uppercase bold.
- **Breakpoints** : XS 0, SM 576, MD 768, LG 992, XL 1200, XXL 1400 (`base/breakpoints.js`) ; MUI `Grid` assure le responsive.
- **Tokens complémentaires** : rayons `lg` arrondis, ombres douces (`assets/theme/base/boxShadows.js`), effets glass-morphism sur certaines cartes.
- **Modes** : pas de dark mode natif ; support RTL complet via `theme-rtl.js` + `stylis-plugin-rtl`.

## Design system & conventions
- Composants préfixés `Soft` encapsulent MUI avec styles thématiques (ex : `components/SoftButton` applique gradients, arrondis, tailles).
- `SoftBox` (wrapper stylé) remplace `Box` pour gérer marges/padding via props ; `SoftTypography` gère couleurs et poids.
- Cartes et widgets modulaires dans `examples/Cards/**`, `examples/Charts/**`, `examples/Tables/Table`.
- Patterns récurrents : sections `SoftBox py={3}` regroupant `Grid` responsive, haut de page avec `DashboardNavbar`, pied `Footer`.
- Les layouts VR et auth utilisent des conteneurs dédiés (`layouts/virtual-reality/components/BaseLayout`, `layouts/authentication/components/CoverLayout|BasicLayout`).
- Conventions de nommage : camelCase pour fichiers JS, PascalCase pour composants, dossiers séparant data, components, styles.

## Navigation et layouts
- Navigation latérale (`examples/Sidenav`) rendue lorsque `layout === "dashboard"` dans `App.js`; s’adapte en “mini” < 1200px.
- `DashboardLayout` applique marges dépendantes du sidenav ; `Configurator` (flottant) permet de changer couleur du sidenav, activer mini-mode.
- Routes publiques uniquement ; redirection par défaut vers `/dashboard`.
- Auth pages (sign-in / sign-up) n’utilisent pas le layout dashboard ; elles s’appuient sur `BasicLayout`/`CoverLayout` avec fonds courbés.
- Layout VR passe `layout` à `vr` pour masquer le sidenav et afficher un environnement plein écran.

## Gestion d’état & données
- **Global** : `SoftUIController` (Context + reducer) pour état Ui (sidenav, direction, layout, configurateur).
- **Local** : hooks `useState` pour formulaires simples (remember me, agreement), interactions Configurator.
- **Données** : mock statiques dans `layouts/**/data/*.js` (tableaux, charts) ; aucune API externe ni requête HTTP ; `react-flatpickr` ou `chart.js` consomment ces mocks.
- **Routing guards / auth** : aucune logique, purement présentational. Les formulaires n’envoient pas de données.
- **Caching** : non applicable ; pas de GraphQL/REST.

## Particularités techniques
- Support RTL automatique (effet side effect dans `layouts/rtl/index.js` qui force la direction).
- Charts animés via `chart.js` (options configurées dans `examples/Charts/**`).
- Tables stylées avec overrides MUI via `sx`; badges et avatars cohérents.
- Accessibilité : usage d’icônes MUI, contraste correct, mais absence d’ARIA spécifiques.
- Tests : dépendances testing-library présentes mais pas de specs dans le repo.
- Internationalisation limitée (exemple RTL arabe, reste en anglais).

## Checklist de reproduction
- [ ] Initialiser un projet React compatible MUI + Emotion.
- [ ] Copier/adapter la structure `src/assets/theme` et injecter `ThemeProvider` + variantes RTL.
- [ ] Implémenter le contexte `SoftUIController` pour gérer sidenav, direction, configurateur.
- [ ] Recréer `components/Soft*` et `examples/**` essentiels (Sidenav, Navbar, Footer, cartes, charts, tables).
- [ ] Répliquer la navigation `routes.js` et le layout conditionnel dans `App`.
- [ ] Importer les jeux de données mock nécessaires ou prévoir leur remplacement via API.
- [ ] Vérifier le responsive avec les breakpoints MUI et les gradients/thèmes.
- [ ] Tester le toggle RTL et le mini-sidenav.
- [ ] Préparer un guide pour le futur dark mode si requis.

