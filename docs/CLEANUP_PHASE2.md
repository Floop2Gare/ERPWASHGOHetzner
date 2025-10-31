## CLEANUP PHASE 2 — Suppression de code mort et artefacts (sans changer les endpoints)

Objectif: réduire la dette technique en supprimant modules/fichiers non utilisés, artefacts et routes de debug, sans modifier les endpoints publics ni intégrer Postgres ici. Ce document liste chaque suppression, la justification, l’impact et les points restants.

---

### 1) Éléments supprimés

Backend (API & modèles):
- `BACK-END-ERP/app/api/planning_original.py`
  - Raison: implémentation legacy non importée; l’app utilise `planning.py`.
  - Impact: aucun endpoint public supprimé.

- `BACK-END-ERP/app/api/calendar_events_original.py`
  - Raison: implémentation legacy non importée; l’app utilise `calendar_events.py`.
  - Impact: aucun endpoint public supprimé.

- `BACK-END-ERP/app/api/debug_google.py`
  - Raison: route de debug non essentielle; importée conditionnellement (feature flag). 
  - Impact: aucun impact production; le flag de debug n’expose plus cette route.

- `BACK-END-ERP/api/index.py`
  - Raison: point d’entrée Vercel legacy; déploiement actuel Hetzner/PM2 n’en dépend pas.
  - Impact: aucun sur l’exécution actuelle.

Frontend:
- `FRONT-END-ERP/FRONT-END-ERP/package.json` — dépendance `@supabase/supabase-js` retirée (non utilisée dans le code source).
  - Impact: bundle allégé, aucun changement fonctionnel.

---

### 2) Modifications conservatrices (compatibilité)
- `BACK-END-ERP/app/api/clients.py` — tolérance des routes avec et sans slash final.
- `FRONT-END-ERP/FRONT-END-ERP/src/store/useAppData.ts` — re-fetch de la liste clients après mutation (persistance visible au refresh). 
- `FRONT-END-ERP/FRONT-END-ERP/src/lib/backendServices.ts` — liste clients via `GET /clients/` (avec "/").

---

### 3) Dépendances & env (état)
- Python: la lib `supabase` est encore requise par certaines routes (companies, leads, services, appointments) → suppression reportée au PR d’intégration Postgres.
- `.env` backend: variables Supabase maintenues pour compat.

---

### 4) Tests recommandés (post‑cleanup)
Backend:
```bash
curl -i http://127.0.0.1:8000/health
curl -i http://127.0.0.1:8000/clients/
```
Frontend:
```bash
cd /srv/erp && npm run build && nginx -t && systemctl reload nginx
# Créer/éditer/supprimer un client → refresh → la liste reflète l’état serveur
```

---

### 5) Points restants (prochain PR)
- Migration Postgres native: remplacer tous les accès Supabase dans `app/api` par une couche DB.
- Suppression finale des fichiers Supabase (`supabase_client.py`, `supabase_manual.py`) et de la lib Python `supabase`, ainsi que des variables d’environnement associées.
- Nettoyage éventuel des RLS/policies spécifiques Supabase dans `database/schema.sql`.

---

### 6) Résumé
Cette phase supprime les modules legacy/artefacts et routes non essentielles, met à jour les dépendances front et garantit la persistance visible côté UI (re-fetch). Les endpoints publics et le comportement fonctionnel sont préservés, préparant le codebase à l’intégration Postgres.


