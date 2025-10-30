# Post-déploiement (texte)

- Nginx: déployer conf `infra/nginx/erp.conf.example` → `/etc/nginx/sites-available/erp.conf`
- Activer conf: lien dans `sites-enabled`, `nginx -t`, reload
- Certbot: `sudo certbot --nginx -d votre-domaine.tld`
- Tests finaux: `https://domaine/`, `https://domaine/api/health`
