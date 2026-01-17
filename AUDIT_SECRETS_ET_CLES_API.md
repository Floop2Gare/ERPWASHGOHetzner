# 🔐 Audit Complet - Secrets et Clés API Sensibles

**Date de l'audit** : 2025-01-08  
**Objectif** : Identifier tous les secrets, clés API et données sensibles qui doivent être protégés avant le déploiement sur Hetzner

---

## 🚨 Résumé Exécutif

### ❌ Secrets Identifiés (À PROTÉGER)

| Catégorie | Nombre | Risque | Action Requise |
|-----------|--------|--------|----------------|
| **Fichiers JSON Google** | 2 | 🔴 CRITIQUE | Transfert direct au serveur |
| **Variables .env** | ~15 | 🔴 CRITIQUE | Transfert direct au serveur |
| **Mots de passe DB** | 3 | 🔴 CRITIQUE | Variables d'environnement |
| **Clés JWT** | 1 | 🔴 CRITIQUE | Variable d'environnement |
| **Mots de passe en dur** | 2 | ⚠️ MOYEN | Vérification post-déploiement |

---

## 📋 1. FICHIERS JSON - Google Service Accounts

### ❌ Fichiers Sensibles (CRITIQUE)

#### `backend/credentials_adrien.json`
- **Type** : Fichier JSON Google Service Account
- **Contenu** : Clés privées Google API, `private_key`, `client_email`, `project_id`
- **Usage** : Authentification Google Calendar API pour "adrien"
- **Risque** : 🔴 **CRITIQUE** - Permet un accès complet aux calendriers Google
- **Protection** : ✅ Déjà dans `.gitignore` (ligne 20)
- **Action** : ⚠️ **TRANSFÉRER DIRECTEMENT** au serveur Hetzner via SCP

#### `backend/credentials_clement.json`
- **Type** : Fichier JSON Google Service Account
- **Contenu** : Clés privées Google API, `private_key`, `client_email`, `project_id`
- **Usage** : Authentification Google Calendar API pour "clement"
- **Risque** : 🔴 **CRITIQUE** - Permet un accès complet aux calendriers Google
- **Protection** : ✅ Déjà dans `.gitignore` (ligne 20)
- **Action** : ⚠️ **TRANSFÉRER DIRECTEMENT** au serveur Hetzner via SCP

### 🔍 Références dans le Code

#### `backend/app/services/google_calendar.py`
- **Lignes 34, 56** : Lecture des fichiers credentials
  ```python
  adrien_file = os.getenv('GOOGLE_SA_ADRIEN_FILE', '/app/credentials_adrien.json')
  clement_file = os.getenv('GOOGLE_SA_CLEMENT_FILE', '/app/credentials_clement.json')
  ```

#### `docker-compose.yml`
- **Lignes 53-54** : Montage des fichiers dans Docker
  ```yaml
  - ./backend/credentials_adrien.json:/app/credentials_adrien.json:ro
  - ./backend/credentials_clement.json:/app/credentials_clement.json:ro
  ```

#### `docker-compose.prod.yml`
- ⚠️ **MANQUE** : Les fichiers credentials ne sont PAS montés en production !
- **Action** : ⚠️ **AJOUTER** les volumes dans `docker-compose.prod.yml` OU utiliser les variables d'environnement

---

## 📋 2. VARIABLES D'ENVIRONNEMENT (.env)

### ❌ Fichier `.env` (CRITIQUE)

**Localisation** : À la racine du projet (IGNORÉ par Git ✅)

### Variables Identifiées

#### 🔴 Base de Données PostgreSQL

| Variable | Description | Valeur par Défaut | Risque |
|----------|-------------|-------------------|--------|
| `POSTGRES_USER` | Utilisateur PostgreSQL | `postgres` | 🔴 CRITIQUE |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `postgres` | 🔴 CRITIQUE |
| `POSTGRES_DB` | Nom de la base de données | `erp_washgo` | ⚠️ MOYEN |
| `POSTGRES_PORT` | Port PostgreSQL | `5432` | ✅ FAIBLE |
| `DATABASE_URL` | URL complète de connexion | `postgresql://postgres:postgres@...` | 🔴 CRITIQUE |

**Références** :
- `docker-compose.yml` (lignes 7-9, 34)
- `docker-compose.prod.yml` (lignes 9-10, 49)
- `backend/app/core/config.py` (lignes 14-17)
- `backend/app/core/dependencies.py` (ligne 15)
- `backend/create_admin_user.py` (lignes 18-23)

#### 🔴 Google Calendar API

