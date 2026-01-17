# Script pour redémarrer proprement le frontend avec la configuration mobile

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  REDEMARRAGE FRONTEND' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Arrêter les processus Vite existants
Write-Host '[1/4] Arret des processus Vite existants...' -ForegroundColor Yellow
$viteProcesses = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($viteProcesses) {
    foreach ($pid in $viteProcesses) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "  Processus $pid arrete" -ForegroundColor Gray
        } catch {
            Write-Host "  Impossible d'arreter le processus $pid" -ForegroundColor Yellow
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host '  Aucun processus Vite trouve' -ForegroundColor Gray
}
Write-Host ''

# Vérifier la configuration .env.local
Write-Host '[2/4] Verification de la configuration .env.local...' -ForegroundColor Yellow
$envFile = 'frontend\.env.local'

if (-not (Test-Path $envFile)) {
    Write-Host '  ATTENTION: Fichier .env.local non trouve' -ForegroundColor Yellow
    Write-Host '  Execution de setup-mobile-access.ps1...' -ForegroundColor Yellow
    & "$PSScriptRoot\setup-mobile-access.ps1"
} else {
    $envContent = Get-Content $envFile | Select-String 'VITE_BACKEND_URL'
    if ($envContent) {
        Write-Host "  OK Configuration trouvee:" -ForegroundColor Green
        Write-Host "    $envContent" -ForegroundColor Gray
    } else {
        Write-Host '  ATTENTION: VITE_BACKEND_URL non trouve' -ForegroundColor Yellow
        Write-Host '  Execution de setup-mobile-access.ps1...' -ForegroundColor Yellow
        & "$PSScriptRoot\setup-mobile-access.ps1"
    }
}
Write-Host ''

# Obtenir l'IP locale
function Get-LocalIP {
    $adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -notlike '127.*' -and 
        $_.IPAddress -notlike '169.254.*' -and
        $_.PrefixOrigin -ne 'WellKnown'
    } | Sort-Object InterfaceIndex
    
    if ($adapters.Count -eq 0) {
        return $null
    }
    
    return $adapters[0].IPAddress
}

$localIP = Get-LocalIP

# Vérifier que le port est libre
Write-Host '[3/4] Verification du port 5173...' -ForegroundColor Yellow
$portCheck = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host '  ATTENTION: Le port 5173 est encore utilise' -ForegroundColor Yellow
    Write-Host '  Attente de 3 secondes...' -ForegroundColor Gray
    Start-Sleep -Seconds 3
}
Write-Host '  OK Port 5173 libre' -ForegroundColor Green
Write-Host ''

# Démarrer le frontend
Write-Host '[4/4] Demarrage du frontend...' -ForegroundColor Yellow
Write-Host ''

if ($localIP) {
    Write-Host '========================================' -ForegroundColor Green
    Write-Host '  FRONTEND EN COURS DE DEMARRAGE' -ForegroundColor Green
    Write-Host '========================================' -ForegroundColor Green
    Write-Host ''
    Write-Host 'URLs de connexion:' -ForegroundColor Cyan
    Write-Host "  Local:    http://localhost:5173" -ForegroundColor White
    Write-Host "  Mobile:   http://${localIP}:5173" -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'Pour acceder depuis votre iPhone:' -ForegroundColor Yellow
    Write-Host "  1. Connectez votre iPhone au meme reseau WiFi" -ForegroundColor White
    Write-Host "  2. Ouvrez Safari et allez sur: http://${localIP}:5173" -ForegroundColor White
    Write-Host "  3. Si Safari dit 'connexion securisee', essayez de vider le cache Safari" -ForegroundColor White
    Write-Host ''
    Write-Host 'Pour arreter: Ctrl+C' -ForegroundColor Yellow
    Write-Host ''
} else {
    Write-Host '========================================' -ForegroundColor Green
    Write-Host '  FRONTEND EN COURS DE DEMARRAGE' -ForegroundColor Green
    Write-Host '========================================' -ForegroundColor Green
    Write-Host ''
    Write-Host 'URL: http://localhost:5173' -ForegroundColor Cyan
    Write-Host ''
}

# Changer de répertoire et démarrer
Set-Location frontend
npm run dev

