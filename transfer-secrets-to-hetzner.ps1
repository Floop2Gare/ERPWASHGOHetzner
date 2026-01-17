# Configuration
param(
    [Parameter(Mandatory=$true)]
    [string]$HETZNER_IP,
    
    [Parameter(Mandatory=$false)]
    [string]$HETZNER_USER = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$REMOTE_PATH = "/opt/erpwashgo"
)

# Couleurs pour les messages
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }

Write-Info "🔐 Transfert des fichiers secrets vers Hetzner..."
Write-Info "IP du serveur: $HETZNER_IP"
Write-Info "Utilisateur: $HETZNER_USER"
Write-Info "Chemin distant: $REMOTE_PATH"
Write-Info ""

# Vérifier que les fichiers existent
$files = @(
    "backend\credentials_adrien.json",
    "backend\credentials_clement.json",
    ".env"
)

$filesExist = $true
foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        if ($file -eq ".env") {
            Write-Warning "⚠️  Fichier .env non trouvé (optionnel)"
        } else {
            Write-Error "❌ Fichier introuvable: $file"
            $filesExist = $false
        }
    } else {
        Write-Success "✅ Fichier trouvé: $file"
    }
}

if (-not $filesExist) {
    Write-Error ""
    Write-Error "❌ Certains fichiers obligatoires sont manquants. Arrêt du script."
    exit 1
}

Write-Info ""
Write-Info "📤 Démarrage du transfert..."
Write-Info ""

# Transférer les fichiers credentials
Write-Info "Transfert de credentials_adrien.json..."
scp "backend\credentials_adrien.json" "${HETZNER_USER}@${HETZNER_IP}:${REMOTE_PATH}/backend/"

if ($LASTEXITCODE -eq 0) {
    Write-Success "✅ credentials_adrien.json transféré avec succès"
} else {
    Write-Error "❌ Erreur lors du transfert de credentials_adrien.json"
    Write-Error "   Vérifiez que SCP est installé et que la connexion SSH fonctionne"
    exit 1
}

Write-Info "Transfert de credentials_clement.json..."
scp "backend\credentials_clement.json" "${HETZNER_USER}@${HETZNER_IP}:${REMOTE_PATH}/backend/"

if ($LASTEXITCODE -eq 0) {
    Write-Success "✅ credentials_clement.json transféré avec succès"
} else {
    Write-Error "❌ Erreur lors du transfert de credentials_clement.json"
    exit 1
}

# Transférer le fichier .env
if (Test-Path ".env") {
    Write-Info "Transfert de .env..."
    scp ".env" "${HETZNER_USER}@${HETZNER_IP}:${REMOTE_PATH}/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ .env transféré avec succès"
    } else {
        Write-Error "❌ Erreur lors du transfert de .env"
        exit 1
    }
} else {
    Write-Warning "⚠️  Fichier .env non trouvé (optionnel)"
}

Write-Info ""
Write-Info "🔒 Définition des permissions sur le serveur..."
Write-Info ""

# Définir les permissions via SSH
$sshCommands = @(
    "chmod 600 ${REMOTE_PATH}/backend/credentials_adrien.json",
    "chmod 600 ${REMOTE_PATH}/backend/credentials_clement.json",
    "if [ -f ${REMOTE_PATH}/.env ]; then chmod 600 ${REMOTE_PATH}/.env; fi",
    "echo '✅ Permissions définies avec succès'"
)

$commands = $sshCommands -join " && "
ssh "${HETZNER_USER}@${HETZNER_IP}" $commands

if ($LASTEXITCODE -eq 0) {
    Write-Success "✅ Permissions définies avec succès"
} else {
    Write-Error "❌ Erreur lors de la définition des permissions"
    Write-Error "   Exécutez manuellement sur le serveur :"
    Write-Error "   chmod 600 ${REMOTE_PATH}/backend/credentials_*.json"
    Write-Error "   chmod 600 ${REMOTE_PATH}/.env"
    exit 1
}

Write-Info ""
Write-Success "✅ Transfert terminé avec succès !"
Write-Info ""
Write-Info "📋 Prochaines étapes :"
Write-Info "1. Vérifier les fichiers sur le serveur :"
Write-Info "   ssh ${HETZNER_USER}@${HETZNER_IP}"
Write-Info "   ls -la ${REMOTE_PATH}/backend/credentials_*.json"
Write-Info "2. Lancer Docker Compose :"
Write-Info "   docker-compose -f docker-compose.prod.yml up -d"
Write-Info ""
