# FASTAPI SETUP - SENTINEL IA v2.0

## RÉSUMÉ

Ce document décrit la structure initiale du backend FastAPI créé pour remplacer Flask. Le projet suit les meilleures pratiques FastAPI avec architecture modulaire, validation Pydantic, et support async complet.

---

## STRUCTURE DU PROJET

```
backend_fastapi/
├── app/
│   ├── __init__.py
│   ├── main.py                    # Point d'entrée FastAPI
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py              # Configuration Pydantic Settings
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/                # Tous les endpoints
│   │   │   ├── __init__.py
│   │   │   ├── auth.py            # Authentication JWT
│   │   │   ├── cameras.py         # Gestion caméras
│   │   │   ├── events.py          # Gestion événements
│   │   │   ├── stats.py           # Statistiques
│   │   │   └── websocket.py       # WebSocket natif
│   │   └── dependencies/          # Dependencies réutilisables
│   ├── schemas/                   # Schémas Pydantic (validation)
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── camera.py
│   │   └── event.py
│   ├── models/                    # Modèles SQLAlchemy (DB)
│   ├── services/                  # Logique métier
│   └── db/                        # Database connections
├── config/                        # Config YAML (réutilisées)
├── tests/                         # Tests pytest
├── requirements.txt
├── .env.example
└── Learning/                      # Documentation migration
    ├── 01_FLASK_ANALYSIS_REPORT.md
    └── 02_FASTAPI_SETUP.md
```

---

## FICHIERS CRÉÉS

### 1. `app/main.py` - Application principale

**Rôle**: Point d'entrée FastAPI avec lifespan management, CORS, et routing

**Caractéristiques**:
- ✅ Lifespan context manager (@asynccontextmanager)
- ✅ Configuration CORS pour frontend React
- ✅ OpenAPI docs auto-générées (/api/docs)
- ✅ Health check endpoint (/)
- ✅ Tous les routers inclus

**Usage**:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. `app/core/config.py` - Configuration globale

**Rôle**: Centralisation de toute la configuration avec Pydantic Settings

**Variables configurées**:
- **API**: HOST, PORT, DEBUG, CORS origins
- **Security**: SECRET_KEY, JWT algorithm, token expiry
- **Databases**: SQLite (auth), ClickHouse (events), MinIO (media)
- **AI Models**: Chemins YOLO, seuils de confiance
- **Processing**: Workers, queue sizes, GPU
- **WebSocket**: Heartbeat, max connections
- **Logging**: Niveau, fichier de log

**Avantages**:
- Variables d'environnement `.env` supportées
- Validation automatique des types
- Valeurs par défaut sensées
- Méthodes helper pour URLs de connexion

### 3. `app/schemas/` - Validation Pydantic

**Schémas créés**:

#### `auth.py`
- `LoginRequest`: Credentials + remember_me
- `LoginResponse`: Token JWT + user info
- `RefreshTokenRequest`: Pour rafraîchir token
- `ChangePasswordRequest`: Changement mot de passe

#### `user.py`
- `UserBase`: Champs communs
- `UserCreate`: Création utilisateur
- `UserUpdate`: Mise à jour (champs optionnels)
- `UserResponse`: Réponse API (sans password)
- `UserListResponse`: Liste paginée

#### `camera.py`
- `CameraStatus`: Enum (active, inactive, error, connecting)
- `CameraBase`: Champs communs (name, url, location)
- `CameraCreate`: Création caméra
- `CameraUpdate`: Mise à jour
- `CameraResponse`: Réponse API complète
- `CameraStatsResponse`: Statistiques caméra
- `CameraDiscoveryResult`: Découverte réseau

#### `event.py`
- `EventType`: Enum (person, vehicle, intrusion, fall, etc.)
- `EventSeverity`: Enum (low, medium, high, critical)
- `EventBase`: Champs communs
- `EventCreate`: Création événement
- `EventUpdate`: Mise à jour (acknowledged, notes)
- `EventResponse`: Réponse API complète
- `EventFilters`: Filtres de recherche
- `EventStatsResponse`: Statistiques globales

