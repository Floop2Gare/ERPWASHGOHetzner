# 🔐 Guide de Déploiement Sécurisé sur Hetzner

**Date** : 2025-01-08  
**Objectif** : Déployer le projet sur Hetzner sans exposer les clés API Google sur GitHub

---

## 🚨 ⚠️ PROBLÈME DE SÉCURITÉ IDENTIFIÉ

### ❌ Fichiers Sensibles Non Protégés

**ATTENTION** : Les fichiers suivants contiennent des **clés API Google** et ne sont **PAS** dans `.gitignore` :

```
backend/credentials_adrien.json
backend/credentials_clement.json
```

**Action IMMÉDIATE requise** : Ajouter ces fichiers à `.gitignore` **AVANT** de pusher sur GitHub !

---

## ✅ Solution : Transférer les Secrets Directement au Serveur

### Méthode 1 : Transférer les Fichiers via SCP (Recommandé)

#### 1.1. Ajouter les fichiers sensibles à `.gitignore`

**IMPORTANT** : Faire ça **AVANT** de pusher sur GitHub !

```bash
# Ajouter à .gitignore
backend/credentials_*.json
backend/*.json
!backend/package.json  # Sauf package.json si vous en avez
```

#### 1.2. Transférer les fichiers directement au serveur Hetzner

**Via SCP (Windows PowerShell)** :

```powershell
# Transférer les fichiers credentials au serveur
scp backend/credentials_adrien.json root@VOTRE_IP_HETZNER:/opt/erpwashgo/backend/
scp backend/credentials_clement.json root@VOTRE_IP_HETZNER:/opt/erpwashgo/backend/

# Transférer le fichier .env si vous en avez un
scp .env root@VOTER_IP_HETZNER:/opt/erpwashgo/
```

**Via WinSCP (Interface Graphique)** :
1. Télécharger WinSCP : https://winscp.net/
2. Se connecter au serveur Hetzner
3. Glisser-déposer les fichiers `credentials_*.json` et `.env`
4. Placer les fichiers dans `/opt/erpwashgo/backend/`

#### 1.3. Définir les permissions sur le serveur

```bash
# Se connecter au serveur Hetzner
ssh root@VOTRE_IP_HETZNER

# Sécuriser les fichiers credentials (lecture seule pour le propriétaire)
chmod 600 /opt/erpwashgo/backend/credentials_*.json
chmod 600 /opt/erpwashgo/.env
```

---

### Méthode 2 : Variables d'Environnement (Alternative)

#### 2.1. Extraire le contenu JSON des fichiers credentials

**Sur votre ordinateur local** :

```powershell
# Lire le contenu des fichiers JSON
Get-Content backend/credentials_adrien.json | Out-File -Encoding utf8 credentials_adrien.txt
Get-Content backend/credentials_clement.json | Out-File -Encoding utf8 credentials_clement.txt
```

#### 2.2. Définir les variables d'environnement sur Hetzner

**Option A : Via Docker Compose** (si vous utilisez Docker)

Créer un fichier `.env` sur le serveur avec :

```env
# Google Calendar - Adrien
GOOGLE_SA_ADRIEN_JSON='{"type":"service_account",...}'
CALENDAR_ID_ADRIEN=adrien@example.com

# Google Calendar - Clément
GOOGLE_SA_CLEMENT_JSON='{"type":"service_account",...}'
CALENDAR_ID_CLEMENT=clement@example.com

# Base de données
DATABASE_URL=postgresql://user:password@postgres:5432/erp_washgo

# Sécurité
SECRET_KEY=votre-cle-secrete-super-longue-et-complexe-min-32-caracteres

# Autres variables...
```

**Option B : Via fichier `.env` système**

Sur le serveur Hetzner :

```bash
# Créer le fichier .env
nano /opt/erpwashgo/.env

# Copier-coller le contenu (avec les variables GOOGLE_SA_*_JSON)
# Enregistrer (Ctrl+O, Enter, Ctrl+X)
```

---

### Méthode 3 : Secrets Docker (Si vous utilisez Docker Swarm/Kubernetes)

#### 3.1. Créer des secrets Docker

```bash
# Sur le serveur Hetzner
docker secret create credentials_adrien backend/credentials_adrien.json
docker secret create credentials_clement backend/credentials_clement.json
```

#### 3.2. Utiliser les secrets dans `docker-compose.yml`

