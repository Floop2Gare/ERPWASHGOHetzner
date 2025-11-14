# Backend ERP Wash&Go - FastAPI

Backend FastAPI pour l'application ERP Wash&Go.

## Structure du projet

```
BACK-END-ERP/
├── app/
│   ├── main.py          # Point d'entrée de l'application
│   ├── api/             # Routes API
│   │   ├── clients.py
│   │   ├── services.py
│   │   ├── appointments.py
│   │   ├── companies.py
│   │   └── ...
│   ├── db/              # Configuration de la base de données
│   │   ├── models.py
│   │   └── session.py
│   ├── schemas/         # Schémas Pydantic
│   │   ├── base.py
│   │   └── erp.py
│   └── utils/           # Utilitaires
│       └── tracing.py
├── alembic/             # Migrations de base de données
│   ├── env.py
│   └── versions/
├── requirements.txt     # Dépendances Python
├── Dockerfile           # Dockerfile pour la production
├── Dockerfile.dev       # Dockerfile pour le développement
└── docker-compose.dev.yml  # Docker Compose pour le développement
```

## Prérequis

- Python 3.13+
- PostgreSQL 16+
- Docker et Docker Compose (pour le déploiement)

## Installation

### Développement local

1. Créer un environnement virtuel :
```bash
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
```

2. Installer les dépendances :
```bash
pip install -r requirements.txt
```

3. Configurer les variables d'environnement :
```bash
cp .env.example .env
# Modifier les variables dans .env
```

4. Appliquer les migrations :
```bash
alembic upgrade head
```

5. Lancer le serveur de développement :
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Développement avec Docker

1. Lancer les services avec Docker Compose :
```bash
docker-compose -f docker-compose.dev.yml up --build
```

2. Les services seront accessibles sur :
   - Backend: http://localhost:8000
   - PostgreSQL: localhost:5433

### Production avec Docker

1. Lancer les services avec Docker Compose :
```bash
docker-compose -f ../docker-compose.prod.yml up --build -d
```

2. Les services seront accessibles sur :
   - Backend: http://localhost:8000
   - PostgreSQL: localhost:5432

## Variables d'environnement

- `DATABASE_URL`: URL de connexion à la base de données PostgreSQL
- `DB_DIALECT`: Dialecte de base de données (postgresql, sqlite)
- `ENABLE_DEBUG_ROUTES`: Activer les routes de debug (true/false)

## Migrations

### Créer une nouvelle migration :
```bash
alembic revision --autogenerate -m "description de la migration"
```

### Appliquer les migrations :
```bash
alembic upgrade head
```

### Revenir à une version précédente :
```bash
alembic downgrade -1
```

## API Documentation

Une fois le serveur lancé, la documentation de l'API est disponible sur :
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Tests

```bash
pytest
```

## Déploiement

Le backend peut être déployé avec Docker Compose en production. Voir `docker-compose.prod.yml` pour la configuration.

## Structure des routes API

- `/health` - Healthcheck
- `/clients/` - Gestion des clients
- `/services/` - Gestion des services
- `/appointments/` - Gestion des rendez-vous
- `/companies/` - Gestion des entreprises
- `/leads/` - Gestion des leads
- `/users/` - Gestion des utilisateurs
- `/planning/` - Planning et calendrier
- `/stats/` - Statistiques
