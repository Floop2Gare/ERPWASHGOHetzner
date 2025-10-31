## Rapport de nettoyage — Suppression Supabase & code mort (sans refactor d’API)

Ce rapport liste précisément tout ce qui a été supprimé/neutralisé, pourquoi, et l’impact attendu. Les endpoints publics n’ont pas été modifiés. Aucune intégration Postgres n’a été ajoutée dans ce lot.

---

### 1) Fichiers supprimés
- `BACK-END-ERP/app/models/supabase_custom.py`
  - Raison: module client Supabase « custom » non référencé ailleurs (code mort, détecté par recherche d’imports).
  - Impact: aucun chemin public. Le backend conserve les accès via `supabase_client.py` (client officiel) et/ou `supabase_manual.py` (REST manuel).

- `BACK-END-ERP/app/api/debug_supabase.py`
  - Raison: route de debug non essentielle et non publique (montée seulement si `ENABLE_DEBUG_ROUTES=true`).
  - Impact: `app/main.py` effectue un import dynamique protégé; en absence du module, un stub est monté. Aucune régression sur les routes publiques.

---

### 2) Dépendances supprimées
- Frontend `FRONT-END-ERP/FRONT-END-ERP/package.json`
  - Retrait: `@supabase/supabase-js` (aucune importation dans le code source). 
  - Raison: lib non utilisée → réduction du bundle et de la surface d’attaque.
  - Impact: aucun changement fonctionnel; les appels Front → Back restent inchangés.

Note: côté backend, la lib Python `supabase` n’a pas été retirée car encore utilisée par certaines routes (`supabase_client.py` est importé par companies/leads/services/appointments). Son retrait sera fait dans un PR séparé après migration de ces routes vers une couche DB native.

---

### 3) Fichiers modifiés (compat minor)
- `BACK-END-ERP/app/api/clients.py`
  - Ajout du support des routes sans slash final (`@router.get("")` et `@router.post("")`).
  - Raison: normaliser l’acceptation des URLs avec/sans slash pour éviter des 405 côté Front.
  - Impact: pas de changement d’API; meilleure tolérance.

- `FRONT-END-ERP/FRONT-END-ERP/src/store/useAppData.ts`
  - Invalidation + re-fetch de la liste clients après create/update/delete afin d’assurer la persistance visible au refresh.
  - Impact: UX fiable sans modifier les endpoints.

- `FRONT-END-ERP/FRONT-END-ERP/src/lib/backendServices.ts`
  - Garantit `GET /clients/` (slash final) pour la liste.
  - Impact: évite les 405.

---

### 4) Ce qui reste (et pourquoi)
- `BACK-END-ERP/app/models/supabase_client.py` et `supabase_manual.py`
  - Requis par les endpoints existants. Seront supprimés avec le PR d’intégration Postgres (remplacement par une couche DB native SQL/ORM).
- Variables d’env Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, etc.)
  - Encore nécessaires au run actuel tant que l’accès DB passe par Supabase.

---

### 5) Tests de non‑régression (à exécuter)
Backend (serveur):
```bash
curl -i http://127.0.0.1:8000/health
curl -i http://127.0.0.1:8000/clients/
```
Frontend:
```bash
cd /srv/erp && npm run build
nginx -t && systemctl reload nginx
# Ouvrir l'app et vérifier la création d'un client, puis refresh → persiste.
```

---

### 6) Prochaines étapes (hors de ce PR)
- PR « feature/postgres-integration »: ajouter la couche DB native (SQLAlchemy/psycopg2), migrer chaque ressource, puis supprimer:
  - `supabase_client.py`, `supabase_manual.py`, la lib `supabase` en Python, les variables d’env associées.
  - Toute logique RLS/policies spécifique à Supabase dans `database/schema.sql`.


