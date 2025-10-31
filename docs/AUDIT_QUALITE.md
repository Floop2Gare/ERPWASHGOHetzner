# Audit Qualité — Projet ERP Wash&Go

## 1. Architecture générale
- **Forces**
  - Monorepo clair séparant `BACK-END-ERP` (FastAPI/SQLAlchemy) et `FRONT-END-ERP` (React/Vite). Voir `package.json` workspace et scripts de dev simultanés.
  - Backend FastAPI modulaire par domaines via routers (`app/api/*.py`), montage centralisé dans `app/main.py` avec CORS configuré.
  - Migrations structurées avec Alembic (`alembic/versions/*`) et configuration `alembic.ini`/`alembic/env.py` alimentée par `DATABASE_URL`.
  - Frontend React + Vite, routage `react-router-dom`, configuration de build standard (`FRONT-END-ERP/FRONT-END-ERP/package.json`).
  - Déploiement documenté: Nginx reverse proxy `/api` → Uvicorn/PM2 (`infra/nginx/erp.conf.example`, `infra/pm2/erp-back.config.example.json`).
- **Faiblesses**
  - Authentification de démonstration non sécurisée (pas de JWT/middleware global). Voir `app/api/auth.py`.
  - Double source de vérité schéma DB: Alembic vs `database/schema.sql` (legacy). Risque de dérive si utilisé par erreur.
  - Couche d’accès données dans les routers (pas de service/repository layer), complexifiant tests et évolutivité.
  - Traçabilité/utilitaires présents (`app/utils/tracing.py`) mais non intégrés au cycle requête/réponse.
- **Score /10**: 7

## 2. Qualité du code
- **Patterns utilisés**
  - FastAPI routers par ressource (`clients.py`, `services.py`, `appointments.py`), réponses normalisées `{ success, data }` via `ERPResponse`/`ERPListResponse` (`app/schemas/erp.py`).
  - SQLAlchemy 2.x Declarative (`app/db/models.py`) avec `UUID`, `JSONB`, `ARRAY` et contraintes FK.
  - Validation Pydantic v2 pour DTOs (`app/schemas/erp.py`, `app/schemas/base.py`).
  - Front: hooks (`hooks/*`), store Zustand (`store/useAppData.ts`), services API dédiés (`src/lib/backendServices.ts`).
- **Patterns manquants**
  - Absence de middleware d’auth/autorisation global et de dépendances réutilisables (e.g., `Depends(current_user)`).
  - Manque de séparation `router` ↔ `service` ↔ `repository` (accès DB direct dans les routes).
  - Gestion d’erreurs/logs non centralisée (pas d’exception handlers globaux, logs hétérogènes).
  - Tests automatisés non présents.
- **Endpoints et structure**
  - Montés dans `app/main.py` (routers multiples) avec CORS permissif.
  - CRUD paginés cohérents, recherche ILIKE, index côté DB alignés (voir migrations Alembic). Les mappages camelCase ↔ snake_case sont faits manuellement dans les handlers (`clients.update_client`).
- **Score /10**: 6.5

## 3. Base de données & Migrations (Alembic)
- **Cohérence du schéma**
  - Tables gérées via Alembic: `clients`, `services`, `appointments` avec colonnes clés (timestamps, JSONB, arrays) en phase avec `app/db/models.py`.
  - Legacy `database/schema.sql` comporte des tables additionnelles (e.g., `engagements`, `auth_users`, `documents`) non présentes dans ORM actuel — à clarifier/retirer pour éviter confusion.
- **Contraintes, index, triggers**
  - Index spécifiques: `uq_clients_email_lower` (unicité email insensible casse), GIN trigram sur `services.name`, index `appointments.start_at DESC`.
  - Triggers `updated_at` par table dans les migrations.
- **Score /10**: 7.5

## 4. Sécurité
- **Failles potentielles**
  - Auth de démo: endpoint `/auth/login` retourne un `access_token` statique sans vérification de signature/expiration; aucune protection des autres routes.
  - CORS large (origines multiples + `allow_headers`/`methods` `*`). Variable `ALLOWED_ORIGINS` existe dans `infra/env/backend.env.example` mais non consommée dans `app/main.py`.
  - Fallback `DATABASE_URL` hardcodé avec credentials par défaut dans `app/db/session.py` (risque si variable manquante en prod).
  - Pas de rate limiting, pas de protections contre enumeration/BRUTE force, pas de chiffrement applicatif de données sensibles.
- **Mauvaises pratiques éventuelles**
  - Exposition potentielle d’endpoints de debug conditionnels (`ENABLE_DEBUG_ROUTES`) — vérifier qu’ils sont désactivés en prod.
  - Logs non systématiquement épurés des données sensibles malgré utilitaires présents.
- **Score /10**: 3

## 5. Performance
- **Risques de lenteur**
  - Manipulations JSONB/ARRAY correctes; pagination par défaut (`limit=100`) sur listes.
  - Mappage manuel et sérialisation peuvent coûter CPU, mais acceptable au volume attendu.
- **Requêtes non indexées**
  - Recherches ILIKE sur `clients.name/email/phone` — index email présent; index trigram pour `services.name` déjà créé.
  - `appointments` triés par `start_at` appuyés par index DESC.
- **Score /10**: 7

## 6. Maintenabilité
- **Organisation des modules**
  - Structure claire `app/api`, `app/db`, `app/schemas`, `app/utils`. Front organisé par `components/pages/lib/store/hooks`.
