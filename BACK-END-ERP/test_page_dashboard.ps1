# Test de la page Dashboard (Tableau de bord)
# Teste les endpoints utilisés par la page Dashboard

$baseUrl = "http://localhost:8000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "=== Test de la page Dashboard ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health check
Write-Host "1. Test /health" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    if ($json.status -eq "ok" -or $json.status -eq "degraded") {
        Write-Host "   ✅ Health check OK" -ForegroundColor Green
        Write-Host "   Status: $($json.status)" -ForegroundColor Green
        Write-Host "   Version: $($json.version)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Health check FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: GET /stats/ (Statistiques)
Write-Host "2. Test GET /stats/" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/stats/" -Method GET -UseBasicParsing -Headers $headers
    $json = $response.Content | ConvertFrom-Json
    if ($json.success -eq $true) {
        Write-Host "   ✅ Statistiques récupérées" -ForegroundColor Green
        Write-Host "   Données: $($json.data | ConvertTo-Json -Depth 2)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Statistiques non disponibles: $($json.error)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Endpoint /stats/ non disponible: $_" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: GET /clients/ (Liste des clients)
Write-Host "3. Test GET /clients/" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/clients/" -Method GET -UseBasicParsing -Headers $headers
    $json = $response.Content | ConvertFrom-Json
    if ($json.success -eq $true) {
        Write-Host "   ✅ Clients récupérés: $($json.data.Count)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Clients non disponibles: $($json.error)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: GET /appointments/ (Liste des rendez-vous)
Write-Host "4. Test GET /appointments/" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/appointments/" -Method GET -UseBasicParsing -Headers $headers
    $json = $response.Content | ConvertFrom-Json
    if ($json.success -eq $true) {
        Write-Host "   ✅ Rendez-vous récupérés: $($json.data.Count)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Rendez-vous non disponibles: $($json.error)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
}
Write-Host ""

# Test 5: GET /services/ (Liste des services)
Write-Host "5. Test GET /services/" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/services/" -Method GET -UseBasicParsing -Headers $headers
    $json = $response.Content | ConvertFrom-Json
    if ($json.success -eq $true) {
        Write-Host "   ✅ Services récupérés: $($json.data.Count)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Services non disponibles: $($json.error)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Tests Dashboard terminés ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Résumé:" -ForegroundColor Cyan
Write-Host "- Si tous les tests sont ✅, la page Dashboard devrait fonctionner correctement" -ForegroundColor Green
Write-Host "- Si certains tests sont ⚠️, vérifier les endpoints correspondants" -ForegroundColor Yellow
Write-Host "- Si certains tests sont ❌, corriger les erreurs avant de continuer" -ForegroundColor Red