**Exemple de validation**:
```python
from app.schemas.auth import LoginRequest

# Valide automatiquement
request = LoginRequest(
    username="admin",
    password="secret123",
    remember_me=True
)

# Échoue avec ValidationError
request = LoginRequest(username="ad", password="12")  # Trop court
```

### 4. `app/api/routes/` - Endpoints

Tous les routers ont été créés avec stubs (HTTP 501 Not Implemented):

#### `auth.py` (5 endpoints)
- `POST /api/auth/login` - Connexion JWT
- `POST /api/auth/refresh` - Rafraîchir token
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - User actuel
- `POST /api/auth/verify` - Vérifier token

#### `cameras.py` (9 endpoints)
- `GET /api/cameras` - Liste caméras
- `GET /api/cameras/{id}` - Détails caméra
- `POST /api/cameras` - Créer caméra
- `PUT /api/cameras/{id}` - Modifier caméra
- `DELETE /api/cameras/{id}` - Supprimer caméra
- `POST /api/cameras/{id}/start` - Démarrer stream
- `POST /api/cameras/{id}/stop` - Arrêter stream
- `GET /api/cameras/{id}/stats` - Stats caméra
- `POST /api/cameras/discover` - Découverte réseau

#### `events.py` (7 endpoints)
- `GET /api/events` - Liste événements (filtres + pagination)
- `GET /api/events/stats` - Stats événements
- `GET /api/events/{id}` - Détails événement
- `POST /api/events` - Créer événement
- `PATCH /api/events/{id}` - Modifier événement
- `POST /api/events/{id}/acknowledge` - Acquitter
- `DELETE /api/events/{id}` - Supprimer

#### `stats.py` (3 endpoints)
- `GET /api/stats/dashboard` - Stats dashboard
- `GET /api/stats/system` - Stats système (CPU, RAM, GPU)
- `GET /api/stats/performance` - Stats performance (FPS, latence)

#### `websocket.py` (1 endpoint + utilities)
- `WS /ws` - WebSocket principal
- `ConnectionManager` - Gestion connexions multiples
- Fonctions broadcast: `broadcast_new_event()`, `broadcast_frame_update()`, etc.

**Messages WebSocket supportés**:
```json
// Client → Server
{
  "type": "ping",
  "timestamp": 1234567890
}

{
  "type": "subscribe",
  "channels": ["camera_1", "events"]
}

// Server → Client
{
  "type": "new_event",
  "data": { "id": "evt_123", ... }
}

{
  "type": "frame_update",
  "camera_id": "camera_1",
  "data": "base64..."
}
```

### 5. `requirements.txt` - Dépendances

**Stack FastAPI**:
- `fastapi==0.115.0` - Framework web
- `uvicorn[standard]==0.32.0` - Serveur ASGI
- `pydantic[email]==2.10.0` - Validation
- `pydantic-settings==2.6.0` - Configuration

**Auth & Security**:
- `python-jose[cryptography]==3.3.0` - JWT
- `passlib[bcrypt]==1.7.4` - Hash passwords
- `bcrypt==4.2.0`

**Database Async**:
- `sqlalchemy[asyncio]==2.0.36` - ORM async
- `aiosqlite==0.20.0` - SQLite async
- `asyncpg==0.30.0` - PostgreSQL async
- `aioclickhouse==0.2.2` - ClickHouse async

**Storage**:
- `aiobotocore==2.15.0` - S3/MinIO async
- `aiofiles==24.1.0` - Fichiers async

**AI & Vision** (réutilisés):
- `ultralytics==8.3.0` - YOLOv8
- `opencv-python==4.10.0.84`
- `torch==2.5.0`

**WebSocket**:
- `websockets==13.1` - WebSocket natif
- `python-socketio==5.11.4` - Compatibilité

