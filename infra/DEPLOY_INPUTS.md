# Déploiement ERPWASHGO — Clés SSH et informations à fournir

Ce document récapitule:
- comment générer et partager une clé SSH de manière sûre (recommandé),
- la liste des informations à me transmettre pour déployer l’application en autonomie sur une VM Ubuntu (Hetzner).

---

## 1) Générer une clé SSH (recommandé)

Ne partagez jamais votre clé privée. Transmettez uniquement la clé publique (`.pub`).

### Windows 10/11 (PowerShell, OpenSSH intégré)
```powershell
# Générer une paire de clés Ed25519 protégée par passphrase (recommandé)
ssh-keygen -t ed25519 -a 100 -C "erp@votre-domaine" -f "$env:USERPROFILE\.ssh\erp_hetzner_ed25519"

# Afficher la clé publique à me transmettre
Get-Content "$env:USERPROFILE\.ssh\erp_hetzner_ed25519.pub"
```

Alternative (PuTTYgen):
- Ouvrir PuTTYgen → Key type: Ed25519 → Generate → définir une passphrase → Save private key (format `.ppk`) → Copy/OpenSSH public key (champ en haut) et me l’envoyer.

### macOS / Linux
```bash
ssh-keygen -t ed25519 -a 100 -C "erp@votre-domaine" -f "$HOME/.ssh/erp_hetzner_ed25519"
cat "$HOME/.ssh/erp_hetzner_ed25519.pub"
```

### Installer la clé publique côté serveur (si vous le faites vous‑même)
```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "<VOTRE_CLE_PUBLIQUE>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```
Ou ajoutez la clé via la console Hetzner (Cloud → Project → Security → SSH Keys) puis attachez‑la à la VM.

---

## Clé publique SSH fournie

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAi6zg42Mxf0nV6VH9YcB7okVn7cqhX4aP1KHt2FFFQT erp@votre-domaine
```

---

## 2) Informations à fournir (checklist simplifiée)

- Accès serveur — obligatoire
  - IP/Hostname du serveur: Hetzner Cloud → Server → Public IPv4/Hostname = 91.98.232.156
  - Utilisateur SSH: `root`
  - Authentification SSH: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAi6zg42Mxf0nV6VH9YcB7okVn7cqhX4aP1KHt2FFFQT erp@votre-domaine
  - Port SSH: 22 par défaut 

- Système — obligatoire
  - OS/Arch: Ubuntu 24.04 x86_64 (`lsb_release -a`)
  - Accès sudo: le compte peut exécuter `sudo`

- Domaine — recommandé (pour HTTPS) PAS DE NOM DE DOMAINE
  - FQDN: domaine pointé en DNS vers l’IP (A/AAAA)
  - DNS OK: `nslookup`/`dig` retourne l’IP de la VM

- Supabase — obligatoire
SUPABASE_URL=https://nzzmsvzkthvypjhpbmdf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56em1zdnprdGh2eXBqaHBibWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1ODcwNDYsImV4cCI6MjA3NzE2MzA0Nn0.fLTwrFBIDBNyv54pgbUl8rady0M_26dUjvubChT58fM
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56em1zdnprdGh2eXBqaHBibWRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4NzA0NiwiZXhwIjoyMDc3MTYzMDQ2fQ.BBujfocqcP8Xo1cch4JpJ_Jw5oAvhssxucSag94Zc8M
SUPABASE_JWT_SECRET=LntutN4FOBlQjKVH4d9alx/hsl/8bbRhulSSVEu1PGfdn/6WfWJziMIqo/2kFeiHDsGjON4ZIKN29H6RRzTQmg==

- Backend — optionnel
  - ALLOWED_ORIGINS (ex: `https://votre-domaine.tld`)
  - ENABLE_DEBUG_ROUTES (`true/false`, défaut: `false`)

- Emails — optionnel
  - SMTP_HOST / SMTP_PORT
  - SMTP_USER / SMTP_PASSWORD

- OAuth — optionnel
  - OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET
  - OAUTH_REDIRECT_URI (ex: `https://votre-domaine.tld/oauth/callback`)

- Base externe — optionnel
  - DATABASE_URL (si vous n’utilisez pas la DB Supabase)

Notes:
- Le front est configuré pour utiliser `/api` en production (voir `vite.config.ts`). Nginx doit proxyfier `/api/` → `http://127.0.0.1:8000/`.
- Let’s Encrypt requiert: domaine pointant vers la VM + port 80 ouvert.

---

## 3) Ce que je ferai après réception de ces éléments

1. Préparer la VM (MAJ système, UFW, dépendances: Python/venv, Node 20, PM2, Nginx, Certbot).
2. Déployer le monorépo dans `/srv/erp` (via Git ou copie), installer dépendances.
3. Créer `/srv/erp/BACK-END-ERP/.env` avec vos valeurs (à partir de `infra/env/backend.env.example`).
4. Builder le frontend (Vite) → `dist/` servi par Nginx.
5. Démarrer le backend via PM2 sur `127.0.0.1:8000`.
6. Configurer Nginx: servir le build + proxy `/api` → backend.
7. Activer HTTPS avec Certbot sur votre domaine.
8. Tests finaux: `https://votre-domaine.tld` et `https://votre-domaine.tld/api/health`.

---

## 4) Bonnes pratiques sécurité

- Protéger la clé privée par passphrase. Ne partagez jamais le fichier privé (`.ppk`, `id_ed25519`).
- Restreindre SSH: UFW, fail2ban (optionnel), désactiver `PasswordAuthentication` après installation de la clé.
- Sauvegarder la configuration PM2 (`pm2 save`) et activer l’autostart systemd.

---

## 5) Modèle de message pour me transmettre les infos

```text
Serveur:
- IP/Hostname: ...
- Utilisateur SSH: ...
- Méthode SSH: (clé publique ci-dessous / mot de passe)
- Port SSH: ... (22 si défaut)
- Ubuntu: 24.04 x86_64 (oui/non)

Domaine:
- FQDN: ...
- DNS pointé vers IP: (oui/non)

Backend .env:
- SUPABASE_URL: ...
- SUPABASE_ANON_KEY: ...
- SUPABASE_SERVICE_KEY: ...
- SUPABASE_JWT_SECRET: ...
- ALLOWED_ORIGINS: ... (optionnel)
- ENABLE_DEBUG_ROUTES: ... (optionnel)
- SMTP_HOST/PORT/USER/PASSWORD: ... (si emails)
- OAUTH_CLIENT_ID/SECRET/REDIRECT_URI: ... (si OAuth)
- DATABASE_URL: ... (si DB externe)

Clé publique SSH (si méthode clé):
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... erp@votre-domaine
```


