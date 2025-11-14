# Script pour démarrer le backend avec les bonnes variables d'environnement
# Utilise les credentials du conteneur PostgreSQL Docker

$env:DATABASE_URL = "postgresql+psycopg://erp_user:change_me_secure_password@localhost:5432/erp_washgo"
$env:DB_DIALECT = "postgresql"
$env:ENABLE_DEBUG_ROUTES = "true"
$env:POSTGRES_USER = "erp_user"
$env:POSTGRES_PASSWORD = "change_me_secure_password"
$env:POSTGRES_DB = "erp_washgo"
$env:POSTGRES_HOST = "localhost"
$env:POSTGRES_PORT = "5432"

Write-Host "Démarrage du backend avec les variables d'environnement suivantes:" -ForegroundColor Cyan
Write-Host "  DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Gray
Write-Host "  DB_DIALECT: $env:DB_DIALECT" -ForegroundColor Gray
Write-Host "  ENABLE_DEBUG_ROUTES: $env:ENABLE_DEBUG_ROUTES" -ForegroundColor Gray
Write-Host ""

# Vérifier que le conteneur PostgreSQL est accessible
Write-Host "Vérification de la connexion à PostgreSQL..." -ForegroundColor Yellow
try {
    docker exec erp_postgres psql -U erp_user -d erp_washgo -c "SELECT 1;" | Out-Null
    Write-Host "  ✓ PostgreSQL est accessible" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Erreur: PostgreSQL n'est pas accessible" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Démarrage du backend FastAPI..." -ForegroundColor Yellow
Write-Host "  URL: http://localhost:8000" -ForegroundColor Gray
Write-Host "  Documentation: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host ""

# Démarrer uvicorn avec les variables d'environnement
cd $PSScriptRoot
& .\venv\Scripts\uvicorn.exe app.main:app --reload --host 0.0.0.0 --port 8000

