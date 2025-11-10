# Sign In

## Rôle & audience
- **Objectif** : formulaire de connexion simple avec option “Remember me”.
- **Utilisateurs cibles** : nouveaux utilisateurs ou administrateurs se connectant à la plateforme.
- **Interactions clés** : saisie email/mot de passe, toggle remember me, lien vers inscription.

## Structure visuelle
- **Fichier principal** : `layouts/authentication/sign-in/index.js`.
- **Layout** : `CoverLayout` (`layouts/authentication/components/CoverLayout`) fournit un fond image (`curved-6.jpg`), overlay gradient et positionnement centré.
- **Formulaire** : `SoftBox component="form"` contenant deux `SoftInput` (email, password), `Switch` MUI, `SoftButton` gradient.
- **CTA secondaire** : `SoftTypography` avec lien `react-router-dom` vers `/authentication/sign-up`.

## Logique & état
- `useState` gère `rememberMe` (booléen).
- Le formulaire n’a pas de submission handler (placeholder) ; actions à brancher dans le nouveau projet.
- Pas de validation intégrée ni feedback d’erreur.

## Dépendances
- `SoftInput`, `SoftButton`, `SoftTypography`, `SoftBox`.
- `Switch` MUI.
- `Link` de `react-router-dom` pour navigation.

## Responsive & variations
- `CoverLayout` gère la responsivité : formulaire centré, largeur max contrôlée (Card-like).
- Sur mobile, le bloc occupe quasiment toute la largeur avec padding identique.

## Particularités graphiques
- Fond image courbé, overlay violet.
- Bouton principal `variant="gradient" color="info"`.
- Texte gradient pour lien “Sign up”.

## Points d’attention
- Ajouter gestion d’erreurs, validation et soumission réelle (API auth) dans le nouveau projet.
- Prévoir la gestion d’état global (ex : redirection après login).
- Conserver l’équilibre typographique (labels `variant="caption"` bold).

## Checklist de reproduction
- [ ] Implémenter `CoverLayout` avec image de fond et slot enfants.
- [ ] Recréer le formulaire (inputs, remember me, bouton gradient).
- [ ] Ajouter navigation vers Sign Up et retour (links).
- [ ] Brancher la soumission sur les services auth du nouveau projet.
- [ ] Prévoir feedback visuel (loading, erreurs) avant mise en prod.

