# Script pour redemarrer TOUT le projet

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  REDEMARRAGE COMPLET' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Write-Host '[1/3] Arret de tous les services...' -ForegroundColor Yellow
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

Write-Host '[2/3] Redemarrage du backend...' -ForegroundColor Yellow
docker-compose up -d postgres backend
Start-Sleep -Seconds 10
Write-Host '  OK Backend redemarre' -ForegroundColor Green
Write-Host ''

Write-Host '[3/3] Redemarrage du frontend...' -ForegroundColor Yellow
& "$PSScriptRoot\..\start\frontend.ps1"
