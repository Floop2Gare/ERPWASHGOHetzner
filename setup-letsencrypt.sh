#!/bin/bash
# Script pour configurer Let's Encrypt avec Certbot pour erpwashgo.fr

set -e

DOMAIN="erpwashgo.fr"
EMAIL="admin@erpwashgo.fr"  # À modifier avec votre email

echo "=== Configuration Let's Encrypt pour $DOMAIN ==="
echo ""

# 1. Installation de Certbot
echo "1. Installation de Certbot..."
apt-get update
apt-get install -y certbot python3-certbot-nginx

# 2. Vérification que le domaine pointe bien vers le serveur
echo ""
echo "2. Vérification DNS..."
DOMAIN_IP=$(dig +short $DOMAIN | tail -1)
SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com)

if [ "$DOMAIN_IP" != "65.21.240.234" ] && [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo "⚠️  ATTENTION: Le domaine $DOMAIN ne pointe pas vers ce serveur"
    echo "   IP du domaine: $DOMAIN_IP"
    echo "   IP du serveur: $SERVER_IP ou 65.21.240.234"
    echo "   Attendez la propagation DNS avant de continuer"
    exit 1
fi

echo "✅ DNS OK: $DOMAIN pointe vers $DOMAIN_IP"

# 3. Arrêt temporaire du frontend pour libérer le port 80
echo ""
echo "3. Arrêt temporaire du frontend..."
cd /opt/erpwashgo
docker compose -f docker-compose.prod.yml stop frontend || true

# 4. Génération du certificat avec Certbot (mode standalone)
echo ""
echo "4. Génération du certificat Let's Encrypt..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --preferred-challenges http

# 5. Vérification que les certificats sont créés
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "❌ Erreur: Les certificats n'ont pas été créés"
    exit 1
fi

echo "✅ Certificats créés dans /etc/letsencrypt/live/$DOMAIN/"

# 6. Création d'un script de renouvellement
echo ""
echo "5. Configuration du renouvellement automatique..."
cat > /etc/cron.monthly/renew-letsencrypt.sh <<EOF
#!/bin/bash
certbot renew --quiet --deploy-hook "cd /opt/erpwashgo && docker compose -f docker-compose.prod.yml restart frontend"
EOF
chmod +x /etc/cron.monthly/renew-letsencrypt.sh

# 7. Redémarrage du frontend
echo ""
echo "6. Redémarrage du frontend..."
cd /opt/erpwashgo
docker compose -f docker-compose.prod.yml up -d frontend

echo ""
echo "=== Configuration terminée ==="
echo ""
echo "✅ Certificats Let's Encrypt installés"
echo "✅ Renouvellement automatique configuré"
echo ""
echo "📋 PROCHAINES ÉTAPES :"
echo "   1. Mettre à jour la configuration nginx pour utiliser les certificats"
echo "   2. Redémarrer le frontend"
echo ""
echo "Les certificats sont dans : /etc/letsencrypt/live/$DOMAIN/"
