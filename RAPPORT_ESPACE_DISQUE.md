# 📊 Rapport Espace Disque - Serveur ERP Wash&Go

## 💾 État Actuel (17 Janvier 2026)

### Capacité Totale
- **38 Go** de stockage disponible sur le serveur Hetzner

### Utilisation Actuelle
- **Utilisé** : **5.7 Go** (16%)
- **Disponible** : **30 Go** (84%)

### Détail de l'Utilisation

#### 1. Images Docker
- **3 images actives** : **3.8 GB**
  - Frontend (Nginx + build) : ~100 MB
  - Backend (Python) : ~300 MB
  - PostgreSQL : ~300 MB
- **Build cache** : **3.2 GB** (récupérable : 3.1 GB)
- **Total Docker** : **~7 GB**

#### 2. Volumes Docker
- **PostgreSQL data** : **64 MB**
- **Backend logs** : **4 KB**
- **Total volumes** : **~64 MB**

#### 3. Code Source
- **Frontend** : 4.4 MB
- **Backend** : 400 KB
- **Total code** : **~5 MB**

#### 4. Système
- **OS + autres** : ~1-2 GB

## 📈 Projection de Croissance

### Scénario Conservateur (Petite Entreprise)
**Sur 1 an** :
- 1 000 clients
- 5 000 devis/factures
- 10 000 services
- **Base de données** : ~500 MB
- **Logs** : ~200 MB
- **Total ajouté** : ~700 MB
- **Total après 1 an** : ~6.4 GB

### Scénario Moyen (Entreprise Moyenne)
**Sur 1 an** :
- 5 000 clients
- 25 000 devis/factures
- 50 000 services
- **Base de données** : ~2-3 GB
- **Logs** : ~500 MB
- **Total ajouté** : ~3 GB
- **Total après 1 an** : ~8.7 GB

### Scénario Important (Grande Entreprise)
**Sur 1 an** :
- 20 000 clients
- 100 000 devis/factures
- 200 000 services
- **Base de données** : ~10-15 GB
- **Logs** : ~1 GB
- **Total ajouté** : ~16 GB
- **Total après 1 an** : ~21.7 GB

## ✅ Conclusion

### Vous avez de la Marge !

**Avec 30 Go disponibles** :
- ✅ **Scénario conservateur** : ~40 ans de données
- ✅ **Scénario moyen** : ~10 ans de données
- ⚠️ **Scénario important** : ~2 ans de données

### Recommandations

#### Court Terme (0-6 mois)
- **Aucun problème** : Vous avez largement assez d'espace
- Surveiller avec `df -h` mensuellement

#### Moyen Terme (6-12 mois)
- Nettoyer le build cache Docker : `docker system prune -a` (libère ~3 GB)
- Mettre en place une rotation des logs (garder 30 jours max)

#### Long Terme (12+ mois)
- Si utilisation > 25 Go, envisager :
  - Nettoyage régulier du build cache
  - Archivage des anciennes données
  - Augmentation du stockage si nécessaire

## 🔧 Optimisations Possibles

### 1. Nettoyer le Build Cache Docker
```bash
docker system prune -a
```
**Gain** : ~3 GB immédiatement

### 2. Rotation des Logs
Mettre en place une rotation automatique pour limiter la croissance des logs.

### 3. Archivage des Données Anciennes
Après 2-3 ans, archiver les données de plus de 2 ans dans un stockage externe.

## 📊 Résumé

| Élément | Taille Actuelle | Croissance/An | Impact |
|---------|----------------|---------------|--------|
| Base de données | 64 MB | 500 MB - 15 GB | ⚠️ Variable |
| Logs | 4 KB | 200 MB - 1 GB | ✅ Faible |
| Images Docker | 3.8 GB | Stable | ✅ Stable |
| Build cache | 3.2 GB | Variable | ✅ Récupérable |
| **TOTAL** | **5.7 GB** | **1-16 GB/an** | ✅ **30 Go disponibles** |

**Verdict** : Vous avez largement assez d'espace pour plusieurs années d'utilisation normale ! 🎉
