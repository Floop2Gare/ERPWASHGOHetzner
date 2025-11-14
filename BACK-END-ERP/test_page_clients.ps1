# Test de la page Clients
# Teste les endpoints utilisés par la page Clients

$baseUrl = "http://localhost:8000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "=== Test de la page Clients ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: GET /clients/ (Liste des clients)
Write-Host "1. Test GET /clients/ (Liste)" -ForegroundColor Yellow
$clientsList = $null
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/clients/" -Method GET -UseBasicParsing -Headers $headers
    $json = $response.Content | ConvertFrom-Json
    if ($json.success -eq $true) {
        $clientsList = $json.data
        Write-Host "   ✅ Clients récupérés: $($clientsList.Count)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Erreur: $($json.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: POST /clients/ (Création d'un client)
Write-Host "2. Test POST /clients/ (Création)" -ForegroundColor Yellow
$newClientId = $null
try {
    $clientData = @{
        type = "individual"
        name = "Client Test Dashboard"
        firstName = "John"
        lastName = "Doe"
        email = "test.dashboard@example.com"
        phone = "0123456789"
        address = "123 Rue Test"
        city = "Paris"
        status = "Actif"
        tags = @("test", "dashboard")
        lastService = ""
        contacts = @()
        siret = ""
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/clients/" -Method POST -Body $clientData -Headers $headers -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    if ($json.success -eq $true) {
        $newClientId = $json.data.id
        Write-Host "   ✅ Client créé avec ID: $newClientId" -ForegroundColor Green
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

# Test 3: GET /clients/{id} (Détails d'un client)
if ($newClientId) {
    Write-Host "3. Test GET /clients/$newClientId (Détails)" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/clients/$newClientId" -Method GET -UseBasicParsing -Headers $headers
        $json = $response.Content | ConvertFrom-Json
        if ($json.success -eq $true) {
            Write-Host "   ✅ Client récupéré: $($json.data.name)" -ForegroundColor Green
            Write-Host "   Email: $($json.data.email)" -ForegroundColor Green
            Write-Host "   Statut: $($json.data.status)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Erreur: $($json.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 4: PUT /clients/{id} (Modification d'un client)
if ($newClientId) {
    Write-Host "4. Test PUT /clients/$newClientId (Modification)" -ForegroundColor Yellow
    try {
        $clientData = @{
            type = "individual"
            name = "Client Test Dashboard Modifié"
            firstName = "Jane"
            lastName = "Doe"
            email = "test.dashboard.modified@example.com"
            phone = "0987654321"
            address = "456 Rue Test Modifié"
            city = "Lyon"
            status = "Actif"
            tags = @("test", "dashboard", "modified")
            lastService = ""
            contacts = @()
            siret = ""
        } | ConvertTo-Json

        $response = Invoke-WebRequest -Uri "$baseUrl/clients/$newClientId" -Method PUT -Body $clientData -Headers $headers -UseBasicParsing
        $json = $response.Content | ConvertFrom-Json
        if ($json.success -eq $true) {
            Write-Host "   ✅ Client modifié: $($json.data.name)" -ForegroundColor Green
            Write-Host "   Nouvelle ville: $($json.data.city)" -ForegroundColor Green
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

# Test 5: DELETE /clients/{id} (Suppression d'un client)
if ($newClientId) {
    Write-Host "5. Test DELETE /clients/$newClientId (Suppression)" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/clients/$newClientId" -Method DELETE -UseBasicParsing -Headers $headers
        $json = $response.Content | ConvertFrom-Json
        if ($json.success -eq $true) {
            Write-Host "   ✅ Client supprimé" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Erreur: $($json.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "=== Tests Clients terminés ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Résumé:" -ForegroundColor Cyan
Write-Host "- Si tous les tests sont ✅, la page Clients devrait fonctionner correctement" -ForegroundColor Green
Write-Host "- Si certains tests sont ❌, corriger les erreurs avant de continuer" -ForegroundColor Red
Write-Host ""
Write-Host "Fonctionnalités à tester manuellement:" -ForegroundColor Cyan
Write-Host "- Recherche de clients" -ForegroundColor Yellow
Write-Host "- Filtrage par statut, segment, ville, tag" -ForegroundColor Yellow
Write-Host "- Export CSV" -ForegroundColor Yellow
Write-Host "- Affichage mobile et desktop" -ForegroundColor Yellow

