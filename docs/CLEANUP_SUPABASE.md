## Nettoyage Supabase — Audit complet et plan de suppression (sans refactor d’API)

Objectif: supprimer/neutraliser proprement toutes les dépendances à Supabase (code, libs, env, docs) sans changer les endpoints publics et sans implémenter ici l’intégration PostgreSQL auto‑hébergée. Cette note prépare un PR `cleanup/supabase` (orientations, ordre des commits, points de contrôle, tests et rollback).

---

### 1) Inventaire exhaustif des éléments liés à Supabase

Code backend (Python):
- `BACK-END-ERP/app/models/supabase_client.py` (client officiel)
- `BACK-END-ERP/app/models/supabase_manual.py` (client REST manuel via requests)
- `BACK-END-ERP/app/models/supabase_custom.py` (si présent/utile)
- `BACK-END-ERP/app/api/debug_supabase.py` (route de debug)
- Utilisations dans les routes (imports directs/indirects):
  - `BACK-END-ERP/app/api/clients.py` (insert/select/update/delete via supabase)
  - `BACK-END-ERP/app/api/services.py`
  - `BACK-END-ERP/app/api/engagements.py` / `appointments.py`
  - `BACK-END-ERP/app/api/companies.py`
  - `BACK-END-ERP/app/api/leads.py`

Dépendances backend:
- `supabase==…` dans `BACK-END-ERP/requirements.txt` / `requirements-full.txt`
- Utilisation de `requests/httpx` pour appeler l’API REST de Supabase (manuel)

Schéma & migrations:
- `BACK-END-ERP/database/schema.sql` (tables + RLS « Allow all operations », pensé pour Supabase)
- `BACK-END-ERP/database/migrations/*.sql` (inclut RLS/policies orientées Supabase)

