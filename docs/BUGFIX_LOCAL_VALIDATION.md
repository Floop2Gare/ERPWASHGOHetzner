# BUGFIX — Validation Locale (pré-déploiement)

Ce journal recense les anomalies rencontrées lors de la validation locale (backend + frontend) et les correctifs appliqués avant toute installation serveur.

## Problème 1 — `leads.convert` dépend encore de Supabase
- **Symptôme**: Le module `app.api.leads` échoue au chargement (module désactivé dans `/health` → `disabled_modules`), les routes `/leads/*` ne sont pas montées.
- **Endpoint/page impactée**: Backend `POST /leads/{lead_id}/convert`
- **Logs console/backend**:
  - ImportError/NameError à l’import du module: type hint et dépendance `SupabaseClient`/`get_supabase_client_dependency` non définis.
- **Cause racine**: Résidu de l’ancienne intégration Supabase dans `app/api/leads.py`.
- **Correction effectuée**: Réécriture de l’endpoint de conversion en pur ORM SQLAlchemy (lecture du `Lead`, création d’un `Client`, MAJ du statut du lead), suppression de toute dépendance Supabase.
  - Fichier: `BACK-END-ERP/app/api/leads.py`
- **Commit correspondant**: `fix(local-validation): corrections pré-déploiement`
- **Résultat après fix**: Le module `leads` est monté correctement; l’endpoint `POST /leads/{lead_id}/convert` fonctionne avec la base Postgres locale.

---

Notes: Ajouter ici les éventuels autres problèmes rencontrés (frontend ou backend) avec le même format.
