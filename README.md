# SENTINEL IA - Système de Surveillance Intelligent

> **Projet en cours de développement**

Système de surveillance vidéo intelligent avec détection d'objets et d'anomalies par IA. Ce projet permet de visualiser des flux de caméras IP en temps réel via WebRTC avec une latence minimale.

---

## Statut du projet

| Composant | Status | Description |
|-----------|--------|-------------|
| **Frontend React** | ✅ Fonctionnel | Interface utilisateur moderne |
| **Backend FastAPI** | ✅ Fonctionnel | API REST avec authentification JWT |
| **Streaming WebRTC** | ✅ Fonctionnel | Flux vidéo temps réel < 500ms |
| **Détection IA** | 🚧 En cours | YOLOv8 pour détection d'objets |
| **Alertes** | 🚧 En cours | Système de notifications |

---

## Structure du projet

```
Sentinel/
├── backend_fastapi/        # API REST FastAPI
│   ├── app/
│   │   ├── api/routes/     # Endpoints (auth, cameras, events)
│   │   ├── core/           # Configuration, sécurité
│   │   ├── models/         # Modèles SQLAlchemy
│   │   ├── schemas/        # Schémas Pydantic
│   │   └── services/       # Logique métier, FFmpeg
│   └── requirements.txt
│
├── frontend/               # Application React
│   ├── src/
│   │   ├── components/     # Composants React (WebRTCPlayer, etc.)
│   │   ├── pages/          # Pages (Dashboard, Cameras, Login)
│   │   ├── store/          # Redux store et slices
│   │   └── services/       # Services API
│   └── package.json
│
├── mediamtx/               # Serveur de streaming
│   └── mediamtx.yml        # Configuration MediaMTX
│
├── shared/                 # Ressources partagées
│   ├── config/             # Configuration YAML
│   ├── data/               # Données persistantes
│   ├── logs/               # Logs applicatifs
│   └── models/             # Modèles IA (YOLOv8)
│
├── scripts/                # Scripts utilitaires
│   ├── download_mediamtx.ps1
│   └── start_mediamtx.ps1
│
└── docs/                   # Documentation
    ├── GETTING_STARTED.md  # Guide de prise en main
    ├── TECHNOLOGIES.md     # Technologies utilisées
    └── react-learning/     # Guides d'apprentissage React
```

---

## Démarrage rapide

### Prérequis

- **Node.js** 20+
- **Python** 3.11+
- **FFmpeg** 6.0+
- **Chrome/Edge** (recommandé pour WebRTC)

### Installation

Consultez le [Guide de Prise en Main](docs/GETTING_STARTED.md) pour les instructions détaillées.

**Résumé :**

```bash
# 1. Backend
cd backend_fastapi
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. MediaMTX (dans un autre terminal)
cd mediamtx
./mediamtx

# 3. Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev
```

**Accès :** http://localhost:5173
**Connexion :** `admin` / `admin123`

---

## Technologies principales

| Catégorie | Technologies |
|-----------|--------------|
| **Frontend** | React 19, TypeScript, Redux Toolkit, Tailwind CSS |
| **Backend** | FastAPI, SQLAlchemy, Pydantic, JWT |
| **Streaming** | WebRTC, MediaMTX, FFmpeg, RTSP |
| **IA** | YOLOv8, OpenCV, PyTorch |

Voir [TECHNOLOGIES.md](docs/TECHNOLOGIES.md) pour les détails.

---

## Fonctionnalités

### Implémentées
- ✅ Authentification JWT avec gestion des sessions
- ✅ Streaming vidéo WebRTC temps réel
- ✅ Transcodage H265→H264 avec GPU NVIDIA
- ✅ Interface utilisateur responsive
- ✅ Gestion multi-caméras
- ✅ API REST documentée (Swagger)

### En développement
- 🚧 Détection d'objets en temps réel (YOLOv8)
- 🚧 Détection de chutes et anomalies
- 🚧 Système d'alertes et notifications
- 🚧 Enregistrement vidéo automatique
- 🚧 Historique des événements

---

## Configuration

### Variables d'environnement (backend_fastapi/.env)

```env
SECRET_KEY=votre-cle-secrete
DATABASE_URL=sqlite+aiosqlite:///./sentinel.db
CAMERA_CONFIG_PATH=../shared/config/cameras.yaml
```

### Configuration caméra (shared/config/cameras.yaml)

```yaml
cameras:
  - id: camera_01
    name: "Ma Caméra"
    url: "rtsp://IP:554/stream"
    username: "admin"
    password: "password"
    enabled: true
```

---

## Documentation

- [Guide de Prise en Main](docs/GETTING_STARTED.md) - Installation et configuration
- [Technologies](docs/TECHNOLOGIES.md) - Stack technique détaillée
- [Apprentissage React](docs/react-learning/) - Guides React/Redux

---

## API

Documentation Swagger disponible à : http://localhost:8000/api/docs

### Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Connexion utilisateur |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/verify` | Vérification du token |
| GET | `/api/cameras` | Liste des caméras |
| POST | `/api/cameras/{id}/start` | Démarrer une caméra |
| GET | `/api/sessions` | Sessions actives |

---

## Licence

Projet privé - Sentinel IA

---

**Version :** 2.0.0-dev
**Dernière mise à jour :** 29 novembre 2025
