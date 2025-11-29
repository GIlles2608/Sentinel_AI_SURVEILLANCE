"""
Service de capture RTSP pour caméras IP
Utilise OpenCV pour lire les flux RTSP
"""
import cv2
import asyncio
from typing import Optional, Callable
from datetime import datetime
import numpy as np
from loguru import logger
import threading


class RTSPCapture:
    """
    Gestion de capture RTSP pour une caméra
    Thread-safe avec async/await
    """

    def __init__(
        self,
        camera_id: str,
        rtsp_url: str,
        on_frame: Optional[Callable] = None,
        fps: int = 10  # Limite à 10 FPS pour économiser CPU
    ):
        """
        Initialiser la capture RTSP

        Args:
            camera_id: ID unique de la caméra
            rtsp_url: URL RTSP complète avec credentials
            on_frame: Callback appelé pour chaque frame (frame_array, timestamp)
            fps: FPS cible pour la capture (défaut: 10)
        """
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.on_frame = on_frame
        self.target_fps = fps
        self.frame_interval = 1.0 / fps  # Intervalle entre frames en secondes

        self.capture: Optional[cv2.VideoCapture] = None
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.last_frame: Optional[np.ndarray] = None
        self.last_frame_time: Optional[datetime] = None
        self.frame_count = 0
        self.error_count = 0
        self.actual_fps = 0.0

    def start(self) -> bool:
        """
        Démarrer la capture RTSP dans un thread séparé

        Returns:
            True si démarré avec succès
        """
        if self.is_running:
            logger.warning(f"Camera {self.camera_id} already running")
            return True

        try:
            # Ouvrir la connexion RTSP
            logger.info(f"Connecting to RTSP stream: {self.camera_id}")
            self.capture = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)

            # Configuration optimisée
            self.capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Buffer minimal pour réduire latence
            self.capture.set(cv2.CAP_PROP_FPS, self.target_fps)

            # Vérifier que la connexion fonctionne
            if not self.capture.isOpened():
                logger.error(f"Failed to open RTSP stream: {self.camera_id}")
                return False

            # Tester la lecture d'une frame
            ret, frame = self.capture.read()
            if not ret or frame is None:
                logger.error(f"Failed to read first frame: {self.camera_id}")
                self.capture.release()
                return False

            logger.success(f"RTSP connection established: {self.camera_id} ({frame.shape[1]}x{frame.shape[0]})")

            # Démarrer le thread de capture
            self.is_running = True
            self.thread = threading.Thread(target=self._capture_loop, daemon=True)
            self.thread.start()

            return True

        except Exception as e:
            logger.error(f"Error starting RTSP capture for {self.camera_id}: {e}")
            if self.capture:
                self.capture.release()
            return False

    def _capture_loop(self):
        """
        Boucle de capture dans un thread séparé
        """
        logger.info(f"Starting capture loop for {self.camera_id}")
        last_capture_time = datetime.now()

        while self.is_running:
            try:
                # Limiter le FPS
                elapsed = (datetime.now() - last_capture_time).total_seconds()
                if elapsed < self.frame_interval:
                    sleep_time = self.frame_interval - elapsed
                    asyncio.run(asyncio.sleep(sleep_time))
                    continue

                last_capture_time = datetime.now()

                # Lire une frame
                ret, frame = self.capture.read()

                if not ret or frame is None:
                    self.error_count += 1
                    logger.warning(f"Failed to read frame from {self.camera_id} (errors: {self.error_count})")

                    # Trop d'erreurs consécutives -> reconnexion
                    if self.error_count > 10:
                        logger.error(f"Too many errors, reconnecting {self.camera_id}")
                        self._reconnect()

                    continue

                # Reset error count on success
                self.error_count = 0
                self.frame_count += 1

                # Sauvegarder la dernière frame
                self.last_frame = frame.copy()
                self.last_frame_time = datetime.now()

                # Calculer FPS réel
                if self.frame_count % 30 == 0:  # Calculer toutes les 30 frames
                    self.actual_fps = self.target_fps  # Approximation

                # Callback avec la frame
                if self.on_frame:
                    try:
                        self.on_frame(frame, self.last_frame_time, self.camera_id)
                    except Exception as e:
                        logger.error(f"Error in frame callback for {self.camera_id}: {e}")

            except Exception as e:
                logger.error(f"Error in capture loop for {self.camera_id}: {e}")
                self.error_count += 1
                asyncio.run(asyncio.sleep(1))

        logger.info(f"Capture loop stopped for {self.camera_id}")

    def _reconnect(self):
        """Tenter de se reconnecter au flux RTSP"""
        logger.info(f"Reconnecting to {self.camera_id}")

        try:
            if self.capture:
                self.capture.release()

            asyncio.run(asyncio.sleep(2))  # Attendre avant de reconnecter

            self.capture = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            self.capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.capture.set(cv2.CAP_PROP_FPS, self.target_fps)

            if self.capture.isOpened():
                logger.success(f"Reconnected to {self.camera_id}")
                self.error_count = 0
            else:
                logger.error(f"Reconnection failed for {self.camera_id}")

        except Exception as e:
            logger.error(f"Error reconnecting {self.camera_id}: {e}")

    def stop(self):
        """Arrêter la capture"""
        logger.info(f"Stopping capture for {self.camera_id}")
        self.is_running = False

        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)

        if self.capture:
            self.capture.release()
            self.capture = None

        logger.info(f"Capture stopped for {self.camera_id}")

    def get_last_frame(self) -> Optional[tuple[np.ndarray, datetime]]:
        """
        Récupérer la dernière frame capturée

        Returns:
            Tuple (frame, timestamp) ou None
        """
        if self.last_frame is not None and self.last_frame_time is not None:
            return self.last_frame.copy(), self.last_frame_time
        return None

    def get_stats(self) -> dict:
        """
        Récupérer les statistiques de capture

        Returns:
            Dict avec les stats
        """
        return {
            "camera_id": self.camera_id,
            "is_running": self.is_running,
            "frame_count": self.frame_count,
            "error_count": self.error_count,
            "fps": self.actual_fps,
            "last_frame_time": self.last_frame_time.isoformat() if self.last_frame_time else None,
            "resolution": f"{self.last_frame.shape[1]}x{self.last_frame.shape[0]}" if self.last_frame is not None else None
        }
