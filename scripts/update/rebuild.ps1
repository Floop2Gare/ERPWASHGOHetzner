# Script pour TOUT reconstruire (sans cache) et redemarrer

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  RECONSTRUCTION COMPLETE' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Write-Host '[1/4] Arret de tous les services...' -ForegroundColor Yellow
docker-compose down
$processes = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        } catch { }
    }
}
Write-Host '  OK Services arretes' -ForegroundColor Green
Write-Host ''

Write-Host '[2/4] Reconstruction du backend (SANS CACHE)...' -ForegroundColor Yellow
docker-compose build --no-cache backend
if ($LASTEXITCODE -ne 0) {
    Write-Host '  ERREUR lors de la reconstruction' -ForegroundColor Red
    exit 1
}
Write-Host '  OK Backend reconstruit' -ForegroundColor Green
Write-Host ''

Write-Host '[3/4] Reconstruction du frontend (SANS CACHE)...' -ForegroundColor Yellow
docker-compose build --no-cache frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host '  ERREUR lors de la reconstruction' -ForegroundColor Red
    exit 1
}
Write-Host '  OK Frontend reconstruit' -ForegroundColor Green
Write-Host ''

Write-Host '[4/4] Redemarrage de tous les services...' -ForegroundColor Yellow
& "$PSScriptRoot\..\restart\all.ps1"
