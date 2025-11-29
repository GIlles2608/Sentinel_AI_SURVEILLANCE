# FLASK BACKEND ANALYSIS REPORT - SENTINEL IA v2.0

## EXECUTIVE SUMMARY

Sentinel IA est un système de surveillance vidéo intelligent avec détection d'objets par IA et détection d'anomalies. Le backend Flask sert d'interface web pour la surveillance, la gestion des caméras et le traitement des événements. Le système utilise une architecture v2.0 moderne avec ClickHouse pour les événements time-series, MinIO pour le stockage média, et SQLite pour l'authentification.

---

## STRUCTURE DU PROJET

```
G:\SDEN\Projets\SENTINEL IA\Code\Sentinel\
├── main.py                          # Point d'entrée principal
├── requirements.txt                  # Dépendances Python
├── config/
│   ├── cameras.yaml                 # Configuration caméras (RTSP, zones)
│   ├── detection_config.yaml        # Paramètres YOLO
│   └── logging_config.py            # Configuration logs
├── src/
│   ├── auth/                        # Système authentification
│   │   └── auth_manager.py          # Gestion utilisateurs (SQLite + Bcrypt)
│   ├── core/                        # Modules traitement core
│   │   ├── camera_manager.py        # Gestion multi-caméras
│   │   ├── detector.py              # Détection YOLO + Pose
│   │   └── processing/              # Orchestration thread pool
│   ├── database/                    # Couche base de données
│   │   ├── manager.py               # Manager unifié v2
│   │   ├── clickhouse.py            # Events time-series
│   │   └── minio_storage.py         # Stockage S3
│   ├── anomalies/                   # Détection anomalies
│   │   ├── intrusion_detector.py
│   │   ├── fall_detector.py
│   │   └── behavior_analyzer.py
│   └── web/                         # Application Flask
│       ├── app.py                   # App Flask (1637 lignes)
│       ├── templates/               # Templates Jinja2 (24 fichiers)
│       └── static/js/               # JavaScript
└── data/
    ├── users.db                     # SQLite utilisateurs
    └── sentinelle.db                # SQLite events (legacy)
```

---

## DÉPENDANCES PRINCIPALES

### Stack Actuel (Flask)
```python
# Web Framework
flask==3.0.0
flask-cors==4.0.0
flask-socketio==5.3.0
Flask-Login==0.6.3

# IA & Vision
ultralytics==8.3.0          # YOLOv8
opencv-python==4.10.0
torch==2.5.0

# Base de données
sqlalchemy==2.0.0           # ORM
clickhouse-driver==0.2.7    # ClickHouse
minio==7.2.5                # S3 storage

# Auth
bcrypt==4.1.2
PyJWT==2.8.0

# Config
pydantic==2.8.0
pydantic-settings==2.3.0
```

---

## API ENDPOINTS (85+ routes)

### Authentication
- `POST /login` - Connexion utilisateur
- `GET /logout` - Déconnexion

### Caméras
- `GET /api/cameras` - Liste caméras
- `POST /api/cameras/<id>/config` - Configuration
- `GET /video_feed/<id>` - Stream MJPEG
- `POST /api/cameras/discover` - Découverte réseau

### Événements
- `GET /api/events` - Events récents
- `POST /api/event/<id>/acknowledge` - Acquitter event
- `GET /api/export/events/csv` - Export CSV

### Statistiques
- `GET /api/stats` - Statistiques globales
- `GET /api/dashboard/stats` - Stats dashboard

### AI & Chat
- `POST /api/chat` - Chat avec assistant IA
- `GET /api/ai/synthesis` - Synthèse IA stream

### WebSocket (SocketIO)
- `connect` - Connexion client
- `new_event` - Broadcast événement
- `frame_update` - Update frame caméra

---

## POINTS CLÉS POUR MIGRATION FASTAPI

### 1. Architecture Async
**Flask (synchrone)** → **FastAPI (asynchrone)**

```python
# Avant (Flask)
@app.route('/api/events')
def get_events():
    events = db.get_events()
    return jsonify(events)

# Après (FastAPI)
@app.get("/api/events")
async def get_events():
    events = await db.get_events()
    return events  # Auto JSON
```

### 2. Validation avec Pydantic
```python
# FastAPI - Validation automatique
from pydantic import BaseModel

class CameraConfig(BaseModel):
    name: str
    url: str
    resolution: str | None = None

@app.put("/api/cameras/{id}")
async def update_camera(id: str, config: CameraConfig):
    # config déjà validé
    pass
```

### 3. Authentication JWT
**Flask-Login** → **FastAPI Security + JWT**

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    payload = jwt.decode(token.credentials, SECRET)
    return User(**payload)

@app.get("/api/cameras")
async def get_cameras(user: User = Depends(get_current_user)):
    pass
```

### 4. WebSocket Natif
**Flask-SocketIO** → **FastAPI WebSocket**

```python
from fastapi import WebSocket

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_json()
        await websocket.send_json(response)
```

### 5. Drivers Async
```python
# Remplacer
clickhouse-driver      → aioclickhouse
minio                  → aiobotocore
sqlalchemy (sync)      → sqlalchemy[asyncio] + asyncpg
```

---

## PLAN DE MIGRATION

### Phase 1: Setup (2 jours)
- [ ] Créer structure FastAPI
- [ ] Installer dépendances async
- [ ] Configuration Pydantic (déjà compatible)

### Phase 2: Modèles (3 jours)
- [ ] Créer schémas Pydantic request/response
- [ ] Migrer modèles SQLAlchemy vers async
- [ ] Définir tous les endpoints OpenAPI

### Phase 3: Auth (3 jours)
- [ ] Implémenter JWT
- [ ] Créer dependency `get_current_user`
- [ ] Remplacer Flask-Login

### Phase 4: API Core (7 jours)
- [ ] Routes caméras
- [ ] Routes événements
- [ ] Routes statistiques
- [ ] Routes AI/Chat

### Phase 5: WebSocket (4 jours)
- [ ] Remplacer SocketIO
- [ ] Connection manager pour broadcast
- [ ] Stream vidéo MJPEG

### Phase 6: Background Tasks (3 jours)
- [ ] Lifespan events
- [ ] Orchestrator async
- [ ] Graceful shutdown

### Phase 7: Tests (5 jours)
- [ ] Tests async (httpx)
- [ ] Tests WebSocket
- [ ] Load testing

**Total: ~30-35 jours (6-7 semaines)**

---

## GAINS ATTENDUS

### Performance
- **Throughput**: 2-5x amélioration
- **Latency**: -30-50% sur requêtes DB
- **Connexions**: 10x plus avec WebSockets natifs

### Développement
- **Documentation**: OpenAPI auto-générée
- **Validation**: Type-safe avec Pydantic
- **Debug**: Meilleurs messages d'erreur

---

## SÉCURITÉ

### Actuel (Flask)
✅ Bcrypt pour mots de passe
✅ SQLAlchemy ORM (anti-SQL injection)
✅ Jinja2 auto-escaping (anti-XSS)
⚠️ CORS wildcard `*` (à sécuriser)

### À Implémenter (FastAPI)
- [ ] JWT avec refresh tokens
- [ ] CORS origins spécifiques
- [ ] Rate limiting (slowapi)
- [ ] HTTPS obligatoire (nginx)

---

**Date**: 2025-11-12
**Analysé**: 40+ fichiers Python, 1637 lignes app.py
**Auteur**: Claude Code Agent
