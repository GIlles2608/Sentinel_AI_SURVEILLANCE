"""
Debug script to check camera credentials in database
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.services import camera_service


async def check_camera():
    """Check camera credentials in database"""
    async with AsyncSessionLocal() as db:
        # Get camera from database
        camera = await camera_service.get_camera_by_id(db, "imou_01")

        if not camera:
            print("ERROR: Camera imou_01 not found in database")
            return

        print(f"Camera found: {camera.name}")
        print(f"Enabled: {camera.enabled}")
        print(f"Status: {camera.status}")
        print(f"URL: {camera.url}")

        # Get decrypted credentials
        username, password = camera_service.get_camera_credentials(camera)
        print(f"Username: {username}")
        print(f"Password: {password}")

        # Check if credentials are present
        if not username or not password:
            print("WARNING: Missing credentials!")
        else:
            print("OK: Credentials present")

            # Build RTSP URL
            rtsp_url = camera.url
            if username and password:
                if "@" not in rtsp_url and "rtsp://" in rtsp_url:
                    rtsp_url = rtsp_url.replace("rtsp://", f"rtsp://{username}:{password}@")

            print(f"Final RTSP URL: {rtsp_url}")


if __name__ == "__main__":
    asyncio.run(check_camera())
