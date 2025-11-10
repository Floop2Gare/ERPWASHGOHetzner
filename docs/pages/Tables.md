# Tables

## Rôle & audience
- **Objectif** : présenter des tables standards (auteurs, projets) illustrant la liste d’utilisateurs et le suivi de livrables.
- **Utilisateurs cibles** : responsables RH/ops, chefs de projet.
- **Interactions clés** : lecture de statuts, action “Edit” (lien placeholder), survol de rangées.

## Structure visuelle
- **Fichier principal** : `layouts/tables/index.js` dans `DashboardLayout`.
- **Bloc 1** : `Card` MUI contenant le titre “Authors table” + composant `examples/Tables/Table` alimenté par `layouts/tables/data/authorsTableData.js`.
- **Bloc 2** : second `Card` pour “Projects table” utilisant `layouts/tables/data/projectsTableData.js`.
- **Entêtes** : `SoftTypography variant="h6"` ; stylisation des bordures via `sx`.

## Logique & état
- Données statiques sous forme d’objets `columns` & `rows` ; chaque cellule peut être un composant React (`SoftBadge`, `SoftAvatar`).
- Pas d’état local ; tout est purement présentational.
- Table MUI gère le tri et l’affichage ; pas de pagination native.

## Dépendances
- `@mui/material/Card`, `SoftBox`, `SoftTypography`.
- `examples/Tables/Table` encapsule `Table` MUI + styles Soft.
- `SoftBadge`, `SoftAvatar` pour cellules custom.

## Responsive & variations
- Chaque `Card` occupe largeur complète (`Grid` non utilisé ici) ; responsive géré via overflow auto dans `Table`.
- Bordures fines supprimées sur la dernière ligne grâce au `sx` conditionnel.

## Particularités graphiques
- Style “soft” : badges en gradient, avatars arrondis, alignement centre/gauche selon colonnes.
- Cartes avec padding 24px (p={3}) cohérent avec reste du dashboard.

## Points d’attention
- Maintenir la structure `columns/rows` pour permettre l’extension (ex : ajout actions).
- Prévoir un wrapper `SoftBox` avec règles de bordure pour imiter l’apparence.
- Si données dynamiques → remplacer mocks par fetch + mapping vers format attendu.

## Checklist de reproduction
- [ ] Recréer deux cartes empilées avec titres et actions.
- [ ] Reproduire le composant Table générique acceptant `columns`/`rows`.
- [ ] Mettre en place les cellules custom (avatar + texte, badge status, liens).
- [ ] Appliquer les styles de bordure conditionnels.
- [ ] Vérifier la lisibilité sur mobile (scroll horizontal).

