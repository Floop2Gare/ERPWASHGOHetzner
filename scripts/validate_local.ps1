# Script de validation locale ERP Wash&Go (PowerShell)
# Usage: .\scripts\validate_local.ps1 [sqlite|postgres]

param(
    [string]$DbType = "sqlite"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "BACK-END-ERP"
$FrontendDir = Join-Path $ProjectRoot "FRONT-END-ERP\FRONT-END-ERP"
$LogFile = Join-Path $ProjectRoot "docs\BUGFIX_LOCAL_VALIDATION.md"

Set-Location $ProjectRoot

Write-Host "=== Validation locale ERP Wash&Go ==="
Write-Host "Type de base: $DbType"
Write-Host ""

# Fonction pour logger les erreurs
function Log-Error {
    param(
        [string]$Symptom,
        [string]$Logs,
        [string]$Cause,
        [string]$Fix,
        [string]$Files,
        [string]$Result
    )
    
    $timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
    $entry = @"

## Problème $timestamp — $Symptom
- **Symptôme**: $Symptom
- **Endpoint/page impactée**: Voir logs
- **Logs console/backend**: 
  $Logs
- **Cause racine**: $Cause
- **Correction effectuée**: $Fix
- **Fichier**: $Files
- **Résultat après fix**: $Result
"@
    Add-Content -Path $LogFile -Value $entry
}

# Configuration backend
if ($DbType -eq "sqlite") {
    Write-Host "[*] Configuration SQLite..."
    Set-Location $BackendDir
    @"
DB_DIALECT=sqlite
DATABASE_URL=sqlite:///./test_erp.db
ENABLE_DEBUG_ROUTES=false
"@ | Out-File -FilePath .env -Encoding utf8 -NoNewline
    Write-Host "[OK] Configuration SQLite creee"
    
    # Créer le schéma
    Write-Host "[*] Creation du schema SQLite..."
    $python = Join-Path $BackendDir "venv\Scripts\python.exe"
    & $python -c @"
import os
os.environ['DB_DIALECT'] = 'sqlite'
os.environ['DATABASE_URL'] = 'sqlite:///./test_erp.db'
from app.db.models import Base
from app.db.session import engine
Base.metadata.create_all(bind=engine)
print('[OK] Schema SQLite cree')
"@
    if ($LASTEXITCODE -ne 0) { Write-Host "[WARN] Erreur creation schema" }
    
} elseif ($DbType -eq "postgres") {
    Write-Host "[*] Configuration PostgreSQL..."
    Set-Location $BackendDir
    # Supprimer l'ancien .env pour éviter les conflits
    Remove-Item .env -ErrorAction SilentlyContinue
    @"
DB_DIALECT=postgresql
DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres
ENABLE_DEBUG_ROUTES=false
"@ | Out-File -FilePath .env -Encoding utf8 -NoNewline
    Write-Host "[OK] Configuration PostgreSQL creee"
    
    # Définir les variables d'environnement pour ce processus
    $env:DB_DIALECT = "postgresql"
    $env:DATABASE_URL = "postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres"
    
    # Migrations
    Write-Host "[*] Application des migrations Alembic..."
    $alembic = Join-Path $BackendDir "venv\Scripts\alembic.exe"
    & $alembic upgrade head
    if ($LASTEXITCODE -ne 0) { Write-Host "[WARN] Erreur migrations" }
}

# Arrêter les processus backend existants
Write-Host "[*] Arret des processus backend existants..."
Get-Process | Where-Object {$_.ProcessName -eq "python" -or $_.CommandLine -like "*uvicorn*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Démarrer le backend
Write-Host "[*] Demarrage du backend..."
Set-Location $BackendDir
# S'assurer que les variables d'environnement sont définies pour PostgreSQL
if ($DbType -eq "postgres") {
    $env:DB_DIALECT = "postgresql"
    $env:DATABASE_URL = "postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres"
    # Créer un script batch temporaire pour lancer avec les bonnes variables
    $batchScript = @"
@echo off
set DB_DIALECT=postgresql
set DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres
"$BackendDir\venv\Scripts\uvicorn.exe" app.main:app --host 127.0.0.1 --port 8000 --reload
"@
    $batchFile = Join-Path $BackendDir "start_backend_pg.bat"
    $batchScript | Out-File -FilePath $batchFile -Encoding ASCII
    Start-Process -FilePath $batchFile -WindowStyle Hidden
    # Ne pas supprimer immédiatement pour laisser le temps au backend de démarrer
    Start-Sleep -Seconds 2
    Remove-Item $batchFile -ErrorAction SilentlyContinue -Force
} else {
    $uvicorn = Join-Path $BackendDir "venv\Scripts\uvicorn.exe"
    Start-Process -FilePath $uvicorn -ArgumentList "app.main:app","--host","127.0.0.1","--port","8000","--reload" -WindowStyle Hidden
}
Start-Sleep -Seconds 15
Write-Host "[*] Attente supplementaire pour initialisation complete..."

# Tests
Write-Host ""
Write-Host "=== Tests API ==="

$errors = @()

# Test /health
Write-Host "1. Test GET /health"
try {
    $health = Invoke-RestMethod -Uri http://127.0.0.1:8000/health -UseBasicParsing
    if ($health.status) {
        Write-Host "   [OK] /health OK - Status: $($health.status)"
    } else {
        Write-Host "   [FAIL] /health FAILED"
        $errors += "GET /health"
    }
} catch {
    Write-Host "   [FAIL] /health FAILED - $_"
    $errors += "GET /health"
}

# Test POST /clients/
Write-Host "2. Test POST /clients/"
try {
    $body = '{"type":"individual","name":"Client Test","email":"test@example.com","status":"Actif"}'
    $client = Invoke-RestMethod -Uri http://127.0.0.1:8000/clients/ -Method POST -Body $body -ContentType "application/json"
    if ($client.success) {
        Write-Host "   [OK] POST /clients/ OK - ID: $($client.data.id)"
    } else {
        Write-Host "   [FAIL] POST /clients/ FAILED - Success: $($client.success)"
        $errors += "POST /clients/"
    }
} catch {
    Write-Host "   [FAIL] POST /clients/ FAILED - $($_.Exception.Message)"
    $errors += "POST /clients/"
}

# Test GET /clients/
Write-Host "3. Test GET /clients/"
try {
    $clients = Invoke-RestMethod -Uri http://127.0.0.1:8000/clients/ -UseBasicParsing
    if ($clients.success) {
        Write-Host "   [OK] GET /clients/ OK - Count: $($clients.count)"
    } else {
        Write-Host "   [FAIL] GET /clients/ FAILED"
        $errors += "GET /clients/"
    }
} catch {
    Write-Host "   [FAIL] GET /clients/ FAILED - $_"
    $errors += "GET /clients/"
}

# Test POST /companies/
Write-Host "4. Test POST /companies/"
try {
    $body = '{"name":"Société Test","email":"company@example.com"}'
    $company = Invoke-RestMethod -Uri http://127.0.0.1:8000/companies/ -Method POST -Body $body -ContentType "application/json"
    if ($company.success) {
        Write-Host "   [OK] POST /companies/ OK - ID: $($company.data.id)"
    } else {
        Write-Host "   [FAIL] POST /companies/ FAILED - Success: $($company.success)"
        $errors += "POST /companies/"
    }
} catch {
    Write-Host "   [FAIL] POST /companies/ FAILED - $($_.Exception.Message)"
    $errors += "POST /companies/"
}

# Test POST /services/
Write-Host "5. Test POST /services/"
try {
    $body = '{"name":"Nettoyage intérieur"}'
    $service = Invoke-RestMethod -Uri http://127.0.0.1:8000/services/ -Method POST -Body $body -ContentType "application/json"
    if ($service.success) {
        Write-Host "   [OK] POST /services/ OK - ID: $($service.data.id)"
    } else {
        Write-Host "   [FAIL] POST /services/ FAILED - Success: $($service.success)"
        $errors += "POST /services/"
    }
} catch {
    Write-Host "   [FAIL] POST /services/ FAILED - $($_.Exception.Message)"
    $errors += "POST /services/"
}

# Arrêter le backend
Write-Host ""
Write-Host "[*] Arret du backend..."
Get-Process | Where-Object {$_.ProcessName -eq "python" -or $_.CommandLine -like "*uvicorn*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host ""
if ($errors.Count -eq 0) {
    Write-Host "[OK] Validation $DbType reussie - Tous les tests passent"
} else {
    Write-Host "[FAIL] Validation $DbType echouee - Erreurs: $($errors -join ', ')"
    exit 1
}

