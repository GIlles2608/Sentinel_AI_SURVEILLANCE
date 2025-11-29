# Script pour arreter tous les backends uvicorn sur le port 8000

Write-Host "Recherche des processus sur le port 8000..."

# Trouver les PIDs ecoutant sur le port 8000
$connections = netstat -ano | Select-String ":8000" | Select-String "LISTENING"

if ($connections) {
    $processIds = @()
    foreach ($line in $connections) {
        # Extraire le PID (derniere colonne)
        if ($line -match '\s+(\d+)\s*$') {
            $processId = $Matches[1]
            if ($processId -notin $processIds) {
                $processIds += $processId
            }
        }
    }

    Write-Host "Processus trouves: $($processIds -join ', ')"

    foreach ($processId in $processIds) {
        Write-Host "Arret du processus PID $processId..."
        taskkill /F /T /PID $processId 2>&1 | Out-Null
        Write-Host "  PID $processId arrete"
    }

    Start-Sleep -Seconds 1

    # Verification
    Write-Host "`nVerification..."
    $remaining = netstat -ano | Select-String ":8000" | Select-String "LISTENING"
    if ($remaining) {
        Write-Host "Certains processus sont encore actifs sur le port 8000"
        $remaining
    } else {
        Write-Host "Port 8000 libere avec succes!"
    }
} else {
    Write-Host "Aucun processus trouve sur le port 8000"
}
