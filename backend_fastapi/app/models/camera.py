"""
Modèle Camera pour SQLAlchemy
Stockage persistant des caméras avec credentials chiffrés
"""
from sqlalchemy import String, Boolean, DateTime, Float, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Optional, Dict, Any, List

from app.models import Base


class Camera(Base):
    """
    Modèle caméra pour la surveillance

    Stocke les informations de connexion, configuration et état
    Les credentials sont chiffrés avant stockage
    """
    __tablename__ = "cameras"

    # Colonnes principales
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Connexion (URL RTSP ou informations de connexion)
    url: Mapped[str] = mapped_column(String(500), nullable=False)

    # Credentials chiffrés (pour Imou et autres caméras)
    encrypted_username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    encrypted_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Type et fabricant
    camera_type: Mapped[str] = mapped_column(String(50), default="generic", nullable=False)
    # Types possibles: imou, generic, hikvision, dahua, etc.
    manufacturer: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Localisation et description
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Configuration
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # État de la caméra
    status: Mapped[str] = mapped_column(String(20), default="inactive", nullable=False)
    # Statuts possibles: active, inactive, error, connecting

    # Informations de stream
    fps: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # ex: "1920x1080"
    last_frame_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Configuration de détection (stocké en JSON)
    detection_zones: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    detection_classes: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    confidence_threshold: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)

    # Statistiques
    total_events: Mapped[int] = mapped_column(default=0, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, onupdate=datetime.utcnow, nullable=True)
    last_seen: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<Camera(id={self.id}, name={self.name}, type={self.camera_type}, status={self.status})>"

    def to_dict(self) -> dict:
        """
        Convertir en dictionnaire (sans les credentials chiffrés)
        """
        return {
            "id": self.id,
            "name": self.name,
            "url": self.url,
            "camera_type": self.camera_type,
            "manufacturer": self.manufacturer,
            "model": self.model,
            "location": self.location,
            "description": self.description,
            "enabled": self.enabled,
            "status": self.status,
            "fps": self.fps,
            "resolution": self.resolution,
            "last_frame_time": self.last_frame_time.isoformat() if self.last_frame_time else None,
            "detection_zones": self.detection_zones,
            "detection_classes": self.detection_classes,
            "confidence_threshold": self.confidence_threshold,
            "total_events": self.total_events,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
        }