| Variable | Description | Risque |
|----------|-------------|--------|
| `CALENDAR_ID_ADRIEN` | ID du calendrier Google "adrien" | ⚠️ MOYEN |
| `CALENDAR_ID_CLEMENT` | ID du calendrier Google "clement" | ⚠️ MOYEN |
| `GOOGLE_SA_ADRIEN_JSON` | Service Account JSON pour "adrien" (alternative aux fichiers) | 🔴 CRITIQUE |
| `GOOGLE_SA_CLEMENT_JSON` | Service Account JSON pour "clement" (alternative aux fichiers) | 🔴 CRITIQUE |
| `GOOGLE_SA_ADRIEN_FILE` | Chemin vers le fichier credentials_adrien.json | ✅ FAIBLE |
| `GOOGLE_SA_CLEMENT_FILE` | Chemin vers le fichier credentials_clement.json | ✅ FAIBLE |
| `CALENDAR_MAX_RANGE_DAYS` | Fenêtre maximale de récupération (jours) | ✅ FAIBLE |

**Références** :
- `docker-compose.yml` (lignes 38-42)
- `backend/app/services/google_calendar.py` (lignes 30, 34, 46-48, 52, 56, 68-70)

#### 🔴 Sécurité JWT / Authentification

| Variable | Description | Valeur par Défaut | Risque |
|----------|-------------|-------------------|--------|
| `SECRET_KEY` | Clé secrète pour signer les tokens JWT | `your-secret-key-change-in-production-min-32-chars` | 🔴 CRITIQUE |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée d'expiration des tokens (minutes) | `10080` (7 jours) | ⚠️ MOYEN |

**Références** :
- `backend/app/core/config.py` (lignes 34, 37)

#### ⚠️ Configuration Application

| Variable | Description | Valeur par Défaut | Risque |
|----------|-------------|-------------------|--------|
| `ENABLE_DEBUG_ROUTES` | Activer les routes de debug | `false` | ⚠️ MOYEN |
| `LOG_LEVEL` | Niveau de logging | `INFO` | ✅ FAIBLE |
| `BACKEND_PORT` | Port du backend | `8000` | ✅ FAIBLE |
| `FRONTEND_PORT` | Port du frontend | `5173` | ✅ FAIBLE |

**Références** :
- `docker-compose.yml` (ligne 36)
- `docker-compose.prod.yml` (ligne 51)

---

## 📋 3. MOTS DE PASSE EN DUR (Code Source)

### ⚠️ Mots de Passe Par Défaut (MOYEN)

#### `backend/create_admin_user.py`
- **Ligne 47** : Mot de passe admin par défaut
  ```python
  "passwordHash": get_password_hash("admin1*"),
  ```
- **Risque** : ⚠️ MOYEN - Documenté, mais devrait être changé en production
- **Action** : ⚠️ **CHANGER** le mot de passe admin après le déploiement

#### `backend/init_admin.sql`
- **Lignes 9, 19, 118** : Hash bcrypt du mot de passe `admin1*`
  ```sql
  -- Mot de passe: admin1* (hash bcrypt)
  "passwordHash": "$2b$12$m2JbzsvXEwEEIBkkjGRHsuxUnUpFv9fv4M1GW.5L5Y/i9aMu7RdW",
  ```
- **Risque** : ⚠️ MOYEN - Documenté dans le code
- **Action** : ⚠️ **CHANGER** le mot de passe admin après le déploiement

#### `docker-compose.yml` et `docker-compose.prod.yml`
- **Mots de passe par défaut** dans les valeurs par défaut des variables
  ```yaml
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
  ```
- **Risque** : 🔴 **CRITIQUE** si les variables ne sont pas définies
- **Action** : ⚠️ **TOUJOURS** définir `POSTGRES_PASSWORD` dans `.env` en production

---

## 📋 4. URLS ET CONFIGURATIONS FRONTEND

### ⚠️ Variables Frontend (VITE_*)

#### `frontend/vite.config.ts`
- **Ligne 41** : Variable d'environnement pour l'URL du backend
  ```typescript
  target: env.VITE_BACKEND_URL || 'http://localhost:8000',
  ```
- **Risque** : ⚠️ MOYEN - Exposé au build (mais pas critique pour la sécurité)
- **Usage** : Configuration du proxy Vite pour le développement

#### `frontend/src/api/config/api.ts`
- **Lignes 20-28** : Fonction pour déterminer l'URL du backend
  ```typescript
  export function getBackendUrl(): string {
    try {
      const { protocol, hostname } = window.location;
      const port = 8000;
      return `${protocol}//${hostname}:${port}`;
    } catch {
      return 'http://127.0.0.1:8000';
    }
  }
  ```
- **Risque** : ✅ FAIBLE - Logique client, pas de secret

---

## 📋 5. CORS ET CONFIGURATIONS SÉCURITAIRE

### ⚠️ Configuration CORS

#### `backend/app/core/config.py`
- **Lignes 26-31** : Origines CORS autorisées
  ```python
  CORS_ORIGINS: list[str] = [
      "https://front-end-erp.vercel.app",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
  ]
  ```
- **Risque** : ⚠️ MOYEN - Doit inclure l'URL de production sur Hetzner
- **Action** : ⚠️ **AJOUTER** l'URL de production (ex: `https://votre-domaine.com`) en production

