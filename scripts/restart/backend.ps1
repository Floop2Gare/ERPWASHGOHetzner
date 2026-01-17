# Script pour redemarrer uniquement le backend

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  REDEMARRAGE BACKEND' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Write-Host '[1/2] Arret du backend...' -ForegroundColor Yellow
docker-compose stop backend
Write-Host '  OK Backend arrete' -ForegroundColor Green
Write-Host ''

Write-Host '[2/2] Redemarrage du backend...' -ForegroundColor Yellow
docker-compose start backend
Start-Sleep -Seconds 5

# Verifier
try {
    $health = Invoke-WebRequest -Uri 'http://localhost:8000/health' -Method GET -TimeoutSec 5
    Write-Host '  OK Backend redemarre' -ForegroundColor Green
} catch {
    Write-Host '  ATTENTION Backend prend du temps a redemarrer' -ForegroundColor Yellow
}

Write-Host ''
