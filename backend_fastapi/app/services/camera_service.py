"""
Service pour la gestion des caméras
CRUD operations sur les cameras avec chiffrement des credentials
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
import uuid
from datetime import datetime

from app.models.camera import Camera
from app.schemas.camera import CameraCreate, CameraUpdate, CameraStatus
from app.core.security import encrypt_credential, decrypt_credential


async def get_camera_by_id(db: AsyncSession, camera_id: str) -> Optional[Camera]:
    """
    Récupérer une caméra par son ID

    Args:
        db: Session de base de données
        camera_id: ID de la caméra

    Returns:
        Camera ou None si non trouvée
    """
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    return result.scalar_one_or_none()


async def get_camera_by_name(db: AsyncSession, name: str) -> Optional[Camera]:
    """
    Récupérer une caméra par son nom

    Args:
        db: Session de base de données
        name: Nom de la caméra

    Returns:
        Camera ou None si non trouvée
    """
    result = await db.execute(select(Camera).where(Camera.name == name))
    return result.scalar_one_or_none()


async def get_cameras(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    enabled_only: bool = False
) -> List[Camera]:
    """
    Récupérer une liste de caméras avec pagination

    Args:
        db: Session de base de données
        skip: Nombre de caméras à sauter
        limit: Nombre maximum de caméras à retourner
        enabled_only: Ne retourner que les caméras activées

    Returns:
        Liste de caméras
    """
    query = select(Camera)

    if enabled_only:
        query = query.where(Camera.enabled == True)

    query = query.offset(skip).limit(limit).order_by(Camera.created_at.desc())

    result = await db.execute(query)
    return result.scalars().all()


async def get_cameras_count(db: AsyncSession, enabled_only: bool = False) -> int:
    """
    Compter le nombre total de caméras

    Args:
        db: Session de base de données
        enabled_only: Ne compter que les caméras activées

    Returns:
        Nombre de caméras
    """
    query = select(func.count(Camera.id))

    if enabled_only:
        query = query.where(Camera.enabled == True)

    result = await db.execute(query)
    return result.scalar_one()


async def create_camera(
    db: AsyncSession,
    camera_data: CameraCreate,
    username: Optional[str] = None,
    password: Optional[str] = None,
    camera_type: str = "generic"
) -> Camera:
    """
    Créer une nouvelle caméra

    Args:
        db: Session de base de données
        camera_data: Données de la caméra à créer
        username: Username pour connexion (optionnel, sera chiffré)
        password: Password pour connexion (optionnel, sera chiffré)
        camera_type: Type de caméra (imou, generic, etc.)

    Returns:
        Caméra créée
    """
    # Générer un ID unique
    camera_id = f"camera_{str(uuid.uuid4())[:8]}"

    # Chiffrer les credentials si fournis
    encrypted_username = encrypt_credential(username) if username else None
    encrypted_password = encrypt_credential(password) if password else None

    # Créer l'objet Camera
    camera = Camera(
        id=camera_id,
        name=camera_data.name,
        url=camera_data.url,
        encrypted_username=encrypted_username,
        encrypted_password=encrypted_password,
        camera_type=camera_type,
        location=camera_data.location,
        description=camera_data.description,
        enabled=camera_data.enabled,
        status=CameraStatus.INACTIVE,
        detection_zones=camera_data.detection_zones,
        detection_classes=camera_data.detection_classes,
        confidence_threshold=camera_data.confidence_threshold or 0.5,
        total_events=0,
        created_at=datetime.utcnow(),
    )

    db.add(camera)
    await db.commit()
    await db.refresh(camera)

    return camera


async def update_camera(
    db: AsyncSession,
    camera_id: str,
    camera_data: CameraUpdate,
    username: Optional[str] = None,
    password: Optional[str] = None
) -> Optional[Camera]:
    """
    Mettre à jour une caméra

    Args:
        db: Session de base de données
        camera_id: ID de la caméra
        camera_data: Nouvelles données de la caméra
        username: Nouveau username (optionnel, sera chiffré)
        password: Nouveau password (optionnel, sera chiffré)

    Returns:
        Caméra mise à jour ou None si non trouvée
    """
    camera = await get_camera_by_id(db, camera_id)
    if not camera:
        return None

    # Mettre à jour les champs fournis
    update_data = camera_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(camera, field, value)

    # Chiffrer et mettre à jour les credentials si fournis
    if username is not None:
        camera.encrypted_username = encrypt_credential(username) if username else None

    if password is not None:
        camera.encrypted_password = encrypt_credential(password) if password else None

    camera.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(camera)

    return camera


async def delete_camera(db: AsyncSession, camera_id: str) -> bool:
    """
    Supprimer une caméra

    Args:
        db: Session de base de données
        camera_id: ID de la caméra

    Returns:
        True si supprimée, False si non trouvée
    """
    camera = await get_camera_by_id(db, camera_id)
    if not camera:
        return False

    await db.delete(camera)
    await db.commit()

    return True


async def update_camera_status(
    db: AsyncSession,
    camera_id: str,
    status: CameraStatus,
    fps: Optional[float] = None,
    resolution: Optional[str] = None
) -> Optional[Camera]:
    """
    Mettre à jour le statut et les infos de stream d'une caméra

    Args:
        db: Session de base de données
        camera_id: ID de la caméra
        status: Nouveau statut
        fps: FPS du stream (optionnel)
        resolution: Résolution du stream (optionnel)

    Returns:
        Caméra mise à jour ou None si non trouvée
    """
    camera = await get_camera_by_id(db, camera_id)
    if not camera:
        return None

    camera.status = status
    camera.last_seen = datetime.utcnow()

    if fps is not None:
        camera.fps = fps

    if resolution is not None:
        camera.resolution = resolution

    if status == CameraStatus.ACTIVE:
        camera.last_frame_time = datetime.utcnow()

    await db.commit()
    await db.refresh(camera)

    return camera


async def increment_camera_events(db: AsyncSession, camera_id: str) -> Optional[Camera]:
    """
    Incrémenter le compteur d'événements d'une caméra

    Args:
        db: Session de base de données
        camera_id: ID de la caméra

    Returns:
        Caméra mise à jour ou None si non trouvée
    """
    camera = await get_camera_by_id(db, camera_id)
    if not camera:
        return None

    camera.total_events += 1
    await db.commit()
    await db.refresh(camera)

    return camera


def get_camera_credentials(camera: Camera) -> tuple[Optional[str], Optional[str]]:
    """
    Récupérer les credentials déchiffrés d'une caméra

    Args:
        camera: Objet Camera

    Returns:
        Tuple (username, password) déchiffrés
    """
    username = decrypt_credential(camera.encrypted_username) if camera.encrypted_username else None
    password = decrypt_credential(camera.encrypted_password) if camera.encrypted_password else None

    return username, password
