"""
Schémas pour les événements
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class EventType(str, Enum):
    """Types d'événements"""
    PERSON = "person"
    VEHICLE = "vehicle"
    ANIMAL = "animal"
    INTRUSION = "intrusion"
    FALL = "fall"
    LOITERING = "loitering"
    CROWD = "crowd"
    OBJECT = "object"
    UNKNOWN = "unknown"


class EventSeverity(str, Enum):
    """Niveaux de sévérité"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EventBase(BaseModel):
    """Base commune pour Event"""
    camera_id: str
    event_type: EventType
    severity: EventSeverity = EventSeverity.MEDIUM
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class EventCreate(EventBase):
    """Création d'événement"""
    detections: Optional[List[Dict[str, Any]]] = None
    frame_url: Optional[str] = None
    video_url: Optional[str] = None


class EventUpdate(BaseModel):
    """Mise à jour d'événement"""
    acknowledged: Optional[bool] = None
    acknowledged_by: Optional[str] = None
    notes: Optional[str] = None


class EventResponse(EventBase):
    """Réponse événement"""
    id: str
    timestamp: datetime
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    notes: Optional[str] = None
    detections: Optional[List[Dict[str, Any]]] = None
    frame_url: Optional[str] = None
    video_url: Optional[str] = None

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": "evt_20250112_100523_camera1",
                    "camera_id": "camera_1",
                    "event_type": "intrusion",
                    "severity": "high",
                    "description": "Intrusion détectée - Zone restreinte",
                    "timestamp": "2025-01-12T10:05:23Z",
                    "acknowledged": False,
                    "detections": [
                        {
                            "class": "person",
                            "confidence": 0.94,
                            "bbox": [120, 340, 280, 580]
                        }
                    ],
                    "frame_url": "/media/frames/evt_20250112_100523_camera1.jpg"
                }
            ]
        }
    }


class EventListResponse(BaseModel):
    """Liste d'événements avec pagination"""
    events: List[EventResponse]
    total: int
    page: int
    page_size: int


class EventFilters(BaseModel):
    """Filtres pour la recherche d'événements"""
    camera_id: Optional[str] = None
    event_type: Optional[EventType] = None
    severity: Optional[EventSeverity] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    acknowledged: Optional[bool] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)


class EventStatsResponse(BaseModel):
    """Statistiques des événements"""
    total_events: int
    events_today: int
    events_last_7_days: int
    events_by_type: Dict[str, int]
    events_by_severity: Dict[str, int]
    events_by_camera: Dict[str, int]
    unacknowledged_count: int
    high_severity_count: int
