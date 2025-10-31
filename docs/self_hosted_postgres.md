## Base PostgreSQL auto‑hébergée (Hetzner) — Plan de mise en place pour ERPWASHGO

Objectif: remplacer Supabase (Postgres managé + REST) par une base PostgreSQL auto‑hébergée sur votre serveur Hetzner, sans coder ici. Ce guide décrit l’infra, les variables d’environnement, l’adaptation du backend, la sécurité, les sauvegardes, une migration éventuelle depuis Supabase, et les tests de validation. Suivez l’ordre indiqué pour atteindre 100% de fonctionnement après redéploiement.

---

### 1) Architecture cible (vue d’ensemble)
- Nginx (reverse proxy) → Backend FastAPI (PM2, port interne 8000) → PostgreSQL (Docker, réseau local Docker).
- Front (build Vite) servi par Nginx sur le même domaine. Les appels API passent par `/api` (pas de CORS).
- Postgres n’est pas exposé sur Internet (écoute sur le réseau Docker uniquement). Accès local via `psql` possible.

---

### 2) Prérequis
- Serveur Ubuntu (Hetzner), accès root/SSH.
- Docker + Docker Compose installés.
- UFW actif: ports 22/80/443 ouverts; 5432 bloqué vers l’extérieur.

---

### 3) Installation Postgres (Docker)
1) Créer un réseau Docker dédié:
```bash
docker network create erp_net || true
```
2) Dossier de données et backups:
```bash
mkdir -p /srv/erp/postgres/{data,backups}
chmod 700 /srv/erp/postgres/data
```
3) Lancer Postgres + (optionnel) pgAdmin via Docker:
```bash
cat > /srv/erp/postgres/docker-compose.yml <<'YML'
version: '3.8'
services:
  db:
    image: postgres:16
    container_name: erp-postgres
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: "CHANGE_ME_STRONG_PASSWORD"
      POSTGRES_USER: "erp"
      POSTGRES_DB: "erp"
    volumes:
      - /srv/erp/postgres/data:/var/lib/postgresql/data
    networks:
      - erp_net
    # Pas d'exposition publique du port 5432

  pgadmin:
    image: dpage/pgadmin4:8
    container_name: erp-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: "CHANGE_ME_STRONG_PASSWORD"
    ports:
      - "127.0.0.1:5050:80"  # accès local uniquement (SSH tunnel si besoin)
    networks:
      - erp_net

networks:
  erp_net:
    external: true
YML
docker compose -f /srv/erp/postgres/docker-compose.yml up -d
```
4) Créer les rôles/DB applicatifs (optionnel si vous gardez `erp/erp`):
```bash
docker exec -it erp-postgres psql -U postgres -c "CREATE USER erp_api WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';"
docker exec -it erp-postgres psql -U postgres -c "CREATE DATABASE erp OWNER erp_api;"
```

---

### 4) Variables .env (backend)
Dans `/srv/erp/BACK-END-ERP/.env`, ajouter/mettre à jour:
```
# Connexion Postgres self‑hosted (SSL inutile en local Docker)
DATABASE_URL=postgresql+psycopg2://erp_api:CHANGE_ME_STRONG_PASSWORD@erp-postgres:5432/erp

# Désactiver les intégrations Supabase si vous migrez totalement
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```
Note: l’hôte est `erp-postgres` (nom du service Docker) car le backend tournera sur l’hôte ou dans Docker selon votre choix. Si le backend n’est pas conteneurisé, vous pouvez exposer 5432 en local uniquement (`127.0.0.1:5432`) et utiliser `localhost`.

---

### 5) Connexion backend (plan de modifications, sans coder ici)
Le backend actuel parle à Supabase REST. Pour Postgres self‑hosted:
1) Introduire une couche d’accès DB native (ex.: SQLAlchemy + psycopg2):
   - Fichier de config DB (création d’un `SessionLocal` à partir de `DATABASE_URL`).
   - Déclarer les modèles (ou requêtes SQL) pour `clients`, `services`, `engagements`, `companies`, `leads`.
2) Adapter les routes FastAPI:
   - Remplacer les appels Supabase (`supabase.table(...).insert/select/update/delete`) par des requêtes SQL/ORM.
   - Conserver le remap camelCase → snake_case, la génération d’UUID, et la réponse normalisée `{ success, data }`.
3) Charger `.env` déjà supporté par l’app (dotenv). 
4) Supprimer/ignorer les dépendances Supabase inutiles (phase 2).

Ordre d’application:
1) Ajouter config DB + modèles/queries.
2) Migrer d’abord la ressource "clients" (la plus critique), tester end‑to‑end.
3) Étendre aux autres ressources (services → rendez‑vous → companies → leads).
4) Retirer le code Supabase (optionnel) une fois la migration validée.

