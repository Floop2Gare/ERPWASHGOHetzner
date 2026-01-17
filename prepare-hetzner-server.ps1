# Script pour préparer le serveur Hetzner pour le déploiement
# Usage: .\prepare-hetzner-server.ps1

$HETZNER_IP = "65.21.240.234"
$SSH_KEY = "$env:USERPROFILE\.ssh\id_ed25519_hetzner"
$REMOTE_PATH = "/opt/erpwashgo"

Write-Host "🚀 Préparation du serveur Hetzner..." -ForegroundColor Cyan
Write-Host "IP: $HETZNER_IP" -ForegroundColor White
Write-Host ""

# Vérifier la connexion SSH
Write-Host "[1/5] Test de connexion SSH..." -ForegroundColor Yellow
$testConnection = ssh -i $SSH_KEY -o ConnectTimeout=5 root@$HETZNER_IP "echo 'OK'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur de connexion SSH" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Connexion SSH OK" -ForegroundColor Green
Write-Host ""

# Préparer le script d'installation à exécuter sur le serveur
$installScript = @"
#!/bin/bash
set -e

echo "🔧 Installation de Docker et Docker Compose..."

# Mettre à jour le système
apt-get update -qq

# Installer les dépendances
apt-get install -y -qq curl wget git ca-certificates gnupg lsb-release

# Installer Docker si pas déjà installé
if ! command -v docker &> /dev/null; then
    echo "📦 Installation de Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    usermod -aG docker root
else
    echo "✅ Docker déjà installé"
fi

# Installer Docker Compose si pas déjà installé
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installation de Docker Compose..."
    DOCKER_COMPOSE_VERSION=`$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
    curl -L "https://github.com/docker/compose/releases/download/\$DOCKER_COMPOSE_VERSION/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
else
    echo "✅ Docker Compose déjà installé"
fi

# Créer la structure de répertoires
echo "📁 Création de la structure de répertoires..."
mkdir -p $REMOTE_PATH/backend
mkdir -p $REMOTE_PATH/frontend
mkdir -p $REMOTE_PATH/logs

# Vérifier les installations
echo ""
echo "✅ Vérification des installations..."
docker --version
docker-compose --version

echo ""
echo "✅ Préparation du serveur terminée !"
"@

# Sauvegarder le script temporairement
$tempScript = "$env:TEMP\hetzner-setup.sh"
$installScript | Out-File -FilePath $tempScript -Encoding UTF8 -NoNewline

Write-Host "[2/5] Transfert du script d'installation..." -ForegroundColor Yellow
scp -i $SSH_KEY $tempScript "root@${HETZNER_IP}:/tmp/hetzner-setup.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du transfert du script" -ForegroundColor Red
    exit 1
}

Write-Host "[3/5] Exécution du script d'installation sur le serveur..." -ForegroundColor Yellow
Write-Host "   (Cela peut prendre 2-3 minutes)" -ForegroundColor Gray
ssh -i $SSH_KEY root@$HETZNER_IP "chmod +x /tmp/hetzner-setup.sh && /tmp/hetzner-setup.sh"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation" -ForegroundColor Red
    exit 1
}

Write-Host "[4/5] Vérification de la structure de répertoires..." -ForegroundColor Yellow
ssh -i $SSH_KEY root@$HETZNER_IP "ls -la $REMOTE_PATH && echo '' && docker --version && docker-compose --version"

Write-Host "[5/5] Nettoyage..." -ForegroundColor Yellow
ssh -i $SSH_KEY root@$HETZNER_IP "rm -f /tmp/hetzner-setup.sh"
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ Serveur Hetzner préparé avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Prochaines étapes :" -ForegroundColor Cyan
Write-Host "1. Transférer les secrets : .\transfer-secrets-to-hetzner.ps1 -HETZNER_IP $HETZNER_IP" -ForegroundColor White
Write-Host "2. Cloner le repo sur le serveur" -ForegroundColor White
Write-Host '3. Lancer docker-compose -f docker-compose.prod.yml up -d' -ForegroundColor White
Write-Host ""
