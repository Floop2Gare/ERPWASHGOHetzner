# 🔍 Analyse du Problème de Rate Limiting

## 📋 Problèmes Identifiés

### 1. **429 Too Many Requests**
- **Cause** : Le rate limiting est trop strict
- **Configuration actuelle** :
  - Nginx : `10r/s` (10 requêtes par seconde) avec `burst=5` pour `/api`
  - FastAPI : Rate limiting middleware également actif

### 2. **401 Unauthorized sur /auth/login**
- **Cause** : Un token est envoyé dans les headers pour la requête de login
- **Logs** : `[httpClient] Token ajouté pour POST /api/auth/login (longueur: 167)`
- **Problème** : Le token ne devrait PAS être envoyé pour `/auth/login` car l'utilisateur n'est pas encore authentifié

### 3. **Multiples Appels à Login**
- **Observation** : Plusieurs appels à `/api/auth/login` se font rapidement
- **Causes possibles** :
  - Retries automatiques du frontend
  - Double-clic sur le bouton de connexion
  - Appels multiples depuis différents composants

## 🔬 Analyse Détaillée

### Configuration Nginx Actuelle
```
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
location /api {
    limit_req zone=api_limit burst=5 nodelay;
}
```

**Signification** :
- `rate=10r/s` : 10 requêtes par seconde maximum
- `burst=5` : Permet 5 requêtes supplémentaires en rafale
- `nodelay` : Les requêtes en rafale ne sont pas retardées

**Problème** : Si l'utilisateur fait 6+ appels rapides (ce qui arrive avec les retries), le 6ème appel est bloqué avec 429.

### Configuration FastAPI Rate Limiting
Le backend a aussi un middleware de rate limiting qui s'ajoute à celui de Nginx.

### Pourquoi un Token est Envoyé pour Login ?

Dans `httpClient.ts` ligne 163-168 :
```typescript
const token = getAuthToken();
const authHeaders: Record<string, string> = {};
if (token && token.trim() && !headers.Authorization) {
  authHeaders.Authorization = `Bearer ${token.trim()}`;
  console.log(`[httpClient] Token ajouté pour ${method} ${url} (longueur: ${token.length})`);
}
```

**Problème** : Le code vérifie `isAuthEndpoint` ligne 157, mais le token est ajouté AVANT cette vérification.

## 💡 Solutions Proposées

### 1. **Exclure `/auth/login` du Rate Limiting Nginx**
Créer une zone spéciale pour les endpoints d'authentification avec un rate limiting plus permissif.

### 2. **Ne Pas Envoyer de Token pour `/auth/login`**
Corriger la logique dans `httpClient.ts` pour ne pas ajouter le token si l'endpoint est `/auth/login`.

### 3. **Augmenter le Rate Limiting pour `/api`**
Passer de `10r/s` à `20r/s` ou `30r/s` pour permettre plus de requêtes.

### 4. **Désactiver les Retries Automatiques sur Login**
Empêcher le frontend de faire plusieurs tentatives de login si la première échoue.

## 🎯 Recommandations

1. **Court terme** : Augmenter le rate limiting à `20r/s` avec `burst=10`
2. **Moyen terme** : Exclure `/auth/login` du rate limiting strict
3. **Long terme** : Corriger la logique pour ne pas envoyer de token sur `/auth/login`
