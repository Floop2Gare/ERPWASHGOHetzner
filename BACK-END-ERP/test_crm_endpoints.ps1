# Script de test pour les endpoints CRM
# Teste tous les endpoints CRM : clients, services, appointments, companies

$baseUrl = "http://localhost:8000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "=== Test des endpoints CRM ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health check
Write-Host "1. Test /health" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -UseBasicParsing
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "   Erreur: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: GET /clients/
Write-Host "2. Test GET /clients/" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/clients/" -Method GET -UseBasicParsing -Headers $headers
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   Success: $($json.success)" -ForegroundColor Green
    if ($json.data) {
        Write-Host "   Clients trouvés: $($json.data.Count)" -ForegroundColor Green
    }
} catch {
    Write-Host "   Erreur: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: POST /clients/ (création d'un client test)
Write-Host "3. Test POST /clients/ (création)" -ForegroundColor Yellow
try {
    $clientData = @{
        type = "individual"
        name = "Client Test"
        firstName = "John"
        lastName = "Doe"
        email = "test@example.com"
        phone = "0123456789"
        address = "123 Rue Test"
        city = "Paris"
        status = "Actif"
        tags = @("test")
        lastService = ""
        contacts = @()
        siret = ""
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/clients/" -Method POST -Body $clientData -Headers $headers -UseBasicParsing
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   Success: $($json.success)" -ForegroundColor Green
    if ($json.data) {
        $clientId = $json.data.id
        Write-Host "   Client créé avec ID: $clientId" -ForegroundColor Green
        
        # Test 4: GET /clients/{id}
        Write-Host ""
        Write-Host "4. Test GET /clients/$clientId" -ForegroundColor Yellow
        try {
            $response = Invoke-WebRequest -Uri "$baseUrl/clients/$clientId" -Method GET -UseBasicParsing -Headers $headers
            Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
            $json = $response.Content | ConvertFrom-Json
            Write-Host "   Success: $($json.success)" -ForegroundColor Green
            Write-Host "   Client: $($json.data.name)" -ForegroundColor Green
        } catch {
            Write-Host "   Erreur: $_" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "   Erreur: $_" -ForegroundColor Red
}
Write-Host ""

# Test 5: GET /services/
Write-Host "5. Test GET /services/" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/services/" -Method GET -UseBasicParsing -Headers $headers
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   Success: $($json.success)" -ForegroundColor Green
    if ($json.data) {
        Write-Host "   Services trouvés: $($json.data.Count)" -ForegroundColor Green
    }
} catch {
    Write-Host "   Erreur: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: GET /appointments/
Write-Host "6. Test GET /appointments/" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/appointments/" -Method GET -UseBasicParsing -Headers $headers
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   Success: $($json.success)" -ForegroundColor Green
    if ($json.data) {
        Write-Host "   Rendez-vous trouvés: $($json.data.Count)" -ForegroundColor Green
    }
} catch {
    Write-Host "   Erreur: $_" -ForegroundColor Red
}
Write-Host ""

# Test 7: GET /companies/
Write-Host "7. Test GET /companies/" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/companies/" -Method GET -UseBasicParsing -Headers $headers
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   Success: $($json.success)" -ForegroundColor Green
    if ($json.data) {
        Write-Host "   Entreprises trouvées: $($json.data.Count)" -ForegroundColor Green
    }
} catch {
    Write-Host "   Erreur: $_" -ForegroundColor Red
}
Write-Host ""

# Test 8: GET /leads/
Write-Host "8. Test GET /leads/" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/leads/" -Method GET -UseBasicParsing -Headers $headers
    Write-Host "   Status: $($response.StatusCode)" -ForegroundColor Green
    $json = $response.Content | ConvertFrom-Json
    Write-Host "   Success: $($json.success)" -ForegroundColor Green
    if ($json.data) {
        Write-Host "   Leads trouvés: $($json.data.Count)" -ForegroundColor Green
    }
} catch {
    Write-Host "   Erreur: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Tests terminés ===" -ForegroundColor Cyan

