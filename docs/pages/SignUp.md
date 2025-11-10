# Sign Up

## Rôle & audience
- **Objectif** : permettre la création de compte via formulaire multi-champs et consentement.
- **Utilisateurs cibles** : nouveaux utilisateurs recherchant un onboarding rapide.
- **Interactions clés** : inscription via email/password, connexion sociale (placeholders), acceptation des conditions.

## Structure visuelle
- **Fichier principal** : `layouts/authentication/sign-up/index.js`.
- **Layout** : `BasicLayout` (image `curved14.jpg`, bandeau accroche, centrage vertical).
- **Bloc carte** : `Card` MUI contenant :
  - `SoftTypography` titre “Register with”.
  - `Socials` (icônes réseaux) + `Separator`.
  - Formulaire `SoftBox` avec `SoftInput` (name, email, password).
  - Ligne conditions (`Checkbox` + liens).
  - Bouton gradient `SoftButton color="dark"`.
  - Lien de retour vers Sign In (`react-router-dom`).

## Logique & état
- Hook `useState` pour le checkbox `agreement`.
- Aucun traitement submit ou validation ; boutons sociaux non câblés.
- Les composants `Socials` et `Separator` encapsulent layout (icônes listées dans `layouts/authentication/components`).

## Dépendances
- `Checkbox` MUI, `Card`.
- Composants Soft : `SoftBox`, `SoftTypography`, `SoftInput`, `SoftButton`.
- `Link` `react-router-dom`.

## Responsive & variations
- `BasicLayout` applique max-width sur la carte et gère marges pour mobile.
- Les icônes sociales se réorganisent en ligne (flex) ; tester alignement sur petits écrans.

## Particularités graphiques
- Fond image courbé, overlay sombre.
- Bouton principal gradient sombre, liens avec `textGradient`.
- Checkbox aligné horizontalement avec texte cliquable (attention faute de frappe `cursor: "poiner"` à corriger dans reproduction).

## Points d’attention
- Prévoir la gestion réelle du consentement (RGPD).
- Corriger `cursor: "poiner"` lors de la migration.
- Injecter validations (mot de passe fort, email) et feedback visuel.

## Checklist de reproduction
- [ ] Mettre en place `BasicLayout` avec hero et slot de contenu.
- [ ] Reproduire la carte inscription (socials, separator, formulaire).
- [ ] Implémenter le checkbox accord + lien conditions.
- [ ] Connecter le bouton “sign up” à la logique d’enregistrement du nouveau projet.
- [ ] Tester l’affichage responsive et l’accessibilité (focus, labels).

