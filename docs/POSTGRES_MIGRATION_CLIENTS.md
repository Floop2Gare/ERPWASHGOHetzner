## Migration Postgres — Ressource "clients" (SQLAlchemy 2.x + Alembic)

Objectif: basculer la ressource "clients" du backend FastAPI de Supabase REST vers Postgres natif (SQLAlchemy 2.x + psycopg2 + Alembic), en conservant les endpoints publics et la forme de réponse.

---

### 1) Modifications introduites (diff minimal)
- Ajout SQLAlchemy/Alembic/psycopg2 dans `BACK-END-ERP/requirements.txt`.
- Alembic bootstrap:
  - `BACK-END-ERP/alembic.ini`
  - `BACK-END-ERP/alembic/env.py`
  - `BACK-END-ERP/alembic/versions/2025_10_31_000001_create_clients_table.py`
- Couche DB:
  - `BACK-END-ERP/app/db/session.py` (engine, SessionLocal, dependency `get_db`)
  - `BACK-END-ERP/app/db/models.py` (ORM `ClientORM`)
- Endpoints clients (`BACK-END-ERP/app/api/clients.py`):
  - Remplacement insert/select/update/delete Supabase par opérations ORM.
  - Support des routes avec et sans slash final conservé.
  - Génération UUID côté backend si `id` absent.
  - Remap camelCase (front) → snake_case (DB) maintenu.
  - Réponse normalisée `{ success, data }` préservée.

---

### 2) Schéma DB (table clients)
Colonnes principales:
- id (PK, UUID), type, name, company_name, first_name, last_name,
  siret, email, phone, address, city, status,
  tags (ARRAY(TEXT)), last_service (string/ISO), contacts (JSONB),
  created_at, updated_at (TIMESTAMPTZ DEFAULT now()).

Migration Alembic ajoutée: `create_clients_table`.

#### Contraintes / Index / Triggers
- id: UUID (colonne Postgres `uuid`), gérée en amont par le backend (UUID v4).
- created_at / updated_at: TIMESTAMPTZ, `DEFAULT now()`.
- Trigger BEFORE UPDATE: met `updated_at = now()` automatiquement.
- Indexs:
  - Index unique sur `lower(email)` (insensible à la casse, `email` peut être NULL → les NULL ne se dédupliquent pas)
  - Index B‑Tree sur `status`
  - Index B‑Tree sur `name`
- Defaults:
  - `tags` → `DEFAULT '{}'::text[]`
  - `status` → `DEFAULT 'active'`

---

### 3) Variables d’environnement
- `DATABASE_URL=postgresql+psycopg2://USER:PASS@HOST:5432/DB`
- Pas de changement des endpoints publics.
- Supabase peut rester pour les autres ressources jusqu’à leur migration.

---

### 4) Procédure de déploiement
1) Installer deps backend:
```bash
cd /srv/erp/BACK-END-ERP
./venv/bin/pip install -r requirements.txt
```
2) Appliquer la migration (DB Postgres self‑hosted):
```bash
cd /srv/erp/BACK-END-ERP
./venv/bin/alembic upgrade head
```
3) Redémarrer backend + rebuild front:
```bash
pm2 restart erp-back
cd /srv/erp && npm run build
nginx -t && systemctl reload nginx
```

---

### 5) Tests cURL (validation)
- Création:
```bash
CID=$(uuidgen)
curl -i -X POST http://127.0.0.1:8000/clients/ \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$CID\",\"type\":\"company\",\"name\":\"Client Test\",\"email\":\"test@example.com\"}"
```
- Conflit email (409):
```bash
# 1ère création
CID1=$(uuidgen)
curl -i -X POST http://127.0.0.1:8000/clients/ \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$CID1\",\"type\":\"company\",\"name\":\"DUP1\",\"email\":\"dup@example.com\"}"

# 2ème création avec le même email (casse ignorée)
CID2=$(uuidgen)
curl -i -X POST http://127.0.0.1:8000/clients/ \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$CID2\",\"type\":\"company\",\"name\":\"DUP2\",\"email\":\"Dup@Example.com\"}"
# Attendu: HTTP/1.1 409 Conflict
```
- Liste:
```bash
curl -i http://127.0.0.1:8000/clients/
```
- Détail:
```bash
curl -i http://127.0.0.1:8000/clients/$CID
```
Attendus: 200/201 et `{ success: true, data: ... }`.

---

### 6) Contraintes / Index / Triggers (récapitulatif)
- Unicité fonctionnelle sur l’email insensible à la casse: index unique sur `lower(email)` (NULL autorisé)
- Index B‑Tree sur `status` et `name`
- `tags` par défaut `{}::text[]`
- `status` par défaut `'active'`
- `created_at` / `updated_at` en TIMESTAMPTZ avec `DEFAULT now()`
- Trigger `BEFORE UPDATE` qui met `updated_at = now()`

Test d’unicité email (409):
```bash
CID1=$(uuidgen); CID2=$(uuidgen)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/clients/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$CID1"'","type":"company","name":"Dup Email","email":"dup@example.com"}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/clients/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$CID2"'","type":"company","name":"Dup Email 2","email":"DUP@example.com"}'
# attendu: 409
```

---

### 7) Rollback simple
En cas de problème:
```bash
cd /srv/erp/BACK-END-ERP
./venv/bin/alembic downgrade -1  # revenir avant la création de la table
pm2 restart erp-back
```
Remettre temporairement la logique Supabase pour clients (si vous aviez gardé une branche de secours) et réessayer après correction.

---

### 8) Points à surveiller
- `DATABASE_URL` correctement chargé (utiliser `pm2 restart erp-back --update-env` si nécessaire).
- Droits DB: user a les permissions DDL/DML.
- Format `tags` (ARRAY) et `contacts` (JSON) selon vos données existantes.
- Index pertinents (email/name/status) créés.

---

### 9) Étapes suivantes
- Migrer progressivement services → engagements → companies → leads avec le même pattern.
- Retirer définitivement les dépendances Supabase et variables d’env une fois toutes les ressources migrées.