```yaml
services:
  backend:
    secrets:
      - credentials_adrien
      - credentials_clement
    environment:
      - GOOGLE_SA_ADRIEN_FILE=/run/secrets/credentials_adrien
      - GOOGLE_SA_CLEMENT_FILE=/run/secrets/credentials_clement

secrets:
  credentials_adrien:
    external: true
  credentials_clement:
    external: true
```

---

## 📋 Checklist de Déploiement Sécurisé

### ✅ Avant de Pusher sur GitHub

- [ ] ✅ Ajouter `backend/credentials_*.json` à `.gitignore`
- [ ] ✅ Ajouter `.env` à `.gitignore` (déjà fait ✅)
- [ ] ✅ Vérifier qu'aucun fichier sensible n'est tracké :
  ```bash
  git status
  git ls-files | grep -E "\.(env|json)$|credentials"
  ```
- [ ] ✅ Si des fichiers sensibles sont déjà trackés, les retirer :
  ```bash
  git rm --cached backend/credentials_adrien.json
  git rm --cached backend/credentials_clement.json
  git rm --cached .env
  git commit -m "Remove sensitive files from git tracking"
  ```

### ✅ Sur le Serveur Hetzner

- [ ] ✅ Créer les répertoires nécessaires :
  ```bash
  mkdir -p /opt/erpwashgo/backend
  mkdir -p /opt/erpwashgo/frontend
  ```
- [ ] ✅ Transférer les fichiers sensibles via SCP :
  ```bash
  scp backend/credentials_*.json root@HETZNER_IP:/opt/erpwashgo/backend/
  scp .env root@HETZNER_IP:/opt/erpwashgo/
  ```
- [ ] ✅ Définir les permissions sécurisées :
  ```bash
  chmod 600 /opt/erpwashgo/backend/credentials_*.json
  chmod 600 /opt/erpwashgo/.env
  ```
- [ ] ✅ Vérifier que Docker peut accéder aux fichiers :
  ```bash
  # Si vous utilisez Docker, vérifier les volumes dans docker-compose.yml
  ```

---

## 🔧 Configuration Docker Compose pour Production

### Exemple de `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    volumes:
      # Monter les fichiers credentials depuis le serveur
      - /opt/erpwashgo/backend/credentials_adrien.json:/app/credentials_adrien.json:ro
      - /opt/erpwashgo/backend/credentials_clement.json:/app/credentials_clement.json:ro
      # Monter le fichier .env
      - /opt/erpwashgo/.env:/app/.env:ro
    environment:
      # Variables d'environnement (si vous préférez les variables plutôt que les fichiers)
      # GOOGLE_SA_ADRIEN_FILE: /app/credentials_adrien.json
      # GOOGLE_SA_CLEMENT_FILE: /app/credentials_clement.json
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
    env_file:
      - /opt/erpwashgo/.env

  frontend:
    build: ./frontend
    # Pas besoin de secrets pour le frontend

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=erp_washgo
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 🚀 Déploiement Complet sur Hetzner

### Étape 1 : Préparer le Projet Local

```powershell
# 1. Vérifier que .gitignore est à jour
cat .gitignore

# 2. Retirer les fichiers sensibles du tracking Git (s'ils y sont déjà)
git rm --cached backend/credentials_*.json 2>$null
git rm --cached .env 2>$null

# 3. Vérifier qu'ils ne sont plus trackés
git status
```

### Étape 2 : Pusher le Code sur GitHub

```powershell
# Le code est maintenant propre, sans secrets
git add .
git commit -m "Prepare for deployment - remove sensitive files"
git push origin main
```

### Étape 3 : Sur le Serveur Hetzner

