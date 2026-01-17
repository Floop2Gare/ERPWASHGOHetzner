# Script pour arreter TOUT

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  ARRET DE TOUS LES SERVICES' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Write-Host '[1/2] Arret des services Docker...' -ForegroundColor Yellow
docker-compose down
Write-Host '  OK Services Docker arretes' -ForegroundColor Green
Write-Host ''

Write-Host '[2/2] Arret du frontend local...' -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "  Processus $processId arrete" -ForegroundColor Gray
        } catch { }
    }
    Write-Host '  OK Frontend arrete' -ForegroundColor Green
} else {
    Write-Host '  OK Aucun frontend en cours' -ForegroundColor Gray
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host '  TOUS LES SERVICES SONT ARRETES' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
