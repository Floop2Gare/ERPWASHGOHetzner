# Script pour demarrer uniquement le backend (PostgreSQL + FastAPI dans Docker)

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================' -ForegroundColor Cyan
Write-Host '  DEMARRAGE BACKEND' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Verifier et demarrer Docker Desktop si necessaire
Write-Host '[1/4] Verification de Docker...' -ForegroundColor Yellow
$dockerAvailable = $false

# Fonction pour verifier si Docker est vraiment disponible
function Test-DockerAvailable {
    try {
        $result = docker ps 2>&1
        if ($LASTEXITCODE -eq 0 -and $result -notmatch "error during connect") {
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

if (Test-DockerAvailable) {
    $dockerAvailable = $true
    Write-Host '  OK Docker disponible' -ForegroundColor Green
} else {
    Write-Host '  Docker nest pas disponible, tentative de demarrage...' -ForegroundColor Yellow
    
    # Chercher Docker Desktop dans les emplacements communs
    $dockerDesktopPaths = @(
        "C:\Program Files\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe"
    )
    
    $dockerDesktopPath = $null
    foreach ($path in $dockerDesktopPaths) {
        if (Test-Path $path) {
            $dockerDesktopPath = $path
            break
        }
    }
    
    if ($dockerDesktopPath) {
        Write-Host "  Demarrage de Docker Desktop..." -ForegroundColor Yellow
        Start-Process -FilePath $dockerDesktopPath -WindowStyle Hidden
        
        # Attendre que Docker soit disponible (maximum 60 secondes)
        Write-Host '  Attente de Docker Desktop (cela peut prendre jusqu''a 60 secondes)...' -ForegroundColor Yellow
        $maxWait = 60
        $waited = 0
        $interval = 2
        
        while ($waited -lt $maxWait) {
            Start-Sleep -Seconds $interval
            $waited += $interval
            if (Test-DockerAvailable) {
                $dockerAvailable = $true
                Write-Host "  OK Docker disponible apres $waited secondes" -ForegroundColor Green
                break
            } else {
                Write-Host "  En attente... ($waited/$maxWait secondes)" -ForegroundColor Gray
            }
        }
        
        if (-not $dockerAvailable) {
            Write-Host '  ERREUR: Docker Desktop n''a pas demarre dans les delais' -ForegroundColor Red
            Write-Host '  Veuillez demarrer Docker Desktop manuellement et reessayer' -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host '  ERREUR: Docker Desktop n''est pas installe ou introuvable' -ForegroundColor Red
        Write-Host '  Veuillez installer Docker Desktop depuis: https://www.docker.com/products/docker-desktop' -ForegroundColor Yellow
        exit 1
    }
}
Write-Host ''

# Verifier si deja en cours
Write-Host '[2/4] Verification des conteneurs existants...' -ForegroundColor Yellow
$backendRunning = docker ps --filter 'name=erp_backend' --format '{{.Names}}' | Select-String 'erp_backend'
$postgresRunning = docker ps --filter 'name=erp_postgres' --format '{{.Names}}' | Select-String 'erp_postgres'

if ($backendRunning -and $postgresRunning) {
    Write-Host '  OK Backend deja en cours dexecution' -ForegroundColor Green
} else {
    Write-Host '[3/4] Demarrage de PostgreSQL et Backend...' -ForegroundColor Yellow
    docker-compose up -d postgres backend
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host '  ERREUR lors du demarrage' -ForegroundColor Red
        Write-Host '  Verifiez les logs avec: docker-compose logs' -ForegroundColor Yellow
        exit 1
    }
    Write-Host '  OK Conteneurs demarres' -ForegroundColor Green
    Write-Host ''
    
    Write-Host '[4/4] Attente du backend (15 secondes)...' -ForegroundColor Yellow
    Start-Sleep -Seconds 15
}

# Verifier le backend
Write-Host 'Verification de la sante du backend...' -ForegroundColor Yellow
$maxRetries = 5
$retryCount = 0
$backendHealthy = $false

while ($retryCount -lt $maxRetries -and -not $backendHealthy) {
    try {
        $health = Invoke-WebRequest -Uri 'http://localhost:8000/health' -Method GET -TimeoutSec 5 -ErrorAction Stop
        $healthData = $health.Content | ConvertFrom-Json
        Write-Host "  OK Backend: $($healthData.status)" -ForegroundColor Green
        $backendHealthy = $true
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "  Tentative $retryCount/$maxRetries - Le backend demarre encore..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        } else {
            Write-Host '  ATTENTION: Le backend ne repond pas encore' -ForegroundColor Yellow
            Write-Host '  Verifiez les logs avec: docker-compose logs backend' -ForegroundColor Yellow
        }
    }
}

Write-Host ''
Write-Host 'Backend disponible sur: http://localhost:8000' -ForegroundColor Cyan
Write-Host ''
