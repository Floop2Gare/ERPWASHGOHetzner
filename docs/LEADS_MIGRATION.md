## Migration Postgres — Ressource "leads" (SQLAlchemy 2.x + Alembic)

Objectif: migrer "leads" de Supabase vers Postgres natif, en conservant les endpoints publics et la forme `{ success, data }`.

---

### 1) Modifications introduites (diff minimal)
- Modèle ORM `LeadORM` dans `BACK-END-ERP/app/db/models.py`.
- Migration Alembic `leads`:
  - `BACK-END-ERP/alembic/versions/2025_10_31_000005_create_leads_table.py`
  - UUID PK, champs: name, email, phone, source, stage, status, interest_level (INT default 0), notes (JSONB default '{}'), tags (TEXT[] default '{}'), address, city, company, contact, owner, segment, activities (JSONB default '[]'), client_id (FK NULL → clients), company_id (FK NULL → companies), created_at/updated_at (TIMESTAMPTZ default now()).
  - Index: unique `lower(email)` (NULL autorisé), `stage`, `source`, `interest_level`.
  - Trigger BEFORE UPDATE pour `updated_at = now()`.
  - CHECK: `interest_level BETWEEN 0 AND 100`.
  - Index de tri: `idx_leads_created_at` sur `created_at DESC`.
  - (Optionnel) `pg_trgm` + index GIN trigram sur `name/email/phone/company` pour accélérer `ILIKE`.
- API `leads` (`BACK-END-ERP/app/api/leads.py`): CRUD via SQLAlchemy (create 201, list, detail, update, delete), recherche (ILIKE sur name/email/phone/company), filtres status/owner/source. `IntegrityError → 409`, `ValidationError → 422`.

---

### 2) Déploiement
```bash
cd /srv/erp/BACK-END-ERP
./venv/bin/pip install -r requirements.txt   # si nécessaire
./venv/bin/alembic upgrade head
pm2 restart erp-back
```

---

### 3) Tests cURL
- Création (201):
```bash
LID=$(uuidgen)
curl -i -X POST http://127.0.0.1:8000/leads/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$LID"'","name":"Lead Test","email":"dup@example.com","phone":"+33...","source":"web","tags":[]}'
```
- Liste:
```bash
curl -i 'http://127.0.0.1:8000/leads/?limit=20&offset=0'
```
- Détail:
```bash
curl -i http://127.0.0.1:8000/leads/$LID
```
- Changer le statut:
```bash
curl -i -X PUT http://127.0.0.1:8000/leads/$LID \
  -H 'Content-Type: application/json' \
  -d '{"status":"Converti"}'
```
- Recherche:
```bash
curl -i http://127.0.0.1:8000/leads/search/test
```

- Conflit email (409, insensible à la casse):
```bash
LID1=$(uuidgen); LID2=$(uuidgen)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/leads/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$LID1"'","name":"Dup","email":"dup@example.com"}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/leads/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$LID2"'","name":"Dup2","email":"DUP@example.com"}'
# attendu: 409
```

---

### 4) Test 409 (unicité email insensible à la casse)
```bash
LID1=$(uuidgen); LID2=$(uuidgen)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/leads/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$LID1"'","name":"Dup","email":"dup@example.com"}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/leads/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$LID2"'","name":"Dup2","email":"DUP@example.com"}'
# attendu: 409
```

---

### 5) Points à surveiller
- `DATABASE_URL` OK et pool SQLAlchemy actif (pool_pre_ping, pool_recycle).
- Les champs additionnels (stage, interest_level, activities) sont supportés et optionnels pour V1.
 - Les FKs `client_id`/`company_id` existent au schéma; si exposées dans l’API plus tard, prévoir un test d’erreur FK (409) avec UUID invalide.

#### (Optionnel) Tests erreur FK si `clientId`/`companyId` sont acceptés par l’API
```bash
BAD=$(uuidgen)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/leads/ \
  -H 'Content-Type: application/json' \
  -d '{"name":"FK bad","clientId":"00000000-0000-0000-0000-000000000000","companyId":"00000000-0000-0000-0000-000000000000"}'
# attendu: 409 si les FKs sont mappées côté API
```

#### Bonnes pratiques (optionnelles)
- Normalisation `phone` côté API: suppression espaces/tirets/points et conversion `^0` → `+33` (ajoutée dans l’API V1).
- Contraintes de domaine: `CHECK (stage IN ('new','contacted','proposal','negotiation','won','lost'))`, `CHECK (status IN ('active','archived','converti'))` (déjà dans la migration).
- Index composite: `idx_leads_source_created ON leads(source, created_at DESC)` pour les vues “source récente”.
- Recherche pondérée (plus tard): `ORDER BY similarity(name, 'foo') DESC` avec `pg_trgm`.


