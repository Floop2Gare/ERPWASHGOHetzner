# 📊 Analyse de l'Espace Disque - Serveur ERP Wash&Go

## 💾 Espace Disque Actuel

### Capacité Totale
- **38 Go** de stockage disponible sur le serveur Hetzner (partition `/dev/sda1`)

### Utilisation Actuelle
- **Utilisé** : 5.7 Go (16%)
- **Disponible** : 30 Go (84%)
- **Total** : 38 Go

### Détail de l'Utilisation

#### 1. Images Docker
- **3 images actives** : 3.8 GB
- **Build cache** : 3.2 GB (récupérable : 3.1 GB)
- **Total Docker** : ~7 GB

#### 2. Volumes Docker
- **PostgreSQL data** : 64 MB
- **Backend logs** : [À vérifier]
- **Total volumes** : ~66 MB

#### 3. Code Source
- **Frontend** : 4.4 MB
- **Backend** : 400 KB
- **Total code** : ~5 MB

#### 4. Base de Données
- **Taille actuelle** : [À vérifier]

## 📈 Estimation de Croissance

### Composants qui Consomment de l'Espace

#### 1. **Base de Données PostgreSQL**
- **Taille actuelle** : [À vérifier]
- **Croissance estimée** :
  - Clients : ~1-2 KB par client
  - Devis/Factures : ~5-10 KB par document
  - Services : ~2-5 KB par service
  - **Estimation** : ~100-200 MB pour 10 000 clients avec historique complet

#### 2. **Images Docker**
- **Taille actuelle** : [À vérifier]
- **Images** :
  - Frontend (Nginx + build) : ~50-100 MB
  - Backend (Python) : ~200-300 MB
  - PostgreSQL : ~200-300 MB
  - **Total** : ~500-700 MB

#### 3. **Volumes Docker**
- **PostgreSQL data** : [À vérifier]
- **Logs** : ~10-50 MB/mois selon l'activité

#### 4. **Logs**
- **Backend logs** : ~1-5 MB/jour
- **Nginx logs** : ~1-2 MB/jour
- **Total** : ~60-210 MB/mois

### Projection sur 1 An

**Scénario Conservateur** (petite entreprise) :
- 1 000 clients
- 5 000 devis/factures
- 10 000 services
- **Base de données** : ~500 MB
- **Logs** : ~2-3 GB/an
- **Total** : ~3-4 GB

**Scénario Moyen** (entreprise moyenne) :
- 5 000 clients
- 25 000 devis/factures
- 50 000 services
- **Base de données** : ~2-3 GB
- **Logs** : ~2-3 GB/an
- **Total** : ~5-6 GB

**Scénario Important** (grande entreprise) :
- 20 000 clients
- 100 000 devis/factures
- 200 000 services
- **Base de données** : ~10-15 GB
- **Logs** : ~2-3 GB/an
- **Total** : ~13-18 GB

## ⚠️ Points d'Attention

### 1. **Logs**
- Les logs peuvent grandir rapidement si non nettoyés
- **Recommandation** : Rotation des logs (garder 30 jours max)

### 2. **Images Docker**
- Les anciennes images s'accumulent
- **Recommandation** : Nettoyer régulièrement avec `docker system prune`

### 3. **Backups**
- Si vous faites des backups locaux, ils consomment aussi de l'espace
- **Recommandation** : Backups externes (cloud, autre serveur)

## 💡 Recommandations

### Court Terme (0-6 mois)
- **40 Go suffisent largement** pour une utilisation normale
- Surveiller l'espace avec `df -h` mensuellement

### Moyen Terme (6-12 mois)
- Mettre en place une rotation des logs
- Nettoyer les images Docker inutilisées
- Surveiller la taille de la base de données

### Long Terme (12+ mois)
- Si > 30 Go utilisés, envisager :
  - Augmentation du stockage Hetzner
  - Migration des logs vers un service externe
  - Archivage des anciennes données

## 🔧 Commandes Utiles

```bash
# Vérifier l'espace disque
df -h

# Taille de la base de données
docker compose exec postgres psql -U erp_user -d erp_washgo -c "SELECT pg_size_pretty(pg_database_size('erp_washgo'));"

# Nettoyer les images Docker inutilisées
docker system prune -a

# Vérifier la taille des volumes
docker volume ls
du -sh /var/lib/docker/volumes/*
```
