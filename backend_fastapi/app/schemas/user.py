"""
Schémas pour les utilisateurs
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime


class UserBase(BaseModel):
    """Base commune pour User"""
    username: str = Field(..., min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    role: Literal["admin", "operator", "viewer"] = "viewer"
    is_active: bool = True


class UserCreate(UserBase):
    """Création d'utilisateur"""
    password: str = Field(..., min_length=6, max_length=100)


class UserUpdate(BaseModel):
    """Mise à jour d'utilisateur (tous les champs optionnels)"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    role: Optional[Literal["admin", "operator", "viewer"]] = None
    is_active: Optional[bool] = None


class UserInDB(UserBase):
    """Utilisateur en base de données (avec hash)"""
    id: str
    hashed_password: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserResponse(UserBase):
    """Réponse utilisateur (sans password)"""
    id: str
    created_at: datetime
    permissions: List[str] = []

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": "1",
                    "username": "admin",
                    "email": "admin@sentinel.ai",
                    "role": "admin",
                    "is_active": True,
                    "created_at": "2025-01-12T10:00:00Z",
                    "permissions": ["read", "write", "delete"]
                }
            ]
        }
    }


class UserListResponse(BaseModel):
    """Liste d'utilisateurs avec pagination"""
    users: List[UserResponse]
    total: int
    page: int
    page_size: int