---

## 📋 6. FICHIERS À VÉRIFIER AVANT LE DÉPLOIEMENT

### ✅ Fichiers Déjà Protégés dans `.gitignore`

```
.env                    ✅ Ligne 15
.env.local             ✅ Ligne 16
.env.*.local           ✅ Ligne 17
backend/credentials_*.json  ✅ Ligne 20
backend/*credentials*.json  ✅ Ligne 21
```

### ⚠️ Fichiers à Vérifier Manuellement

| Fichier | État | Action |
|---------|------|--------|
| `backend/credentials_adrien.json` | ✅ Dans .gitignore | Vérifier qu'il n'est PAS tracké |
| `backend/credentials_clement.json` | ✅ Dans .gitignore | Vérifier qu'il n'est PAS tracké |
| `.env` | ✅ Dans .gitignore | Vérifier qu'il n'est PAS tracké |
| `frontend/.env.local` | ✅ Dans .gitignore | Vérifier qu'il n'est PAS tracké |

**Commande de vérification** :
```powershell
git ls-files | Select-String -Pattern "\.env|credentials.*\.json"
# Ne doit rien retourner !
```

---

## 🎯 PLAN D'ACTION - DÉPLOIEMENT SUR HETZNER

### Phase 1 : Vérification Avant Push sur GitHub ⚠️

1. ✅ **Vérifier que `.gitignore` est à jour** (déjà fait ✅)
2. ⚠️ **Vérifier qu'aucun fichier sensible n'est tracké** :
   ```powershell
   git ls-files | Select-String -Pattern "\.env|credentials.*\.json"
   # Si résultat, retirer du tracking :
   git rm --cached backend/credentials_*.json
   git rm --cached .env
   ```
3. ⚠️ **Créer un fichier `.env.example`** (sans secrets) pour la documentation :
   ```env
   # Base de données
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=change_me_secure_password
   POSTGRES_DB=erp_washgo
   DATABASE_URL=postgresql://postgres:change_me_secure_password@postgres:5432/erp_washgo
   
   # Google Calendar
   CALENDAR_ID_ADRIEN=adrien@example.com
   CALENDAR_ID_CLEMENT=clement@example.com
   # GOOGLE_SA_ADRIEN_JSON='{"type":"service_account",...}'
   # GOOGLE_SA_CLEMENT_JSON='{"type":"service_account",...}'
   
   # Sécurité
   SECRET_KEY=change_me_min_32_characters_long_secret_key
   ACCESS_TOKEN_EXPIRE_MINUTES=10080
   
   # Configuration
   ENABLE_DEBUG_ROUTES=false
   LOG_LEVEL=INFO
   ```

### Phase 2 : Préparation des Fichiers pour Hetzner

1. ✅ **Créer le script `transfer-secrets-to-hetzner.ps1`** (déjà fait ✅)
2. ⚠️ **Vérifier que les fichiers credentials existent** :
   ```powershell
   Test-Path backend/credentials_adrien.json
   Test-Path backend/credentials_clement.json
   Test-Path .env
   ```

### Phase 3 : Déploiement sur Hetzner

1. ⚠️ **Transférer les fichiers secrets** :
   ```powershell
   .\transfer-secrets-to-hetzner.ps1 -HETZNER_IP "VOTRE_IP"
   ```

2. ⚠️ **Créer le fichier `.env` sur le serveur** (si pas déjà fait par le script) :
   ```bash
   ssh root@VOTRE_IP_HETZNER
   nano /opt/erpwashgo/.env
   # Copier-coller le contenu de votre .env local
   ```

3. ⚠️ **Vérifier les permissions** :
   ```bash
   chmod 600 /opt/erpwashgo/backend/credentials_*.json
   chmod 600 /opt/erpwashgo/.env
   ```

4. ⚠️ **Mettre à jour `docker-compose.prod.yml`** :
   - Ajouter les volumes pour les fichiers credentials :
     ```yaml
     volumes:
       - /opt/erpwashgo/backend/credentials_adrien.json:/app/credentials_adrien.json:ro
       - /opt/erpwashgo/backend/credentials_clement.json:/app/credentials_clement.json:ro
     ```
   - OU utiliser les variables d'environnement `GOOGLE_SA_*_JSON` dans `.env`

5. ⚠️ **Mettre à jour CORS** :
   - Ajouter l'URL de production dans `backend/app/core/config.py` :
     ```python
     CORS_ORIGINS: list[str] = [
         "https://votre-domaine.com",  # ← AJOUTER
         "https://front-end-erp.vercel.app",
         # ...
     ]
     ```

### Phase 4 : Post-Déploiement

