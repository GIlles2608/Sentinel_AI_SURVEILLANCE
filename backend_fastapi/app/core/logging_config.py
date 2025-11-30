"""
Configuration du système de logging avec Loguru
Écrit les logs dans des fichiers + console
"""
import sys
from loguru import logger
from app.core.config import settings


def setup_logging():
    """
    Configure loguru pour écrire dans:
    - Console (avec couleurs)
    - Fichier principal (sentinel_api.log)
    - Fichier erreurs (sentinel_errors.log)
    """
    # Supprimer le handler par défaut
    logger.remove()

    # Format des logs
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>"
    )

    # Format pour fichier (sans couleurs)
    file_format = (
        "{time:YYYY-MM-DD HH:mm:ss} | "
        "{level: <8} | "
        "{name}:{function}:{line} | "
        "{message}"
    )

    # Handler console (avec couleurs)
    logger.add(
        sys.stderr,
        format=log_format,
        level=settings.LOG_LEVEL,
        colorize=True,
    )

    # Handler fichier principal (rotation 10MB, garde 7 jours)
    logger.add(
        settings.LOG_FILE,
        format=file_format,
        level=settings.LOG_LEVEL,
        rotation="10 MB",
        retention="7 days",
        compression="zip",
        encoding="utf-8",
    )

    # Handler fichier erreurs uniquement
    error_log_path = settings.LOG_FILE.replace(".log", "_errors.log")
    logger.add(
        error_log_path,
        format=file_format,
        level="ERROR",
        rotation="10 MB",
        retention="30 days",
        compression="zip",
        encoding="utf-8",
    )

    logger.info(f"Logging configured: {settings.LOG_LEVEL} level")
    logger.info(f"Log files: {settings.LOG_FILE}")

    return logger
