"""
Modèle de session utilisateur pour tracking des connexions actives
"""
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models import Base
import uuid


class Session(Base):
    """
    Session utilisateur active

    Permet de tracker toutes les connexions actives et de gérer la révocation
    """
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Informations sur le token
    token_jti = Column(String, unique=True, nullable=False, index=True)  # JWT ID (unique identifier)
    access_token_hash = Column(String, nullable=False)  # Hash du token pour validation
    refresh_token_hash = Column(String, nullable=True)  # Hash du refresh token

    # Métadonnées de connexion
    user_agent = Column(String, nullable=True)  # Navigateur/client
    ip_address = Column(String, nullable=True)  # IP de connexion

    # Dates
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    last_activity = Column(DateTime, default=datetime.utcnow, nullable=False)

    # État
    is_active = Column(Boolean, default=True, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

    # Relation avec User
    user = relationship("User", back_populates="sessions")

    def to_dict(self):
        """Convertir en dictionnaire"""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "token_jti": self.token_jti,
            "user_agent": self.user_agent,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "is_active": self.is_active,
            "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
        }
