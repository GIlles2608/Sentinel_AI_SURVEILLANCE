"""
Modèle User pour SQLAlchemy
Compatible avec la base SQLite existante (data/users.db)
"""
from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional

from app.models import Base


class User(Base):
    """
    Modèle utilisateur pour l'authentification

    Compatible avec le système Flask-Login existant
    """
    __tablename__ = "users"

    # Colonnes principales
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Rôle et permissions
    role: Mapped[str] = mapped_column(String(20), default="viewer", nullable=False)
    # Roles possibles: admin, operator, viewer

    # Statut
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, onupdate=datetime.utcnow, nullable=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relations
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username}, role={self.role})>"

    @property
    def permissions(self) -> list[str]:
        """
        Retourne les permissions basées sur le rôle
        """
        if self.role == "admin":
            return ["read", "write", "delete", "manage_users"]
        elif self.role == "operator":
            return ["read", "write"]
        else:  # viewer
            return ["read"]

    def to_dict(self) -> dict:
        """
        Convertir en dictionnaire (sans le password)
        """
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "permissions": self.permissions,
        }
