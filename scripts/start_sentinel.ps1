# ================================================================================
# Sentinel IA - Script de demarrage complet
# Demarre tous les services: MediaMTX, Backend FastAPI, Frontend React
# ================================================================================

$ErrorActionPreference = "Stop"
$ROOT_DIR = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   SENTINEL IA - Demarrage complet" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour verifier si un port est utilise
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Fonction pour arreter les processus sur un port
function Stop-ProcessOnPort {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) {
        $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $processIds) {
            Write-Host "  Arret du processus PID $procId sur le port $Port..." -ForegroundColor Yellow
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }
}

# Verifier et liberer les ports
Write-Host "[1/4] Verification des ports..." -ForegroundColor Green
$ports = @(8000, 8554, 8888, 8889, 5173)
foreach ($port in $ports) {
    if (Test-Port -Port $port) {
        Write-Host "  Port $port occupe, liberation..." -ForegroundColor Yellow
        Stop-ProcessOnPort -Port $port
    }
}
Write-Host "  Ports liberes!" -ForegroundColor Green
Write-Host ""

# Demarrer MediaMTX
Write-Host "[2/4] Demarrage de MediaMTX..." -ForegroundColor Green
$mediamtxPath = Join-Path $ROOT_DIR "mediamtx"
$mediamtxExe = Join-Path $mediamtxPath "mediamtx.exe"

if (Test-Path $mediamtxExe) {
    Start-Process -FilePath $mediamtxExe -WorkingDirectory $mediamtxPath -WindowStyle Minimized
    Write-Host "  MediaMTX demarre (minimise)" -ForegroundColor Green
    Write-Host "  Logs: shared/logs/mediamtx.log" -ForegroundColor Gray
} else {
    Write-Host "  ERREUR: mediamtx.exe non trouve!" -ForegroundColor Red
    Write-Host "  Chemin attendu: $mediamtxExe" -ForegroundColor Red
}
Write-Host ""

# Attendre que MediaMTX soit pret
Start-Sleep -Seconds 2

# Demarrer le Backend FastAPI
Write-Host "[3/4] Demarrage du Backend FastAPI..." -ForegroundColor Green
$backendPath = Join-Path $ROOT_DIR "backend_fastapi"
$venvPython = Join-Path $backendPath "venv\Scripts\python.exe"

if (Test-Path $venvPython) {
    $backendProcess = Start-Process -FilePath $venvPython -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000" -WorkingDirectory $backendPath -WindowStyle Minimized -PassThru
    Write-Host "  Backend demarre sur http://localhost:8000 (minimise)" -ForegroundColor Green
    Write-Host "  API Docs: http://localhost:8000/api/docs" -ForegroundColor Gray
    Write-Host "  Logs: shared/logs/sentinel_api.log" -ForegroundColor Gray
} else {
    Write-Host "  ERREUR: Python venv non trouve!" -ForegroundColor Red
    Write-Host "  Executez: cd backend_fastapi && python -m venv venv && pip install -r requirements.txt" -ForegroundColor Red
}
Write-Host ""

# Attendre que le backend soit pret
Start-Sleep -Seconds 3

# Demarrer le Frontend React
Write-Host "[4/4] Demarrage du Frontend React..." -ForegroundColor Green
$frontendPath = Join-Path $ROOT_DIR "frontend"
$npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source

if ($npmPath -and (Test-Path (Join-Path $frontendPath "package.json"))) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$frontendPath`" && npm run dev" -WindowStyle Minimized
    Write-Host "  Frontend demarre sur http://localhost:5173 (minimise)" -ForegroundColor Green
} else {
    Write-Host "  ERREUR: npm ou package.json non trouve!" -ForegroundColor Red
}
Write-Host ""

# Resume
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Tous les services sont demarres!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor White
Write-Host "  - Frontend:  http://localhost:5173" -ForegroundColor Gray
Write-Host "  - Backend:   http://localhost:8000" -ForegroundColor Gray
Write-Host "  - API Docs:  http://localhost:8000/api/docs" -ForegroundColor Gray
Write-Host "  - MediaMTX:  rtsp://localhost:8554" -ForegroundColor Gray
Write-Host ""
Write-Host "Logs:" -ForegroundColor White
Write-Host "  - Backend:   shared/logs/sentinel_api.log" -ForegroundColor Gray
Write-Host "  - Erreurs:   shared/logs/sentinel_api_errors.log" -ForegroundColor Gray
Write-Host "  - MediaMTX:  shared/logs/mediamtx.log" -ForegroundColor Gray
Write-Host ""
Write-Host "Credentials par defaut: admin / admin123" -ForegroundColor Yellow
Write-Host ""
Write-Host "Pour arreter tous les services: .\scripts\stop_sentinel.ps1" -ForegroundColor Gray
