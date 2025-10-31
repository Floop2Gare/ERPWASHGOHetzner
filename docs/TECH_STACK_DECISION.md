## Décision de stack backend (verrouillage avant migration Postgres)

### 1) Constat sur le projet actuel
- Langage/Framework: Python + FastAPI (fichier d’entrée `BACK-END-ERP/app/main.py`, routes `app/api/*.py`).
- Serveur ASGI: Uvicorn (lancé via PM2 comme process manager).
- Process manager: PM2 est utilisé pour superviser le binaire Python (`uvicorn`), pas pour exécuter une app Node.
- Frontend: React/Vite, servi par Nginx (pas concerné par la décision ORM backend).
- Accès données: aujourd’hui via Supabase (REST + SDK), couche à remplacer par une DB Postgres auto‑hébergée.

Conclusion: l’application backend est **Python/FastAPI**. PM2 ne signifie pas Node; il est uniquement utilisé pour superviser le processus `uvicorn`.

### 2) ORM/Migration tool recommandé
Stack cible (PostgreSQL self‑hosted) côté backend Python:
- ORM: **SQLAlchemy 2.x** (mode Declarative + type‑hints), pour un contrôle fin, un écosystème stable, et la compatibilité large Postgres.
- Outil de migration: **Alembic** (de l’auteur de SQLAlchemy). Permet de versionner le schéma, gérer les évolutions (DDL) et les scripts de migration.

Pourquoi SQLAlchemy + Alembic ?
- Cohérence avec FastAPI et l’écosystème Python (documentation, exemples, tooling).
- Maturité et stabilité sur Postgres (transactions, pooling, types JSON/ARRAY, contraintes).
- Contrôle évolutif: migrations DDL explicites, data‑migrations possibles, compat CI/CD.

Rejet des alternatives dans ce contexte:
- Prisma/Drizzle (Node/TS) ne sont pas adaptés au runtime Python et ajouteraient une double stack inutile.
- ODM/ORM plus « high‑level » (pydantic‑SQLModel) restent en surface sur SQLAlchemy et n’apportent pas d’avantage décisif ici.

### 3) Périmètre et principes de mise en place (sans code ici)
1) Configuration DB
   - Variable `DATABASE_URL` (SQLAlchemy/psycopg2), pooling par défaut, temps d’attente paramétrés.
   - Session management (scoped session) et dépendances FastAPI (lifetime‐aware) pour ouvrir/fermer proprement.

2) Modélisation
   - Définir les modèles pour les ressources actuelles: `clients`, `services`, `engagements`, `companies`, `leads`.
   - Respecter le mapping camelCase (front) ↔ snake_case (DB) dans la couche d’accès/repos (ou au niveau de la transformation DTO↔ORM).

3) Migrations
   - Initialiser Alembic; aligner le schéma à partir de `database/schema.sql` (générer un état de référence « baseline »).
   - Une migration par ressource lors de la bascule, documentée et testée.

4) Remplacement progressif de Supabase
   - Par ressource (ordre recommandé): clients → services → engagements → companies → leads.
   - Pour chaque ressource: remplacer `insert/select/update/delete` REST Supabase par des appels ORM/SQL.
   - Conserver les endpoints publics (mêmes URLs, même forme `{ success, data }`).

5) Validation
   - Tests cURL (POST/GET liste/GET détail) + scénarios UI (création → refresh → persistance).
   - Logs proprement surveillés (`pm2 logs`) et requêtes lentes détectées (statement timeout, EXPLAIN si besoin).

### 4) Points d’attention
- Transactions: regrouper les écritures cohérentes (ex. rendez‑vous + effets secondaires) sous la même session/transaction.
- Indexes & contraintes: créer les index nécessaires (recherches par email/siret, jointures fréquentes). Contrôler NOT NULL vs. validation UI.
- JSON/ARRAY: exploiter nativement les types Postgres (JSONB, TEXT[]) pour éviter un refactor fonctionnel côté front.
- Sécurité: DB non exposée publiquement, comptes dédiés (lecture/écriture), sauvegardes et rétention.

### 5) Décision verrouillée
- Backend: **Python + FastAPI + Uvicorn (supervisé par PM2)**.
- ORM: **SQLAlchemy 2.x**.
- Migrations: **Alembic**.
- Pas d’adoption Node/Express/Prisma/Drizzle côté backend.

Cette décision sert de base à la migration Postgres self‑hosted et à la suppression progressive de toute dépendance Supabase, sans impact sur les endpoints publics ni sur le front.


