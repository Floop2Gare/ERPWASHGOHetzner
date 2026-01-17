# Script wrapper pour démarrer le projet
# Appelle le script principal dans scripts/start/

$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'scripts\start\all.ps1'

if (-not (Test-Path $scriptPath)) {
    Write-Host "ERREUR: Le fichier $scriptPath n'existe pas" -ForegroundColor Red
    exit 1
}

& $scriptPath