**Testing & Quality**:
- `pytest==8.3.0`
- `pytest-asyncio==0.24.0`
- `mypy==1.11.0`
- `ruff==0.6.9`

### 6. `.env.example` - Template configuration

Fichier exemple avec toutes les variables d'environnement:
```bash
# API
PORT=8000
DEBUG=True

# Security - CHANGER EN PRODUCTION
SECRET_KEY=your-secret-key-change-this

# Databases
CLICKHOUSE_HOST=localhost
MINIO_ENDPOINT=localhost:9000

# AI
YOLO_MODEL_PATH=../models/yolov8n.pt
CONFIDENCE_THRESHOLD=0.5
```

**Usage**:
```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

---

## DIFFÉRENCES FLASK → FASTAPI

### Architecture

| Aspect | Flask (actuel) | FastAPI (nouveau) |
|--------|---------------|-------------------|
| **Paradigme** | Synchrone (WSGI) | Asynchrone (ASGI) |
| **Validation** | Manuelle | Automatique (Pydantic) |
| **Documentation** | Manuelle | Auto-générée (OpenAPI) |
| **WebSocket** | Flask-SocketIO | Natif WebSocket |
| **Type hints** | Optionnel | Requis |
| **Performance** | Baseline | 2-5x plus rapide |

### Exemple de route

**Flask (avant)**:
```python
@app.route('/api/events', methods=['GET'])
@login_required
def get_events():
    camera_id = request.args.get('camera_id')
    events = db.query_events(camera_id)
    return jsonify(events)
