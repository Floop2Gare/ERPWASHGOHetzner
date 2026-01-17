# Structure des Scripts

## 📁 Organisation

```
scripts/
├── start/          # Scripts de démarrage
│   ├── all.ps1     # Démarrer tout
│   ├── backend.ps1 # Démarrer backend uniquement
│   └── frontend.ps1# Démarrer frontend uniquement
│
├── restart/        # Scripts de redémarrage
│   ├── all.ps1     # Redémarrer tout
│   ├── backend.ps1 # Redémarrer backend uniquement
│   └── frontend.ps1# Redémarrer frontend uniquement
│
├── update/         # Scripts de mise à jour
│   ├── rebuild.ps1 # Reconstruction complète (sans cache)
│   └── quick.ps1   # Mise à jour rapide (avec cache)
│
└── stop/           # Scripts d'arrêt
    └── all.ps1     # Arrêter tout
```

## 🎯 Utilisation

### Pour l'utilisateur (commandes simples à la racine)
```powershell
.\start.ps1      # Démarrer
.\restart.ps1    # Redémarrer
.\rebuild.ps1    # Reconstruire
.\update.ps1     # Mise à jour
.\stop.ps1       # Arrêter
```

### Pour Auto (commandes détaillées dans scripts/)
```powershell
.\scripts\start\all.ps1
.\scripts\restart\backend.ps1
.\scripts\update\rebuild.ps1
```

## 🔧 Architecture

- **Backend** : Docker (PostgreSQL + FastAPI)
- **Frontend** : Local (npm run dev) pour hot reload
- **Avantage** : Changements visibles immédiatement sans reconstruire Docker

