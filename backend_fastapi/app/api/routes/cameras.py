"""
Routes pour la gestion des caméras
"""
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from datetime import datetime

from app.schemas.camera import (
    CameraCreate,
    CameraUpdate,
    CameraResponse,
    CameraListResponse,
    CameraStatsResponse,
    CameraDiscoveryResult,
    CameraStatus,
)
from app.db.session import get_db
from app.services import camera_service
from app.api.dependencies import get_current_user
from app.models.user import User
from app.core.camera_stream_manager import camera_stream_manager

router = APIRouter()


@router.get("", response_model=List[CameraResponse])
async def get_cameras(
    skip: int = 0,
    limit: int = 100,
    enabled_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer la liste de toutes les caméras

    - **skip**: Nombre de caméras à sauter (pagination)
    - **limit**: Nombre maximum de caméras à retourner
    - **enabled_only**: Ne retourner que les caméras activées

    Returns la liste des caméras avec leurs statuts
    """
    cameras = await camera_service.get_cameras(
        db=db,
        skip=skip,
        limit=limit,
        enabled_only=enabled_only
    )

    return cameras


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer les détails d'une caméra

    - **camera_id**: Identifiant de la caméra
    """
    camera = await camera_service.get_camera_by_id(db, camera_id)

    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera {camera_id} not found"
        )

    return camera


@router.post("", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
async def create_camera(
    camera: CameraCreate,
    username: str = None,
    password: str = None,
    camera_type: str = "generic",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Créer une nouvelle caméra

    - **name**: Nom de la caméra
    - **url**: URL RTSP
    - **location**: Localisation (optionnel)
    - **detection_zones**: Zones de détection (optionnel)
    - **username**: Username pour connexion (optionnel, sera chiffré)
    - **password**: Password pour connexion (optionnel, sera chiffré)
    - **camera_type**: Type de caméra (imou, generic, etc.)

    Requires admin role
    """
    # Vérifier les permissions
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create cameras"
        )

    # Vérifier si une caméra avec le même nom existe déjà
    existing = await camera_service.get_camera_by_name(db, camera.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Camera with name '{camera.name}' already exists"
        )

    new_camera = await camera_service.create_camera(
        db=db,
        camera_data=camera,
        username=username,
        password=password,
        camera_type=camera_type
    )

    return new_camera


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: str,
    camera: CameraUpdate,
    username: str = None,
    password: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mettre à jour une caméra existante

    - **camera_id**: Identifiant de la caméra
    - **username**: Nouveau username (optionnel)
    - **password**: Nouveau password (optionnel)

    Requires admin or operator role
    """
    # Vérifier les permissions
    if current_user.role not in ["admin", "operator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and operators can update cameras"
        )

    updated_camera = await camera_service.update_camera(
        db=db,
        camera_id=camera_id,
        camera_data=camera,
        username=username,
        password=password
    )

    if not updated_camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera {camera_id} not found"
        )

    return updated_camera


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Supprimer une caméra

    - **camera_id**: Identifiant de la caméra

    Requires admin role
    """
    # Vérifier les permissions
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete cameras"
        )

    deleted = await camera_service.delete_camera(db, camera_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera {camera_id} not found"
        )

    return None


@router.post("/{camera_id}/start")
async def start_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Démarrer le streaming d'une caméra

    - **camera_id**: Identifiant de la caméra

    Requires admin or operator role
    """
    # Vérifier les permissions
    if current_user.role not in ["admin", "operator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and operators can start cameras"
        )

    camera = await camera_service.get_camera_by_id(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera {camera_id} not found"
        )

    # Démarrer le stream via le stream manager
    success = await camera_stream_manager.start_camera(
        db=db,
        camera_id=camera_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start camera {camera_id}"
        )

    # Récupérer la caméra mise à jour
    updated_camera = await camera_service.get_camera_by_id(db, camera_id)

    return {
        "message": f"Camera {camera_id} started successfully",
        "status": updated_camera.status,
        "camera": updated_camera
    }


@router.post("/{camera_id}/stop")
async def stop_camera(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Arrêter le streaming d'une caméra

    - **camera_id**: Identifiant de la caméra

    Requires admin or operator role
    """
    # Vérifier les permissions
    if current_user.role not in ["admin", "operator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and operators can stop cameras"
        )

    camera = await camera_service.get_camera_by_id(db, camera_id)
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera {camera_id} not found"
        )

    # Arrêter le stream via le stream manager
    success = await camera_stream_manager.stop_camera(
        db=db,
        camera_id=camera_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop camera {camera_id}"
        )

    # Récupérer la caméra mise à jour
    updated_camera = await camera_service.get_camera_by_id(db, camera_id)

    return {
        "message": f"Camera {camera_id} stopped successfully",
        "status": updated_camera.status,
        "camera": updated_camera
    }


@router.get("/{camera_id}/stats", response_model=CameraStatsResponse)
async def get_camera_stats(
    camera_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer les statistiques d'une caméra

    - **camera_id**: Identifiant de la caméra

    Returns statistiques détaillées (événements, uptime, etc.)
    """
    camera = await camera_service.get_camera_by_id(db, camera_id)

    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Camera {camera_id} not found"
        )

    # TODO: Calculer les vraies statistiques depuis ClickHouse
    # Pour l'instant, retourner des stats basiques
    return {
        "camera_id": camera_id,
        "total_events": camera.total_events,
        "events_today": 0,  # TODO: Query ClickHouse
        "events_last_7_days": 0,  # TODO: Query ClickHouse
        "avg_events_per_day": 0.0,  # TODO: Calculate
        "most_detected_class": None,  # TODO: Query ClickHouse
        "uptime_percentage": 95.0 if camera.status == "active" else 0.0,
    }


@router.post("/discover", response_model=List[CameraDiscoveryResult])
async def discover_cameras(
    current_user: User = Depends(get_current_user)
):
    """
    Découvrir automatiquement les caméras sur le réseau

    Scan le réseau local pour trouver des caméras IP compatibles

    Returns liste des caméras découvertes avec leurs URLs RTSP

    Requires admin role
    """
    # Vérifier les permissions
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can discover cameras"
        )

    # TODO: Implémenter la découverte réseau (ONVIF, mDNS)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Camera discovery not yet implemented"
    )