Points de contrôle:
- Les endpoints supportent `/ressource/` et sans slash.
- `POST/PUT` renvoient `200/201 + { success, data }`.
- Listes `GET /ressource/` rechargent bien après mutation côté front.

---

### 6) Sécurité réseau
- Postgres non exposé publiquement: pas de `-p 5432:5432` dans Compose.
- UFW: ne pas ouvrir 5432; garder 22/80/443.
- Accès d’admin:
  - `docker exec -it erp-postgres psql -U postgres` (shell),
  - pgAdmin en local via tunnel SSH (port 5050 bindé en 127.0.0.1).
- Mots de passe forts et rotation périodique.

---

### 7) Initialisation du schéma (depuis le projet)
1) Depuis l’hôte:
```bash
docker exec -i erp-postgres psql -U erp_api -d erp < /srv/erp/BACK-END-ERP/database/schema.sql
```
2) Extensions éventuelles:
```bash
docker exec -it erp-postgres psql -U postgres -d erp -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```
3) Vérifier les tables/contraintes créées selon votre besoin (NOT NULL, indexes, etc.).

---

### 8) Backups & rétention
- Sauvegarde logique quotidienne:
```bash
cat > /etc/cron.d/erp_pg_backup <<'CRON'
0 2 * * * root docker exec erp-postgres pg_dump -U erp_api -F c -d erp > /srv/erp/postgres/backups/erp_$(date +\%F).dump
CRON
```
- Rétention (7–14 jours) + rsync/Cloud (S3/Backblaze) recommandé.
- Test de restauration (mensuel): `pg_restore` dans une DB de test.

---

### 9) Migration éventuelle depuis Supabase
Option A (dump SQL):
1) Depuis Supabase: exporter chaque table (ou dump complet) en SQL/CSV.
2) Adapter les noms de colonnes (snake_case) si nécessaire.
3) Importer dans Postgres local:
   - SQL: `psql -U erp_api -d erp -f export.sql`
   - CSV: `\copy table from 'file.csv' with (format csv, header true)`.

Option B (ETL simple):
1) Écrire un script temporaire (hors de ce guide) qui lit Supabase REST et insère en Postgres (via SQLAlchemy).
2) Conserver les mêmes IDs pour ne pas casser les relations.

Contrôles post‑migration:
- Comptes de lignes par table identiques (± tolérance si nettoyage).
- Échantillon de données (10 enregistrements) identiques sur les champs clés.

---

### 10) Étapes de test (validation complète)
1) Santé API:
```bash
curl -i http://127.0.0.1:8000/health
```
2) Clients:
```bash
CID=$(uuidgen)
curl -i -X POST http://127.0.0.1:8000/clients/ \
  -H 'Content-Type: application/json' \
  -d "{\"id\":\"$CID\",\"type\":\"company\",\"name\":\"Client Test\",\"email\":\"test@example.com\"}"
curl -i http://127.0.0.1:8000/clients/
curl -i http://127.0.0.1:8000/clients/$CID
```
3) Services / Rendez‑vous / Companies / Leads: répéter le triplet POST → GET liste → GET détail.
4) UI: créer, rafraîchir → la donnée persiste et se relit depuis Postgres.

---

### 11) Modifications nécessaires dans le projet (résumé)
- Backend:
  - Ajouter une config DB (`DATABASE_URL`) et une couche d’accès (SQLAlchemy/psycopg2 ou SQL brut).
  - Adapter les endpoints pour lire/écrire en Postgres (remplacer Supabase REST).
  - Conserver conventions: slash final pour listes, `{ success, data }`, UUID générés côté serveur, remap camelCase→snake_case.
  - Retirer (phase 2) les dépendances Supabase non utilisées.
- Front:
  - Aucun changement majeur si les endpoints restent identiques.
  - Après chaque mutation: invalider/re‑fetch la liste correspondante (déjà recommandé).
- Infra:
  - Docker Postgres + backups + sécurité réseau.

Ordre d’application:
1) Déployer Postgres (Docker) + `.env` backend `DATABASE_URL`.
2) Implémenter la couche DB + migrer la ressource "clients".
3) Tester (curl + UI). Si OK, migrer services → rendez‑vous → companies → leads.
4) Appliquer sauvegardes + rétention. Retirer Supabase.

Points de contrôle pour 100% OK:
- Tous les endpoints refactorisés retournent 200/201 + `{ success, data }`.
- Les listes `GET /ressource/` reflètent exactement l’état Postgres après mutation.
- Les logs `pm2` ne montrent ni 400/401/405/422.
- Les backups s’exécutent et sont restaurables.

---

### 12) Sécurité & exploitation
- Postgres non exposé publiquement; accès admin via SSH/pgAdmin local.
- Mots de passe forts; rotation périodique.
- Supervision: `pm2 logs`, `journalctl -u nginx`, `docker logs erp-postgres`.
- Mises à jour: `docker compose pull && up -d`, tests post‑upgrade.


