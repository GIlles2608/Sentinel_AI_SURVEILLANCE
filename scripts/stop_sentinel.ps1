# ================================================================================
# Sentinel IA - Script d'arret complet
# Arrete tous les services: MediaMTX, Backend FastAPI, Frontend React
# ================================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SENTINEL IA - Arret complet" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour arreter les processus sur un port
function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServiceName)
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $pids) {
            Write-Host "  Arret de $ServiceName (PID $pid)..." -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
        return $true
    }
    return $false
}

# Arreter le Frontend (port 5173)
Write-Host "[1/3] Arret du Frontend..." -ForegroundColor Green
if (Stop-ProcessOnPort -Port 5173 -ServiceName "Frontend") {
    Write-Host "  Frontend arrete!" -ForegroundColor Green
} else {
    Write-Host "  Frontend non actif" -ForegroundColor Gray
}

# Arreter le Backend (port 8000)
Write-Host "[2/3] Arret du Backend..." -ForegroundColor Green
if (Stop-ProcessOnPort -Port 8000 -ServiceName "Backend") {
    Write-Host "  Backend arrete!" -ForegroundColor Green
} else {
    Write-Host "  Backend non actif" -ForegroundColor Gray
}

# Arreter MediaMTX (port 8554)
Write-Host "[3/3] Arret de MediaMTX..." -ForegroundColor Green
$mediamtxProcesses = Get-Process -Name "mediamtx" -ErrorAction SilentlyContinue
if ($mediamtxProcesses) {
    $mediamtxProcesses | Stop-Process -Force
    Write-Host "  MediaMTX arrete!" -ForegroundColor Green
} else {
    Write-Host "  MediaMTX non actif" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Tous les services sont arretes!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
