# Guide de Prise en Main - Sentinel IA

Ce guide vous accompagne étape par étape pour mettre en place et rendre fonctionnel le projet Sentinel IA.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

| Logiciel | Version | Téléchargement |
|----------|---------|----------------|
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.11+ | [python.org](https://python.org/) |
| **Git** | 2.40+ | [git-scm.com](https://git-scm.com/) |
| **FFmpeg** | 6.0+ | [ffmpeg.org](https://ffmpeg.org/) |

### Optionnel (recommandé)
- **GPU NVIDIA** avec CUDA pour l'accélération matérielle du transcodage vidéo
- **Chrome/Edge** comme navigateur (meilleure compatibilité WebRTC)

---

## Étape 1 : Cloner le projet

```bash
git clone <url-du-repo>
cd Sentinel
```

---

## Étape 2 : Configurer le Backend FastAPI

### 2.1 Créer l'environnement virtuel

```bash
cd backend_fastapi
python -m venv venv
```

### 2.2 Activer l'environnement virtuel

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
venv\Scripts\activate.bat
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 2.3 Installer les dépendances

```bash
pip install -r requirements.txt
```

### 2.4 Configurer les variables d'environnement

Créez un fichier `.env` dans le dossier `backend_fastapi/` :

```env
# Application
DEBUG=True
SECRET_KEY=votre-cle-secrete-changez-ceci-en-production

# Base de données
DATABASE_URL=sqlite+aiosqlite:///./sentinel.db

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256

# Chemins
CAMERA_CONFIG_PATH=../shared/config/cameras.yaml
YOLO_MODEL_PATH=../shared/models/yolov8n.pt

# MediaMTX
MEDIAMTX_RTSP_URL=rtsp://localhost:8554
MEDIAMTX_WEBRTC_URL=http://localhost:8889
```

### 2.5 Démarrer le backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Vérification :** Accédez à http://localhost:8000/api/docs pour voir la documentation Swagger.

---

## Étape 3 : Configurer MediaMTX (Serveur de streaming)

MediaMTX est le serveur qui gère le streaming vidéo WebRTC.

### 3.1 Télécharger MediaMTX

**Windows (PowerShell):**
```powershell
cd scripts
.\download_mediamtx.ps1
```

**Ou manuellement :**
1. Téléchargez MediaMTX depuis [GitHub Releases](https://github.com/bluenviron/mediamtx/releases)
2. Extrayez dans le dossier `mediamtx/`

### 3.2 Démarrer MediaMTX

**Windows (PowerShell):**
```powershell
cd scripts
.\start_mediamtx.ps1
```

**Ou manuellement :**
```bash
cd mediamtx
./mediamtx
```

**Ports utilisés par MediaMTX :**
| Port | Protocole | Usage |
|------|-----------|-------|
| 8554 | RTSP | Réception/envoi flux RTSP |
| 8889 | HTTP | WebRTC (WHEP/WHIP) |
| 8888 | HTTP | HLS streaming |
| 9997 | HTTP | API de contrôle |

---

## Étape 4 : Configurer le Frontend React

### 4.1 Installer les dépendances

```bash
cd frontend
npm install
```

### 4.2 Configurer les variables d'environnement

Créez/modifiez le fichier `.env` dans `frontend/` :

```env
VITE_API_URL=http://localhost:8000
VITE_WEBRTC_URL=http://localhost:8889
VITE_HLS_URL=http://localhost:8888
VITE_WS_DISABLED=true
```

### 4.3 Démarrer le frontend

```bash
npm run dev
```

**Accès :** http://localhost:5173

---

## Étape 5 : Configurer une caméra

### 5.1 Modifier la configuration des caméras

Éditez le fichier `shared/config/cameras.yaml` :

```yaml
cameras:
  - id: camera_01
    name: "Ma Caméra"
    url: "rtsp://IP_CAMERA:554/stream"
    username: "admin"
    password: "motdepasse"
    type: "ip"
    enabled: true
```

### 5.2 Pour une caméra IMOU

```yaml
cameras:
  - id: imou_01
    name: "IMOU Entrée"
    url: "rtsp://192.168.1.XX:554/cam/realmonitor?channel=1&subtype=1"
    username: "admin"
    password: "votre_mot_de_passe"
    type: "imou"
    enabled: true
```

---

## Étape 6 : Lancement complet

### Option A : Démarrage automatique (Recommandé)

Utilisez le script de démarrage qui lance tous les services en une seule commande :

**Windows (PowerShell):**
```powershell
.\scripts\start_sentinel.ps1
```

Ce script :
- Libère automatiquement les ports occupés
- Démarre MediaMTX, Backend et Frontend
- Affiche un résumé avec toutes les URLs

Pour arrêter tous les services :
```powershell
.\scripts\stop_sentinel.ps1
```

### Option B : Démarrage manuel

Si vous préférez démarrer les services séparément :

1. **MediaMTX** (serveur de streaming)
   ```bash
   cd mediamtx && ./mediamtx
   ```

2. **Backend FastAPI** (dans un nouveau terminal)
   ```bash
   cd backend_fastapi
   .\venv\Scripts\activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Frontend React** (dans un nouveau terminal)
   ```bash
   cd frontend
   npm run dev
   ```

### Accès à l'application :

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | Interface utilisateur |
| Backend API | http://localhost:8000 | API REST |
| API Docs | http://localhost:8000/api/docs | Documentation Swagger |
| MediaMTX API | http://localhost:9997 | Contrôle streaming |

### Connexion :

- **Utilisateur :** `admin`
- **Mot de passe :** `admin123`

---

## Fichiers de logs

Les logs des différents services sont enregistrés dans `shared/logs/` :

| Service | Fichier | Description |
|---------|---------|-------------|
| Backend | `sentinel_api.log` | Tous les logs (rotation 10MB, 7 jours) |
| Backend Erreurs | `sentinel_api_errors.log` | Erreurs uniquement (30 jours) |
| MediaMTX | `mediamtx.log` | Logs du serveur de streaming |

### Suivre les logs en temps réel

**PowerShell:**
```powershell
# Logs backend
Get-Content .\shared\logs\sentinel_api.log -Tail 50 -Wait

# Logs MediaMTX
Get-Content .\shared\logs\mediamtx.log -Tail 50 -Wait
```

**Git Bash / Linux:**
```bash
tail -f shared/logs/sentinel_api.log
```

---

## Vérification du bon fonctionnement

### 1. Backend API

```bash
curl http://localhost:8000/api/health
```

Réponse attendue :
```json
{"status":"healthy","database":"connected","gpu":"available"}
```

### 2. MediaMTX

```bash
curl http://localhost:9997/v3/paths/list
```

### 3. Flux vidéo

1. Connectez-vous au frontend
2. Allez sur la page "Caméras"
3. La vidéo devrait s'afficher automatiquement si la caméra est configurée

---

## Dépannage

### Le flux vidéo ne s'affiche pas

1. **Vérifiez que MediaMTX est démarré**
   ```bash
   curl http://localhost:9997/v3/paths/list
   ```

2. **Vérifiez que FFmpeg transcode correctement**
   - Regardez les logs du backend pour "Transcoding started"

3. **Utilisez Chrome ou Edge**
   - Firefox peut avoir des problèmes avec certains codecs H264

4. **Vérifiez les logs de la caméra**
   ```bash
   curl http://localhost:8000/api/cameras
   ```

### Erreur de connexion à la base de données

1. Supprimez le fichier `sentinel.db` dans `backend_fastapi/`
2. Redémarrez le backend (les tables seront recréées)

### Erreur d'authentification

1. Vérifiez que le `SECRET_KEY` dans `.env` n'a pas changé
2. Déconnectez-vous et reconnectez-vous

---

## Architecture des flux vidéo

```
┌─────────────┐     RTSP H265      ┌─────────────┐
│   Caméra    │ ─────────────────► │   Backend   │
│   (IMOU)    │                    │  FastAPI    │
└─────────────┘                    └──────┬──────┘
                                          │
                                   FFmpeg │ Transcode
                                   H265→H264
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │  MediaMTX   │
                                   │   Server    │
                                   └──────┬──────┘
                                          │
                                   WebRTC │ WHEP
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │  Frontend   │
                                   │   React     │
                                   └─────────────┘
```

---

## Prochaines étapes

Une fois le système fonctionnel, vous pouvez :

1. **Ajouter d'autres caméras** dans `cameras.yaml`
2. **Configurer les zones de détection** pour chaque caméra
3. **Activer la détection IA** avec YOLOv8
4. **Configurer les alertes** et notifications

---

*Document mis à jour le 30 novembre 2025*
