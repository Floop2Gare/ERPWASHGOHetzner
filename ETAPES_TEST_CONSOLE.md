# 📋 Étapes Précises pour Tester avec la Console Bruyante

## ✅ Console Bruyante Installée

J'ai ajouté des logs détaillés dans :
- 🔵🔵🔵 `hydrateFromBackpack` (chargement initial au démarrage)
- 🟢🟢🟢 `addCompany` (création d'entreprise)
- 📥📥📥 `loadBackpack` (appel API `/user/backpack`)
- 🟡🟡🟡 `buildCompanyStateFromBackend` (rechargement depuis backend)

## 📋 Étapes Précises à Suivre

### 1. Préparation
- Ouvrez la console du navigateur (touche **F12** ou clic droit > Inspecter > Console)
- Allez sur **https://erpwashgo.fr**
- **Videz la console** (icône 🚫 ou Ctrl+L)

### 2. Connexion
- Connectez-vous avec vos identifiants
- **Regardez les logs** qui commencent par :
  - 📥📥📥 (appel API)
  - 🔵🔵🔵 (hydrateFromBackpack)

### 3. Vérification Initiale
- Notez combien d'entreprises sont chargées dans les logs 🔵🔵🔵
- Regardez la ligne : `🔵🔵🔵 [hydrateFromBackpack] Nombre d'entreprises: X`
- Regardez : `🔵🔵🔵 [hydrateFromBackpack] payload.companies: [...]`

### 4. Création d'Entreprise
- Allez dans **Paramètres** > **Entreprises**
- Cliquez sur **Créer une entreprise**
- Remplissez le formulaire et sauvegardez
- **Regardez les logs** qui commencent par 🟢🟢🟢 (addCompany)
- Notez :
  - `🟢🟢🟢 [addCompany] Nombre d'entreprises après ajout local: X`
  - `🟢🟢🟢 [addCompany] Nombre d'entreprises récupérées: X`
  - `🟢🟢🟢 [addCompany] Nombre d'entreprises dans nouveau state: X`

### 5. Refresh de la Page
- **Rafraîchissez la page** (F5 ou Ctrl+R)
- **Videz la console** à nouveau
- **Regardez les logs** qui commencent par :
  - 📥📥📥 (appel API)
  - 🔵🔵🔵 (hydrateFromBackpack)
- **Comparez** avec l'étape 3 :
  - Est-ce que `payload.companies` contient les entreprises créées ?
  - Est-ce que le nombre d'entreprises est correct ?

### 6. Capture des Logs
- **Copiez TOUS les logs** de la console
- Envoyez-moi :
  - Les logs de l'étape 2 (connexion)
  - Les logs de l'étape 4 (création)
  - Les logs de l'étape 5 (refresh)

## 🔍 Ce qu'on va Découvrir

Avec ces logs, on va comprendre :
1. ✅ Est-ce que `/user/backpack` retourne bien les entreprises ?
2. ✅ Est-ce que `payload.companies` est un array valide ?
3. ✅ Est-ce que `hydrateFromBackpack` utilise le fallback `state.companies` ?
4. ✅ Pourquoi les entreprises disparaissent au refresh ?
5. ✅ Pourquoi elles réapparaissent après création ?

## 📸 Format des Logs à Envoyer

Envoyez-moi les logs dans cet ordre :
```
=== ÉTAPE 2 - CONNEXION ===
[logs 📥📥📥 et 🔵🔵🔵]

=== ÉTAPE 4 - CRÉATION ===
[logs 🟢🟢🟢]

=== ÉTAPE 5 - REFRESH ===
[logs 📥📥📥 et 🔵🔵🔵]
```
