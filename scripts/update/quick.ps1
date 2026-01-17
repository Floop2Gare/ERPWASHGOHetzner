# Script pour mise a jour rapide (avec cache Docker)

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  MISE A JOUR RAPIDE' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Write-Host '[1/3] Reconstruction des images (avec cache)...' -ForegroundColor Yellow
docker-compose build backend frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host '  ERREUR lors de la reconstruction' -ForegroundColor Red
    exit 1
}
Write-Host '  OK Images reconstruites' -ForegroundColor Green
Write-Host ''

Write-Host '[2/3] Redemarrage des services...' -ForegroundColor Yellow
& "$PSScriptRoot\..\restart\all.ps1"
