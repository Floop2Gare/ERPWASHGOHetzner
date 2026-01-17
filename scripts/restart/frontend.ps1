# Script pour redemarrer uniquement le frontend

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  REDEMARRAGE FRONTEND' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

Write-Host '[1/2] Arret du frontend...' -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "  Processus $processId arrete" -ForegroundColor Gray
        } catch { }
    }
    Start-Sleep -Seconds 2
}
Write-Host '  OK Frontend arrete' -ForegroundColor Green
Write-Host ''

Write-Host '[2/2] Redemarrage du frontend...' -ForegroundColor Yellow

# Obtenir l'IP locale pour affichage
function Get-LocalIP {
    $adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -notlike '127.*' -and 
        $_.IPAddress -notlike '169.254.*' -and
        $_.PrefixOrigin -ne 'WellKnown'
    } | Sort-Object InterfaceIndex
    
    if ($adapters.Count -eq 0) {
        return $null
    }
    
    return $adapters[0].IPAddress
}

$localIP = Get-LocalIP

Write-Host ''
if ($localIP) {
    Write-Host 'URLs de connexion:' -ForegroundColor Cyan
    Write-Host "  Local:  http://localhost:5173" -ForegroundColor White
    Write-Host "  Mobile: http://${localIP}:5173" -ForegroundColor Yellow
    Write-Host ''
}

& "$PSScriptRoot\..\start\frontend.ps1"
