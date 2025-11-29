"""
Point d'entrée principal de l'API FastAPI
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.core.config import settings
from app.api.routes import auth, cameras, events, stats, websocket, sessions
from app.db.session import init_db, close_db, get_db
from app.db.clickhouse import clickhouse_client
from app.db.minio_storage import minio_storage
from app.services.user_service import create_default_admin
from app.core.init_cameras import init_cameras_from_config, autostart_enabled_cameras


# Lifespan context manager pour gérer le startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gère les événements de démarrage et d'arrêt de l'application
    """
    # Startup
    print("Starting Sentinel IA Backend v2.0...")

    # Initialiser la base de données SQLite
    print("Initializing databases...")
    await init_db()

    # Créer l'utilisateur admin par défaut et charger les caméras
    async for db in get_db():
        await create_default_admin(db)
        # Charger les caméras depuis cameras.yaml
        await init_cameras_from_config(db)
        # Démarrer automatiquement les caméras activées
        await autostart_enabled_cameras(db)
        break  # Une seule itération pour obtenir la session

    # Connecter ClickHouse (events) - Désactivé temporairement
    # await clickhouse_client.connect()

    # Connecter MinIO (media storage) - Désactivé temporairement
    # await minio_storage.connect()

    # TODO: Démarrage du processing orchestrator
    # TODO: Chargement des modèles YOLO

    print("All services initialized successfully")

    yield

    # Shutdown
    print("Shutting down Sentinel IA Backend...")

    # Fermer connexions DB
    await close_db()
    # await clickhouse_client.disconnect()
    # await minio_storage.disconnect()

    # TODO: Arrêter les threads de traitement
    # TODO: Libérer ressources GPU

    print("Shutdown complete")


# Créer l'application FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API pour Sentinel IA - Système de surveillance intelligent avec IA",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Monter les fichiers statiques
# app.mount("/static", StaticFiles(directory="static"), name="static")

# Inclure les routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(sessions.router, prefix="/api", tags=["Sessions"])
app.include_router(cameras.router, prefix="/api/cameras", tags=["Cameras"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistics"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "name": settings.PROJECT_NAME,
        "version": "2.0.0",
        "status": "running",
        "docs": "/api/docs",
    }


@app.get("/api/health")
async def health_check():
    """
    Endpoint de santé pour vérifier l'état du système
    """
    # TODO: Vérifier connexions DB, GPU, etc.
    return {
        "status": "healthy",
        "database": "connected",  # TODO: vérifier réellement
        "gpu": "available",       # TODO: vérifier réellement
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
