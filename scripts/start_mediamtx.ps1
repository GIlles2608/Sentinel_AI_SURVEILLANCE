# Script pour démarrer MediaMTX
# Sentinel IA - WebRTC Streaming

$ErrorActionPreference = "Stop"

$MediaMTXPath = "$PSScriptRoot\..\mediamtx"
$ConfigFile = "$MediaMTXPath\mediamtx.yml"
$ExePath = "$MediaMTXPath\mediamtx.exe"

Write-Host "=== Démarrage de MediaMTX ===" -ForegroundColor Cyan

# Vérifier que MediaMTX est installé
if (!(Test-Path $ExePath)) {
    Write-Host "✗ MediaMTX n'est pas installé" -ForegroundColor Red
    Write-Host "Exécutez d'abord: .\download_mediamtx.ps1" -ForegroundColor Yellow
    exit 1
}

# Vérifier que le fichier de configuration existe
if (!(Test-Path $ConfigFile)) {
    Write-Host "✗ Fichier de configuration introuvable: $ConfigFile" -ForegroundColor Red
    Write-Host "Assurez-vous que mediamtx.yml existe dans le dossier mediamtx/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Configuration trouvée: $ConfigFile" -ForegroundColor Green
Write-Host "✓ Démarrage de MediaMTX..." -ForegroundColor Green
Write-Host ""
Write-Host "Ports utilisés:" -ForegroundColor Cyan
Write-Host "  - RTSP:    8554" -ForegroundColor White
Write-Host "  - WebRTC:  8889" -ForegroundColor White
Write-Host "  - API:     9997" -ForegroundColor White
Write-Host ""
Write-Host "Accès WebRTC: http://localhost:8889/imou_01" -ForegroundColor Yellow
Write-Host "API:          http://localhost:9997/" -ForegroundColor Yellow
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter MediaMTX" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Démarrer MediaMTX
Set-Location $MediaMTXPath
& ".\mediamtx.exe" "mediamtx.yml"