```

**FastAPI (après)**:
```python
@router.get("/events", response_model=EventListResponse)
async def get_events(
    camera_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    events = await db.query_events(camera_id)
    return events  # Auto-converti en JSON
```

**Avantages FastAPI**:
- ✅ Async/await natif
- ✅ Validation automatique des paramètres
- ✅ Type hints requis
- ✅ Documentation auto-générée
- ✅ Conversion JSON automatique
- ✅ Dependency injection native

### WebSocket

**Flask-SocketIO (avant)**:
```python
from flask_socketio import SocketIO, emit

socketio = SocketIO(app)

@socketio.on('connect')
def handle_connect():
    emit('connected', {'message': 'Welcome'})

@socketio.on('subscribe')
def handle_subscribe(data):
    # ...
```

**FastAPI (après)**:
```python
from fastapi import WebSocket

@router.websocket("")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    await websocket.send_json({'type': 'connected'})

    while True:
        data = await websocket.receive_json()
        # Traiter le message
```

**Avantages**:
- ✅ WebSocket natif (pas de surcouche)
- ✅ Async natif
- ✅ Plus performant
- ✅ Plus simple

---

## INSTALLATION & DÉMARRAGE

### 1. Installation des dépendances

```bash
cd backend_fastapi
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configuration

```bash
cp .env.example .env
# Éditer .env avec vos valeurs
```

### 3. Démarrage

**Mode développement**:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Mode production**:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4. Accès

- **API**: http://localhost:8000
- **Documentation interactive**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc
- **OpenAPI JSON**: http://localhost:8000/api/openapi.json

---

## PROCHAINES ÉTAPES

### Phase suivante: Database Layer

1. **Créer les modèles SQLAlchemy async**:
   - `app/models/user.py` - Modèle User
   - `app/models/__init__.py` - Base declarative

2. **Créer les connexions DB**:
   - `app/db/session.py` - Session SQLite async
   - `app/db/clickhouse.py` - Client ClickHouse async
   - `app/db/minio.py` - Client MinIO async

3. **Créer les repositories**:
   - `app/services/user_service.py` - CRUD users
   - `app/services/camera_service.py` - CRUD cameras
   - `app/services/event_service.py` - CRUD events

### Phase Authentication

4. **Implémenter JWT auth**:
   - `app/core/security.py` - Hash, verify, create token
   - `app/api/dependencies/auth.py` - Dependency get_current_user
   - Implémenter les routes auth

5. **Migrer les utilisateurs**:
   - Script de migration depuis SQLite existant

### Phase API Implementation

6. **Implémenter les routes cameras**:
   - Intégrer avec CameraManager existant
   - Adapter pour async

7. **Implémenter les routes events**:
   - Intégrer avec ClickHouse
   - Pagination, filtres

8. **Implémenter WebSocket broadcast**:
   - Connecter avec ProcessingOrchestrator
   - Broadcast événements temps réel

---

## TESTS

### Structure de tests

```
tests/
├── __init__.py
├── conftest.py              # Fixtures pytest
├── test_api/
│   ├── test_auth.py
│   ├── test_cameras.py
│   ├── test_events.py
│   └── test_websocket.py
└── test_services/
    └── test_user_service.py
```

### Exemple de test

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_login():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            json={"username": "admin", "password": "admin123"}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()
```

### Lancer les tests

```bash
pytest tests/ -v
pytest tests/ --cov=app --cov-report=html
```

---

## COMPATIBILITÉ AVEC L'EXISTANT

### Réutilisation des modules

Les modules core existants peuvent être réutilisés:

✅ **Réutilisables directement**:
- `src/core/detector.py` - Détection YOLO
- `src/anomalies/` - Détecteurs d'anomalies
- `config/cameras.yaml` - Configuration caméras
- `config/detection_config.yaml` - Config détection

⚠️ **À adapter pour async**:
- `src/core/camera_manager.py` - Ajouter méthodes async
- `src/database/manager.py` - Remplacer par drivers async
- `src/core/processing/orchestrator.py` - Adapter pour FastAPI lifespan

❌ **À remplacer**:
- `src/auth/auth_manager.py` - Remplacé par JWT
- `src/web/app.py` - Remplacé par FastAPI

---

## DOCUMENTATION AUTOMATIQUE

FastAPI génère automatiquement:

### Swagger UI (/api/docs)
Interface interactive pour tester l'API:
- Tous les endpoints listés
- Formulaires de test
- Schémas de requête/réponse
- Essayer directement depuis le navigateur

### ReDoc (/api/redoc)
Documentation élégante et complète:
- Vue d'ensemble de l'API
- Tous les modèles Pydantic
- Descriptions détaillées
- Exemples de requêtes

### OpenAPI JSON (/api/openapi.json)
Spécification complète au format OpenAPI 3.1:
- Importable dans Postman
- Générateur de clients (TypeScript, Python, etc.)
- Validation automatique

**Exemple de génération client TypeScript**:
```bash
npx openapi-typescript http://localhost:8000/api/openapi.json \
  --output frontend/src/api/schema.ts
```

---

## RÉSUMÉ DES FICHIERS CRÉÉS

| Fichier | Lignes | Description |
|---------|--------|-------------|
| `app/main.py` | 95 | Application FastAPI principale |
| `app/core/config.py` | 174 | Configuration Pydantic Settings |
| `requirements.txt` | 65 | Dépendances Python |
| `app/schemas/auth.py` | 70 | Schémas authentication |
| `app/schemas/user.py` | 75 | Schémas utilisateurs |
| `app/schemas/camera.py` | 115 | Schémas caméras |
| `app/schemas/event.py` | 130 | Schémas événements |
| `app/api/routes/auth.py` | 90 | Routes authentication |
| `app/api/routes/cameras.py` | 150 | Routes caméras |
| `app/api/routes/events.py` | 140 | Routes événements |
| `app/api/routes/stats.py` | 60 | Routes statistiques |
| `app/api/routes/websocket.py` | 180 | WebSocket natif |
| `.env.example` | 50 | Template configuration |
| **TOTAL** | **~1400 lignes** | **Structure complète** |

---

**Status**: ✅ Structure FastAPI complète créée
**Prochaine étape**: Implémenter la couche database async
**Date**: 2025-01-12
**Auteur**: Claude Code Agent
