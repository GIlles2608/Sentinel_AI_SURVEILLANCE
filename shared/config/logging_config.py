"""
Configuration du logging pour Sentinel IA
"""
import logging
import logging.handlers
from pathlib import Path
import sys

def setup_logging(log_level=logging.INFO):
    """
    Configurer le logging pour Sentinel IA.

    Logs vers :
    - Console (WARNING et plus)
    - Fichier logs/sentinel.log (INFO et plus, rotation 10 MB)
    - Fichier logs/errors.log (ERROR uniquement)
    """
    # Créer le dossier logs
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Configuration racine
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Supprimer les handlers existants
    root_logger.handlers.clear()

    # Format des logs
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # 1. Handler Console (WARNING et plus)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # 2. Handler Fichier Principal (INFO et plus, rotation)
    main_file_handler = logging.handlers.RotatingFileHandler(
        log_dir / "sentinel.log",
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding='utf-8'
    )
    main_file_handler.setLevel(logging.INFO)
    main_file_handler.setFormatter(formatter)
    root_logger.addHandler(main_file_handler)

    # 3. Handler Fichier Erreurs (ERROR uniquement)
    error_file_handler = logging.handlers.RotatingFileHandler(
        log_dir / "errors.log",
        maxBytes=5 * 1024 * 1024,  # 5 MB
        backupCount=3,
        encoding='utf-8'
    )
    error_file_handler.setLevel(logging.ERROR)
    error_file_handler.setFormatter(formatter)
    root_logger.addHandler(error_file_handler)

    # Réduire le niveau de logs pour certaines bibliothèques bruyantes
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('socketio').setLevel(logging.WARNING)
    logging.getLogger('engineio').setLevel(logging.WARNING)
    logging.getLogger('werkzeug').setLevel(logging.WARNING)

    logging.info("Logging configuré - Fichiers: logs/sentinel.log, logs/errors.log")

    return root_logger
