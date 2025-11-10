# Dashboard

## Rôle & audience
- **Objectif** : page d’atterrissage principale présentant KPIs financiers, activités courantes et suivi de projets.
- **Utilisateurs cibles** : managers, responsables marketing/ventes, équipe produit.
- **Interactions clés** : lecture rapide des cartes KPI, exploration des graphiques d’activité, navigation vers projets ou rapports via liens “Read More”.

## Structure visuelle
- **Enveloppe** : `layouts/dashboard/index.js` encapsulé dans `examples/LayoutContainers/DashboardLayout`, avec `DashboardNavbar` en tête et `Footer`.
- **Hero KPI** (`SoftBox mb={3}`) : grille 4 colonnes (mini KPI) via `examples/Cards/StatisticsCards/MiniStatisticsCard`.
- **Section “Build by developers / Work with the rockets”** : `layouts/dashboard/components/BuildByDevelopers` (carte gradient + visuel) et `WorkWithTheRockets` (carte texte + CTA).
- **Section analytics** : `examples/Charts/BarCharts/ReportsBarChart` + `examples/Charts/LineCharts/GradientLineChart` alimentés par `layouts/dashboard/data/*`.
- **Section bas de page** : `layouts/dashboard/components/Projects` (tableau cartes projets) et `OrderOverview` (timeline commandes).

## Logique & état
- Aucun état global propre ; consommation du contexte pour marges layout.
- Données issues de mocks (`layouts/dashboard/data/reportsBarChartData.js`, `gradientLineChartData.js`, `projects.js`, etc.).
- Composants charts gèrent internement animation et options via props `chart`, `items`.

## Dépendances
- `@mui/material/Grid`, `SoftBox`, `SoftTypography` pour la mise en page.
- Charts via `react-chartjs-2` / `chart.js`.
- Icônes MUI (`<Icon>`).

## Responsive & variations
- Grilles `Grid item xs={12} sm={6} xl={3}` : passage 1 → 2 → 4 colonnes selon largeur.
- Les sections `BuildByDevelopers` et `WorkWithTheRockets` empilées sur mobile (xs: 12) et juxtaposées dès `lg`.
- Les cartes charts adaptent leur hauteur, padding conditionné par props.

## Particularités graphiques
- Usage de gradients info/violet sur cartes illustrées.
- Icônes MUI dans bulles colorées pour KPIs.
- Composition glass-morphism sur `Projects` (fond semi transparent + blur via styles).

## Points d’attention pour reproduction
- Respecter l’ordre des sections pour conserver le storytelling de haut de page.
- Réimplémenter `MiniStatisticsCard` avec props `title`, `count`, `percentage`, `icon`.
- Prévoir injection de vraies données (APIs) ; assurer compatibilité des datasets avec `react-chartjs-2`.
- Vérifier que le layout top conserve `SoftBox py={3}` pour cohérence spacing.

## Checklist de reproduction
- [ ] Recréer le layout Dashboard avec `DashboardNavbar` + `Footer`.
- [ ] Implémenter la grille de 4 KPI responsives.
- [ ] Reproduire les deux cartes narratives (`BuildByDevelopers`, `WorkWithTheRockets`).
- [ ] Intégrer un bar chart + line chart avec données dynamiques.
- [ ] Ajouter la section projets (cartes) et “Order overview” (timeline).
- [ ] Tester l’affichage sur xs/sm/lg (alignement, padding).

