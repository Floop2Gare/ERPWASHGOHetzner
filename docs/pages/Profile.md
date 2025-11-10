# Profile

## Rôle & audience
- **Objectif** : page profil utilisateur combinant paramètres, informations personnelles, conversations et projets.
- **Utilisateurs cibles** : utilisateurs finaux souhaitant gérer leur profil ; managers consultant les projets associés.
- **Interactions clés** : toggles de préférences (notifications), liens sociaux, cartes projets avec CTA “view project”.

## Structure visuelle
- **Fichier principal** : `layouts/profile/index.js` (composant `Overview`).
- **Header** : `layouts/profile/components/Header` (banner + avatar + boutons social/édit).
- **Grille principale** :
  - Colonne 1 (`PlatformSettings`) : switches regroupant notifications & sécurité.
  - Colonne 2 (`ProfileInfoCard`) : bio, infos de contact, liens sociaux.
  - Colonne 3 (`ProfilesList`) : conversations (listes avatars + status).
- **Section projets** : `Card` avec `DefaultProjectCard` x3 + `PlaceholderCard` ; images dans `src/assets/images/home-decor-*`.
- `Footer` en bas de page.

## Logique & état
- `PlatformSettings` gère des `Switch` MUI contrôlés localement pour illustrer préférences.
- `ProfilesList` consomme `layouts/profile/data/profilesListData.js`.
- Aucun appel API ; toutes les données sont mockées.

## Dépendances
- `@mui/material/Grid`, `Card`.
- Composants Soft : `SoftBox`, `SoftTypography`, `SoftButton`.
- Icônes sociaux MUI (`FacebookIcon`, etc.).

## Responsive & variations
- Grille `xs=12`, `md=6`, `xl=4` sur la première section : sur mobile, les cartes s’empilent verticalement.
- Section projets : `Grid item xs=12 md=6 xl=3` (jusqu’à 4 cartes par ligne).
- Header applique un effet overlap (avatar partiellement superposé) : vérifier marges négatives.

## Particularités graphiques
- Banner hero avec image `curved-images`.
- Cartes projets : image top, label uppercase, avatars auteurs en stack (overlap).
- Boutons text-gradient (liens) pour actions.

## Points d’attention
- Maintenir la hiérarchie 3 colonnes → 4 cartes pour respecter la densité visuelle.
- Centraliser les données (bio, projets) pour permettre la substitution par API.
- Surveiller l’empilement des avatars (z-index) et la cohérence des rayons d’image.

## Checklist de reproduction
- [ ] Créer le header profil avec image de couverture + avatar + actions.
- [ ] Reproduire la grille à trois colonnes (settings, info card, conversations).
- [ ] Construire la section projets avec cartes réutilisables + placeholder.
- [ ] Gérer les switches et liens sociaux (états contrôlés).
- [ ] Tester l’affichage sur xs/md/xl pour éviter débordements.

