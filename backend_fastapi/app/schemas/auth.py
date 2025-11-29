"""
Schémas pour l'authentification
"""
from pydantic import BaseModel, Field
from typing import Optional


class Token(BaseModel):
    """Token JWT"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Données décodées du token"""
    username: Optional[str] = None
    user_id: Optional[str] = None


class LoginRequest(BaseModel):
    """Requête de connexion"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    remember_me: bool = False

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "username": "admin",
                    "password": "admin123",
                    "remember_me": False
                }
            ]
        }
    }


class LoginResponse(BaseModel):
    """Réponse de connexion"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: dict  # UserResponse

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "bearer",
                    "user": {
                        "id": "1",
                        "username": "admin",
                        "email": "admin@sentinel.ai",
                        "role": "admin"
                    }
                }
            ]
        }
    }


class RefreshTokenRequest(BaseModel):
    """Requête de rafraîchissement de token"""
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    """Requête de changement de mot de passe"""
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)
