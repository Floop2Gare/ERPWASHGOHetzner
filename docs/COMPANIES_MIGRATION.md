## Migration Postgres — Ressource "companies" (SQLAlchemy 2.x + Alembic)

Objectif: migrer "companies" de Supabase vers Postgres natif, en conservant les endpoints publics et le format `{ success, data }`.

---

### 1) Modifications introduites (diff minimal)
- Modèle ORM `CompanyORM` dans `BACK-END-ERP/app/db/models.py`.
- Migration Alembic `companies`:
  - `BACK-END-ERP/alembic/versions/2025_10_31_000004_create_companies_table.py`
  - Colonnes: id (UUID, PK), name, siret, address, city, phone, email, status DEFAULT 'active', notes JSONB DEFAULT '{}'::jsonb, tags TEXT[] DEFAULT '{}', created_at/updated_at TIMESTAMPTZ DEFAULT now(), + colonnes optionnelles (postal_code, vat_number, legal_notes, vat_enabled, website, is_default, document_header_title, logo_url, invoice_logo_url, bank_*, iban, bic, planning_user), company_id (FK nullable → clients.id).
  - Index uniques insensibles à la casse: `lower(name)` et `lower(email)` (NULL autorisé).
  - Trigger `BEFORE UPDATE` pour `updated_at = now()`.
- API `companies` (`BACK-END-ERP/app/api/companies.py`): CRUD via SQLAlchemy (create 201, list, detail, update, delete). Mapping camelCase→snake_case préservé.

---

### 2) Schéma DB (table companies)
- id UUID PK
- name, siret, address, city, phone, email
- status VARCHAR(20) DEFAULT 'active'
- notes JSONB DEFAULT '{}'::jsonb
- tags TEXT[] DEFAULT '{}'
- created_at, updated_at TIMESTAMPTZ DEFAULT now()
- company_id UUID NULL REFERENCES clients(id) ON DELETE SET NULL (non utilisé par le front aujourd’hui)

Contraintes / Index / Triggers:
- Uniques: `lower(name)` et `lower(email)` (NULL autorisé)
- Trigger `BEFORE UPDATE` qui met `updated_at = now()`

---

### 3) Déploiement
```bash
cd /srv/erp/BACK-END-ERP
./venv/bin/pip install -r requirements.txt   # si nécessaire
./venv/bin/alembic upgrade head
pm2 restart erp-back
```

---

### 4) Tests cURL
- Création (201):
```bash
CID=$(uuidgen)
curl -i -X POST http://127.0.0.1:8000/companies/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$CID"'","name":"Wash&Go ÎDF","email":"contact@wg.example","phone":"+33...","address":"1 rue ...","city":"Paris","siret":"123..."}'
```
- Liste:
```bash
curl -i 'http://127.0.0.1:8000/companies/?limit=20&offset=0'
```
- Détail:
```bash
curl -i http://127.0.0.1:8000/companies/$CID
```

---

### 5) Test 409 (unicité insensible à la casse sur email)
```bash
CID1=$(uuidgen); CID2=$(uuidgen)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/companies/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$CID1"'","name":"WG Paris","email":"dup@example.com"}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/companies/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$CID2"'","name":"WG Paris 2","email":"DUP@example.com"}'
# attendu: 409
```

---

### 6) Points à surveiller
- `DATABASE_URL` OK et pool SQLAlchemy actif (pool_pre_ping, pool_recycle).
- Évolutions futures: recâbler les endpoints stats/clients/appointments sur l’ORM une fois les relations côté `clients`/`appointments` stabilisées.
- SIRET (optionnel futur): vous pouvez imposer `CHECK (char_length(siret)=14)` et un index unique `lower(siret)`; non requis en V1.
- Email nullable: toléré pour créer des entités internes non contactables; à mentionner dans le README.
- Index pratiques ajoutés: `idx_companies_city` et `idx_companies_status`.
- Tri ergonomique: pour des listes fluides, `ORDER BY lower(name)` (l’unique sur `lower(name)` existe déjà; un index non‑unique supplémentaire n’est pas nécessaire).


