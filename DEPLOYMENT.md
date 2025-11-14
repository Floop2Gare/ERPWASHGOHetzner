# Guide de déploiement ERP Wash&Go

Guide pour déployer l'application ERP Wash&Go en production avec Docker.

## Architecture

L'application est composée de :
- **Backend**: FastAPI (Python 3.13) avec PostgreSQL
- **Frontend**: React + Vite (TypeScript)
- **Base de données**: PostgreSQL 16

## Prérequis

- Docker et Docker Compose installés
- Accès à un serveur Linux (Ubuntu 20.04+ recommandé)
- Nom de domaine configuré (optionnel mais recommandé)

## Structure du projet

```
ERPWASHGO/
├── BACK-END-ERP/          # Backend FastAPI
│   ├── app/               # Code de l'application
│   ├── alembic/           # Migrations de base de données
│   ├── Dockerfile         # Dockerfile pour la production
│   └── requirements.txt   # Dépendances Python
├── FRONT-END-ERP/         # Frontend React
│   ├── src/               # Code source
│   ├── package.json       # Dépendances Node.js
│   └── vite.config.ts     # Configuration Vite
├── docker-compose.prod.yml  # Docker Compose pour la production
└── infra/                 # Configuration d'infrastructure
    ├── nginx/             # Configuration Nginx
    └── pm2/               # Configuration PM2
```

## Déploiement avec Docker

### 1. Préparation du serveur

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker $USER
```

### 2. Configuration des variables d'environnement

Créer un fichier `.env` à la racine du projet :

```bash
# Base de données
POSTGRES_USER=erp_user
POSTGRES_PASSWORD=change_me_secure_password
POSTGRES_DB=erp_washgo
POSTGRES_PORT=5432

# Backend
BACKEND_PORT=8000
ENABLE_DEBUG_ROUTES=false

# Frontend
FRONTEND_PORT=5173

# Sécurité
SECRET_KEY=your-secret-key-here
```

### 3. Déploiement du backend

```bash
# Cloner le projet
git clone <repository-url>
cd ERPWASHGO

# Lancer les services
docker-compose -f docker-compose.prod.yml up -d --build

# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs -f

# Vérifier le statut
docker-compose -f docker-compose.prod.yml ps
```

### 4. Configuration Nginx (optionnel)

Pour servir le frontend et proxy les requêtes API :

```nginx
server {
    listen 80;
    server_name votre-domaine.tld;

    # Frontend (build Vite)
    root /srv/erp/FRONT-END-ERP/dist;
    index index.html;

    # Proxy pour l'API backend
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend SPA
    location / {
        try_files $uri /index.html;
    }
}
```

### 5. Configuration SSL avec Certbot (optionnel)

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d votre-domaine.tld

# Renouvellement automatique
sudo certbot renew --dry-run
```

## Développement local

### Avec Docker Compose

```bash
# Lancer les services de développement
cd BACK-END-ERP
docker-compose -f docker-compose.dev.yml up --build

# Les services seront accessibles sur :
# - Backend: http://localhost:8000
# - PostgreSQL: localhost:5433
```

### Sans Docker

```bash
# Backend
cd BACK-END-ERP
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd FRONT-END-ERP
npm install
npm run dev
```

## Migrations de base de données

```bash
# Créer une nouvelle migration
cd BACK-END-ERP
alembic revision --autogenerate -m "description de la migration"

# Appliquer les migrations
alembic upgrade head

# Avec Docker
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## Maintenance

### Sauvegarde de la base de données

```bash
# Sauvegarder la base de données
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U erp_user erp_washgo > backup.sql

# Restaurer la base de données
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U erp_user erp_washgo < backup.sql
```

### Mise à jour de l'application

```bash
# Mettre à jour le code
git pull

# Reconstruire les images
docker-compose -f docker-compose.prod.yml up -d --build

# Appliquer les migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Logs

```bash
# Voir les logs du backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Voir les logs de la base de données
docker-compose -f docker-compose.prod.yml logs -f postgres
```

## Sécurité

### Recommandations

1. **Variables d'environnement** : Ne jamais commiter les fichiers `.env`
2. **Mots de passe** : Utiliser des mots de passe forts pour la base de données
3. **HTTPS** : Configurer SSL/TLS pour la production
4. **Firewall** : Configurer un firewall pour limiter l'accès aux ports
5. **Backups** : Mettre en place des sauvegardes régulières

### Configuration du firewall

```bash
# Autoriser uniquement les ports nécessaires
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Monitoring

### Healthcheck

L'endpoint `/health` permet de vérifier l'état de l'application :

```bash
curl http://localhost:8000/health
```

### Monitoring avec Prometheus (optionnel)

```yaml
# Ajouter au docker-compose.prod.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
```

## Dépannage

### Problèmes courants

1. **Erreur de connexion à la base de données**
   - Vérifier que PostgreSQL est démarré
   - Vérifier les variables d'environnement
   - Vérifier les logs : `docker-compose logs postgres`

2. **Erreur 502 Bad Gateway**
   - Vérifier que le backend est démarré
   - Vérifier la configuration Nginx
   - Vérifier les logs : `docker-compose logs backend`

3. **Erreur de migration**
   - Vérifier que les migrations sont à jour
   - Vérifier les logs : `docker-compose logs backend`
   - Appliquer les migrations manuellement : `alembic upgrade head`

## Support

Pour toute question ou problème, consulter :
- Documentation FastAPI : https://fastapi.tiangolo.com/
- Documentation Docker : https://docs.docker.com/
- Documentation PostgreSQL : https://www.postgresql.org/docs/

