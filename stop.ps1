# Script wrapper pour arrêter le projet
# Appelle le script principal dans scripts/stop/

$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'scripts\stop\all.ps1'

if (-not (Test-Path $scriptPath)) {
    Write-Host "ERREUR: Le fichier $scriptPath n'existe pas" -ForegroundColor Red
    exit 1
}

& $scriptPath

