"""
Service de transcodage FFmpeg
Convertit H265 (HEVC) vers H264 pour compatibilité WebRTC
Architecture hybride: H265 pour stockage/YOLOv8, H264 pour streaming
"""
import subprocess
import asyncio
from typing import Dict, Optional
from loguru import logger
from datetime import datetime


class FFmpegTranscoder:
    """
    Service de transcodage vidéo H265 → H264 pour WebRTC

    Architecture:
    - RTSP H265 (caméra) → FFmpeg → RTSP H264 (MediaMTX WebRTC)
    - Latence cible: < 500ms
    - Utilise hardware encoding si disponible (NVENC, QSV, VideoToolbox)
    """

    def __init__(self):
        self.processes: Dict[str, subprocess.Popen] = {}
        self.stats: Dict[str, dict] = {}
        logger.info("FFmpegTranscoder initialized")

    def _detect_hardware_encoder(self) -> str:
        """
        Détecte l'encodeur hardware disponible

        Returns:
            Nom de l'encodeur H264 (nvenc_h264, h264_qsv, h264_videotoolbox, libx264)
        """
        # Ordre de préférence: NVIDIA NVENC > Intel QSV > Apple VideoToolbox > Software
        encoders = [
            ("h264_nvenc", "NVIDIA NVENC"),  # NVIDIA GPU
            ("h264_qsv", "Intel QuickSync"),  # Intel iGPU
            ("h264_videotoolbox", "Apple VideoToolbox"),  # macOS
            ("libx264", "Software x264")  # CPU fallback
        ]

        for encoder, name in encoders:
            try:
                # Tester si l'encodeur est disponible
                result = subprocess.run(
                    ["ffmpeg", "-hide_banner", "-encoders"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if encoder in result.stdout:
                    logger.info(f"Using {name} encoder ({encoder})")
                    return encoder
            except Exception as e:
                logger.warning(f"Failed to detect encoder {encoder}: {e}")

        # Fallback sur libx264
        logger.warning("No hardware encoder detected, using software libx264")
        return "libx264"

    def _build_ffmpeg_command(
        self,
        input_rtsp: str,
        output_rtsp: str,
        encoder: str = "libx264",
        preset: str = "ultrafast",
        tune: str = "zerolatency",
        bitrate: str = "2M",
        fps: int = 25,
        resolution: Optional[str] = None
    ) -> list[str]:
        """
        Construit la commande FFmpeg pour transcodage low-latency

        Args:
            input_rtsp: URL RTSP source (H265)
            output_rtsp: URL RTSP destination (H264)
            encoder: Encodeur H264 (libx264, h264_nvenc, etc.)
            preset: Preset d'encodage (ultrafast, superfast, veryfast)
            tune: Tuning (zerolatency pour latence minimale)
            bitrate: Bitrate cible (ex: "2M", "4M")
            fps: FPS de sortie
            resolution: Résolution optionnelle (ex: "1920x1080", "1280x720")

        Returns:
            Liste d'arguments pour subprocess
        """
        cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "warning",

            # INPUT - RTSP H265
            "-rtsp_transport", "tcp",  # TCP plus stable que UDP
            "-i", input_rtsp,

            # VIDEO ENCODING - H264
            "-c:v", encoder,
            "-preset", preset,
            "-b:v", bitrate,
            "-maxrate", bitrate,
            "-bufsize", f"{int(bitrate.rstrip('M')) * 2}M",  # 2x bitrate
            "-r", str(fps),  # Force FPS
            "-g", str(fps * 2),  # Keyframe interval (2 secondes)
            "-sc_threshold", "0",  # Désactiver scene change detection
        ]

        # Résolution optionnelle
        if resolution:
            cmd.extend(["-s", resolution])

        # Options spécifiques par encodeur
        if encoder == "h264_nvenc":
            # NVIDIA NVENC optimisations (pas de -tune pour hardware encoders!)
            cmd.extend([
                "-profile:v", "baseline",  # Profil compatible WebRTC
                "-level", "3.1",  # Level H264
                "-rc", "cbr",  # Constant bitrate
                "-zerolatency", "1",
                "-delay", "0",
                "-forced-idr", "1",
            ])
        elif encoder == "libx264":
            # Software x264 optimisations
            cmd.extend([
                "-tune", tune,  # -tune fonctionne SEULEMENT avec libx264
                "-profile:v", "baseline",  # Profil compatible
                "-level", "3.1",
                "-x264opts", "keyint=50:min-keyint=25:no-scenecut",
            ])

        # Bitstream filter pour WebRTC (APRÈS les options d'encodeur)
        cmd.extend([
            "-bsf:v", "dump_extra",  # Inject SPS/PPS in keyframes for WebRTC
        ])

        # AUDIO - Copie ou transcode
        cmd.extend([
            "-c:a", "aac",  # WebRTC supporte AAC
            "-b:a", "128k",
            "-ar", "48000",  # Sample rate
        ])

        # OUTPUT - RTSP
        cmd.extend([
            "-f", "rtsp",
            "-rtsp_transport", "tcp",
            output_rtsp
        ])

        return cmd

    async def start_transcoding(
        self,
        camera_id: str,
        input_rtsp_url: str,
        output_rtsp_url: str,
        fps: int = 25,
        resolution: Optional[str] = None,
        bitrate: str = "2M"
    ) -> bool:
        """
        Démarre le transcodage pour une caméra

        Args:
            camera_id: ID de la caméra
            input_rtsp_url: URL RTSP source H265
            output_rtsp_url: URL RTSP destination H264
            fps: FPS cible
            resolution: Résolution optionnelle
            bitrate: Bitrate cible

        Returns:
            True si démarré avec succès
        """
        if camera_id in self.processes:
            logger.warning(f"Transcoding already active for camera {camera_id}")
            return True

        try:
            logger.info(f"Starting H265→H264 transcoding for camera {camera_id}")

            # Détecter l'encodeur hardware
            encoder = self._detect_hardware_encoder()

            # Construire la commande FFmpeg
            cmd = self._build_ffmpeg_command(
                input_rtsp=input_rtsp_url,
                output_rtsp=output_rtsp_url,
                encoder=encoder,
                preset="ultrafast" if encoder == "libx264" else "fast",
                tune="zerolatency",
                bitrate=bitrate,
                fps=fps,
                resolution=resolution
            )

            logger.debug(f"FFmpeg command: {' '.join(cmd)}")

            # Démarrer le processus FFmpeg
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.PIPE
            )

            # Stocker le processus
            self.processes[camera_id] = process

            # Initialiser les stats
            self.stats[camera_id] = {
                "camera_id": camera_id,
                "input_url": input_rtsp_url[:50] + "...",  # Masquer credentials
                "output_url": output_rtsp_url[:50] + "...",
                "encoder": encoder,
                "fps": fps,
                "bitrate": bitrate,
                "started_at": datetime.now().isoformat(),
                "status": "running"
            }

            # Vérifier que le processus est bien démarré
            await asyncio.sleep(1)
            if process.poll() is not None:
                # Le processus s'est arrêté
                stderr = process.stderr.read().decode('utf-8')
                logger.error(f"FFmpeg process failed for {camera_id}:")
                logger.error(f"Exit code: {process.returncode}")
                logger.error(f"Stderr output:\n{stderr}")
                return False

            logger.success(f"Transcoding started for camera {camera_id} with {encoder}")

            # Créer une tâche pour surveiller les logs FFmpeg en continu
            asyncio.create_task(self._monitor_ffmpeg_logs(camera_id, process))

            return True

        except Exception as e:
            logger.error(f"Failed to start transcoding for {camera_id}: {e}")
            if camera_id in self.processes:
                del self.processes[camera_id]
            return False

    async def stop_transcoding(self, camera_id: str) -> bool:
        """
        Arrête le transcodage pour une caméra

        Args:
            camera_id: ID de la caméra

        Returns:
            True si arrêté avec succès
        """
        if camera_id not in self.processes:
            logger.warning(f"No active transcoding for camera {camera_id}")
            return True

        try:
            logger.info(f"Stopping transcoding for camera {camera_id}")

            process = self.processes[camera_id]

            # Envoyer signal de terminaison propre (q pour quit)
            try:
                process.stdin.write(b'q')
                process.stdin.flush()
            except:
                pass

            # Attendre un peu
            await asyncio.sleep(0.5)

            # Si toujours actif, terminer
            if process.poll() is None:
                process.terminate()
                await asyncio.sleep(0.5)

            # Si toujours actif, forcer
            if process.poll() is None:
                process.kill()

            # Nettoyer
            del self.processes[camera_id]
            if camera_id in self.stats:
                self.stats[camera_id]["status"] = "stopped"

            logger.success(f"Transcoding stopped for camera {camera_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to stop transcoding for {camera_id}: {e}")
            return False

    def get_stats(self, camera_id: str) -> Optional[dict]:
        """Récupère les stats d'une caméra"""
        return self.stats.get(camera_id)

    def get_all_stats(self) -> dict:
        """Récupère les stats de toutes les caméras"""
        return self.stats.copy()

    async def stop_all(self):
        """Arrête tous les transcodages"""
        logger.info("Stopping all transcoding processes")
        camera_ids = list(self.processes.keys())
        for camera_id in camera_ids:
            await self.stop_transcoding(camera_id)
        logger.info("All transcoding processes stopped")

    async def _monitor_ffmpeg_logs(self, camera_id: str, process: subprocess.Popen):
        """
        Surveille les logs FFmpeg pour détecter les erreurs en temps réel

        Args:
            camera_id: ID de la caméra
            process: Processus FFmpeg
        """
        try:
            logger.info(f"Starting FFmpeg log monitor for {camera_id}")

            # Lire stderr en continu (FFmpeg écrit ses logs sur stderr)
            while process.poll() is None:
                if process.stderr:
                    line = process.stderr.readline()
                    if line:
                        decoded_line = line.decode('utf-8', errors='ignore').strip()
                        if decoded_line:
                            # Filtrer les lignes importantes (erreurs, warnings)
                            if any(keyword in decoded_line.lower() for keyword in ['error', 'fail', 'warning', 'cannot', 'refused']):
                                logger.warning(f"[FFmpeg {camera_id}] {decoded_line}")
                            elif 'frame=' in decoded_line:
                                # Log de progression toutes les 100 frames
                                pass  # Trop verbeux, on ignore
                await asyncio.sleep(0.1)

            # Le processus s'est arrêté
            exit_code = process.returncode
            if exit_code != 0:
                logger.error(f"FFmpeg process for {camera_id} exited with code {exit_code}")
                # Lire les dernières lignes de stderr
                remaining_stderr = process.stderr.read().decode('utf-8', errors='ignore')
                if remaining_stderr:
                    logger.error(f"[FFmpeg {camera_id}] Final stderr:\n{remaining_stderr}")

                # Mettre à jour les stats
                if camera_id in self.stats:
                    self.stats[camera_id]["status"] = "crashed"

        except Exception as e:
            logger.error(f"Error monitoring FFmpeg logs for {camera_id}: {e}")


# Instance globale (singleton)
ffmpeg_transcoder = FFmpegTranscoder()
