# Script de test pour les endpoints CRM en local
# Ce script teste chaque endpoint CRM individuellement

$baseUrl = "http://localhost:8000"
$headers = @{
    "Content-Type" = "application/json"
}

$testResults = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [string]$Description
    )
    
    Write-Host "`n=== $Name ===" -ForegroundColor Cyan
    Write-Host "Description: $Description" -ForegroundColor Gray
    Write-Host "Endpoint: $Method $Endpoint" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = "$baseUrl$Endpoint"
            Method = $Method
            Headers = $headers
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-WebRequest @params
        $json = $response.Content | ConvertFrom-Json
        
        if ($json.success -eq $true) {
            Write-Host "✓ SUCCESS" -ForegroundColor Green
            Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Green
            if ($json.data) {
                if ($json.data -is [Array]) {
                    Write-Host "  Données: $($json.data.Count) élément(s)" -ForegroundColor Green
                } else {
                    Write-Host "  Données: Présentes" -ForegroundColor Green
                }
            }
            $testResults += @{
                Name = $Name
                Status = "SUCCESS"
                StatusCode = $response.StatusCode
                Message = "OK"
            }
            return $true
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red
            Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Red
            Write-Host "  Erreur: $($json.error)" -ForegroundColor Red
            $testResults += @{
                Name = $Name
                Status = "FAILED"
                StatusCode = $response.StatusCode
                Message = $json.error
            }
            return $false
        }
    } catch {
        Write-Host "✗ ERROR" -ForegroundColor Red
        Write-Host "  Erreur: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  Réponse: $responseBody" -ForegroundColor Red
        }
        $testResults += @{
            Name = $Name
            Status = "ERROR"
            StatusCode = $_.Exception.Response.StatusCode.value__
            Message = $_.Exception.Message
        }
        return $false
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST DES ENDPOINTS CRM EN LOCAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test 1: Health Check
Test-Endpoint -Name "Health Check" -Method "GET" -Endpoint "/health" -Description "Vérifie que le backend est accessible"

# Test 2: Clients - GET all
Test-Endpoint -Name "GET /clients/" -Method "GET" -Endpoint "/clients/" -Description "Récupère tous les clients"

# Test 3: Clients - POST (création)
$newClient = @{
    type = "individual"
    name = "Client Test $(Get-Date -Format 'HHmmss')"
    firstName = "John"
    lastName = "Doe"
    email = "test$(Get-Date -Format 'HHmmss')@example.com"
    phone = "0123456789"
    address = "123 Rue Test"
    city = "Paris"
    status = "Actif"
    tags = @("test")
    lastService = ""
    contacts = @()
    siret = ""
}
$clientCreated = Test-Endpoint -Name "POST /clients/ (création)" -Method "POST" -Endpoint "/clients/" -Body $newClient -Description "Crée un nouveau client"

# Test 4: Clients - GET by ID (si création réussie)
if ($clientCreated -and $testResults[-1].Message -eq "OK") {
    $response = Invoke-WebRequest -Uri "$baseUrl/clients/" -Method GET -Headers $headers -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    if ($json.success -and $json.data.Count -gt 0) {
        $clientId = $json.data[0].id
        Test-Endpoint -Name "GET /clients/{id}" -Method "GET" -Endpoint "/clients/$clientId" -Description "Récupère un client par ID"
    }
}

# Test 5: Services - GET all
Test-Endpoint -Name "GET /services/" -Method "GET" -Endpoint "/services/" -Description "Récupère tous les services"

# Test 6: Services - POST (création)
$newService = @{
    name = "Service Test $(Get-Date -Format 'HHmmss')"
    description = "Description du service test"
    status = "Actif"
}
Test-Endpoint -Name "POST /services/ (création)" -Method "POST" -Endpoint "/services/" -Body $newService -Description "Crée un nouveau service"

# Test 7: Appointments - GET all
Test-Endpoint -Name "GET /appointments/" -Method "GET" -Endpoint "/appointments/" -Description "Récupère tous les rendez-vous"

# Test 8: Companies - GET all
Test-Endpoint -Name "GET /companies/" -Method "GET" -Endpoint "/companies/" -Description "Récupère toutes les entreprises"

# Test 9: Companies - POST (création)
$newCompany = @{
    name = "Entreprise Test $(Get-Date -Format 'HHmmss')"
    email = "company$(Get-Date -Format 'HHmmss')@example.com"
    phone = "0123456789"
    address = "456 Rue Entreprise"
}
Test-Endpoint -Name "POST /companies/ (création)" -Method "POST" -Endpoint "/companies/" -Body $newCompany -Description "Crée une nouvelle entreprise"

# Test 10: Leads - GET all
Test-Endpoint -Name "GET /leads/" -Method "GET" -Endpoint "/leads/" -Description "Récupère tous les leads"

# Résumé
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$successCount = ($testResults | Where-Object { $_.Status -eq "SUCCESS" }).Count
$failedCount = ($testResults | Where-Object { $_.Status -eq "FAILED" }).Count
$errorCount = ($testResults | Where-Object { $_.Status -eq "ERROR" }).Count
$totalCount = $testResults.Count

Write-Host "Total: $totalCount tests" -ForegroundColor White
Write-Host "✓ Réussis: $successCount" -ForegroundColor Green
Write-Host "✗ Échoués: $failedCount" -ForegroundColor Red
Write-Host "⚠ Erreurs: $errorCount" -ForegroundColor Yellow

$successRate = if ($totalCount -gt 0) { [math]::Round(($successCount / $totalCount) * 100, 2) } else { 0 }
Write-Host "`nTaux de réussite: $successRate%" -ForegroundColor $(if ($successRate -eq 100) { "Green" } elseif ($successRate -ge 80) { "Yellow" } else { "Red" })

# Détails des échecs
if ($failedCount -gt 0 -or $errorCount -gt 0) {
    Write-Host "`n=== DÉTAILS DES ÉCHECS ===" -ForegroundColor Red
    $testResults | Where-Object { $_.Status -ne "SUCCESS" } | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Message)" -ForegroundColor Red
    }
}

# Sauvegarder les résultats
$testResults | ConvertTo-Json -Depth 3 | Out-File -FilePath "test_results.json" -Encoding UTF8
Write-Host "`nRésultats sauvegardés dans test_results.json" -ForegroundColor Gray

