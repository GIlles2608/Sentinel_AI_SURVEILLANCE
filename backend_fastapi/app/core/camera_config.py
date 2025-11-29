"""
Chargement et parsing de la configuration des caméras depuis YAML
"""
import yaml
from pathlib import Path
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
from loguru import logger

from app.schemas.camera import CameraCreate


class CameraConfig:
    """Configuration d'une caméra depuis YAML"""

    def __init__(self, data: Dict[str, Any]):
        self.id = data.get("id", "")
        self.name = data.get("name", "")
        self.url = data.get("url", "")
        self.enabled = data.get("enabled", True)
        self.zones = data.get("zones", {})

    def extract_credentials_from_url(self) -> tuple[str, str, str]:
        """
        Extrait username, password et URL nettoyée depuis l'URL RTSP

        Returns:
            Tuple (username, password, clean_url)
        """
        try:
            parsed = urlparse(self.url)

            username = parsed.username or "admin"
            password = parsed.password or ""

            # Reconstruire l'URL sans credentials
            clean_url = f"{parsed.scheme}://{parsed.hostname}"
            if parsed.port:
                clean_url += f":{parsed.port}"
            if parsed.path:
                clean_url += parsed.path
            if parsed.query:
                clean_url += f"?{parsed.query}"

            return username, password, clean_url

        except Exception as e:
            logger.error(f"Error parsing RTSP URL: {e}")
            return "admin", "", self.url

    def to_camera_create(self) -> tuple[CameraCreate, str, str]:
        """
        Convertit la config YAML en CameraCreate schema

        Returns:
            Tuple (CameraCreate, username, password)
        """
        username, password, clean_url = self.extract_credentials_from_url()

        # Extraire les zones de détection
        detection_zones = []
        restricted_zones = self.zones.get("restricted_zones", [])

        for zone in restricted_zones:
            detection_zones.append({
                "name": zone.get("name", "Zone"),
                "points": zone.get("points", []),
                "active_hours": zone.get("active_hours", "00:00-23:59"),
            })

        camera_create = CameraCreate(
            name=self.name,
            url=clean_url,
            location="",  # Peut être ajouté dans le YAML si nécessaire
            description=f"Caméra IMOU {self.id}",
            enabled=self.enabled,
            detection_zones=detection_zones if detection_zones else None,
            detection_classes=None,  # Peut être configuré plus tard
            confidence_threshold=0.5,
        )

        return camera_create, username, password


def load_cameras_config(config_path: str = None) -> List[CameraConfig]:
    """
    Charge la configuration des caméras depuis le fichier YAML

    Args:
        config_path: Chemin vers le fichier cameras.yaml (optionnel)

    Returns:
        Liste de CameraConfig
    """
    if config_path is None:
        # Chemin par défaut
        base_path = Path(__file__).parent.parent.parent.parent  # Remonter à la racine
        config_path = base_path / "shared" / "config" / "cameras.yaml"

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        cameras_data = data.get("cameras", [])
        cameras = [CameraConfig(cam) for cam in cameras_data]

        logger.info(f"Loaded {len(cameras)} cameras from config")
        return cameras

    except FileNotFoundError:
        logger.warning(f"Camera config file not found: {config_path}")
        return []
    except Exception as e:
        logger.error(f"Error loading camera config: {e}")
        return []


def get_enabled_cameras_config(config_path: str = None) -> List[CameraConfig]:
    """
    Charge uniquement les caméras activées depuis le fichier YAML

    Args:
        config_path: Chemin vers le fichier cameras.yaml (optionnel)

    Returns:
        Liste de CameraConfig activées
    """
    all_cameras = load_cameras_config(config_path)
    return [cam for cam in all_cameras if cam.enabled]