```bash
# 1. Se connecter au serveur
ssh root@VOTRE_IP_HETZNER

# 2. Cloner le repo (sans les secrets)
cd /opt
git clone https://github.com/VOTRE_USERNAME/ERPWASHGO.git erpwashgo
cd erpwashgo

# 3. Créer les fichiers secrets (transférer depuis votre PC via SCP)
# (Voir Méthode 1 ci-dessus)

# 4. Créer le fichier .env
nano .env
# Copier-coller votre configuration

# 5. Définir les permissions
chmod 600 backend/credentials_*.json
chmod 600 .env

# 6. Lancer Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### Étape 4 : Transférer les Fichiers Secrets (Depuis votre PC)

```powershell
# Depuis votre ordinateur Windows
scp backend/credentials_adrien.json root@VOTRE_IP_HETZNER:/opt/erpwashgo/backend/
scp backend/credentials_clement.json root@VOTRE_IP_HETZNER:/opt/erpwashgo/backend/
scp .env root@VOTRE_IP_HETZNER:/opt/erpwashgo/
```

---

## 🔒 Sécurité - Bonnes Pratiques

### ✅ À FAIRE

1. ✅ **Utiliser `.gitignore`** pour exclure tous les fichiers sensibles
2. ✅ **Transférer les secrets directement** au serveur via SCP/SFTP
3. ✅ **Définir les permissions** (chmod 600) sur les fichiers sensibles
4. ✅ **Ne JAMAIS commiter** les secrets sur GitHub
5. ✅ **Utiliser des variables d'environnement** pour les secrets en production
6. ✅ **Chiffrer les fichiers** si nécessaire (gpg, openssl)

### ❌ À NE JAMAIS FAIRE

1. ❌ **NE JAMAIS** commiter `.env`, `credentials_*.json` sur GitHub
2. ❌ **NE JAMAIS** mettre les secrets dans le code source
3. ❌ **NE JAMAIS** partager les secrets par email/messagerie non sécurisée
4. ❌ **NE JAMAIS** laisser les fichiers sensibles accessibles publiquement

---

## 📝 Variables d'Environnement Nécessaires

### Variables pour Google Calendar

```env
# Fichiers ou variables JSON
GOOGLE_SA_ADRIEN_FILE=/app/credentials_adrien.json
GOOGLE_SA_CLEMENT_FILE=/app/credentials_clement.json

# OU variables d'environnement (alternative)
GOOGLE_SA_ADRIEN_JSON='{"type":"service_account",...}'
GOOGLE_SA_CLEMENT_JSON='{"type":"service_account",...}'

# IDs des calendriers
CALENDAR_ID_ADRIEN=adrien@example.com
CALENDAR_ID_CLEMENT=clement@example.com
```

### Variables pour la Base de Données

```env
DATABASE_URL=postgresql://user:password@postgres:5432/erp_washgo
```

### Variables de Sécurité

```env
SECRET_KEY=votre-cle-secrete-super-longue-et-complexe-min-32-caracteres
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

### Variables pour le Calendrier

```env
CALENDAR_BASE_URL=https://mon-projet-calendrier.vercel.app
CALENDAR_DEFAULT_CALENDARS=adrien,clement
CALENDAR_MAX_RANGE_DAYS=90
```

---

## 🔍 Vérification Post-Déploiement

### Vérifier que les Secrets ne sont pas sur GitHub

```bash
# Sur GitHub, rechercher dans le code
# Recherche : "type\": \"service_account"
# Si des résultats apparaissent, RETIRER immédiatement !
```

### Vérifier que les Fichiers sont Bien sur le Serveur

```bash
# Sur le serveur Hetzner
ssh root@VOTRE_IP_HETZNER
ls -la /opt/erpwashgo/backend/credentials_*.json
ls -la /opt/erpwashgo/.env

# Vérifier les permissions
stat /opt/erpwashgo/backend/credentials_adrien.json
# Doit afficher : -rw------- (600)
```

### Tester que Google Calendar Fonctionne

```bash
# Tester l'API
curl -X GET "http://localhost:8000/api/calendar/events?from=2025-01-01&to=2025-01-31" \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

---

## 🆘 En Cas de Problème

### Si Google Bloque l'API

1. **Vérifier les quotas** : https://console.cloud.google.com/apis/api/calendar.googleapis.com/quotas
2. **Vérifier les permissions** du Service Account
3. **Vérifier que les calendriers sont partagés** avec le Service Account
4. **Vérifier les logs** du backend pour les erreurs d'authentification

### Si les Secrets ne Fonctionnent Pas

1. **Vérifier les chemins** dans Docker Compose
2. **Vérifier les permissions** (chmod 600)
3. **Vérifier les variables d'environnement** :
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend env | grep GOOGLE
   ```

---

## ✅ Résumé Rapide

1. **Ajouter `backend/credentials_*.json` à `.gitignore`** ⚠️ URGENT
2. **Retirer les fichiers sensibles du tracking Git** (s'ils y sont déjà)
3. **Pusher le code sur GitHub** (sans secrets)
4. **Transférer les secrets directement au serveur via SCP** :
   ```powershell
   scp backend/credentials_*.json root@IP:/opt/erpwashgo/backend/
   scp .env root@IP:/opt/erpwashgo/
   ```
5. **Définir les permissions** : `chmod 600` sur les fichiers secrets
6. **Lancer Docker Compose** : `docker-compose -f docker-compose.prod.yml up -d`

---

**✅ Vous êtes maintenant prêt pour un déploiement sécurisé sur Hetzner ! 🚀**
