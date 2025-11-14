# Test de la page Services
# Teste les endpoints utilisés par la page Services

$baseUrl = "http://localhost:8000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "=== Test de la page Services ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: GET /services/ (Liste des services)
Write-Host "1. Test GET /services/ (Liste)" -ForegroundColor Yellow
$servicesList = $null
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/services/" -Method GET -UseBasicParsing -Headers $headers
    $json = $response.Content | ConvertFrom-Json
    if ($json.success -eq $true) {
        $servicesList = $json.data
        Write-Host "   ✅ Services récupérés: $($servicesList.Count)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erreur: $($json.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: POST /services/ (Création d'un service)
Write-Host "2. Test POST /services/ (Création)" -ForegroundColor Yellow
$newServiceId = $null
try {
    $serviceData = @{
        name = "Service Test"
        description = "Service de test pour la page Services"
        status = "Actif"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/services/" -Method POST -Body $serviceData -Headers $headers -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    if ($json.success -eq $true) {
        $newServiceId = $json.data.id
        Write-Host "   ✅ Service créé avec ID: $newServiceId" -ForegroundColor Green
        Write-Host "   Nom: $($json.data.name)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erreur: $($json.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Détails: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# Test 3: GET /services/{id} (Détails d'un service)
if ($newServiceId) {
    Write-Host "3. Test GET /services/$newServiceId (Détails)" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/services/$newServiceId" -Method GET -UseBasicParsing -Headers $headers
        $json = $response.Content | ConvertFrom-Json
        if ($json.success -eq $true) {
            Write-Host "   ✅ Service récupéré: $($json.data.name)" -ForegroundColor Green
            Write-Host "   Description: $($json.data.description)" -ForegroundColor Green
            Write-Host "   Statut: $($json.data.status)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Erreur: $($json.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 4: PUT /services/{id} (Modification d'un service)
if ($newServiceId) {
    Write-Host "4. Test PUT /services/$newServiceId (Modification)" -ForegroundColor Yellow
    try {
        $serviceData = @{
            name = "Service Test Modifié"
            description = "Service de test modifié pour la page Services"
            status = "Actif"
        } | ConvertTo-Json

        $response = Invoke-WebRequest -Uri "$baseUrl/services/$newServiceId" -Method PUT -Body $serviceData -Headers $headers -UseBasicParsing
        $json = $response.Content | ConvertFrom-Json
        if ($json.success -eq $true) {
            Write-Host "   ✅ Service modifié: $($json.data.name)" -ForegroundColor Green
            Write-Host "   Nouvelle description: $($json.data.description)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Erreur: $($json.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Détails: $responseBody" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Test 5: DELETE /services/{id} (Suppression d'un service)
if ($newServiceId) {
    Write-Host "5. Test DELETE /services/$newServiceId (Suppression)" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/services/$newServiceId" -Method DELETE -UseBasicParsing -Headers $headers
        $json = $response.Content | ConvertFrom-Json
        if ($json.success -eq $true) {
            Write-Host "   ✅ Service supprimé" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Erreur: $($json.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "=== Tests Services terminés ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Résumé:" -ForegroundColor Cyan
Write-Host "- Si tous les tests sont ✅, la page Services devrait fonctionner correctement" -ForegroundColor Green
Write-Host "- Si certains tests sont ❌, corriger les erreurs avant de continuer" -ForegroundColor Red
Write-Host ""
Write-Host "Fonctionnalités à tester manuellement:" -ForegroundColor Cyan
Write-Host "- Recherche de services" -ForegroundColor Yellow
Write-Host "- Filtrage par statut" -ForegroundColor Yellow
Write-Host "- Affichage mobile et desktop" -ForegroundColor Yellow

