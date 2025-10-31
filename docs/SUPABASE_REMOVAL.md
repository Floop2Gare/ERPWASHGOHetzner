## Suppression Supabase — PR cleanup_supabase_final

### Pourquoi Supabase est retiré
- Migration complète du backend vers Postgres self‑hosted (SQLAlchemy 2.x + Alembic).
- Limiter la complexité (RLS/policies) et dépendances externes.
- Unifier la stack et simplifier le déploiement sur le serveur (Hetzner + Nginx + PM2).

### Où vit la base de données maintenant
- PostgreSQL self‑hosted, accessible via `DATABASE_URL` dans `BACK-END-ERP/.env`.
- Schéma et évolutions gérés par Alembic.

### Ce qui a été retiré dans ce PR
- Code: `app/models/supabase_client.py`, `app/models/supabase_manual.py` supprimés.
- API: toutes les références à Supabase supprimées dans les endpoints (recâblées ORM).
- Config: variables `SUPABASE_*` retirées de `infra/env/backend.env.example` (section Legacy commentée ajoutée).
- Build: suppression du chunk Supabase côté front (`vite.config.ts`).
- SQL: fichiers/sections RLS/policies Supabase retirés (`database/rls_production_policies.sql` supprimé, `schema.sql` marqué Legacy et nettoyé des RLS/policies).

### Comment rebasculer (rollback) si besoin
1) Réintroduire les variables `SUPABASE_*` dans l’environnement et dans `backend.env.example`.
2) Restaurer le client Supabase (réintroduire `app/models/supabase_client.py` ou une version compat).
3) Dans les endpoints, remplacer les appels ORM par les appels REST Supabase précédemment utilisés.
4) Côté front, rétablir le chunk `@supabase/supabase-js` si vous reconsommez directement le SDK (non recommandé).

Remarque: ce rollback est déconseillé. Préférer la stack Postgres native.

### Vérifications et déploiement
1) Vérifier qu’aucune référence Supabase n’existe hors documentation legacy:
```bash
rg -i supabase -n --glob '!docs/**' --glob '!**/README*' --glob '!**/*.md' --glob '!**/LEGACY*'
```
2) Installer les dépendances backend:
```bash
cd /srv/erp/BACK-END-ERP && ./venv/bin/pip install -r requirements.txt
```
3) Appliquer les migrations si nécessaire:
```bash
./venv/bin/alembic upgrade head
```
4) Redémarrer le backend et vérifier la santé:
```bash
pm2 restart erp-back
curl -i http://127.0.0.1:8000/health  # doit renvoyer 200 et status ok/degraded selon modules
```

### Tests de non-régression
- CRUD `clients/services/appointments/companies/leads` → OK
- Recherche (ILIKE) et filtres → OK
- Conflits d’unicité (ex: lower(email)) → HTTP 409
- Validation Pydantic → HTTP 422
- Healthcheck `/health` → 200

### Changelog (PR cleanup_supabase_final)
- BREAKING CHANGE: aucune — endpoints, URLs et formats `{ success, data }` inchangés.

### Clause future-proof
- Supabase ne peut plus être réactivé partiellement. Toutes les ressources utilisent désormais l’ORM Postgres. Un mix Supabase/Postgres n’est pas supporté.


