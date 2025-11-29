"""
Client MinIO async pour le stockage des médias (frames, vidéos)
"""
from aiobotocore.session import get_session
from botocore.exceptions import ClientError
from typing import Optional, BinaryIO
import aiofiles
from io import BytesIO

from app.core.config import settings


class MinIOStorage:
    """
    Client MinIO async pour gérer le stockage des médias
    Compatible S3
    """

    def __init__(self):
        self.session = get_session()
        self.client = None
        self._initialized = False

    async def connect(self) -> None:
        """Initialiser la connexion MinIO"""
        try:
            # Créer le client S3 (compatible MinIO)
            self.client = self.session.create_client(
                "s3",
                endpoint_url=f"{'https' if settings.MINIO_SECURE else 'http'}://{settings.MINIO_ENDPOINT}",
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY,
            )

            # Vérifier si le bucket existe, le créer sinon
            async with self.client as client:
                try:
                    await client.head_bucket(Bucket=settings.MINIO_BUCKET)
                    print(f"OK MinIO bucket exists: {settings.MINIO_BUCKET}")
                except ClientError:
                    # Le bucket n'existe pas, le créer
                    await client.create_bucket(Bucket=settings.MINIO_BUCKET)
                    print(f"OK MinIO bucket created: {settings.MINIO_BUCKET}")

            self._initialized = True
            print(f"OK MinIO connected: {settings.MINIO_ENDPOINT}")

        except Exception as e:
            print(f"❌ MinIO connection failed: {e}")
            self._initialized = False

    async def disconnect(self) -> None:
        """Fermer la connexion MinIO"""
        if self.client:
            await self.client.__aexit__(None, None, None)
            self._initialized = False
            print("OK MinIO connection closed")

    async def upload_file(
        self,
        file_path: str,
        object_name: str,
        content_type: str = "application/octet-stream"
    ) -> Optional[str]:
        """
        Upload un fichier depuis le disque vers MinIO

        Args:
            file_path: Chemin local du fichier
            object_name: Nom de l'objet dans MinIO (avec chemin)
            content_type: Type MIME du fichier

        Returns:
            URL de l'objet uploadé, ou None si erreur
        """
        if not self._initialized:
            print("⚠️ MinIO not initialized, skipping upload")
            return None

        try:
            async with self.client as client:
                async with aiofiles.open(file_path, "rb") as f:
                    data = await f.read()

                    await client.put_object(
                        Bucket=settings.MINIO_BUCKET,
                        Key=object_name,
                        Body=data,
                        ContentType=content_type,
                    )

            # Construire l'URL de l'objet
            url = f"{'https' if settings.MINIO_SECURE else 'http'}://{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}/{object_name}"
            return url

        except Exception as e:
            print(f"❌ Error uploading file to MinIO: {e}")
            return None

    async def upload_bytes(
        self,
        data: bytes,
        object_name: str,
        content_type: str = "application/octet-stream"
    ) -> Optional[str]:
        """
        Upload des bytes directement vers MinIO

        Args:
            data: Données binaires
            object_name: Nom de l'objet dans MinIO
            content_type: Type MIME

        Returns:
            URL de l'objet uploadé, ou None si erreur
        """
        if not self._initialized:
            print("⚠️ MinIO not initialized, skipping upload")
            return None

        try:
            async with self.client as client:
                await client.put_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=object_name,
                    Body=data,
                    ContentType=content_type,
                )

            url = f"{'https' if settings.MINIO_SECURE else 'http'}://{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}/{object_name}"
            return url

        except Exception as e:
            print(f"❌ Error uploading bytes to MinIO: {e}")
            return None

    async def download_file(
        self,
        object_name: str,
        file_path: str
    ) -> bool:
        """
        Télécharger un fichier depuis MinIO vers le disque

        Args:
            object_name: Nom de l'objet dans MinIO
            file_path: Chemin local où sauvegarder

        Returns:
            True si succès
        """
        if not self._initialized:
            return False

        try:
            async with self.client as client:
                response = await client.get_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=object_name,
                )

                async with aiofiles.open(file_path, "wb") as f:
                    async for chunk in response["Body"]:
                        await f.write(chunk)

            return True

        except Exception as e:
            print(f"❌ Error downloading file from MinIO: {e}")
            return False

    async def download_bytes(self, object_name: str) -> Optional[bytes]:
        """
        Télécharger un fichier comme bytes depuis MinIO

        Args:
            object_name: Nom de l'objet dans MinIO

        Returns:
            Données binaires ou None si erreur
        """
        if not self._initialized:
            return None

        try:
            async with self.client as client:
                response = await client.get_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=object_name,
                )

                data = await response["Body"].read()
                return data

        except Exception as e:
            print(f"❌ Error downloading bytes from MinIO: {e}")
            return None

    async def delete_file(self, object_name: str) -> bool:
        """
        Supprimer un fichier de MinIO

        Args:
            object_name: Nom de l'objet dans MinIO

        Returns:
            True si succès
        """
        if not self._initialized:
            return False

        try:
            async with self.client as client:
                await client.delete_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=object_name,
                )
            return True

        except Exception as e:
            print(f"❌ Error deleting file from MinIO: {e}")
            return False

    async def file_exists(self, object_name: str) -> bool:
        """
        Vérifier si un fichier existe dans MinIO

        Args:
            object_name: Nom de l'objet dans MinIO

        Returns:
            True si le fichier existe
        """
        if not self._initialized:
            return False

        try:
            async with self.client as client:
                await client.head_object(
                    Bucket=settings.MINIO_BUCKET,
                    Key=object_name,
                )
            return True

        except ClientError:
            return False
        except Exception as e:
            print(f"❌ Error checking file existence in MinIO: {e}")
            return False

    async def get_presigned_url(
        self,
        object_name: str,
        expires_in: int = 3600
    ) -> Optional[str]:
        """
        Générer une URL pré-signée pour accéder temporairement à un fichier

        Args:
            object_name: Nom de l'objet dans MinIO
            expires_in: Durée de validité en secondes (défaut: 1h)

        Returns:
            URL pré-signée ou None si erreur
        """
        if not self._initialized:
            return None

        try:
            async with self.client as client:
                url = await client.generate_presigned_url(
                    "get_object",
                    Params={
                        "Bucket": settings.MINIO_BUCKET,
                        "Key": object_name,
                    },
                    ExpiresIn=expires_in,
                )
            return url

        except Exception as e:
            print(f"❌ Error generating presigned URL: {e}")
            return None


# Instance globale
minio_storage = MinIOStorage()