- **Séparation des responsabilités**
  - Mélange partiel logique métier/accès DB dans routers; pas de couche service dédiée.
  - Deux schémas Pydantic coexistent (`schemas/base.py` et `schemas/erp.py`) avec recouvrement conceptuel.
- **Score /10**: 6.5

## 7. Déploiement & Monitoring
- **Logs**
  - Utilitaires de traçabilité présents (`app/utils/tracing.py`) pour IDs de requête/événement et masquage partiel, mais non intégrés (pas de middleware/filters). PM2 supervise Uvicorn.
- **Observabilité**
  - Pas de métriques/health enrichies (seulement `/health` basique). Pas de traces ou APM intégrés.
- **Score /10**: 5.5

## 8. Dette technique détectée
- **Points précis issus du code**
  - Auth insecure de démo (`app/api/auth.py`), aucune vérification d’accès sur autres routes.
  - CORS figé en dur (`app/main.py`) sans lecture d’`ALLOWED_ORIGINS`.
  - Fallback `DATABASE_URL` codé en dur (`app/db/session.py`).
  - Tracing non câblé (middleware manquant) alors que `app/utils/tracing.py` est prêt.
  - Divergence potentielle schéma (`database/schema.sql` legacy) vs Alembic/ORM.
  - Accès DB direct dans routers (difficile à tester/mock).
- **Priorités**
  1) Sécuriser authentification/autorisation (blocage prod).
  2) Centraliser CORS/Config et supprimer fallback DB en prod.
  3) Introduire service/repository layer et middleware de tracing.
  4) Retirer/archiver le schéma legacy pour éviter erreurs.

## 9. Recommandations
- **Correctifs rapides**
  - Activer lecture `ALLOWED_ORIGINS` depuis env et supprimer origines codées en dur.
  - Retirer le fallback `postgres:postgres@localhost` en production (exiger `DATABASE_URL`).
  - Désactiver/retirer routes de debug en prod.
  - Ajouter des index complémentaires si recherche fréquente sur `clients.phone` (btree) et `clients.name` trigram si nécessaire.
- **Améliorations structurantes**
  - Implémenter JWT (HS/RS) avec dépendance FastAPI `current_user` et RBAC côté backend (front dispose déjà de `lib/rbac.ts`).
  - Introduire une couche `services/` et `repositories/` pour isoler ORM des routers.
  - Ajouter un middleware de tracing (request_id) et brancher `utils.tracing` dans les handlers + logs structurés (JSON).
  - Normaliser les schémas Pydantic (réduire duplication `base.py`/`erp.py`) et automatiser mappage camelCase↔snake_case.
  - Supprimer ou déplacer `database/schema.sql` en archive explicite; ne garder que Alembic.
- **Roadmap 30/60/90 jours**
  - 30j: Auth JWT + CORS dynamique + suppression fallback DB + handlers d’erreurs globaux + désactivation debug routes.
  - 60j: Refactor routers → services/repositories, tests unitaires sur services, intégration tracing middleware + logs JSON.
  - 90j: Observabilité (metrics, dashboards), optimisation index supplémentaires après analyse EXPLAIN, durcissement sécurité (rate limiting, audit droits).

## 10. Conclusion
- **Niveau de maturité global**: Intermédiaire — base saine (FastAPI/SQLAlchemy/Alembic/React) mais sécurité à consolider et couches à clarifier.
- **Risques à court/moyen terme**
  - Court terme: exposition d’API sans auth robuste, mauvaise config CORS, confusion schéma legacy.
  - Moyen terme: dette d’architecture (absence service/repository), traçabilité/logs non structurés impactant le debug.


### Éléments de preuve (extraits)
- Backend FastAPI et montage des routers:
```41:46:BACK-END-ERP/app/main.py
app = FastAPI(
    title="ERP Wash&Go API",
    version="1.0.0",
    description="API Backend pour ERP Wash&Go"
)
```
```79:86:BACK-END-ERP/app/main.py
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(clients.router, prefix="/clients", tags=["clients"])
app.include_router(services.router, prefix="/services", tags=["services"])
app.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
```
- Auth de démonstration:
```9:16:BACK-END-ERP/app/api/auth.py
@router.post('/login', response_model=AuthPayload)
def login(payload: LoginRequest) -> AuthPayload:
    expected_email = os.getenv('DEMO_AUTH_EMAIL', 'demo@example.com')
    expected_password = os.getenv('DEMO_AUTH_PASSWORD', 'demo')

    if payload.email != expected_email or payload.password != expected_password:
        raise HTTPException(status_code=401, detail='Identifiants invalides')
    return AuthPayload(access_token='demo-token')
```
- Fallback `DATABASE_URL` codé en dur:
```13:21:BACK-END-ERP/app/db/session.py
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/postgres"
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
)
```
- Indexation et contraintes via Alembic:
```44:47:BACK-END-ERP/alembic/versions/2025_10_31_000001_create_clients_table.py
op.create_index('idx_clients_name', 'clients', ['name'])
op.create_index('idx_clients_status', 'clients', ['status'])
op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_email_lower ON clients ((lower(email))) WHERE email IS NOT NULL")
```
```66:69:BACK-END-ERP/alembic/versions/2025_10_31_000002_create_services_table.py
op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
op.execute("CREATE INDEX IF NOT EXISTS idx_services_name_trgm ON services USING gin (name gin_trgm_ops)")
```
- Nginx proxy `/api` vers backend:
```12:18:infra/nginx/erp.conf.example
location /api/ {
    proxy_pass http://127.0.0.1:8000/;  # Backend FastAPI via PM2
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
