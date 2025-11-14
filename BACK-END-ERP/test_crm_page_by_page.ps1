# Script de test page par page pour le CRM
# Teste chaque page du frontend CRM avec le backend

$baseUrl = "http://localhost:8000"
$headers = @{
    "Content-Type" = "application/json"
}

$pages = @(
    @{
        Name = "Dashboard"
        Endpoints = @(
            @{ Method = "GET"; Path = "/health"; Description = "Health check" }
            @{ Method = "GET"; Path = "/stats/summary"; Description = "Statistiques du dashboard" }
        )
    },
    @{
        Name = "Clients"
        Endpoints = @(
            @{ Method = "GET"; Path = "/clients/"; Description = "Liste des clients" }
            @{ Method = "POST"; Path = "/clients/"; Body = @{
                type = "individual"
                name = "Client Test Dashboard"
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
            }; Description = "Création d'un client" }
        )
    },
    @{
        Name = "Leads"
        Endpoints = @(
            @{ Method = "GET"; Path = "/leads/"; Description = "Liste des leads" }
        )
    },
    @{
        Name = "Services"
        Endpoints = @(
            @{ Method = "GET"; Path = "/services/"; Description = "Liste des services" }
            @{ Method = "POST"; Path = "/services/"; Body = @{
                name = "Service Test"
                description = "Description du service"
                status = "Actif"
            }; Description = "Création d'un service" }
        )
    },
    @{
        Name = "Planning"
        Endpoints = @(
            @{ Method = "GET"; Path = "/appointments/"; Description = "Liste des rendez-vous" }
            @{ Method = "GET"; Path = "/planning/google-calendar"; Description = "Événements Google Calendar" }
        )
    },
    @{
        Name = "Statistiques"
        Endpoints = @(
            @{ Method = "GET"; Path = "/stats/summary"; Description = "Statistiques générales" }
        )
    }
)

function Test-Page {
    param(
        [object]$Page
    )
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  PAGE: $($Page.Name)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $pageResults = @()
    $allSuccess = $true
    
    foreach ($endpoint in $Page.Endpoints) {
        Write-Host "`n  Test: $($endpoint.Description)" -ForegroundColor Yellow
        Write-Host "  Endpoint: $($endpoint.Method) $($endpoint.Path)" -ForegroundColor Gray
        
        try {
            $params = @{
                Uri = "$baseUrl$($endpoint.Path)"
                Method = $endpoint.Method
                Headers = $headers
                UseBasicParsing = $true
            }
            
            if ($endpoint.Body) {
                $params.Body = ($endpoint.Body | ConvertTo-Json -Depth 10)
            }
            
            $response = Invoke-WebRequest @params
            $json = $response.Content | ConvertFrom-Json
            
            if ($json.success -eq $true) {
                Write-Host "  [OK] SUCCESS" -ForegroundColor Green
                $pageResults += @{
                    Endpoint = $endpoint.Path
                    Status = "SUCCESS"
                    StatusCode = $response.StatusCode
                }
            } else {
                Write-Host "  [X] FAILED" -ForegroundColor Red
                Write-Host "    Erreur: $($json.error)" -ForegroundColor Red
                $pageResults += @{
                    Endpoint = $endpoint.Path
                    Status = "FAILED"
                    StatusCode = $response.StatusCode
                    Error = $json.error
                }
                $allSuccess = $false
            }
        } catch {
            Write-Host "  [X] ERROR" -ForegroundColor Red
            Write-Host "    Erreur: $($_.Exception.Message)" -ForegroundColor Red
            $pageResults += @{
                Endpoint = $endpoint.Path
                Status = "ERROR"
                Error = $_.Exception.Message
            }
            $allSuccess = $false
        }
    }
    
    return @{
        Page = $Page.Name
        Results = $pageResults
        AllSuccess = $allSuccess
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST PAGE PAR PAGE - CRM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$allResults = @()

foreach ($page in $pages) {
    $result = Test-Page -Page $page
    $allResults += $result
}

# Résumé final
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ PAR PAGE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

foreach ($result in $allResults) {
    $successCount = ($result.Results | Where-Object { $_.Status -eq "SUCCESS" }).Count
    $totalCount = $result.Results.Count
    if ($result.AllSuccess) {
        $status = "TOUS LES TESTS REUSSIS"
        $color = "Green"
    } else {
        $status = "CERTAINS TESTS ONT ECHOUE"
        $color = "Red"
    }
    
    Write-Host "`n$($result.Page): $status" -ForegroundColor $color
    Write-Host "  $successCount/$totalCount tests réussis" -ForegroundColor $(if ($result.AllSuccess) { "Green" } else { "Yellow" })
    
    if (-not $result.AllSuccess) {
        Write-Host "  Endpoints en échec:" -ForegroundColor Red
        $result.Results | Where-Object { $_.Status -ne "SUCCESS" } | ForEach-Object {
            Write-Host "    - $($_.Endpoint): $($_.Error)" -ForegroundColor Red
        }
    }
}

$totalSuccess = ($allResults | Where-Object { $_.AllSuccess }).Count
$totalPages = $allResults.Count

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RÉSUMÉ GLOBAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pages testées: $totalPages" -ForegroundColor White
Write-Host "Pages réussies: $totalSuccess" -ForegroundColor Green
Write-Host "Pages avec erreurs: $($totalPages - $totalSuccess)" -ForegroundColor Red

$successRate = if ($totalPages -gt 0) { [math]::Round(($totalSuccess / $totalPages) * 100, 2) } else { 0 }
Write-Host "`nTaux de réussite: $successRate%" -ForegroundColor $(if ($successRate -eq 100) { "Green" } elseif ($successRate -ge 80) { "Yellow" } else { "Red" })

# Sauvegarder les résultats
$allResults | ConvertTo-Json -Depth 5 | Out-File -FilePath "test_results_page_by_page.json" -Encoding UTF8
Write-Host "`nRésultats sauvegardés dans test_results_page_by_page.json" -ForegroundColor Gray

