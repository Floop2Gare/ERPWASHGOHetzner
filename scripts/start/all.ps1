# Script pour demarrer TOUT le projet (Backend Docker + Frontend Local)

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  DEMARRAGE COMPLET - VERSION 1.1' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Demarrer le backend
Write-Host '[1/2] Demarrage du backend...' -ForegroundColor Yellow
& "$PSScriptRoot\backend.ps1"
Write-Host ''

# Demarrer le frontend dans un nouveau terminal
Write-Host '[2/2] Demarrage du frontend...' -ForegroundColor Yellow
Write-Host '  Le frontend va demarrer dans un nouveau terminal' -ForegroundColor Gray

$frontendDir = Join-Path $PWD 'frontend'
$scriptPath = Join-Path $PWD 'frontend-start.ps1'

$frontendScript = @'
cd "{0}"
Write-Host "========================================" -ForegroundColor Green
Write-Host "  FRONTEND - Version 1.1" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour arreter: Ctrl+C" -ForegroundColor Yellow
Write-Host ""
npm run dev
'@ -f $frontendDir

$frontendScript | Out-File -FilePath $scriptPath -Encoding UTF8

Start-Process powershell -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $scriptPath
Start-Sleep -Seconds 3

Write-Host '  OK Frontend demarre dans un nouveau terminal' -ForegroundColor Green
Write-Host ''

# Fonction pour obtenir l'IP locale
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

# Obtenir l'IP locale pour l'accès mobile
$localIP = Get-LocalIP

Write-Host '========================================' -ForegroundColor Green
Write-Host '  TOUT EST PRET !' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Services (accès local):' -ForegroundColor Cyan
Write-Host '  OK Backend:  http://localhost:8000 (Docker)' -ForegroundColor Green
Write-Host '  OK Frontend: http://localhost:5173 (Local)' -ForegroundColor Green
Write-Host ''

if ($localIP) {
    Write-Host 'Accès mobile (même réseau WiFi):' -ForegroundColor Cyan
    Write-Host "  Frontend: http://${localIP}:5173" -ForegroundColor Yellow
    Write-Host "  Backend:  http://${localIP}:8000" -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'Pour accéder depuis votre iPhone:' -ForegroundColor Yellow
    Write-Host "  1. Connectez votre iPhone au même réseau WiFi" -ForegroundColor White
    Write-Host "  2. Ouvrez Safari et allez sur: http://${localIP}:5173" -ForegroundColor White
    Write-Host "  3. Si cela ne fonctionne pas, exécutez: .\setup-mobile-access.ps1" -ForegroundColor White
    Write-Host ''
} else {
    Write-Host 'ATTENTION: Impossible de détecter l''IP locale' -ForegroundColor Yellow
    Write-Host 'Pour configurer l''accès mobile, exécutez: .\setup-mobile-access.ps1' -ForegroundColor Yellow
    Write-Host ''
}

Write-Host 'Version: 1.1' -ForegroundColor Yellow
Write-Host ''
