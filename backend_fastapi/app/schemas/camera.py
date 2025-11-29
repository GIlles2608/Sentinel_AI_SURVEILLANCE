"""
Schémas pour les caméras
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class CameraStatus(str, Enum):
    """Statut d'une caméra"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    CONNECTING = "connecting"


class CameraBase(BaseModel):
    """Base commune pour Camera"""
    name: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., description="URL RTSP de la caméra")
    location: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    enabled: bool = True


class CameraCreate(CameraBase):
    """Création de caméra"""
    detection_zones: Optional[List[Dict[str, Any]]] = None
    detection_classes: Optional[List[str]] = None
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


class CameraUpdate(BaseModel):
    """Mise à jour de caméra (tous les champs optionnels)"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    url: Optional[str] = None
    location: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    enabled: Optional[bool] = None
    detection_zones: Optional[List[Dict[str, Any]]] = None
    detection_classes: Optional[List[str]] = None
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


class CameraResponse(CameraBase):
    """Réponse caméra"""
    id: str
    status: CameraStatus
    fps: Optional[float] = None
    resolution: Optional[str] = None
    last_frame_time: Optional[datetime] = None
    total_events: int = 0
    detection_zones: Optional[List[Dict[str, Any]]] = None
    detection_classes: Optional[List[str]] = None
    confidence_threshold: float = 0.5
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": "camera_1",
                    "name": "Entrée Principale",
                    "url": "rtsp://192.168.1.100:554/stream",
                    "location": "Entrée principale du bâtiment",
                    "description": "Caméra surveillant l'entrée",
                    "enabled": True,
                    "status": "active",
                    "fps": 25.0,
                    "resolution": "1920x1080",
                    "total_events": 142,
                    "confidence_threshold": 0.5,
                    "created_at": "2025-01-12T10:00:00Z"
                }
            ]
        }
    }


class CameraListResponse(BaseModel):
    """Liste de caméras"""
    cameras: List[CameraResponse]
    total: int


class CameraStatsResponse(BaseModel):
    """Statistiques d'une caméra"""
    camera_id: str
    total_events: int
    events_today: int
    events_last_7_days: int
    avg_events_per_day: float
    most_detected_class: Optional[str] = None
    uptime_percentage: float


class CameraDiscoveryResult(BaseModel):
    """Résultat de découverte de caméra"""
    ip: str
    port: int
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    rtsp_urls: List[str] = []
    accessible: bool
