# Script de déploiement sur serveur Hetzner
# Mise à jour complète de l'application sur le serveur

param(
    [Parameter(Mandatory=$false)]
    [string]$HETZNER_IP = "65.21.240.234",
    
    [Parameter(Mandatory=$false)]
    [string]$HETZNER_USER = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$REMOTE_PATH = "/opt/erpwashgo",
    
    [Parameter(Mandatory=$false)]
    [string]$SSH_KEY = "$env:USERPROFILE\.ssh\id_ed25519_hetzner"
)

$ErrorActionPreference = 'Stop'

# Couleurs pour les messages
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  DEPLOIEMENT SUR HETZNER' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''
Write-Info "IP du serveur: $HETZNER_IP"
Write-Info "Utilisateur: $HETZNER_USER"
Write-Info "Chemin distant: $REMOTE_PATH"
Write-Host ''

# Vérifier que Git est à jour
Write-Info '[1/6] Vérification du statut Git...' -ForegroundColor Yellow
$gitStatus = git status --porcelain
# Exclure le script de déploiement lui-même
$gitStatusFiltered = $gitStatus | Where-Object { $_ -notmatch 'deploy-to-hetzner.ps1' }
if ($gitStatusFiltered) {
    Write-Warning '⚠️  Des changements non commités ont été détectés (autres que deploy-to-hetzner.ps1)'
    Write-Warning '   Continuation du déploiement...'
} else {
    Write-Success '✅ Repository Git à jour (hors deploy-to-hetzner.ps1)'
}
Write-Host ''

