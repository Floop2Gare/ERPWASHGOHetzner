# ERP Wash&Go

Application ERP complète pour la gestion d'entreprise.

## 🚀 Démarrage rapide

### Démarrage complet (Backend + Frontend)

```powershell
.\start.ps1
```

### Arrêt

```powershell
.\stop.ps1
```

### Redémarrage

```powershell
.\restart.ps1
```

## 📱 Accès mobile (iPhone/Android)

### Configuration initiale (une seule fois)

```powershell
.\setup-mobile-access.ps1
```

Ce script configure automatiquement :
- Détection de l'IP locale
- Configuration du fichier `.env.local`
- Affichage des URLs de connexion

### Démarrage avec test mobile

```powershell
.\DEMARRER-ET-TESTER.ps1
```

Démarre le projet et teste l'accessibilité depuis le réseau local.

### Accès depuis votre téléphone

1. Connectez votre téléphone au **même réseau WiFi** que votre PC
2. Ouvrez Safari (iOS) ou Chrome (Android)
3. Allez sur l'URL affichée (ex: `http://192.168.1.149:5173`)

**Si Safari affiche "connexion sécurisée" :**
- Videz le cache Safari : Réglages > Safari > Effacer l'historique
- Essayez en navigation privée

## 📂 Structure du projet

```
ERPWASHGO/
├── backend/          # Backend FastAPI (Docker)
├── frontend/         # Frontend React/Vite
├── scripts/          # Scripts organisés (start, stop, restart)
├── docker-compose.yml # Configuration Docker
└── package.json      # Configuration monorepo
```

## 🔧 Scripts disponibles

### Scripts principaux
- `start.ps1` - Démarre tout le projet
- `stop.ps1` - Arrête tout le projet
- `restart.ps1` - Redémarre tout le projet
- `update.ps1` - Met à jour les dépendances
- `rebuild.ps1` - Reconstruit les conteneurs Docker

### Scripts mobile
- `setup-mobile-access.ps1` - Configure l'accès mobile
- `DEMARRER-ET-TESTER.ps1` - Démarre et teste l'accès mobile
- `restart-frontend.ps1` - Redémarre uniquement le frontend

### Scripts organisés (dans `scripts/`)
- `scripts/start/` - Scripts de démarrage
- `scripts/stop/` - Scripts d'arrêt
- `scripts/restart/` - Scripts de redémarrage
- `scripts/update/` - Scripts de mise à jour

## 🌐 URLs

- **Frontend local** : http://localhost:5173
- **Backend local** : http://localhost:8000
- **Frontend mobile** : http://VOTRE_IP:5173 (affiché par les scripts)
- **Backend mobile** : http://VOTRE_IP:8000

## 📋 Prérequis

- Docker Desktop
- Node.js (pour le frontend en développement local)
- PowerShell (Windows)

## 🐳 Docker

Le backend tourne dans Docker. Les commandes Docker sont gérées automatiquement par les scripts.

## 🔐 Configuration

Les variables d'environnement sont dans :
- `backend/.env` (backend)
- `frontend/.env.local` (frontend, généré automatiquement par `setup-mobile-access.ps1`)

## 📝 Notes- Le frontend en développement local utilise Vite avec hot-reload
- Le backend utilise FastAPI avec auto-reload
- L'accès mobile nécessite que le PC et le téléphone soient sur le même réseau WiFi