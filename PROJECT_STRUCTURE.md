# Structure du Projet ERP Wash&Go

Documentation de la structure du projet après refactorisation.

## Vue d'ensemble

Le projet est organisé en monorepo avec :
- **Backend**: FastAPI (Python) dans `BACK-END-ERP/`
- **Frontend**: React + Vite (TypeScript) dans `FRONT-END-ERP/`

## Structure Frontend

### Structure des dossiers

```
FRONT-END-ERP/
├── src/
│   ├── api/                    # Services API (nouveau)
│   │   ├── config/             # Configuration API
│   │   │   └── api.ts
│   │   ├── utils/              # Utilitaires API
│   │   │   ├── httpClient.ts   # Client HTTP réutilisable
│   │   │   └── logger.ts       # Logging
│   │   ├── services/           # Services API par domaine
│   │   │   ├── clients.ts
│   │   │   ├── services.ts
│   │   │   ├── appointments.ts
│   │   │   ├── companies.ts
│   │   │   ├── calendar.ts
│   │   │   └── health.ts
│   │   └── index.ts            # Point d'entrée
│   ├── components/             # Composants React
│   ├── hooks/                  # Hooks React
│   ├── layout/                 # Composants de layout
│   ├── lib/                    # Bibliothèques utilitaires
│   │   └── backendServices.ts  # Compatibilité (déprécié)
│   ├── pages/                  # Pages de l'application
│   ├── store/                  # State management (Zustand)
│   └── workspace/              # Modules workspace
```

### Services API

Les services API sont organisés par domaine métier :

- **ClientService**: Gestion des clients
- **ServiceService**: Gestion des services
- **AppointmentService**: Gestion des rendez-vous
- **CompanyService**: Gestion des entreprises
- **CalendarService**: Intégration Google Calendar
- **HealthService**: Santé du backend

### Client HTTP

Le client HTTP centralisé (`httpClient`) gère :
- Les requêtes HTTP (GET, POST, PUT, DELETE, PATCH)
- La gestion des erreurs
- Les timeouts
- Le logging
- La normalisation des réponses

## Structure Backend

### Structure des dossiers

```
BACK-END-ERP/
├── app/
│   ├── main.py                 # Point d'entrée FastAPI
│   ├── api/                    # Routes API
│   │   ├── clients.py
│   │   ├── services.py
│   │   ├── appointments.py
│   │   ├── companies.py
│   │   └── ...
│   ├── core/                   # Configuration centrale
│   │   └── config.py
│   ├── db/                     # Base de données
│   │   ├── models.py
│   │   └── session.py
│   ├── schemas/                # Schémas Pydantic
│   │   ├── base.py
│   │   └── erp.py
│   └── utils/                  # Utilitaires
│       └── tracing.py
├── alembic/                    # Migrations
│   ├── env.py
│   └── versions/
├── Dockerfile                  # Production
├── Dockerfile.dev              # Développement
└── docker-compose.dev.yml      # Docker Compose dev
```

### Configuration

La configuration est centralisée dans `app/core/config.py` :
- Variables d'environnement
- Configuration de la base de données
- Configuration CORS
- Configuration de sécurité

## Déploiement

### Docker

Le projet utilise Docker pour le déploiement :

- **Production**: `docker-compose.prod.yml`
- **Développement**: `BACK-END-ERP/docker-compose.dev.yml`

### Services Docker

- **PostgreSQL**: Base de données
- **Backend**: FastAPI avec Uvicorn
- **Frontend**: Optionnel (peut être servi via Nginx)

### Variables d'environnement

Les variables d'environnement sont configurées dans :
- `.env` (local)
- Variables d'environnement Docker (production)

## Migration

### Migration depuis l'ancien code

L'ancien fichier `backendServices.ts` est conservé pour la compatibilité mais est déprécié. Pour migrer :

**Ancien code** :
```typescript
import { ClientService } from '@/lib/backendServices';
```

**Nouveau code** :
```typescript
import { ClientService } from '@/api';
```

### Avantages de la nouvelle structure

1. **Modularité**: Services séparés par domaine
2. **Maintenabilité**: Code plus lisible et organisé
3. **Réutilisabilité**: Client HTTP réutilisable
4. **Testabilité**: Services isolés et testables
5. **Scalabilité**: Facile d'ajouter de nouveaux services

## Développement

### Développement local

```bash
# Backend
cd BACK-END-ERP
docker-compose -f docker-compose.dev.yml up --build

# Frontend
cd FRONT-END-ERP
npm install
npm run dev
```

### Tests

```bash
# Backend
cd BACK-END-ERP
pytest

# Frontend
cd FRONT-END-ERP
npm test
```

## Documentation

- **API Frontend**: `FRONT-END-ERP/src/api/README.md`
- **Backend**: `BACK-END-ERP/README.md`
- **Déploiement**: `DEPLOYMENT.md`

## Prochaines étapes

1. Ajouter des tests unitaires pour les services API
2. Ajouter des tests d'intégration pour le backend
3. Mettre en place un système de monitoring
4. Ajouter une documentation API (Swagger)
5. Mettre en place un système de cache
6. Ajouter une gestion d'authentification JWT

