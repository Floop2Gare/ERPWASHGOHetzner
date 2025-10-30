# Pré-déploiement (texte)

- Mettre à jour la VM: `sudo apt update && sudo apt upgrade -y`
- Installer: `git ufw curl build-essential python3-venv python3-pip nginx certbot python3-certbot-nginx`
- Installer Node 20: Nodesource
- Installer PM2: `sudo npm i -g pm2` puis `pm2 startup`
- Créer utilisateur `erp`, répertoire `/srv/erp`, droits
- UFW: autoriser OpenSSH, 80, 443, puis `sudo ufw --force enable`
