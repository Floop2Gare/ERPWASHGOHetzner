# Infra (Hetzner - Ubuntu 24.04)

Description courte: Cette couche prépare le déploiement sur une VM avec backend (FastAPI), frontend (Vite statique), reverse proxy (Nginx), gestionnaire de processus (PM2) et fichiers d'environnement. Aucun secret n'est versionné.

Ordre de déploiement recommandé:
1) Backend (PM2 sur port interne, ex. 8000)
2) Frontend (build Vite en statique)
3) Nginx (proxy /api → backend, servir le build du front)

Emplacements:
- Nginx: `infra/nginx/` (placeholders)
- PM2: `infra/pm2/` (placeholders)
- Scripts: `infra/scripts/` (étapes textuelles)
- Environnements: `infra/env/` (fichiers .env exemples, sans valeurs)

Checklist déploiement (≤10 lignes):
1. Mettre à jour VM + installer Python, Node 20, PM2, Nginx, Certbot
2. Créer utilisateur non-root `erp` et `/srv/erp`
3. Copier le monorépo dans `/srv/erp`
4. Poser `.env` backend d'après `infra/env/backend.env.example`
5. Installer deps back + front, puis `npm run build`
6. Démarrer backend: PM2 (voir `infra/pm2/`)
7. Déployer Nginx: conf d'exemple `infra/nginx/erp.conf.example`
8. Activer HTTPS avec Certbot
9. Tester `https://domaine/` et `https://domaine/api/health`
10. Sauvegarder PM2 (`pm2 save`) et vérifier UFW
