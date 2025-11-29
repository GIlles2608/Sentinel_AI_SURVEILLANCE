"""Schémas Pydantic pour validation des requêtes/réponses"""
from app.schemas.auth import *
from app.schemas.camera import *
from app.schemas.event import *
from app.schemas.user import *

__all__ = [
    # Auth
    "Token",
    "TokenData",
    "LoginRequest",
    "LoginResponse",
    # User
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserInDB",
    "UserResponse",
    # Camera
    "CameraBase",
    "CameraCreate",
    "CameraUpdate",
    "CameraResponse",
    "CameraStatus",
    # Event
    "EventBase",
    "EventCreate",
    "EventResponse",
    "EventType",
    "EventSeverity",
]