# Vérifier la connexion SSH
Write-Info '[2/6] Vérification de la connexion SSH...' -ForegroundColor Yellow
# Utiliser la clé SSH si elle existe
if (Test-Path $SSH_KEY) {
    $sshCmd = "ssh -i `"$SSH_KEY`" -o ConnectTimeout=5 -o BatchMode=yes ${HETZNER_USER}@${HETZNER_IP}"
    $sshTest = Invoke-Expression "$sshCmd 'echo OK'" 2>&1
} else {
    $sshCmd = "ssh -o ConnectTimeout=5 -o BatchMode=yes ${HETZNER_USER}@${HETZNER_IP}"
    $sshTest = Invoke-Expression "$sshCmd 'echo OK'" 2>&1
}

if ($LASTEXITCODE -ne 0) {
    Write-Warning '⚠️  Connexion SSH avec BatchMode échouée, tentative avec authentification interactive...'
    if (Test-Path $SSH_KEY) {
        ssh -i $SSH_KEY -o ConnectTimeout=10 "${HETZNER_USER}@${HETZNER_IP}" "echo 'Connexion OK'" 2>&1
    } else {
        ssh -o ConnectTimeout=10 "${HETZNER_USER}@${HETZNER_IP}" "echo 'Connexion OK'" 2>&1
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Impossible de se connecter au serveur ${HETZNER_IP}"
        Write-Error '   Vérifiez que SSH est configuré correctement'
        exit 1
    }
}
Write-Success '✅ Connexion SSH établie'
Write-Host ''

# Pull des changements sur le serveur
Write-Info '[3/6] Pull des changements sur le serveur...' -ForegroundColor Yellow
# Nettoyer les fichiers non suivis qui pourraient bloquer le merge
Write-Info '   Nettoyage des fichiers non suivis qui pourraient bloquer...'
$cleanCommand = "cd ${REMOTE_PATH} && git clean -fd && git reset --hard HEAD"
if (Test-Path $SSH_KEY) {
    ssh -i $SSH_KEY "${HETZNER_USER}@${HETZNER_IP}" $cleanCommand 2>&1 | Out-Null
} else {
    ssh "${HETZNER_USER}@${HETZNER_IP}" $cleanCommand 2>&1 | Out-Null
}
# Effectuer le pull
$pullCommand = "cd ${REMOTE_PATH} && git pull origin main"
if (Test-Path $SSH_KEY) {
    ssh -i $SSH_KEY "${HETZNER_USER}@${HETZNER_IP}" $pullCommand
} else {
    ssh "${HETZNER_USER}@${HETZNER_IP}" $pullCommand
}
if ($LASTEXITCODE -ne 0) {
    Write-Error '❌ Erreur lors du pull Git sur le serveur'
    Write-Error '   Vérifiez que le dépôt Git est configuré correctement sur le serveur'
    exit 1
}
Write-Success '✅ Changements récupérés sur le serveur'
Write-Host ''

# Reconstruire les images Docker
Write-Info '[4/6] Reconstruction des images Docker...' -ForegroundColor Yellow
Write-Warning '   ⏳ Cette opération peut prendre plusieurs minutes...'
# Essayer d'abord avec docker compose (v2), puis docker-compose (v1)
$buildCommand = "cd ${REMOTE_PATH} && (docker compose -f docker-compose.prod.yml build --no-cache backend frontend 2>/dev/null || docker-compose -f docker-compose.prod.yml build --no-cache backend frontend)"
if (Test-Path $SSH_KEY) {
    ssh -i $SSH_KEY "${HETZNER_USER}@${HETZNER_IP}" $buildCommand
} else {
    ssh "${HETZNER_USER}@${HETZNER_IP}" $buildCommand
}
if ($LASTEXITCODE -ne 0) {
    Write-Error '❌ Erreur lors de la reconstruction des images Docker'
    Write-Error '   Vérifiez les logs sur le serveur'
    exit 1
}
Write-Success '✅ Images Docker reconstruites'
Write-Host ''

# Redémarrer les services
Write-Info '[5/6] Redémarrage des services...' -ForegroundColor Yellow
# Arrêter et supprimer les conteneurs existants pour éviter les conflits
$stopCommand = "cd ${REMOTE_PATH} && docker compose -f docker-compose.prod.yml down"
if (Test-Path $SSH_KEY) {
    ssh -i $SSH_KEY "${HETZNER_USER}@${HETZNER_IP}" $stopCommand 2>&1 | Out-Null
} else {
    ssh "${HETZNER_USER}@${HETZNER_IP}" $stopCommand 2>&1 | Out-Null
}
# Redémarrer les services
$restartCommand = "cd ${REMOTE_PATH} && docker compose -f docker-compose.prod.yml up -d"
if (Test-Path $SSH_KEY) {
    ssh -i $SSH_KEY "${HETZNER_USER}@${HETZNER_IP}" $restartCommand
} else {
    ssh "${HETZNER_USER}@${HETZNER_IP}" $restartCommand
}
if ($LASTEXITCODE -ne 0) {
    Write-Error '❌ Erreur lors du redémarrage des services'
    Write-Error '   Vérifiez les logs sur le serveur'
    exit 1
}
Write-Success '✅ Services redémarrés'
Write-Host ''

# Vérifier le statut des services
Write-Info '[6/6] Vérification du statut des services...' -ForegroundColor Yellow
$statusCommand = "cd ${REMOTE_PATH} && (docker compose -f docker-compose.prod.yml ps 2>/dev/null || docker-compose -f docker-compose.prod.yml ps)"
if (Test-Path $SSH_KEY) {
    ssh -i $SSH_KEY "${HETZNER_USER}@${HETZNER_IP}" $statusCommand
} else {
    ssh "${HETZNER_USER}@${HETZNER_IP}" $statusCommand
}
if ($LASTEXITCODE -ne 0) {
    Write-Warning '⚠️  Impossible de récupérer le statut des services'
} else {
    Write-Success '✅ Statut des services vérifié'
}
Write-Host ''

Write-Success '✅ Déploiement terminé avec succès !'
Write-Host ''
Write-Info '📋 Résumé :'
Write-Info "   - Code mis à jour sur le serveur"
Write-Info "   - Images Docker reconstruites"
Write-Info "   - Services redémarrés"
Write-Host ''
