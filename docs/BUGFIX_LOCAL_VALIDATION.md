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

## Problème 3 — Incompatibilités de types Postgres lors d’un fallback SQLite
- **Symptôme**: Impossible d’utiliser les modèles ORM avec SQLite (types `UUID`, `JSONB`, `ARRAY` non supportés).
- **Endpoint/page impactée**: Tous les CRUD lors d’un test local sans Postgres.
- **Logs console/backend**: Erreurs de compilation SQLAlchemy sur types dialecte Postgres.
- **Cause racine**: Les modèles SQLAlchemy utilisent des types spécifiques Postgres.
- **Correction effectuée**: Ajout d’un fallback typé pour SQLite via variable `DB_DIALECT`.
  - `BACK-END-ERP/app/db/models.py`: mapping dynamique des types (`UUID`→`String(36)`, `JSONB/ARRAY`→`JSON`) si `DB_DIALECT!=postgresql`.
- **Commit correspondant**: `fix(local-validation): sqlite fallback types for ORM`
- **Résultat après fix**: Les modèles sont utilisables en fallback SQLite pour tests internes.
 
## Problème 2 — Échec installation `psycopg2-binary` sous Python 3.13
- **Symptôme**: `pip install -r BACK-END-ERP/requirements.txt` échoue avec `pg_config executable not found` lors de la construction de `psycopg2-binary`.
- **Endpoint/page impactée**: Installation backend (toutes routes DB bloquées).
- **Logs console/backend**:
  - `Error: pg_config executable not found.`
- **Cause racine**: Pas de wheel précompilée pour Python 3.13 → tentative de build source nécessitant `pg_config`.
- **Correction effectuée**: Migration vers `psycopg` v3 binaire et mise à jour du driver SQLAlchemy.
  - `BACK-END-ERP/requirements.txt`: remplacer `psycopg2-binary==2.9.9` par `psycopg[binary]==3.1.19`.
  - `BACK-END-ERP/app/db/session.py`: fallback `postgresql+psycopg://...` (au lieu de `psycopg2`).
- **Commit correspondant**: `fix(local-validation): corrections pré-déploiement`
- **Résultat après fix**: Installation des dépendances Python possible sans `pg_config`.
