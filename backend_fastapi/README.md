# SENTINEL IA v2.0 - Backend FastAPI

Backend API moderne pour Sentinel IA - Système de surveillance vidéo intelligent avec détection d'objets par IA.

## 🚀 Stack Technologique

- **FastAPI 0.115.0** - Framework web async haute performance
- **Uvicorn** - Serveur ASGI
- **SQLAlchemy 2.0** - ORM avec support async
- **Pydantic v2** - Validation de données
- **ClickHouse** - Base de données time-series pour événements
- **MinIO** - Stockage S3 pour médias
- **YOLOv8** - Détection d'objets en temps réel
- **WebSocket natif** - Communication temps réel

## 📁 Structure du Projet

```
backend_fastapi/
├── app/
│   ├── main.py                    # Point d'entrée FastAPI
│   ├── core/
│   │   └── config.py              # Configuration Pydantic
│   ├── api/
│   │   └── routes/                # Endpoints API
│   │       ├── auth.py            # Authentication JWT
│   │       ├── cameras.py         # Gestion caméras
│   │       ├── events.py          # Gestion événements
│   │       ├── stats.py           # Statistiques
│   │       └── websocket.py       # WebSocket temps réel
│   ├── schemas/                   # Schémas Pydantic
│   ├── models/                    # Modèles SQLAlchemy
│   ├── services/                  # Logique métier
│   └── db/                        # Connexions databases
│       ├── session.py             # SQLite async
│       ├── clickhouse.py          # ClickHouse async
│       └── minio_storage.py       # MinIO S3
├── config/                        # Configuration YAML
├── tests/                         # Tests pytest
├── requirements.txt
├── .env.example
└── Learning/                      # Documentation migration
```

## 🔧 Installation

### Prérequis

- Python 3.11+
- ClickHouse (optionnel, pour événements)
- MinIO (optionnel, pour médias)

### 1. Créer l'environnement virtuel

```bash
cd backend_fastapi
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 3. Configuration

```bash
# Copier le fichier exemple
cp .env.example .env

# Éditer .env avec vos valeurs
nano .env  # ou votre éditeur préféré
```

**Variables importantes**:
```bash
# API
PORT=8000
DEBUG=True

# Security - CHANGER EN PRODUCTION
SECRET_KEY=your-secret-key-min-32-chars

# Databases
CLICKHOUSE_HOST=localhost
MINIO_ENDPOINT=localhost:9000

# AI Models
YOLO_MODEL_PATH=../models/yolov8n.pt
```

## 🚀 Démarrage

### Mode développement (avec reload)

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Mode production

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Avec script Python

```bash
python -m app.main
```

## 📚 Documentation API

Une fois le serveur démarré:

- **Swagger UI** (interactive): http://localhost:8000/api/docs
- **ReDoc** (élégante): http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

## 🔐 Authentification

L'API utilise JWT (JSON Web Tokens) pour l'authentification.

### Obtenir un token

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

Réponse:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "1",
    "username": "admin",
    "role": "admin"
  }
}
```

### Utiliser le token

```bash
curl -X GET "http://localhost:8000/api/cameras" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🌐 WebSocket

Le WebSocket permet la communication temps réel pour:
- Nouveaux événements détectés
- Mises à jour de frames caméras
- Changements de statut
- Alertes système

### Connexion WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  console.log('Connected');

  // Souscrire à des canaux
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['camera_1', 'events']
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'new_event') {
    console.log('New event:', message.data);
  }
};
```

## 🧪 Tests

### Lancer tous les tests

```bash
pytest tests/ -v
```

### Avec couverture

```bash
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

### Tests spécifiques

```bash
# Tests auth uniquement
pytest tests/test_api/test_auth.py -v

# Tests async
pytest tests/ -v -k async
```

## 🗄️ Bases de données

### SQLite (Authentification)

Base légère pour les utilisateurs et configuration.

**Emplacement**: `../data/users.db`

**Tables**:
- `users` - Utilisateurs du système

### ClickHouse (Événements)

Base de données time-series pour événements haute performance.

**Configuration**:
```bash
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=9000
CLICKHOUSE_DATABASE=sentinel
```

**Tables**:
- `events` - Événements de détection (partitionné par mois)

### MinIO (Médias)

Stockage S3-compatible pour frames et vidéos.

**Configuration**:
```bash
MINIO_ENDPOINT=localhost:9000
MINIO_BUCKET=sentinel-media
```

**Structure**:
```
sentinel-media/
├── frames/
│   └── evt_20250112_100523_camera1.jpg
└── videos/
    └── evt_20250112_100523_camera1.mp4
```

## 📊 Endpoints principaux

### Authentication
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Rafraîchir token
- `GET /api/auth/me` - Utilisateur actuel

### Cameras
- `GET /api/cameras` - Liste des caméras
- `POST /api/cameras` - Créer caméra
- `GET /api/cameras/{id}` - Détails caméra
- `POST /api/cameras/{id}/start` - Démarrer stream
- `POST /api/cameras/discover` - Découverte réseau

### Events
- `GET /api/events` - Liste événements (avec filtres)
- `GET /api/events/stats` - Statistiques
- `POST /api/events/{id}/acknowledge` - Acquitter
- `GET /api/events/{id}` - Détails événement

### Statistics
- `GET /api/stats/dashboard` - Stats dashboard
- `GET /api/stats/system` - Stats système (CPU, RAM, GPU)
- `GET /api/stats/performance` - Stats performance

### WebSocket
- `WS /ws` - Connexion temps réel

## 🔄 Migration depuis Flask

Ce backend remplace l'ancien backend Flask. Voir la documentation de migration:

- [01_FLASK_ANALYSIS_REPORT.md](Learning/01_FLASK_ANALYSIS_REPORT.md) - Analyse complète du backend Flask
- [02_FASTAPI_SETUP.md](Learning/02_FASTAPI_SETUP.md) - Structure FastAPI et guide de setup

**Améliorations principales**:
- ✅ Architecture async (2-5x plus rapide)
- ✅ Validation Pydantic automatique
- ✅ Documentation OpenAPI auto-générée
- ✅ WebSocket natif (plus performant)
- ✅ Type hints obligatoires
- ✅ Meilleure gestion des erreurs

## 🔧 Développement

### Linter & Formatage

```bash
# Formater avec black
black app/

# Linter avec ruff
ruff check app/

# Type checking avec mypy
mypy app/
```

### Ajouter une nouvelle route

1. Créer le schéma Pydantic dans `app/schemas/`
2. Créer la route dans `app/api/routes/`
3. Ajouter le router dans `app/main.py`
4. La documentation est générée automatiquement !

Exemple:
```python
from fastapi import APIRouter
from app.schemas.camera import CameraResponse

router = APIRouter()

@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(camera_id: str):
    # Votre logique ici
    return camera
```

## 🐳 Docker (à venir)

```bash
# Build
docker build -t sentinel-backend .

# Run
docker run -p 8000:8000 sentinel-backend
```

## 📝 Logs

Les logs sont configurés dans `app/core/config.py`:

```bash
LOG_LEVEL=INFO
LOG_FILE=../logs/sentinel_api.log
```

## 🤝 Contribuer

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Propriétaire - Sentinel IA

## 📞 Support

Pour toute question ou problème, consultez la documentation dans le dossier `Learning/`.

---

**Version**: 2.0.0
**Date**: 2025-01-12
**Status**: ✅ Structure complète créée, implémentation en cours
