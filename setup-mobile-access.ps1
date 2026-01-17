# Script pour configurer l'accès mobile à l'application
# Détecte automatiquement l'IP locale et configure .env.local

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  CONFIGURATION ACCES MOBILE' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Fonction pour obtenir l'IP locale (non localhost)
function Get-LocalIP {
    $adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -notlike '127.*' -and 
        $_.IPAddress -notlike '169.254.*' -and
        $_.PrefixOrigin -ne 'WellKnown'
    } | Sort-Object InterfaceIndex
    
    if ($adapters.Count -eq 0) {
        Write-Host '  ERREUR: Aucune adresse IP locale trouvee' -ForegroundColor Red
        return $null
    }
    
    # Prendre la première IP valide (généralement la connexion principale)
    $localIP = $adapters[0].IPAddress
    
    # Afficher toutes les IPs trouvées pour information
    Write-Host '  Adresses IP detectees:' -ForegroundColor Yellow
    foreach ($adapter in $adapters) {
        $interface = Get-NetAdapter -InterfaceIndex $adapter.InterfaceIndex -ErrorAction SilentlyContinue
        $interfaceName = if ($interface) { $interface.Name } else { "Interface $($adapter.InterfaceIndex)" }
        $marker = if ($adapter.IPAddress -eq $localIP) { ' <-- SELECTIONNEE' } else { '' }
        Write-Host "    - $($adapter.IPAddress) ($interfaceName)$marker" -ForegroundColor Gray
    }
    
    return $localIP
}

# Détecter l'IP locale
Write-Host '[1/3] Detection de l''adresse IP locale...' -ForegroundColor Yellow
$localIP = Get-LocalIP

if (-not $localIP) {
    Write-Host '  ERREUR: Impossible de detecter l''adresse IP locale' -ForegroundColor Red
    Write-Host '  Veuillez configurer manuellement VITE_BACKEND_URL dans frontend\.env.local' -ForegroundColor Yellow
    exit 1
}

Write-Host "  OK IP locale detectee: $localIP" -ForegroundColor Green
Write-Host ''

# Configurer le fichier .env.local
Write-Host '[2/3] Configuration du fichier .env.local...' -ForegroundColor Yellow

$envFile = 'frontend\.env.local'
$backendUrl = "http://${localIP}:8000"

# Créer le répertoire frontend s'il n'existe pas
if (-not (Test-Path 'frontend')) {
    Write-Host '  ERREUR: Le repertoire frontend n''existe pas' -ForegroundColor Red
    exit 1
}

# Lire le fichier existant ou créer un nouveau
$lines = @()
if (Test-Path $envFile) {
    $lines = Get-Content $envFile
    Write-Host "  Fichier .env.local existant trouve" -ForegroundColor Gray
} else {
    Write-Host "  Creation d'un nouveau fichier .env.local" -ForegroundColor Gray
}

# Mettre à jour ou ajouter VITE_BACKEND_URL
$newLines = @()
$foundBackendUrl = $false

foreach ($line in $lines) {
    if ($line -match '^VITE_BACKEND_URL=') {
        if (-not $foundBackendUrl) {
            $newLines += "VITE_BACKEND_URL=$backendUrl"
            $foundBackendUrl = $true
            Write-Host "  Mise a jour: VITE_BACKEND_URL=$backendUrl" -ForegroundColor Green
        } else {
            Write-Host "  Suppression doublon: $line" -ForegroundColor Gray
        }
    } else {
        $newLines += $line
    }
}

# Ajouter VITE_BACKEND_URL s'il n'existe pas
if (-not $foundBackendUrl) {
    $newLines += "VITE_BACKEND_URL=$backendUrl"
    Write-Host "  Ajout: VITE_BACKEND_URL=$backendUrl" -ForegroundColor Green
}

# Écrire le fichier
$newLines | Set-Content $envFile -Encoding UTF8

Write-Host '  OK Fichier .env.local configure' -ForegroundColor Green
Write-Host ''

# Afficher les informations de connexion
Write-Host '[3/3] Informations de connexion' -ForegroundColor Yellow
Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host '  CONFIGURATION TERMINEE !' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Adresse IP locale:' -ForegroundColor Cyan
Write-Host "  $localIP" -ForegroundColor White
Write-Host ''
Write-Host 'URLs de connexion:' -ForegroundColor Cyan
Write-Host "  Frontend: http://${localIP}:5173" -ForegroundColor White
Write-Host "  Backend:  http://${localIP}:8000" -ForegroundColor White
Write-Host ''
Write-Host 'Pour acceder depuis votre iPhone:' -ForegroundColor Yellow
Write-Host "  1. Connectez votre iPhone au meme reseau WiFi" -ForegroundColor White
Write-Host "  2. Ouvrez Safari et allez sur: http://${localIP}:5173" -ForegroundColor White
Write-Host ''
Write-Host 'Verification de la configuration:' -ForegroundColor Cyan
Get-Content $envFile | Select-String 'VITE_BACKEND_URL'
Write-Host ''

