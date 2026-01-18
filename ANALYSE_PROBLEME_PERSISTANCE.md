# Analyse du Problème de Persistance des Données

## 🔍 Problème Observé

**Symptôme** : Les données (entreprises, clients, etc.) sont bien créées et sauvegardées dans PostgreSQL, mais :
1. Après un refresh de la page, elles **disparaissent** de l'interface
2. Quand on crée une nouvelle entité du même type, **toutes les entités réapparaissent** (anciennes + nouvelles)

**Exemple concret** :
- Créer une entreprise "Wash&Go" → ✅ Créée
- Refresh (F5) → ❌ L'entreprise disparaît
- Créer une nouvelle entreprise "Test" → ✅ Créée
- **Résultat** : On voit maintenant **2 entreprises** (Wash&Go + Test)

## ✅ Ce qui fonctionne

1. **Sauvegarde dans PostgreSQL** : Les données sont bien persistées dans la base de données
2. **Volume Docker** : Le volume `erpwashgo_postgres_data` est bien configuré et persistant
3. **Création via API** : Les endpoints POST fonctionnent correctement
4. **Récupération après création** : Quand on crée une nouvelle entité, toutes les entités sont rechargées

## ❌ Ce qui ne fonctionne pas

1. **Chargement initial au démarrage** : Les données ne sont pas chargées depuis le backend au refresh
2. **Synchronisation frontend/backend** : Le frontend ne récupère pas les données sauvegardées au démarrage

## 🔬 Analyse du Flux de Données

### 1. Au Démarrage de l'Application

**Backend** (`/user/backpack`) :
```python
# Ligne 54-56 de user_backpack.py
cur.execute("SELECT id, data FROM companies ORDER BY created_at DESC;")
for row in cur.fetchall():
    companies_list.append({**row[1], "id": row[0]})
```
✅ Le backend charge **TOUTES** les entreprises depuis PostgreSQL

**Frontend** (`useUserBackpack` → `hydrateFromBackpack`) :
```typescript
// Ligne 4220-4228 de useAppData.ts
let mappedCompanies = Array.isArray(payload.companies)
  ? payload.companies.map((company) => normalizeCompanySnapshot(company))
  : state.companies;  // ⚠️ FALLBACK : utilise state.companies si payload.companies n'est pas un array

if (payload.company) {
  mappedCompanies = [normalizeCompanySnapshot(payload.company), ...mappedCompanies];
}

mappedCompanies = dedupeCompanies(mappedCompanies);
```

### 2. Problème Identifié

**Hypothèse principale** : Le `payload.companies` dans `hydrateFromBackpack` n'est **pas un array valide** au démarrage, donc le code utilise `state.companies` qui est **vide initialement**.

**Vérification nécessaire** :
- Est-ce que `/user/backpack` retourne bien `companies` comme un array ?
- Est-ce que `payload.companies` est bien reçu dans `hydrateFromBackpack` ?
- Y a-t-il un problème de timing (les entreprises sont chargées mais écrasées après) ?

### 3. Quand on Crée une Entreprise

**Flux** (`addCompany` dans `useAppData.ts`) :
```typescript
// Ligne 4486-4503
CompanyService.createCompany({...})
  .then(async (result) => {
    if (!result.success) return;
    // ⚠️ ICI : Recharge TOUTES les entreprises depuis le backend
    const companiesResult = await CompanyService.getCompanies();
    if (companiesResult.success && Array.isArray(companiesResult.data)) {
      set((state) => buildCompanyStateFromBackend(state, companiesResult.data));
    }
  })
```

✅ **C'est pour ça que toutes les entreprises réapparaissent** : `addCompany` appelle `CompanyService.getCompanies()` qui recharge toutes les entreprises depuis le backend.

## 🎯 Conclusion

**Le problème n'est PAS la persistance** (les données sont bien sauvegardées), mais **le chargement initial** :

1. Au démarrage, `hydrateFromBackpack` ne charge pas correctement les entreprises depuis `payload.companies`
2. Soit `payload.companies` n'est pas un array valide
3. Soit `payload.companies` est vide/undefined
4. Soit il y a un problème de timing où les entreprises sont chargées puis écrasées

**Quand on crée une entreprise**, le code appelle explicitement `CompanyService.getCompanies()` qui recharge toutes les entreprises, c'est pourquoi elles réapparaissent.

## 🔧 Points à Vérifier (Sans Modifier le Code)

1. **Vérifier le payload de `/user/backpack`** :
   - Est-ce que `data.companies` est bien un array ?
   - Est-ce qu'il contient les entreprises créées ?

2. **Vérifier `hydrateFromBackpack`** :
   - Est-ce que `payload.companies` est reçu correctement ?
   - Est-ce que le fallback `state.companies` est utilisé à tort ?

3. **Vérifier le timing** :
   - Est-ce que `hydrateFromBackpack` est appelé avant que les entreprises soient chargées ?
   - Y a-t-il un autre code qui écrase `state.companies` après `hydrateFromBackpack` ?

4. **Vérifier les logs du frontend** :
   - Que contient `payload.companies` dans `hydrateFromBackpack` ?
   - Y a-t-il des erreurs silencieuses ?
