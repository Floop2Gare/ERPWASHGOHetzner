# Virtual Reality

## Rôle & audience
- **Objectif** : démontrer un espace immersif de productivité (météo, tâches, media) sans sidenav.
- **Utilisateurs cibles** : utilisateurs avancés recherchant un tableau de bord “plein écran”.
- **Interactions clés** : consultation de todo-list, emails, lecteur média ; boutons d’accès rapide (home, search).

## Structure visuelle
- **Fichier principal** : `layouts/virtual-reality/index.js` (composant `VRInfo`).
- **Base layout** : `layouts/virtual-reality/components/BaseLayout` gère l’arrière-plan VR et définit `layout = "vr"` (masque le sidenav).
- **Colonne latérale gauche** : avatar (`SoftAvatar`) + boutons icône (`SoftButton iconOnly`) avec `Tooltip`.
- **Header** : bloc météo (température, état) + illustration `sunCloud`.
- **Grille de contenu** : trois colonnes (`Grid item xs={12} md={4}`) avec :
  - `TodoList` (carte verte, toggle tasks).
  - `TodoCard` + `Emails` (cartes empilées).
  - `MediaPlayer` + `Messages`.

## Logique & état
- Layout utilise des données statiques ; certains composants (ex `TodoList`) contiennent une logique minimale (checkbox, compteurs).
- `useSoftUIController` configure `layout` via `BaseLayout`.
- Pas de fetch ; uniquement du rendu statique sur base de mocks.

## Dépendances
- `SoftBox`, `SoftTypography`, `SoftButton`, `SoftAvatar`.
- `Tooltip` MUI pour actions latérales.
- Images depuis `src/assets/images`.

## Responsive & variations
- Sur mobile (`xs`), la colonne latérale devient barre supérieure (flex row) grâce aux props `flexDirection`.
- Les trois colonnes principales s’empilent verticalement, chacune occupant 100%.
- Transformations CSS (`scale(1.1)`) pour accent VR ; veiller à l’impact sur petits écrans.

## Particularités graphiques
- Palette dominée par cyan et violet avec fonds translucides.
- Avatar flottant + boutons arrondis, effet `sx` pour bord radius `lg`.
- Iconographie MUI couplée à gradients.

## Points d’attention
- S’assurer que `setLayout(dispatch, "vr")` est respecté afin de désactiver le sidenav.
- Reproduire l’arrière-plan via `BaseLayout` (image courbe) et overlays.
- Prévoir un fallback responsive pour empêcher overflow dû au `transform: scale`.
- Les composants listés sont réutilisables ; isoler les styles dans le nouveau projet pour éviter dépendances globales.

## Checklist de reproduction
- [ ] Implémenter `BaseLayout` VR avec image de fond et `layout = "vr"`.
- [ ] Recréer la colonne d’actions (avatar + boutons + tooltips).
- [ ] Construire le header météo avec typographies `d1/h6`.
- [ ] Reproduire les trois colonnes (TodoList, Emails, MediaPlayer, Messages).
- [ ] Tester la transformation et l’alignement sur tailles xs/md/lg.

