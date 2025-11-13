# Refonte du header du tableau de bord

## Résumé des objectifs

- Alignement du déclencheur de sidebar à l’extrême gauche du header lorsque la navigation est masquée.
- Masquage complet du bloc marque (`WF Wash&Go App`) et du bouton d’ouverture lorsque la sidebar desktop est visible.
- Élimination du doublon de la section « Vue d’ensemble » sous le hero du tableau de bord.

Ces ajustements garantissent une hiérarchie visuelle cohérente et évitent que les éléments de navigation persistent quand la barre latérale est déployée.

## Composants concernés

- `src/layout/Topbar.tsx`
- `src/pages/DashboardPage.tsx`
- (Lecture uniquement) `src/index.css` pour connaître les classes utilitaires existantes.

## Étapes mises en œuvre

### 1. Gestion conditionnelle du bloc marque & bouton desktop

1. Import de `clsx` dans `Topbar.tsx` pour composer dynamiquement les classes.
2. Calcul d’une grille responsive `topbarDesktopCols` afin de réduire à deux colonnes quand la sidebar est visible.
3. Nettoyage du groupe gauche du header :
   - Quand `isDesktopSidebarHidden === false`, le bloc gauche devient invisible sur grand écran (`lg:hidden`), ce qui laisse toute la place à la zone centrale et au panneau d’actions.
   - Quand la sidebar est masquée, le bouton d’ouverture (`MenuRoundedIcon`) est rendu avant le logo pour un alignement parfait.
4. Suppression de l’icône `MenuOpenRoundedIcon` côté desktop afin d’éviter un bouton inutile lorsque la navigation est ouverte.

### 2. Suppression du duplicata de puces « Vue d’ensemble »

1. Retrait du tableau `quickSnapshot` et des puces associées dans le hero du tableau de bord.
2. Conservation du ruban secondaire `dashboard-secondary-bar` comme seul endroit où ces métriques sont affichées.
3. Injection directe des valeurs (`weeklyEngagements.length`, `leadsToContact.length`, `quotesToSend.length`) dans les trois puces restantes pour simplifier la lecture du code.

## Bonnes pratiques pour étendre la refonte

- **Centraliser la logique d’affichage** : privilégier des valeurs calculées directement au moment du rendu (ou via des hooks dédiés) plutôt que de multiplier les structures de données dérivées.
- **Respecter l’accessibilité** : conserver `aria-label` sur les boutons de navigation et veiller à ce que les éléments masqués via les classes utilitaires ne perturbent pas la navigation clavier.
- **Limiter les doublons visuels** : vérifier que chaque métrique ou élément de navigation n’est présenté qu’une seule fois par vue.
- **Utiliser `clsx`** pour toute classe conditionnelle ; cela maintient une syntaxe lisible et réduit les erreurs.
- **Tester en responsive** : valider les variantes `lg:hidden`, `hidden lg:inline-flex`, etc., sur un viewport compact (≤1366px) et sur un viewport large.

## Procédure type pour d’autres pages

1. Identifier les composants de layout (topbar, sidebar, rubans secondaires) et déterminer ce qui doit être visible selon l’état de la navigation.
2. Introduire, si nécessaire, des helpers similaires à `topbarDesktopCols` pour ajuster les grilles CSS.
3. Simplifier les sections templating en retirant les structures répétitives : remplacer un tableau intermédiaire par des valeurs calculées inline.
4. Vérifier les styles dans `index.css` afin de réutiliser les classes existantes avant d’en créer de nouvelles.
5. Tester les interactions principales (ouverture/fermeture sidebar, hover, focus) en desktop et mobile.

### Exemple appliqué : `ClientsPage`

- Adoption des composants `dashboard-hero` et `dashboard-secondary-bar` pour harmoniser l’en-tête avec la page tableau de bord.
- Création d’un tableau `summaryItems` pour injecter directement les métriques clés dans la barre secondaire sans dupliquer les cartes statistiques.
- Retrait du triptyque de cartes initiales au profit d’un seul point d’entrée « Vue d’ensemble ».
- Conservation des actions (nouveau client, import/export) dans les sections opérationnelles existantes afin d’éviter de surcharger le hero.
- Remplacement de l’ancien composant `Table` par une grille interactive bâtie sur `@tanstack/react-table` (`DataTable`) afin de bénéficier du tri natif, d’un rendu plus sobre et d’une meilleure cohérence visuelle avec le reste de l’interface.

## Points de vigilance

- Conserver la cohérence avec les tokens design (classes `topbar__*`, `dashboard-*`).
- Ne pas supprimer les éléments utilisés par la navigation mobile (`lg:hidden` implique que le bloc reste visible sur petit écran).
- Après toute modification structurelle, lancer `npm run lint` ou `pnpm lint` pour s’assurer de l’absence d’erreurs.

---

Ce document sert de guide pour les agents IA chargés d’aligner les autres pages sur ce design. Adapter les valeurs et la logique métier selon les besoins de chaque vue, tout en respectant les principes ci-dessus.