1. ⚠️ **Changer le mot de passe admin** :
   ```bash
   # Se connecter à la base de données
   docker exec -it erp_postgres_prod psql -U erp_user -d erp_washgo
   # Utiliser le script Python pour changer le mot de passe
   docker exec -it erp_backend_prod python create_admin_user.py
   ```

2. ⚠️ **Vérifier que `SECRET_KEY` est définie** :
   ```bash
   docker exec -it erp_backend_prod env | grep SECRET_KEY
   # Doit retourner une valeur complexe (pas la valeur par défaut)
   ```

3. ⚠️ **Vérifier que `POSTGRES_PASSWORD` n'est pas la valeur par défaut** :
   ```bash
   docker exec -it erp_postgres_prod env | grep POSTGRES_PASSWORD
   # Ne doit PAS retourner "postgres"
   ```

---

## 📊 Tableau Récapitulatif des Secrets

| Secret | Localisation | Méthode de Transfert | Risque |
|--------|--------------|----------------------|--------|
| `credentials_adrien.json` | `backend/` | SCP direct au serveur | 🔴 CRITIQUE |
| `credentials_clement.json` | `backend/` | SCP direct au serveur | 🔴 CRITIQUE |
| `.env` (toutes variables) | Racine | SCP direct au serveur | 🔴 CRITIQUE |
| `POSTGRES_PASSWORD` | `.env` | Variable d'environnement | 🔴 CRITIQUE |
| `SECRET_KEY` | `.env` | Variable d'environnement | 🔴 CRITIQUE |
| `GOOGLE_SA_*_JSON` | `.env` OU fichiers | Variables OU fichiers | 🔴 CRITIQUE |
| `DATABASE_URL` | `.env` | Variable d'environnement | 🔴 CRITIQUE |
| `CALENDAR_ID_*` | `.env` | Variable d'environnement | ⚠️ MOYEN |
| Mot de passe admin | Code source | Changé manuellement post-déploiement | ⚠️ MOYEN |

---

## ✅ Checklist de Sécurité

### Avant de Pusher sur GitHub

- [ ] ✅ Vérifier que `.gitignore` contient `.env` et `backend/credentials_*.json`
- [ ] ⚠️ Vérifier qu'aucun fichier sensible n'est tracké : `git ls-files | grep -E "\.env|credentials"`
- [ ] ⚠️ Si fichiers trackés : `git rm --cached backend/credentials_*.json .env`
- [ ] ⚠️ Créer `.env.example` (sans secrets) pour documentation

### Sur le Serveur Hetzner

- [ ] ⚠️ Transférer `backend/credentials_*.json` via SCP
- [ ] ⚠️ Transférer `.env` via SCP
- [ ] ⚠️ Définir permissions `chmod 600` sur les fichiers secrets
- [ ] ⚠️ Mettre à jour `docker-compose.prod.yml` (volumes credentials)
- [ ] ⚠️ Vérifier que `SECRET_KEY` est définie et complexe
- [ ] ⚠️ Vérifier que `POSTGRES_PASSWORD` n'est pas "postgres"
- [ ] ⚠️ Ajouter l'URL de production dans CORS_ORIGINS
- [ ] ⚠️ Changer le mot de passe admin après le déploiement

---

## 🆘 En Cas de Problème

### Si un Secret est Committé par Erreur

1. **Retirer immédiatement** :
   ```powershell
   git rm --cached backend/credentials_*.json
   git rm --cached .env
   git commit -m "Remove sensitive files from git tracking"
   ```

2. **Si déjà poussé sur GitHub** :
   - ⚠️ **ROTATER** immédiatement tous les secrets compromis :
     - Régénérer les Service Accounts Google
     - Changer `SECRET_KEY`
     - Changer `POSTGRES_PASSWORD`
   - ⚠️ **SUPPRIMER** l'historique Git (si nécessaire) : `git filter-branch` ou réinitialiser le repo

### Si Google Bloque l'API

1. Vérifier les quotas : https://console.cloud.google.com/apis/api/calendar.googleapis.com/quotas
2. Vérifier les permissions du Service Account
3. Vérifier que les calendriers sont partagés avec le Service Account
4. Vérifier les logs du backend pour les erreurs d'authentification

---

## 📝 Notes Importantes

1. **NE JAMAIS** commiter `.env`, `credentials_*.json` sur GitHub
2. **TOUJOURS** utiliser des secrets complexes en production (min 32 caractères)
3. **TOUJOURS** changer les mots de passe par défaut après le déploiement
4. **TOUJOURS** définir `chmod 600` sur les fichiers secrets
5. **TOUJOURS** vérifier que les secrets ne sont pas trackés avant de pusher

---

**✅ Audit terminé - Vous êtes maintenant prêt pour un déploiement sécurisé sur Hetzner ! 🚀**
