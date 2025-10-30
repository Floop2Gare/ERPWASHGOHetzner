# Déploiement Hetzner (Ubuntu 24.04) — Monorépo ERPWASHGO

Cette checklist décrit un déploiement simple et reproductible pour votre monorépo:
- `BACK-END-ERP` (FastAPI)
- `FRONT-END-ERP/FRONT-END-ERP` (React + Vite)

Cible serveur (recommandée):
- Utilisateur non-root: `erp`
- Dossiers:
  - `/srv/erp/BACK-END-ERP`
  - `/srv/erp/FRONT-END-ERP/FRONT-END-ERP` (build dans `dist/`)
  - `/srv/erp/logs` (optionnel)

## 1) Préparer la VM

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git ufw curl build-essential

# Utilisateur non-root
sudo adduser --disabled-password --gecos "" erp
sudo usermod -aG sudo erp
sudo mkdir -p /srv/erp && sudo chown -R erp:erp /srv/erp

# Pare-feu
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## 2) Runtimes et outils

```bash
# Python + venv
sudo apt install -y python3-venv python3-pip

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # doit afficher 20.x

# PM2 (process manager)
sudo npm i -g pm2
# Préparer l’autostart systemd (exécuter la commande imprimée)
pm2 startup systemd -u erp --hp /home/erp

# Nginx + Certbot
sudo apt install -y nginx
sudo apt install -y certbot python3-certbot-nginx
```

## 3) Récupérer le code du monorépo

```bash
sudo -u erp -H bash -lc '
  set -e
  cd /srv/erp
  git clone <VOTRE_REPO_GIT> .
'
```

Si vous transférez les fichiers depuis votre machine locale, copiez l’arborescence telle quelle dans `/srv/erp`.

## 4) Installer les dépendances

Frontend (via npm workspaces depuis la racine):
```bash
sudo -u erp -H bash -lc '
  cd /srv/erp
  npm run install:all
'
```

Backend (venv dédié):
```bash
sudo -u erp -H bash -lc '
  cd /srv/erp/BACK-END-ERP
  python3 -m venv venv
  ./venv/bin/pip install --upgrade pip
  ./venv/bin/pip install -r requirements.txt  # ou requirements-full.txt
'
```

Variables d’environnement backend:
- Modèle: `infra/env/backend.env.example`
- Poser le fichier réel sur le serveur: `/srv/erp/BACK-END-ERP/.env` (ne pas commit)
- Vérifier que les origines CORS du frontend (domaine final) sont autorisées côté API si nécessaire.

## 5) Build du frontend

```bash
sudo -u erp -H bash -lc '
  cd /srv/erp
  npm run build
'
```

Résultat: `/srv/erp/FRONT-END-ERP/FRONT-END-ERP/dist`

## 6) Démarrer le backend avec PM2 (port interne)

```bash
sudo -u erp -H bash -lc '
  pm2 start /srv/erp/BACK-END-ERP/venv/bin/uvicorn \
    --name erp-back -- app.main:app --host 127.0.0.1 --port 8000 --workers 2
  pm2 save
'

# Vérifier localement
curl -s http://127.0.0.1:8000/health | jq .
```

Astuce: si des dépendances Python manquent, l’API peut démarrer en mode "degraded" (limité). Installez les paquets plus tard pour revenir en "ok".

## 7) Configurer Nginx (reverse proxy + statique)

Point de départ: `infra/nginx/erp.conf.example` (placeholders). Copier/adapter vers `/etc/nginx/sites-available/erp.conf`.

Créer le server block (remplacer `votre-domaine.tld`):
```bash
sudo tee /etc/nginx/sites-available/erp.conf >/dev/null <<'NGINX'
server {
  listen 80;
  server_name votre-domaine.tld;

  # Servir le frontend en HTTP (avant HTTPS) ou rediriger vers HTTPS après Certbot
  root /srv/erp/FRONT-END-ERP/FRONT-END-ERP/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri /index.html;
  }
}
NGINX

sudo ln -s /etc/nginx/sites-available/erp.conf /etc/nginx/sites-enabled/ || true
sudo nginx -t && sudo systemctl reload nginx
```

## 8) Activer HTTPS (Let’s Encrypt)

```bash
sudo certbot --nginx -d votre-domaine.tld
# Vérifier le timer de renouvellement
systemctl status certbot.timer
```

Après obtention du certificat, Nginx servira le site en HTTPS et redirigera automatiquement le HTTP.

## 9) Tests finaux

- Backend derrière Nginx:
  ```bash
  curl -I https://votre-domaine.tld/api/health
  ```
- Frontend via Nginx: ouvrir `https://votre-domaine.tld` dans le navigateur
- Routage API depuis le front: naviguer dans l’app et vérifier les appels `/api/...`
- HTTPS: cadenas valide; `curl -I https://votre-domaine.tld` → 200
- CORS: si front et API sont sur le même domaine, pas d’action; sinon, vérifier console navigateur

## 10) Maintenance et mises à jour

```bash
# Mettre à jour l’app
sudo -u erp -H bash -lc '
  cd /srv/erp
  git pull
  npm run install:all
  npm run build
  pm2 restart erp-back
  pm2 save
'

# Logs
pm2 logs erp-back
sudo journalctl -u nginx -f

# Mises à jour système
sudo apt update && sudo apt upgrade -y
```

---
Checklist d’exécution rapide:
1. Préparer VM + UFW + utilisateur `erp`
2. Installer Python, Node 20, PM2, Nginx, Certbot
3. Déployer monorépo dans `/srv/erp`
4. Poser `.env` backend selon `infra/env/backend.env.example`
5. Installer deps backend + frontend
6. Builder le frontend
7. Démarrer backend avec PM2 (127.0.0.1:8000) — voir `infra/pm2/`
8. Configurer Nginx via `infra/nginx/erp.conf.example`
9. Activer HTTPS (Certbot)
10. Tester: `https://votre-domaine.tld` et `/api/health`
