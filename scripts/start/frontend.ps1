# Script pour demarrer uniquement le frontend (en local)

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  DEMARRAGE FRONTEND' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Verifier si le port 5173 est utilise
Write-Host '[1/3] Verification du port 5173...' -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host '  ATTENTION Le port 5173 est deja utilise' -ForegroundColor Yellow
    $processes = $portInUse | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "    Processus $processId arrete" -ForegroundColor Gray
        } catch { }
    }
    Start-Sleep -Seconds 2
}
Write-Host '  OK Port 5173 libre' -ForegroundColor Green
Write-Host ''

# Verifier node_modules
Write-Host '[2/3] Verification des dependances...' -ForegroundColor Yellow
if (-not (Test-Path 'frontend\node_modules')) {
    Write-Host '  Installation des dependances...' -ForegroundColor Gray
    Set-Location frontend
    npm install
    Set-Location ..
}
Write-Host '  OK Dependances OK' -ForegroundColor Green
Write-Host ''

# Demarrer le frontend
Write-Host '[3/3] Demarrage du serveur de developpement...' -ForegroundColor Yellow
Write-Host '  Le frontend va demarrer dans ce terminal' -ForegroundColor Gray
Write-Host ''

Set-Location frontend
npm run dev
