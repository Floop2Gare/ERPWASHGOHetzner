# Script wrapper pour reconstruire le projet
# Appelle le script principal dans scripts/update/

$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'scripts\update\rebuild.ps1'

if (-not (Test-Path $scriptPath)) {
    Write-Host "ERREUR: Le fichier $scriptPath n'existe pas" -ForegroundColor Red
    exit 1
}

& $scriptPath

