# 🔒 AUDIT DE SÉCURITÉ - ERP Wash&Go

Date: 2026-01-17
Serveur: Hetzner (65.21.240.234)

## 📋 RÉSUMÉ EXÉCUTIF

### ✅ Points positifs
- HTTPS configuré avec certificat SSL
- Authentification JWT implémentée
- Base de données PostgreSQL isolée dans Docker
- Variables d'environnement pour les secrets

### ⚠️ Points à améliorer (EN COURS)
- Firewall UFW non activé
- Fail2ban non installé
- Pas de rate limiting
- Pas de protection contre le référencement
- Pas de restriction d'accès par IP/token
- PostgreSQL exposé sur le port 5432

## 🛡️ MESURES DE SÉCURITÉ IMPLÉMENTÉES

### 1. Protection contre le référencement
- ✅ `robots.txt` configuré pour bloquer tous les robots
- ✅ Meta tags `noindex, nofollow` dans `index.html`
- ✅ Headers HTTP pour empêcher l'indexation

### 2. Rate Limiting
- ✅ Middleware de rate limiting dans le backend
- ✅ Limites configurées :
  - Login : 5 requêtes / 5 minutes
  - API : 60 requêtes / minute
  - Général : 100 requêtes / minute
- ✅ Rate limiting nginx au niveau frontend

### 3. Contrôle d'accès
- ✅ Middleware de contrôle d'accès par token secret
- ✅ Variable `ACCESS_TOKEN_SECRET` dans `.env`
- ✅ Si configuré, toutes les requêtes nécessitent le header `X-Access-Token`

### 4. Headers de sécurité
- ✅ Strict-Transport-Security (HSTS)
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ X-XSS-Protection
- ✅ Referrer-Policy

### 5. Firewall et protection système
- ⏳ Script de sécurisation créé (`secure-hetzner-server.sh`)
- ⏳ À exécuter pour activer :
  - UFW (firewall)
  - Fail2ban (protection contre les attaques)
  - Mises à jour automatiques de sécurité

## 📝 CONFIGURATION REQUISE

### Variables d'environnement à ajouter dans `.env` :

```bash
# Token secret pour restreindre l'accès (optionnel mais recommandé)
# Si défini, toutes les requêtes doivent inclure: X-Access-Token: <votre_token>
ACCESS_TOKEN_SECRET=votre_token_secret_ici_32_caracteres_minimum

# Rate limiting (optionnel, valeurs par défaut utilisées si non défini)
RATE_LIMIT_ENABLED=true
```

### Utilisation du token d'accès

Si `ACCESS_TOKEN_SECRET` est défini dans `.env`, toutes les requêtes API doivent inclure :

```http
X-Access-Token: votre_token_secret_ici
```

**Pour le frontend**, ajouter dans `frontend/src/api/utils/httpClient.ts` :

```typescript
const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN || '';

// Dans la fonction request, ajouter :
if (ACCESS_TOKEN) {
  headers['X-Access-Token'] = ACCESS_TOKEN;
}
```

## 🚀 PROCHAINES ÉTAPES

1. **Exécuter le script de sécurisation** :
   ```bash
   ssh root@65.21.240.234
   cd /opt/erpwashgo
   chmod +x secure-hetzner-server.sh
   ./secure-hetzner-server.sh
   ```

2. **Configurer le token d'accès** :
   - Ajouter `ACCESS_TOKEN_SECRET` dans `.env` sur le serveur
   - Ajouter `VITE_ACCESS_TOKEN` dans le frontend (si nécessaire)

3. **Restreindre PostgreSQL** :
   - Retirer l'exposition du port 5432 dans `docker-compose.prod.yml`
   - PostgreSQL sera accessible uniquement depuis le réseau Docker

4. **Monitoring** :
   - Configurer des alertes pour les tentatives d'intrusion
   - Surveiller les logs avec `docker compose logs -f`

## 🔐 RECOMMANDATIONS SUPPLÉMENTAIRES

1. **Backups automatiques** :
   - Configurer des backups quotidiens de la base de données
   - Stocker les backups hors du serveur

2. **Monitoring** :
   - Installer un outil de monitoring (ex: Prometheus + Grafana)
   - Surveiller les ressources et les tentatives d'attaque

3. **Authentification forte** :
   - Activer 2FA pour les comptes administrateurs
   - Utiliser des mots de passe forts

4. **Mises à jour** :
   - Maintenir les dépendances à jour
   - Surveiller les CVE (Common Vulnerabilities and Exposures)

## 📊 NIVEAU DE SÉCURITÉ

**Avant** : ⚠️ Faible (3/10)
**Après implémentation** : ✅ Bon (7/10)
**Avec toutes les mesures** : ✅ Très bon (9/10)
