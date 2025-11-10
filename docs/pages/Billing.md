# Billing

## Rôle & audience
- **Objectif** : synthétiser les informations de facturation, méthodes de paiement et transactions récentes.
- **Utilisateurs cibles** : équipe finance/compta, administrateurs.
- **Interactions clés** : visualisation des cartes bancaires, consultation des factures et transactions ; boutons placeholders pour actions (“View All”, “Pay”).

## Structure visuelle
- **Fichier principal** : `layouts/billing/index.js` dans `DashboardLayout`.
- **Grille supérieure** : `Grid` `xs=12` → `lg=8` (section cartes + méthodes) & `lg=4` (factures).
  - `MasterCard` (carte physique) + deux `DefaultInfoCard` (salary/paypal).
  - `PaymentMethod` (`layouts/billing/components/PaymentMethod`) listant cartes virtuelles + boutons.
  - `Invoices` (`layouts/billing/components/Invoices`) : liste verticale avec boutons `See details`.
- **Seconde section** (`SoftBox my={3}`) : `BillingInformation` (cards info clients) + `Transactions` (timeline).
- **Footer** : inclus via `DashboardLayout`.

## Logique & état
- Purement statique : données codées dans chaque composant (tableaux d’objets).
- Layout dépend du contexte pour marges mais pas d’état spécifique.
- Aucun appel API ; boutons non fonctionnels (href "#").

## Dépendances
- `@mui/material/Grid`, `Card`, `SoftBox`.
- Composants réutilisables : `examples/Cards/MasterCard`, `examples/Cards/InfoCards/DefaultInfoCard`, `examples/Lists` custom.
- Icônes MUI pour transactions.

## Responsive & variations
- Grille multi-niveaux : sur mobile, chaque sous-carte occupe `xs=12` (empilement).
- `PaymentMethod` affiche colonnes flex wrap pour cartes ; vérifier l’adaptation des boutons.
- `Transactions` utilise `SoftTypography` + border-left stylisée ; taille s’adapte aux breakpoints.

## Particularités graphiques
- Cartes gradient (MasterCard) avec numéros masqués.
- Boutons ghost (outlined) et icônes alignés à droite.
- Listes factures avec label + date highlight (badge clair).

## Points d’attention
- Reproduire l’équilibre de colonnes (8/4 puis 7/5) pour conserver les hiérarchies visuelles.
- Anticiper l’intégration de vraies données (APIs de paiement) ; isoler la structure `PaymentMethod`.
- S’assurer que les composants info utilisent la même palette pour cohérence.

## Checklist de reproduction
- [ ] Construire la grille principale 8/4 avec MasterCard + info cards + PaymentMethod + Invoices.
- [ ] Ajouter la seconde grille BillingInformation + Transactions.
- [ ] Vérifier l’alignement responsive sur `xs`, `md`, `lg`.
- [ ] Prévoir des props pour injecter données réelles (factures, transactions).
- [ ] Tester la lisibilité des badges et CTA.

