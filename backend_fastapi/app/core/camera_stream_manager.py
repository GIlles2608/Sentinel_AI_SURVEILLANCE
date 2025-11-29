"""
Gestionnaire central des flux caméras
Gère les captures RTSP de toutes les caméras actives
"""
from typing import Dict, Optional, Callable
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import numpy as np
from loguru import logger
import asyncio

from app.core.rtsp_capture import RTSPCapture
from app.services import camera_service
from app.services.ffmpeg_transcoder import ffmpeg_transcoder
from app.schemas.camera import CameraStatus


class CameraStreamManager:
    """
    Gestionnaire central pour tous les flux caméras
    Singleton pattern
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.captures: Dict[str, RTSPCapture] = {}
        self.frame_callbacks: Dict[str, list] = {}  # camera_id -> [callbacks]
        self._initialized = True

        logger.info("CameraStreamManager initialized")

    async def start_camera(
        self,
        db: AsyncSession,
        camera_id: str,
        on_frame: Optional[Callable] = None
    ) -> bool:
        """
        Démarrer le stream d'une caméra

        Args:
            db: Session de base de données
            camera_id: ID de la caméra
            on_frame: Callback optionnel pour chaque frame

        Returns:
            True si démarré avec succès
        """
        # Vérifier si déjà en cours
        if camera_id in self.captures:
            logger.warning(f"Camera {camera_id} already streaming")
            return True

        # Récupérer la caméra depuis la DB
        camera = await camera_service.get_camera_by_id(db, camera_id)
        if not camera:
            logger.error(f"Camera {camera_id} not found")
            return False

        if not camera.enabled:
            logger.warning(f"Camera {camera_id} is disabled")
            return False

        # Récupérer les credentials déchiffrés
        username, password = camera_service.get_camera_credentials(camera)

        # Construire l'URL RTSP avec credentials
        rtsp_url = camera.url
        if username and password:
            # Injecter les credentials dans l'URL si nécessaire
            if "@" not in rtsp_url and "rtsp://" in rtsp_url:
                rtsp_url = rtsp_url.replace("rtsp://", f"rtsp://{username}:{password}@")

        logger.info(f"Starting camera {camera_id}: {camera.name}")

        # Mettre à jour le statut
        await camera_service.update_camera_status(
            db=db,
            camera_id=camera_id,
            status=CameraStatus.CONNECTING
        )

        # Créer la capture RTSP
        try:
            logger.info(f"Creating RTSPCapture for {camera_id} with URL: {rtsp_url[:20]}...")
            capture = RTSPCapture(
                camera_id=camera_id,
                rtsp_url=rtsp_url,
                on_frame=self._create_frame_handler(camera_id, db),
                fps=camera.fps or 10
            )
            logger.info(f"RTSPCapture created, calling start()...")

            # Démarrer la capture
            start_result = capture.start()
            logger.info(f"capture.start() returned: {start_result}")
            if start_result:
                self.captures[camera_id] = capture

                # Ajouter le callback utilisateur si fourni
                if on_frame:
                    if camera_id not in self.frame_callbacks:
                        self.frame_callbacks[camera_id] = []
                    self.frame_callbacks[camera_id].append(on_frame)

                # Démarrer le transcodage FFmpeg H265→H264 pour WebRTC
                logger.info(f"Starting FFmpeg transcoding H265→H264 for camera {camera_id}")
                transcoding_started = await ffmpeg_transcoder.start_transcoding(
                    camera_id=camera_id,
                    input_rtsp_url=rtsp_url,
                    output_rtsp_url=f"rtsp://localhost:8554/{camera_id}_h264",
                    fps=camera.fps or 25,
                    bitrate="2M"
                )

                if not transcoding_started:
                    logger.warning(f"Failed to start transcoding for {camera_id}, WebRTC may not work")

                # Mettre à jour le statut
                await camera_service.update_camera_status(
                    db=db,
                    camera_id=camera_id,
                    status=CameraStatus.ACTIVE,
                    fps=capture.target_fps
                )

                logger.success(f"Camera {camera_id} started successfully (RTSP capture + FFmpeg transcoding)")
                return True
            else:
                # Échec du démarrage
                await camera_service.update_camera_status(
                    db=db,
                    camera_id=camera_id,
                    status=CameraStatus.ERROR
                )
                logger.error(f"Failed to start camera {camera_id}")
                return False

        except Exception as e:
            import traceback
            logger.error(f"Error starting camera {camera_id}: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            await camera_service.update_camera_status(
                db=db,
                camera_id=camera_id,
                status=CameraStatus.ERROR
            )
            return False

    def _create_frame_handler(self, camera_id: str, db: AsyncSession):
        """
        Créer un handler de frame pour une caméra

        Args:
            camera_id: ID de la caméra
            db: Session DB

        Returns:
            Fonction callback
        """
        async def handle_frame(frame: np.ndarray, timestamp: datetime, cam_id: str):
            """Handler appelé pour chaque nouvelle frame"""
            try:
                # Appeler les callbacks utilisateur
                if cam_id in self.frame_callbacks:
                    for callback in self.frame_callbacks[cam_id]:
                        try:
                            if asyncio.iscoroutinefunction(callback):
                                await callback(frame, timestamp, cam_id)
                            else:
                                callback(frame, timestamp, cam_id)
                        except Exception as e:
                            logger.error(f"Error in user callback for {cam_id}: {e}")

            except Exception as e:
                logger.error(f"Error handling frame for {cam_id}: {e}")

        # Wrapper synchrone car RTSPCapture utilise des threads
        def sync_wrapper(frame: np.ndarray, timestamp: datetime, cam_id: str):
            import asyncio
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(handle_frame(frame, timestamp, cam_id))
                loop.close()
            except Exception as e:
                logger.error(f"Error in frame handler wrapper: {e}")

        return sync_wrapper

    async def stop_camera(self, db: AsyncSession, camera_id: str) -> bool:
        """
        Arrêter le stream d'une caméra

        Args:
            db: Session de base de données
            camera_id: ID de la caméra

        Returns:
            True si arrêté avec succès
        """
        if camera_id not in self.captures:
            logger.warning(f"Camera {camera_id} not streaming")
            return True

        logger.info(f"Stopping camera {camera_id}")

        try:
            # Arrêter le transcodage FFmpeg
            await ffmpeg_transcoder.stop_transcoding(camera_id)

            # Arrêter la capture
            capture = self.captures[camera_id]
            capture.stop()

            # Retirer de la liste
            del self.captures[camera_id]

            # Nettoyer les callbacks
            if camera_id in self.frame_callbacks:
                del self.frame_callbacks[camera_id]

            # Mettre à jour le statut
            await camera_service.update_camera_status(
                db=db,
                camera_id=camera_id,
                status=CameraStatus.INACTIVE
            )

            logger.success(f"Camera {camera_id} stopped")
            return True

        except Exception as e:
            logger.error(f"Error stopping camera {camera_id}: {e}")
            return False

    def get_camera_frame(self, camera_id: str) -> Optional[tuple[np.ndarray, datetime]]:
        """
        Récupérer la dernière frame d'une caméra

        Args:
            camera_id: ID de la caméra

        Returns:
            Tuple (frame, timestamp) ou None
        """
        if camera_id not in self.captures:
            return None

        return self.captures[camera_id].get_last_frame()

    def get_camera_stats(self, camera_id: str) -> Optional[dict]:
        """
        Récupérer les stats d'une caméra

        Args:
            camera_id: ID de la caméra

        Returns:
            Dict avec stats ou None
        """
        if camera_id not in self.captures:
            return None

        return self.captures[camera_id].get_stats()

    def get_all_stats(self) -> dict:
        """
        Récupérer les stats de toutes les caméras

        Returns:
            Dict avec stats de toutes les caméras
        """
        return {
            camera_id: capture.get_stats()
            for camera_id, capture in self.captures.items()
        }

    async def stop_all(self, db: AsyncSession):
        """Arrêter toutes les caméras"""
        logger.info("Stopping all cameras")

        camera_ids = list(self.captures.keys())
        for camera_id in camera_ids:
            await self.stop_camera(db, camera_id)

        logger.info("All cameras stopped")


# Instance globale (singleton)
camera_stream_manager = CameraStreamManager()
