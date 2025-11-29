"""
Modèles de base de données SQLAlchemy
"""
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase


class Base(AsyncAttrs, DeclarativeBase):
    """
    Base pour tous les modèles SQLAlchemy
    AsyncAttrs permet d'utiliser await sur les relations lazy-loaded
    """
    pass


# Import des modèles pour que Base les connaisse
from app.models.user import User
from app.models.camera import Camera
from app.models.session import Session

__all__ = ["Base", "User", "Camera", "Session"]
