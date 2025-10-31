## Migration Postgres — Ressource "appointments" (SQLAlchemy 2.x + Alembic)

Objectif: basculer "appointments" (rendez‑vous) de Supabase vers Postgres natif en copiant le pattern clients/services, tout en conservant les endpoints publics et la forme `{ success, data }`.

---

### 1) Modifications introduites (diff minimal)
- Modèle ORM `AppointmentORM` dans `BACK-END-ERP/app/db/models.py`.
- Migration Alembic `appointments`:
  - `BACK-END-ERP/alembic/versions/2025_10_31_000003_create_appointments_table.py`
  - Colonnes: id (UUID, PK), client_id (FK→clients.id), service_id (FK→services.id), start_at (TIMESTAMPTZ), end_at (TIMESTAMPTZ, NULL), status (VARCHAR), notes (JSONB DEFAULT '{}'::jsonb), created_at/updated_at (TIMESTAMPTZ DEFAULT now()).
  - Index: client_id, service_id, start_at.
  - Trigger `BEFORE UPDATE` pour `updated_at = now()`.
- API `appointments` (`BACK-END-ERP/app/api/appointments.py`):
  - Création 201, liste, détail, update, delete → SQLAlchemy.
  - Génération UUID si absent.
  - Mapping de sortie conservant des clés attendues (`scheduled_at` depuis `start_at`, `start_time` depuis `end_at`).

---

### 2) Schéma DB (table appointments)
- id UUID PK
- client_id UUID FK NOT NULL → `clients(id)` ON DELETE CASCADE
- service_id UUID FK NOT NULL → `services(id)` ON DELETE CASCADE
- start_at TIMESTAMPTZ NOT NULL
- end_at TIMESTAMPTZ NULL
- status VARCHAR(50) NULL
- notes JSONB NOT NULL DEFAULT '{}'::jsonb
- created_at TIMESTAMPTZ DEFAULT now()
- updated_at TIMESTAMPTZ DEFAULT now()

Contraintes / Index / Triggers:
- Index B‑Tree: `client_id`, `service_id`, `start_at`
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
AID=$(uuidgen)
curl -i -X POST http://127.0.0.1:8000/appointments/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$AID"'","clientId":"<client_uuid>","serviceId":"<service_uuid>","scheduledAt":"2025-11-01T09:00:00Z"}'
```
- Liste:
```bash
curl -i 'http://127.0.0.1:8000/appointments/?limit=20&offset=0'
```
- Détail:
```bash
curl -i http://127.0.0.1:8000/appointments/$AID
```

---

### 5) Tests d’erreurs
- FK invalide (client/service inexistant) → `IntegrityError` mappé en 409:
```bash
BAD=$(uuidgen)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8000/appointments/ \
  -H 'Content-Type: application/json' \
  -d '{"id":"'"$BAD"'","clientId":"00000000-0000-0000-0000-000000000000","serviceId":"00000000-0000-0000-0000-000000000000","scheduledAt":"2025-11-01T09:00:00Z"}'
# attendu: 409
```
- Validation manquante/mauvais format → 422 (ex: manque `clientId` ou `serviceId`).

---

### 6) Points à surveiller
- `get_db()` gère commit/rollback/close; `IntegrityError → 409`, 404 levé par les endpoints, 422 pour validations (FastAPI).
- La sortie conserve `{ success, data }` et inclut `scheduled_at`/`start_time` pour compat frontend.


