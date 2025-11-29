# Script pour télécharger MediaMTX
# Sentinel IA - WebRTC Streaming

$ErrorActionPreference = "Stop"

# Configuration
$MediaMTXVersion = "v1.9.3"
$MediaMTXUrl = "https://github.com/bluenviron/mediamtx/releases/download/$MediaMTXVersion/mediamtx_${MediaMTXVersion}_windows_amd64.zip"
$DownloadPath = "$PSScriptRoot\..\mediamtx"
$ZipFile = "$DownloadPath\mediamtx.zip"

Write-Host "=== Téléchargement de MediaMTX $MediaMTXVersion ===" -ForegroundColor Cyan

# Créer le dossier si nécessaire
if (!(Test-Path $DownloadPath)) {
    New-Item -ItemType Directory -Path $DownloadPath | Out-Null
    Write-Host "✓ Dossier créé: $DownloadPath" -ForegroundColor Green
}

# Télécharger MediaMTX
Write-Host "Téléchargement depuis GitHub..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $MediaMTXUrl -OutFile $ZipFile -UseBasicParsing
    Write-Host "✓ Téléchargement terminé" -ForegroundColor Green
} catch {
    Write-Host "✗ Erreur lors du téléchargement: $_" -ForegroundColor Red
    exit 1
}

# Extraire le fichier
Write-Host "Extraction de l'archive..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $ZipFile -DestinationPath $DownloadPath -Force
    Write-Host "✓ Extraction terminée" -ForegroundColor Green
} catch {
    Write-Host "✗ Erreur lors de l'extraction: $_" -ForegroundColor Red
    exit 1
}

# Nettoyer le fichier zip
Remove-Item $ZipFile -Force
Write-Host "✓ Nettoyage effectué" -ForegroundColor Green

# Vérifier que l'exécutable existe
$ExePath = "$DownloadPath\mediamtx.exe"
if (Test-Path $ExePath) {
    Write-Host "`n✓ MediaMTX installé avec succès!" -ForegroundColor Green
    Write-Host "Emplacement: $ExePath" -ForegroundColor Cyan
    Write-Host "`nPour démarrer MediaMTX, exécutez:" -ForegroundColor Yellow
    Write-Host "  cd mediamtx" -ForegroundColor White
    Write-Host "  .\mediamtx.exe mediamtx.yml" -ForegroundColor White
} else {
    Write-Host "✗ L'exécutable MediaMTX est introuvable" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Installation terminée ===" -ForegroundColor Cyan
