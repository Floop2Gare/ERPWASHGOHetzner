## Migration Postgres — Ressource "services" (SQLAlchemy 2.x + Alembic)

Objectif: basculer la ressource "services" de Supabase REST vers Postgres natif (SQLAlchemy 2.x + psycopg2 + Alembic), en conservant les endpoints publics et la forme `{ success, data }`.

---

### 1) Modifications introduites (diff minimal)
- Modèle ORM `ServiceORM` dans `BACK-END-ERP/app/db/models.py`.
- Migration Alembic `services`:
  - `BACK-END-ERP/alembic/versions/2025_10_31_000002_create_services_table.py`
  - Colonnes: id (UUID), category, name, description, base_price, base_duration, active, options (JSONB), created_at, updated_at
  - TIMESTAMPTZ + `DEFAULT now()` pour timestamps
  - Trigger `BEFORE UPDATE` pour `updated_at = now()`
  - Index: B‑Tree `name`, `active`, `category`, et index unique sur `lower(name)` (NULL autorisé)
  - Contraintes: `CHECK (base_price >= 0)`, `CHECK (base_duration >= 0)`
  - (Optionnel) Extension `pg_trgm` et index `GIN` trigram sur `name` pour accélérer les recherches `ILIKE`
- API `services` (`BACK-END-ERP/app/api/services.py`): insert/select/update/delete via SQLAlchemy, pagination et filtres conservés, 201 en création, mapping camelCase→snake_case, génération UUID si absent.

---

### 2) Schéma DB (table services)
- id (UUID, PK)
- category (VARCHAR(100), nullable)
- name (VARCHAR(255), NOT NULL)
- description (TEXT)
- base_price (NUMERIC(10,2) DEFAULT 0)
- base_duration (INTEGER DEFAULT 0)
- active (BOOLEAN DEFAULT true)
- options (JSONB DEFAULT '[]')
- created_at, updated_at (TIMESTAMPTZ DEFAULT now())

Contraintes / Index / Triggers:
- Index unique sur `lower(name)` (insensible à la casse, NULL autorisé)
- Index B‑Tree sur `name`, `active`, `category`
- Trigger `BEFORE UPDATE` qui met `updated_at = now()`
- `CHECK (base_price >= 0)` et `CHECK (base_duration >= 0)`
- (Optionnel) `CREATE EXTENSION IF NOT EXISTS pg_trgm` + `CREATE INDEX ... USING gin (name gin_trgm_ops)`

---

### 3) Variables d’environnement
- `DATABASE_URL=postgresql+psycopg2://USER:PASS@HOST:5432/DB`
- `get_db()` gère commit/rollback/close et mappe `IntegrityError → 409`.

---

### 4) Procédure de déploiement
1) Installer deps (si pas déjà faits):
```bash
cd /srv/erp/BACK-END-ERP
./venv/bin/pip install -r requirements.txt
```
2) Exécuter migrations:
```bash
./venv/bin/alembic upgrade head
```
3) Redémarrer backend:
```bash
pm2 restart erp-back
```

---

### 5) Tests cURL (validation)
- Création (201):
```bash
SID=$(uuidgen)
curl -i -X POST http://127.0.0.1:8000/services/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$SID"'","name":"Nettoyage intérieur","category":"Voiture","active":true,"options":[]}'
```
- Liste:
```bash
curl -i 'http://127.0.0.1:8000/services/?limit=20&offset=0&active_only=false'
```
- Détail:
```bash
curl -i http://127.0.0.1:8000/services/$SID
```
- Recherche:
```bash
curl -i http://127.0.0.1:8000/services/search/nettoy
```
Si l’extension `pg_trgm` et l’index GIN trigram sont activés, les recherches `ILIKE` sur `name` seront plus rapides.
- Par catégorie:
```bash
curl -i http://127.0.0.1:8000/services/category/Voiture
```
- Catégories distinctes:
```bash
curl -i http://127.0.0.1:8000/services/categories
```

---

### 6) Test 409 (unicité sur lower(name))
```bash
SID1=$(uuidgen); SID2=$(uuidgen)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/services/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$SID1"'","name":"Polish Luxe","active":true}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/services/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$SID2"'","name":"POLISH LUXE","active":true}'
# attendu: 409
```

---

### 7) Rollback simple
```bash
cd /srv/erp/BACK-END-ERP
./venv/bin/alembic downgrade -1
pm2 restart erp-back
```

---

### 8) Points à surveiller
- `DATABASE_URL` chargé et pool SQLAlchemy (pool_pre_ping/pool_recycle) actifs.
- L’API conserve `{ success, data }` et les mêmes URLs.
- Les champs `base_price`/`base_duration` sont optionnels (default 0) si le front ne les envoie pas.


