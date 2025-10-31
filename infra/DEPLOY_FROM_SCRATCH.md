# Déployer ERPWASHGO de A à Z (Ubuntu, root) — avec nettoyage préalable

Ce guide pas-à-pas part d’un serveur « sale » (ancienne install) et le remet à plat, puis installe et lance l’application. Il est pensé pour un débutant: copiez/collez les blocs dans l’ordre.

Hypothèses simples pour ce guide:
- Accès: SSH en root sur l’IP 91.98.232.156
- Pas de nom de domaine pour l’instant (accès via http://91.98.232.156)
- Le code du projet est sur votre PC (Windows) dans le dossier courant
- Vous possédez votre clé publique/privée; ici on utilisera l’authentification par mot de passe pour simplifier (vous pouvez utiliser la clé SSH si configurée)

Vous pourrez passer à une configuration plus « propre » (utilisateur non-root, HTTPS, clé SSH obligatoire) ensuite.

---

## 0) Variables utiles (gardez-les à portée)

- IP du serveur: `91.98.232.156`
- Utilisateur: `root`
- Dossier de déploiement: `/srv/erp`

Supabase (vos valeurs actuelles):
- `SUPABASE_URL=https://nzzmsvzkthvypjhpbmdf.supabase.co`
- `SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56em1zdnprdGh2eXBqaHBibWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODcwNDYsImV4cCI6MjA3NzE2MzA0Nn0.fLTwrFBIDBNyv54pgbUl8rady0M_26dUjvubChT58fM`
- `SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56em1zdnprdGh2eXBqaHBibWRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4NzA0NiwiZXhwIjoyMDc3MTYzMDQ2fQ.BBujfocqcP8Xo1cch4JpJ_Jw5oAvhssxucSag94Zc8M`
- `SUPABASE_JWT_SECRET=LntutN4FOBlQjKVH4d9alx/hsl/8bbRhulSSVEu1PGfdn/6WfWJziMIqo/2kFeiHDsGjON4ZIKN29H6RRzTQmg==`

---

## 1) Connexion au serveur (depuis votre PC Windows)

Ouvrez PowerShell:

```powershell
ssh root@91.98.232.156
```

Saisissez le mot de passe root si demandé.

---

## 2) Nettoyage du serveur (remise à plat)

Copiez/collez ce bloc dans la session SSH (sur le serveur):

```bash
set -e

# 2.1 Arrêter et nettoyer PM2 (si déjà installé)
if command -v pm2 >/dev/null 2>&1; then
  pm2 stop all || true
  pm2 delete all || true
  pm2 flush || true
fi

# 2.2 Nettoyer Nginx (ancienne conf éventuelle)
rm -f /etc/nginx/sites-enabled/erp.conf || true
rm -f /etc/nginx/sites-available/erp.conf || true
nginx -t && systemctl reload nginx || true

# 2.3 Supprimer l’ancien code
rm -rf /srv/erp
mkdir -p /srv/erp

# 2.4 (Optionnel) Purger Node « paquet Ubuntu » s’il a été installé à la main
# apt remove -y nodejs npm || true
# apt autoremove -y || true

# 2.5 MAJ système et utilitaires de base
apt update && apt -y upgrade
apt -y install ufw curl git build-essential python3-venv python3-pip nginx

# 2.6 Ouvrir le pare-feu
ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable
```

---

## 3) Installer Node 20 + PM2 (process manager)

Toujours sur le serveur (SSH):

```bash
set -e
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt -y install nodejs
npm -v && node -v  # doit afficher npm et node (v20.x)
npm i -g pm2
pm2 -v
```

---

## 4) Transférer le code depuis votre PC

Dans PowerShell (local, pas sur le serveur). Placez-vous à la racine du projet ERPWASHGO:

```powershell
# Créer une archive du projet, en excluant les gros dossiers si présents
$Archive = "erp.tar.gz"
# Ajustez les exclusions si nécessaire
& tar -czf $Archive --exclude="BACK-END-ERP/venv" --exclude="FRONT-END-ERP/FRONT-END-ERP/node_modules" --exclude="node_modules" .

# Envoyer l’archive sur le serveur (saisir le mot de passe root si demandé)
scp $Archive root@91.98.232.156:/srv/erp/

# (Option) supprimer l’archive locale après transfert
Remove-Item $Archive -Force
```

Revenez sur le serveur (SSH) pour décompresser:

```bash
set -e
cd /srv/erp
tar -xzf erp.tar.gz
rm erp.tar.gz
```

---

## 5) Installer les dépendances backend (Python)

Sur le serveur (SSH):

```bash
set -e
cd /srv/erp/BACK-END-ERP
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
```

Si une dépendance échoue, relancez la commande; ça peut prendre quelques minutes.

---

## 6) Créer le fichier d’environnement backend (.env)

Sur le serveur (SSH):

```bash
cat > /srv/erp/BACK-END-ERP/.env <<'EOF'
SUPABASE_URL=https://nzzmsvzkthvypjhpbmdf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56em1zdnprdGh2eXBqaHBibWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODcwNDYsImV4cCI6MjA3NzE2MzA0Nn0.fLTwrFBIDBNyv54pgbUl8rady0M_26dUjvubChT58fM
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56em1zdnprdGh2eXBqaHBibWRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4NzA0NiwiZXhwIjoyMDc3MTYzMDQ2fQ.BBujfocqcP8Xo1cch4JpJ_Jw5oAvhssxucSag94Zc8M
SUPABASE_JWT_SECRET=LntutN4FOBlQjKVH4d9alx/hsl/8bbRhulSSVEu1PGfdn/6WfWJziMIqo/2kFeiHDsGjON4ZIKN29H6RRzTQmg==
ENABLE_DEBUG_ROUTES=false
EOF
```

Vous pourrez ajuster plus tard d’autres variables (SMTP, OAuth…).

---

## 7) Installer les dépendances frontend et builder

Sur le serveur (SSH):

```bash
set -e
cd /srv/erp
npm run install:all
npm run build
```

Résultat du build: `/srv/erp/FRONT-END-ERP/FRONT-END-ERP/dist`

---

## 8) Démarrer le backend avec PM2 (en arrière-plan)

Sur le serveur (SSH):

```bash
set -e
pm2 start /srv/erp/BACK-END-ERP/venv/bin/uvicorn --name erp-back -- app.main:app --host 127.0.0.1 --port 8000 --workers 2
pm2 save
pm2 status
```

Si une erreur apparaît, consultez les logs:

```bash
pm2 logs erp-back --lines 200
```

---

## 9) Configurer Nginx (HTTP sans domaine)

Sur le serveur (SSH):

```bash
cat > /etc/nginx/sites-available/erp.conf <<'NGINX'
server {
  listen 80;
  server_name _;

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

ln -sf /etc/nginx/sites-available/erp.conf /etc/nginx/sites-enabled/erp.conf
nginx -t && systemctl reload nginx
```

---

## 10) Tests finaux

Depuis votre PC:

```powershell
# API santé (HTTP)
Invoke-RestMethod -Uri "http://91.98.232.156/api/health" -TimeoutSec 10 | Format-List
# Ouvrir le front dans le navigateur
Start-Process "http://91.98.232.156"
```

Remarques:
- Si `/api/health` renvoie 500 au début: c’est souvent dû à des modules de debug/externes non configurés. L’API tourne quand même; vous pourrez compléter le `.env` plus tard.

---

## 11) Commandes utiles (maintenance)

Sur le serveur (SSH):

```bash
# Redémarrer le backend
pm2 restart erp-back && pm2 save

# Voir les logs
pm2 logs erp-back -f

# Mettre à jour l’app (plus tard)
cd /srv/erp
# (si vous utilisez git) git pull
npm run install:all
npm run build
pm2 restart erp-back && pm2 save

# Nginx
nginx -t && systemctl reload nginx
```

---

## 12) Aller plus loin (facultatif)

- Créer un utilisateur non-root (ex: `erp`) et migrer `/srv/erp` sous cet utilisateur.
- Passer en HTTPS avec un domaine et Let’s Encrypt (`certbot --nginx -d votre-domaine`).
- Basculer l’authentification SSH en « clé uniquement » (désactiver `PasswordAuthentication`).
- Sauvegardes, monitoring, et mises à jour de sécurité régulières.

---

Besoin d’aide pour exécuter ces étapes depuis votre PowerShell avec mot de passe (sans clé) ? Je peux vous fournir un script qui enchaîne toutes les commandes via `plink`/`pscp`.
