"""
Service pour la gestion des utilisateurs
CRUD operations sur les users
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import uuid

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password


async def get_user_by_id(db: AsyncSession, user_id: str) -> Optional[User]:
    """
    Récupérer un utilisateur par son ID

    Args:
        db: Session de base de données
        user_id: ID de l'utilisateur

    Returns:
        User ou None si non trouvé
    """
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    """
    Récupérer un utilisateur par son nom d'utilisateur

    Args:
        db: Session de base de données
        username: Nom d'utilisateur

    Returns:
        User ou None si non trouvé
    """
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """
    Récupérer un utilisateur par son email

    Args:
        db: Session de base de données
        email: Email

    Returns:
        User ou None si non trouvé
    """
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_users(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100
) -> List[User]:
    """
    Récupérer une liste d'utilisateurs avec pagination

    Args:
        db: Session de base de données
        skip: Nombre d'utilisateurs à sauter
        limit: Nombre maximum d'utilisateurs à retourner

    Returns:
        Liste d'utilisateurs
    """
    result = await db.execute(
        select(User)
        .offset(skip)
        .limit(limit)
        .order_by(User.created_at.desc())
    )
    return result.scalars().all()


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    """
    Créer un nouvel utilisateur

    Args:
        db: Session de base de données
        user_data: Données de l'utilisateur à créer

    Returns:
        Utilisateur créé
    """
    # Générer un ID unique
    user_id = str(uuid.uuid4())

    # Hasher le mot de passe
    hashed_password = get_password_hash(user_data.password)

    # Créer l'utilisateur
    db_user = User(
        id=user_id,
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        is_active=user_data.is_active,
    )

    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    return db_user


async def update_user(
    db: AsyncSession,
    user_id: str,
    user_data: UserUpdate
) -> Optional[User]:
    """
    Mettre à jour un utilisateur

    Args:
        db: Session de base de données
        user_id: ID de l'utilisateur
        user_data: Nouvelles données

    Returns:
        Utilisateur mis à jour ou None si non trouvé
    """
    # Récupérer l'utilisateur
    user = await get_user_by_id(db, user_id)
    if not user:
        return None

    # Mettre à jour les champs fournis
    update_data = user_data.model_dump(exclude_unset=True)

    # Hash le nouveau mot de passe si fourni
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    # Appliquer les mises à jour
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return user


async def delete_user(db: AsyncSession, user_id: str) -> bool:
    """
    Supprimer un utilisateur

    Args:
        db: Session de base de données
        user_id: ID de l'utilisateur

    Returns:
        True si supprimé, False si non trouvé
    """
    user = await get_user_by_id(db, user_id)
    if not user:
        return False

    await db.delete(user)
    await db.commit()

    return True


async def authenticate_user(
    db: AsyncSession,
    username: str,
    password: str
) -> Optional[User]:
    """
    Authentifier un utilisateur

    Args:
        db: Session de base de données
        username: Nom d'utilisateur
        password: Mot de passe en clair

    Returns:
        User si authentification réussie, None sinon
    """
    # Récupérer l'utilisateur
    user = await get_user_by_username(db, username)
    if not user:
        return None

    # Vérifier le mot de passe
    if not verify_password(password, user.hashed_password):
        return None

    # Vérifier si l'utilisateur est actif
    if not user.is_active:
        return None

    return user


async def create_default_admin(db: AsyncSession) -> User:
    """
    Créer l'utilisateur admin par défaut si il n'existe pas

    Args:
        db: Session de base de données

    Returns:
        User admin créé ou existant
    """
    # Vérifier si admin existe
    admin = await get_user_by_username(db, "admin")
    if admin:
        return admin

    # Créer l'admin
    admin_data = UserCreate(
        username="admin",
        email="admin@sentinel.ai",
        password="admin123",  # À changer en production !
        role="admin",
        is_active=True,
    )

    return await create_user(db, admin_data)
