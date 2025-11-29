"""
Configuration globale de l'application avec Pydantic Settings
Compatible avec la configuration existante de Sentinel IA
"""
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os


class Settings(BaseSettings):
    """
    Configuration principale de l'application
    Les variables peuvent être surchargées par .env ou variables d'environnement
    """

    # API Configuration
    PROJECT_NAME: str = "Sentinel IA API v2.0"
    VERSION: str = "2.0.0"
    HOST: str = Field(default="0.0.0.0", description="Host de l'API")
    PORT: int = Field(default=8000, description="Port de l'API")
    DEBUG: bool = Field(default=True, description="Mode debug")

    # CORS
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000"],
        description="Origins autorisées pour CORS"
    )

    # Security
    SECRET_KEY: str = Field(
        default="sentinel-secret-key-change-in-production",
        description="Clé secrète pour JWT"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 heures
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7 jours

    # Database - SQLite (Auth)
    SQLITE_DB_PATH: str = Field(
        default="../data/users.db",
        description="Chemin vers la base SQLite utilisateurs"
    )

    # Database - ClickHouse (Events)
    CLICKHOUSE_HOST: str = Field(default="localhost", description="Host ClickHouse")
    CLICKHOUSE_PORT: int = Field(default=9000, description="Port ClickHouse")
    CLICKHOUSE_USER: str = Field(default="default", description="User ClickHouse")
    CLICKHOUSE_PASSWORD: str = Field(default="", description="Password ClickHouse")
    CLICKHOUSE_DATABASE: str = Field(default="sentinel", description="Database ClickHouse")

    # Storage - MinIO
    MINIO_ENDPOINT: str = Field(default="localhost:9000", description="Endpoint MinIO")
    MINIO_ACCESS_KEY: str = Field(default="minioadmin", description="Access key MinIO")
    MINIO_SECRET_KEY: str = Field(default="minioadmin", description="Secret key MinIO")
    MINIO_BUCKET: str = Field(default="sentinel-media", description="Bucket MinIO")
    MINIO_SECURE: bool = Field(default=False, description="Utiliser HTTPS pour MinIO")

    # AI Models
    YOLO_MODEL_PATH: str = Field(
        default="../models/yolov8n.pt",
        description="Chemin vers le modèle YOLO"
    )
    POSE_MODEL_PATH: str = Field(
        default="../models/yolov8n-pose.pt",
        description="Chemin vers le modèle Pose"
    )
    CONFIDENCE_THRESHOLD: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Seuil de confiance pour détections"
    )

    # Camera Configuration
    CAMERA_CONFIG_PATH: str = Field(
        default="../config/cameras.yaml",
        description="Chemin vers la config caméras"
    )
    DETECTION_CONFIG_PATH: str = Field(
        default="../config/detection_config.yaml",
        description="Chemin vers la config détection"
    )

    # Processing
    MAX_WORKERS: int = Field(
        default=4,
        ge=1,
        description="Nombre de workers pour le traitement"
    )
    FRAME_QUEUE_SIZE: int = Field(
        default=30,
        ge=1,
        description="Taille de la queue de frames"
    )
    ENABLE_GPU: bool = Field(
        default=True,
        description="Activer l'accélération GPU"
    )

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = Field(
        default=30,
        description="Intervalle heartbeat WebSocket (secondes)"
    )
    WS_MAX_CONNECTIONS: int = Field(
        default=100,
        description="Nombre max de connexions WebSocket"
    )

    # Logging
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Niveau de log (DEBUG, INFO, WARNING, ERROR)"
    )
    LOG_FILE: str = Field(
        default="../logs/sentinel_api.log",
        description="Fichier de log"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def get_database_url(self) -> str:
        """Retourne l'URL de connexion SQLite pour SQLAlchemy"""
        return f"sqlite+aiosqlite:///{self.SQLITE_DB_PATH}"

    def get_clickhouse_url(self) -> str:
        """Retourne l'URL de connexion ClickHouse"""
        auth = f"{self.CLICKHOUSE_USER}:{self.CLICKHOUSE_PASSWORD}@" if self.CLICKHOUSE_PASSWORD else ""
        return f"clickhouse://{auth}{self.CLICKHOUSE_HOST}:{self.CLICKHOUSE_PORT}/{self.CLICKHOUSE_DATABASE}"


# Instance globale des settings
settings = Settings()


# Créer les dossiers nécessaires au démarrage
def ensure_directories():
    """Crée les dossiers nécessaires s'ils n'existent pas"""
    directories = [
        os.path.dirname(settings.SQLITE_DB_PATH),
        os.path.dirname(settings.LOG_FILE),
        "../models",
        "../data/media",
    ]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)


# Exécuter au chargement du module
ensure_directories()
