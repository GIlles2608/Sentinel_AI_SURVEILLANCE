"""
Script pour vérifier et corriger les credentials des caméras en base
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.services import camera_service
from app.core.security import encrypt_credential, decrypt_credential
from app.core.config import settings
from loguru import logger


async def check_and_fix_credentials():
    """Vérifier et corriger les credentials des caméras"""
    logger.info("Checking camera credentials...")
    logger.info(f"SECRET_KEY (first 16 chars): {settings.SECRET_KEY[:16]}")

    async with AsyncSessionLocal() as db:
        # Récupérer toutes les caméras
        cameras = await camera_service.get_cameras(db, limit=100)

        logger.info(f"Found {len(cameras)} cameras in database")

        for camera in cameras:
            logger.info(f"\n--- Camera: {camera.id} ({camera.name}) ---")
            logger.info(f"URL: {camera.url}")
            logger.info(f"Encrypted username: {camera.encrypted_username[:50] if camera.encrypted_username else 'None'}...")
            logger.info(f"Encrypted password: {camera.encrypted_password[:50] if camera.encrypted_password else 'None'}...")

            # Essayer de déchiffrer
            try:
                username, password = camera_service.get_camera_credentials(camera)
                if username and password:
                    logger.success(f"✓ Decryption OK - Username: {username}, Password: {password}")
                else:
                    logger.warning(f"✗ Decryption failed - got empty credentials")

                    # Proposer de réinitialiser avec les credentials du YAML
                    logger.info("Attempting to fix credentials from YAML config...")

                    # Pour imou_01, on connaît les credentials
                    if camera.id == "imou_01":
                        new_username = "admin"
                        new_password = "L26F76F1"

                        # Chiffrer les nouveaux credentials
                        encrypted_username = encrypt_credential(new_username)
                        encrypted_password = encrypt_credential(new_password)

                        # Mettre à jour en base
                        camera.encrypted_username = encrypted_username
                        camera.encrypted_password = encrypted_password

                        await db.commit()
                        await db.refresh(camera)

                        logger.success(f"✓ Credentials updated for {camera.id}")

                        # Vérifier que le déchiffrement fonctionne maintenant
                        test_username, test_password = camera_service.get_camera_credentials(camera)
                        if test_username == new_username and test_password == new_password:
                            logger.success(f"✓ Verification OK - credentials work!")
                        else:
                            logger.error(f"✗ Verification failed - got: {test_username}/{test_password}")

            except Exception as e:
                logger.error(f"Error processing camera {camera.id}: {e}")
                import traceback
                logger.error(traceback.format_exc())


if __name__ == "__main__":
    asyncio.run(check_and_fix_credentials())
