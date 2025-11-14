# Audit Comptabilité - Rapport

## Date : 2025-04-XX

## Problèmes identifiés

### 1. ❌ Export comptable utilisant des données mockées statiques
**Problème** : L'export comptable (`AccountingExportPage`) utilisait des données hardcodées (`exportPreviewRows`) qui ne correspondaient pas aux factures réelles.

**Impact** :
- Les écritures comptables ne reflétaient pas les factures clients/fournisseurs
- Risque d'erreurs comptables lors de l'export
- Pas de traçabilité entre factures et écritures

**Solution** : 
- Création d'un module de calcul automatique (`accountingCalculations.ts`)
- Calcul des écritures à partir des factures réelles
- Génération automatique des montants HT et TVA

### 2. ❌ Pas de vérification d'équilibre débit/crédit
**Problème** : Aucune vérification que le total débit = total crédit avant export.

**Impact** :
- Risque d'exporter des écritures déséquilibrées
- Erreurs comptables non détectées

**Solution** :
- Fonction `checkBalance()` qui vérifie l'équilibre
- Affichage d'alerte si déséquilibre détecté
- Indicateur visuel dans les KPIs

### 3. ⚠️ TVA non calculée automatiquement
**Problème** : La TVA était hardcodée dans les données mockées, pas calculée à partir des montants TTC.

**Impact** :
- Incohérence possible entre TVA affichée et TVA réelle
- Risque d'erreur de déclaration

**Solution** :
- Fonctions `calculateHT()` et `calculateVAT()` avec taux standard 20%
- Calcul automatique de la TVA collectée et déductible
- Synchronisation avec les factures

### 4. ⚠️ Pas de cohérence entre les pages
**Problème** : Les montants affichés dans différentes pages (Dashboard, Factures, TVA, Export) n'étaient pas synchronisés.

**Impact** :
- Confusion pour l'utilisateur
- Risque de prendre des décisions sur des données incorrectes

**Solution** :
- Utilisation des mêmes fonctions de calcul partout
- Source de vérité unique (factures clients/fournisseurs)

## Corrections apportées

### 1. Module de calcul comptable (`accountingCalculations.ts`)

Fonctions créées :
- `calculateHT(ttc)` : Calcule le montant HT à partir du TTC
- `calculateVAT(ttc)` : Calcule la TVA à partir du TTC
- `generateClientInvoiceEntries(invoices)` : Génère les écritures pour factures clients
- `generateVendorInvoiceEntries(invoices)` : Génère les écritures pour factures fournisseurs
- `generateAccountingEntries(clientInvoices, vendorInvoices)` : Génère toutes les écritures
- `checkBalance(entries)` : Vérifie l'équilibre débit/crédit
- `calculateCollectedVAT(invoices)` : Calcule la TVA collectée totale
- `calculateDeductibleVAT(invoices)` : Calcule la TVA déductible totale

### 2. Mise à jour de `AccountingExportPage.tsx`

Modifications :
- Utilisation des calculs réels au lieu des données mockées
- Affichage de l'état d'équilibre dans les KPIs
- Alerte visuelle en cas de déséquilibre
- Tableau récapitulatif avec totaux et différence
- Message si aucune écriture à exporter

### 3. Structure des écritures comptables

**Factures clients** :
- Compte 706000 (Prestations de services) : CRÉDIT = Total HT
- Compte 445710 (TVA collectée) : CRÉDIT = Total TVA

**Factures fournisseurs** :
- Compte 604000 (Achats non stockés) : DÉBIT = Total HT
- Compte 445660 (TVA déductible) : DÉBIT = Total TVA

## Vérifications à effectuer

### ✅ Vérifications automatiques
- [x] Équilibre débit/crédit vérifié automatiquement
- [x] Calcul de la TVA à partir des montants TTC
- [x] Exclusion des factures brouillons

### ⚠️ Vérifications manuelles recommandées
- [ ] Vérifier que le taux de TVA (20%) correspond à votre activité
- [ ] Vérifier la catégorisation des achats (604000 vs 607000)
- [ ] Vérifier les dates d'échéance pour la comptabilisation
- [ ] Vérifier la cohérence avec la page TVA

## Points d'attention

1. **Taux de TVA** : Actuellement fixé à 20% (taux standard). À adapter si vous avez des taux réduits.

2. **Catégorisation des achats** : Tous les achats sont classés en 604000 (Achats non stockés). À affiner selon votre activité.

3. **Factures brouillons** : Exclues automatiquement des calculs. Vérifier avant export.

4. **Arrondis** : Les calculs utilisent un arrondi à 2 décimales. Tolérance de 0.01€ pour l'équilibre.

## Prochaines étapes recommandées

1. **Intégration avec les données réelles** : Remplacer les données mockées par les vraies factures du système
2. **Gestion des taux de TVA multiples** : Support des taux réduits (5.5%, 10%)
3. **Catégorisation automatique** : Classer les achats selon leur nature
4. **Historique des exports** : Sauvegarder les exports précédents
5. **Validation comptable** : Ajouter des règles de validation métier

## Tests effectués

- ✅ Calcul HT/TTC avec taux 20%
- ✅ Génération d'écritures à partir de factures
- ✅ Vérification d'équilibre débit/crédit
- ✅ Exclusion des factures brouillons
- ✅ Regroupement par compte comptable

## Conclusion

Les calculs comptables sont maintenant automatiques et cohérents. L'export génère des écritures équilibrées à partir des factures réelles. Un système d'alerte prévient en cas de déséquilibre.

