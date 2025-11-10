# RTL

## Rôle & audience
- **Objectif** : démontrer le support “Right-to-Left” avec contenu en arabe et inversion du layout.
- **Utilisateurs cibles** : équipes produit/design qui doivent localiser l’app pour langues RTL.
- **Interactions clés** : identiques à la page Dashboard, mais dans un contexte RTL.

## Structure visuelle
- **Fichier principal** : `layouts/rtl/index.js`, calqué sur `layouts/dashboard/index.js`.
- Sections : KPI, cartes narratives, graphiques, projets/commande (`components` spécifiques sous `layouts/rtl/components/*` pour traductions).
- Utilise `DashboardLayout`, `DashboardNavbar`, `Footer`.

## Logique & état
- `useEffect` invoque `setDirection(dispatch, "rtl")` au montage puis restaure `ltr` au démontage.
- Données statiques via `layouts/rtl/data/*`.
- Aucun état supplémentaire ; dépend du contexte global pour forcer `ThemeProvider` RTL dans `App.js`.

## Dépendances
- Même stack que Dashboard : `MiniStatisticsCard`, `ReportsBarChart`, `GradientLineChart`.
- `@emotion` cache RTL créé dans `App.js` (`createCache` + `stylis-plugin-rtl`).

## Responsive & variations
- Comportement identique à Dashboard mais inversion de colonnes (grille MUI gère automatiquement grâce au thème RTL).
- Typographie arabe rendue via Roboto ; veiller à charger polices adaptées si remanié.

## Particularités graphiques
- Titres et libellés traduits en arabe, alignement à droite automatique.
- Icônes restent cohérents, direction des flèches/paginations inversée par MUI RTL.

## Points d’attention
- Toujours encapsuler la page dans `CacheProvider` RTL (géré au niveau `App`).
- Penser à réinitialiser direction lors de la navigation vers pages LTR.
- Tester les composants custom pour vérifier qu’ils n’emploient pas de styles inline supposant LTR (ex marges `ml` vs `mr`).

## Checklist de reproduction
- [ ] Implémenter la bascule directionnelle via contexte global (`setDirection`).
- [ ] Créer un cache Emotion RTL et connecter au `ThemeProvider`.
- [ ] Adapter toutes les sections Dashboard avec contenu RTL.
- [ ] Vérifier alignement et ordre des colonnes sur tailles multiples.
- [ ] Préparer le chargement de polices compatibles RTL si nécessaire.

