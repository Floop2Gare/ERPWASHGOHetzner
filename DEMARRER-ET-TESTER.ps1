# Script pour démarrer tout et tester l'accès mobile

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  DEMARRAGE ET TEST COMPLET' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Obtenir l'IP locale
function Get-LocalIP {
    $adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -notlike '127.*' -and 
        $_.IPAddress -notlike '169.254.*' -and
        $_.PrefixOrigin -ne 'WellKnown'
    } | Sort-Object InterfaceIndex
    
    if ($adapters.Count -eq 0) {
        return $null
    } else {
        return $adapters[0].IPAddress
    }
}

$localIP = Get-LocalIP
Write-Host "IP locale detectee: $localIP" -ForegroundColor Cyan
Write-Host ''

# 1. Vérifier/Configurer .env.local
Write-Host '[1/4] Configuration .env.local...' -ForegroundColor Yellow
$envFile = 'frontend\.env.local'
if (-not (Test-Path $envFile)) {
    & "$PSScriptRoot\setup-mobile-access.ps1" | Out-Null
} else {
    $envContent = Get-Content $envFile | Select-String 'VITE_BACKEND_URL'
    if (-not $envContent -or -not $envContent.ToString().Contains($localIP)) {
        & "$PSScriptRoot\setup-mobile-access.ps1" | Out-Null
    }
}
Write-Host '  OK Configuration .env.local' -ForegroundColor Green
Write-Host ''

# 2. Démarrer le backend
Write-Host '[2/4] Demarrage du backend...' -ForegroundColor Yellow
$backendRunning = docker ps --filter 'name=erp_backend' --format '{{.Names}}' | Select-String 'erp_backend'
if (-not $backendRunning) {
    docker-compose up -d backend postgres | Out-Null
    Write-Host '  Attente du demarrage du backend (15 secondes)...' -ForegroundColor Gray
    Start-Sleep -Seconds 15
} else {
    Write-Host '  Backend deja demarre' -ForegroundColor Gray
}

# Tester le backend
try {
    $health = Invoke-WebRequest -Uri "http://${localIP}:8000/health" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host '  OK Backend accessible' -ForegroundColor Green
} catch {
    Write-Host '  ATTENTION: Backend demarre mais pas encore accessible' -ForegroundColor Yellow
}
Write-Host ''

# 3. Arrêter le frontend s'il tourne
Write-Host '[3/4] Redemarrage du frontend...' -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    foreach ($processId in $processes) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host '  Ancien processus arrete' -ForegroundColor Gray
}

# 4. Démarrer le frontend
Write-Host '  Demarrage du frontend...' -ForegroundColor Gray
$frontendScript = @"
cd "$PSScriptRoot\frontend"
`$env:VITE_BACKEND_URL = "http://${localIP}:8000"
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  FRONTEND - ACCES MOBILE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Local:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "Mobile: http://${localIP}:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pour arreter: Ctrl+C" -ForegroundColor Gray
Write-Host ""
npm run dev
"@

$frontendScript | Out-File -FilePath "$env:TEMP\start-frontend-mobile.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$env:TEMP\start-frontend-mobile.ps1"

Write-Host '  Attente du demarrage (8 secondes)...' -ForegroundColor Gray
Start-Sleep -Seconds 8

# Tester le frontend
try {
    $response = Invoke-WebRequest -Uri "http://${localIP}:5173" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host '  OK Frontend accessible (HTTP ' + $response.StatusCode + ')' -ForegroundColor Green
} catch {
    Write-Host '  ATTENTION: Frontend demarre mais pas encore accessible' -ForegroundColor Yellow
}
Write-Host ''

# 5. Vérifier le firewall
Write-Host '[4/4] Verification du firewall...' -ForegroundColor Yellow
$firewall5173 = Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*5173*" -or $_.DisplayName -like "*ERP*Port 5173*" } | Where-Object { $_.Enabled -eq $true -and $_.Direction -eq 'Inbound' }
$firewall8000 = Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*8000*" -or $_.DisplayName -like "*ERP*Port 8000*" } | Where-Object { $_.Enabled -eq $true -and $_.Direction -eq 'Inbound' }

if ($firewall5173) {
    Write-Host '  OK Firewall port 5173 configure' -ForegroundColor Green
} else {
    Write-Host '  ATTENTION: Firewall port 5173 non configure' -ForegroundColor Yellow
    Write-Host '    Executez .\CONFIGURER-TOUT.bat en administrateur' -ForegroundColor Gray
}

if ($firewall8000) {
    Write-Host '  OK Firewall port 8000 configure' -ForegroundColor Green
} else {
    Write-Host '  ATTENTION: Firewall port 8000 non configure' -ForegroundColor Yellow
    Write-Host '    Executez .\CONFIGURER-TOUT.bat en administrateur' -ForegroundColor Gray
}
Write-Host ''

# Résumé final
Write-Host '========================================' -ForegroundColor Green
Write-Host '  TOUT EST PRET !' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
Write-Host 'URLs de connexion:' -ForegroundColor Cyan
Write-Host "  Frontend: http://${localIP}:5173" -ForegroundColor White
Write-Host "  Backend:  http://${localIP}:8000" -ForegroundColor White
Write-Host ''
Write-Host 'Testez depuis votre iPhone:' -ForegroundColor Yellow
Write-Host "  1. Connectez-vous au meme reseau WiFi" -ForegroundColor White
Write-Host "  2. Ouvrez Safari" -ForegroundColor White
Write-Host "  3. Allez sur: http://${localIP}:5173" -ForegroundColor White
Write-Host "  4. Si erreur 'connexion securisee':" -ForegroundColor White
Write-Host "     - Videz le cache Safari (Reglages > Safari > Effacer)" -ForegroundColor Gray
Write-Host "     - Essayez en navigation privee" -ForegroundColor Gray
Write-Host ''
Write-Host 'Le frontend tourne dans un nouveau terminal.' -ForegroundColor Gray
Write-Host ''

