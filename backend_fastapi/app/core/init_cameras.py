"""
Initialisation des caméras depuis la configuration YAML
"""
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.camera_config import get_enabled_cameras_config
from app.services import camera_service
from app.core.camera_stream_manager import camera_stream_manager


async def init_cameras_from_config(db: AsyncSession) -> int:
    """
    Initialise les caméras depuis le fichier cameras.yaml

    Args:
        db: Session de base de données

    Returns:
        Nombre de caméras créées
    """
    logger.info("Initializing cameras from config...")

    # Charger la configuration
    camera_configs = get_enabled_cameras_config()

    if not camera_configs:
        logger.warning("No cameras found in config")
        return 0

    created_count = 0

    for camera_config in camera_configs:
        # Vérifier si la caméra existe déjà
        existing = await camera_service.get_camera_by_id(db, camera_config.id)

        if existing:
            # Vérifier si les credentials peuvent être déchiffrés
            username, password = camera_service.get_camera_credentials(existing)
            # Si username ou password sont vides (""), cela signifie que le déchiffrement a échoué
            if username and password:
                logger.info(f"Camera {camera_config.id} already exists with valid credentials, skipping")
                continue
            else:
                # Credentials invalides - supprimer et recréer
                logger.warning(f"Camera {camera_config.id} has invalid encrypted credentials (decryption returned empty), recreating...")
                await camera_service.delete_camera(db, camera_config.id)
                logger.info(f"Deleted camera {camera_config.id} with corrupted credentials")

        # Convertir en CameraCreate et extraire credentials
        camera_create, username, password = camera_config.to_camera_create()

        try:
            # Créer la caméra avec l'ID depuis le YAML
            camera = await camera_service.create_camera(
                db=db,
                camera_data=camera_create,
                username=username,
                password=password,
                camera_type="imou"
            )

            # Forcer l'ID depuis la config YAML
            camera.id = camera_config.id
            await db.commit()
            await db.refresh(camera)

            logger.info(f"Created camera: {camera.id} - {camera.name}")
            created_count += 1

        except Exception as e:
            logger.error(f"Error creating camera {camera_config.id}: {e}")
            await db.rollback()

    logger.info(f"Initialized {created_count} cameras from config")
    return created_count


async def sync_cameras_with_config(db: AsyncSession) -> dict:
    """
    Synchronise les caméras en base avec la configuration YAML
    Ajoute les nouvelles, met à jour les existantes

    Args:
        db: Session de base de données

    Returns:
        Dict avec statistiques de synchronisation
    """
    logger.info("Synchronizing cameras with config...")

    camera_configs = get_enabled_cameras_config()
    stats = {
        "created": 0,
        "updated": 0,
        "skipped": 0,
        "errors": 0
    }

    for camera_config in camera_configs:
        try:
            existing = await camera_service.get_camera_by_id(db, camera_config.id)
            camera_create, username, password = camera_config.to_camera_create()

            if existing:
                # Mettre à jour si nécessaire
                if existing.name != camera_create.name or existing.url != camera_create.url:
                    from app.schemas.camera import CameraUpdate
                    update_data = CameraUpdate(
                        name=camera_create.name,
                        url=camera_create.url,
                        enabled=camera_create.enabled,
                        detection_zones=camera_create.detection_zones
                    )

                    await camera_service.update_camera(
                        db=db,
                        camera_id=camera_config.id,
                        camera_data=update_data,
                        username=username,
                        password=password
                    )
                    logger.info(f"Updated camera: {camera_config.id}")
                    stats["updated"] += 1
                else:
                    stats["skipped"] += 1
            else:
                # Créer nouvelle caméra
                camera = await camera_service.create_camera(
                    db=db,
                    camera_data=camera_create,
                    username=username,
                    password=password,
                    camera_type="imou"
                )
                camera.id = camera_config.id
                await db.commit()
                await db.refresh(camera)

                logger.info(f"Created camera: {camera.id} - {camera.name}")
                stats["created"] += 1

        except Exception as e:
            logger.error(f"Error syncing camera {camera_config.id}: {e}")
            stats["errors"] += 1
            await db.rollback()

    logger.info(f"Sync complete: {stats}")
    return stats


async def autostart_enabled_cameras(db: AsyncSession) -> int:
    """
    Démarre automatiquement toutes les caméras activées au démarrage du backend

    Args:
        db: Session de base de données

    Returns:
        Nombre de caméras démarrées avec succès
    """
    logger.info("Auto-starting enabled cameras...")

    # Récupérer toutes les caméras activées
    cameras = await camera_service.get_cameras(db=db, enabled_only=True)

    if not cameras:
        logger.warning("No enabled cameras to start")
        return 0

    started_count = 0

    for camera in cameras:
        try:
            logger.info(f"Auto-starting camera: {camera.id} - {camera.name}")

            # Démarrer le stream via le stream manager
            success = await camera_stream_manager.start_camera(
                db=db,
                camera_id=camera.id
            )

            if success:
                logger.success(f"Camera {camera.id} auto-started successfully")
                started_count += 1
            else:
                logger.error(f"Failed to auto-start camera {camera.id}")

        except Exception as e:
            logger.error(f"Error auto-starting camera {camera.id}: {e}")

    logger.info(f"Auto-started {started_count}/{len(cameras)} cameras")
    return started_count
