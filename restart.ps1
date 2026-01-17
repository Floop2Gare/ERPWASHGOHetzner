# Script wrapper pour redémarrer le projet
# Appelle le script principal dans scripts/restart/

$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'scripts\restart\all.ps1'

if (-not (Test-Path $scriptPath)) {
    Write-Host "ERREUR: Le fichier $scriptPath n'existe pas" -ForegroundColor Red
    exit 1
}

& $scriptPath