Env/Config:
- `infra/env/backend.env.example` — variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_JWT_SECRET`
- `.env` backend sur serveur: mêmes clés
- `ENABLE_DEBUG_ROUTES` expose `/debug/debug-supabase` si `true`

Frontend (TS/React):
- `FRONT-END-ERP/FRONT-END-ERP/package.json` — dépendance `@supabase/supabase-js` (même si peu/plus utilisée)
- `dist/assets/supabase-*.js` (artefacts build)
  
Docs:
- README/QUICKSTART mentionnent Supabase (URL, clés, etc.)

CI/Nginx:
- Pas de config Supabase spécifique dans Nginx (proxy /api inchangé)
- Pas de pipeline CI spécifique détecté au dépôt

---

### 2) Contraintes à respecter
- Ne pas modifier les endpoints publics (chemins et formes des réponses `{ success, data }`).
- Ne pas livrer l’intégration PostgreSQL ici (sera traitée dans un autre PR dédié).
- Nettoyage « sûr »: neutraliser/retirer ce qui est purement Supabase sans casser le run.

---

### 3) Plan de suppression/neutralisation — ordre exact (PR `cleanup/supabase`)

Phase A — Préparation (docs/env)
1. Ajouter ce document au dépôt pour cadrer le PR et l’intention.
2. Mettre à jour `infra/env/backend.env.example` (déprécier les variables Supabase; garder une section « legacy » commentée). Justification: éviter la confusion et l’exposition de clés.
3. Mettre à jour les docs (README/QUICKSTART) pour retirer les sections Supabase ou les marquer « Legacy ».

Phase B — Neutralisation douce (garde‑fou)
4. Désactiver les routes de debug Supabase par défaut (`ENABLE_DEBUG_ROUTES=false`) dans les exemples d’env.
5. Introduire (dans les docs uniquement) un « mode lecture seule Legacy »: préciser que tant que l’intégration Postgres n’est pas en place, les fichiers `supabase_*.py` restent mais ne doivent pas être activés en prod.

Phase C — Dépendances et imports (sans casser l’existant)
6. Front: retirer `@supabase/supabase-js` de `package.json` si non utilisé par le code source (vérifier import). Justification: réduire le bundle et l’attaque surface. Si une importation subsiste, remplacer par un mock local (dans un PR ultérieur si besoin).
7. Back: retirer `supabase` (lib Python) de `requirements*.txt` SI et SEULEMENT SI plus aucun module n’importe `supabase` (l’usage « manuel » via requests/httpx peut rester). Sinon, conserver jusqu’à la migration complète.

Phase D — Code legacy Supabase
8. Marquer comme legacy (en-tête de fichier) les modules:
   - `app/models/supabase_client.py`
   - `app/models/supabase_manual.py`
   - `app/api/debug_supabase.py`
   Justification: permettre une review claire et un diff propre lors du PR d’intégration Postgres.
9. Ne pas supprimer immédiatement les appels Supabase dans `app/api/*.py` (clients/services/engagements/companies/leads) pour préserver les endpoints publics; la suppression sera faite dans le PR d’intégration Postgres qui remplacera ces accès par SQL/ORM.

Phase E — Schéma
10. Annoter `database/schema.sql` comme « générique Postgres » et déplacer (dans un futur PR) les policies RLS spécifiques Supabase. Justification: réduire les ambiguïtés quand on bascule sur Postgres auto‑hébergé.

Phase F — Artefacts
11. Front: nettoyer les artefacts `dist/assets/supabase-*.js` lors du prochain build (automatique après retrait de la lib).

---

### 4) Points de contrôle (avant merge)
- Build Front OK (`npm run build`), bundle sans `@supabase/supabase-js` si retirée.
- Back OK (`pm2 restart erp-back`), endpoints publics inchangés, `/health` en 200.
- Absence d’erreurs d’import sur `supabase` côté Python (si la lib est retirée, vérifier que plus aucun import n’existe).
- Docs/env actualisés; pas de fuite de clés.

---

### 5) Tests de non‑régression (sans Postgres)
- API (smoke):
  - `curl -i http://127.0.0.1:8000/health` → 200
  - `curl -i http://127.0.0.1:8000/clients/` → 200 (si legacy encore actif), sinon 200 avec structure `{ success, data: [] }` mockée (voir note ci‑dessous).
- UI:
  - Ouverture de l’app, aucune erreur console liée à Supabase.

Note: si vous neutralisez totalement Supabase avant d’intégrer Postgres, prévoir un mode « lecture vide » temporaire (réponses vides) pour éviter des 500 (à décider dans un PR court et isolé, sans changer le contrat des endpoints).

---

### 6) Rollback
- Si un service dépend encore de Supabase en prod, revert du commit retirant la lib/les imports.
- Rétablir le `.env` précédent (clés Supabase) et redéployer.

---

### 7) Ce qui sera retiré/neutralisé dans le PR `cleanup/supabase`
(Sans implémenter Postgres ici; endpoints publics préservés)

Retraits/neutralisations proposés:
1. Front: dépendance `@supabase/supabase-js` si non utilisée (et purge des artefacts dist lors du build).
2. Back: lib Python `supabase` si non importée (sinon conserver jusqu’au PR d’intégration Postgres).
3. Env: clés Supabase retirées des templates `.env` (ou déplacées en section Legacy commentée).
4. Debug route Supabase désactivée par défaut (feature flag existant).
5. Documentation nettoyée: mentions Supabase déplacées dans une section « Legacy ».

Non retiré dans ce PR:
- Code d’accès Supabase au cœur des endpoints (clients/services/engagements/companies/leads) pour ne pas casser l’API. Leur suppression interviendra avec l’intégration Postgres, en remplaçant chaque accès par des requêtes SQL/ORM.

---

### 8) Prochain PR (hors de ce scope)
- `feature/postgres-integration`: ajout de la couche DB (SQLAlchemy/psycopg2), migration ressource par ressource, tests end‑to‑end, suppression des modules Supabase et des dépendances résiduelles.

---

### 9) Résumé décisionnel
- Ce PR `cleanup/supabase` se limite à: documentation, env, dépendances non utilisées, désactivation debug, marquage legacy. 
- Aucune rupture d’endpoint ni ajout de features. 
- L’intégration Postgres et la suppression définitive des accès Supabase sont explicitement déportées.


