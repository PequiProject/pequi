"""Object storage client — S3-compatible (MinIO / Cloudflare R2)."""

import logging
from typing import Literal

import aiobotocore.session

from pequi.config import Settings, get_settings

logger = logging.getLogger(__name__)


class ObjectStorageClient:
    """S3-compatible object storage client using aiobotocore."""

    def __init__(
        self,
        bucket: str | None = None,
        endpoint_url: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        region: str | None = None,
        public_url: str | None = None,
        settings: Settings | None = None,
    ) -> None:
        """Initialize object storage client.

        Args:
            bucket: Bucket name. Defaults to settings.STORAGE_BUCKET_IMAGES.
            endpoint_url: S3 endpoint URL. Defaults to settings.STORAGE_ENDPOINT.
            access_key: Access key. Defaults to settings.STORAGE_ACCESS_KEY.
            secret_key: Secret key. Defaults to settings.STORAGE_SECRET_KEY.
            region: Region. Defaults to settings.STORAGE_REGION.
            public_url: Public URL base. Defaults to settings.STORAGE_PUBLIC_URL.
        """
        settings = settings or get_settings()
        self.bucket = bucket or settings.STORAGE_BUCKET_IMAGES
        self.endpoint_url = endpoint_url or settings.STORAGE_ENDPOINT
        self._access_key = access_key or settings.STORAGE_ACCESS_KEY
        self._secret_key = secret_key or settings.STORAGE_SECRET_KEY
        self.region = region or settings.STORAGE_REGION
        self.public_url = public_url if public_url is not None else settings.STORAGE_PUBLIC_URL

        self._session = aiobotocore.session.get_session()

    async def _get_client(self):
        """Create a boto3 client."""
        return self._session.create_client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self._access_key,
            aws_secret_access_key=self._secret_key,
            region_name=self.region,
        )

    async def upload(
        self,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload data to object storage.

        Args:
            key: Object key (path within bucket)
            data: Binary data to upload
            content_type: MIME type of the data

        Returns:
            Public URL of the uploaded object
        """
        try:
            async with await self._get_client() as client:
                await client.put_object(
                    Bucket=self.bucket,
                    Key=key,
                    Body=data,
                    ContentType=content_type,
                )

            if self.public_url:
                return f"{self.public_url}/{self.bucket}/{key}"
            return await self.generate_presigned_url(key)
        except Exception as e:
            logger.error(
                "Failed to upload object to storage: %s",
                str(e),
                extra={"key": key, "bucket": self.bucket},
            )
            raise

    async def generate_presigned_url(
        self,
        key: str,
        expires: int = 3600,
        method: Literal["get_object", "put_object"] = "get_object",
    ) -> str:
        """Generate a presigned URL for an object.

        Args:
            key: Object key
            expires: URL expiration time in seconds (default: 1 hour)
            method: S3 operation (get_object or put_object)

        Returns:
            Presigned URL
        """
        try:
            async with await self._get_client() as client:
                url = await client.generate_presigned_url(
                    method,
                    Params={"Bucket": self.bucket, "Key": key},
                    ExpiresIn=expires,
                )
                return url
        except Exception as e:
            logger.error(
                "Failed to generate presigned URL: %s",
                str(e),
                extra={"key": key, "bucket": self.bucket},
            )
            raise

    async def delete(self, key: str) -> None:
        """Delete an object from storage.

        Args:
            key: Object key to delete
        """
        try:
            async with await self._get_client() as client:
                await client.delete_object(Bucket=self.bucket, Key=key)
            logger.info(
                "Deleted object from storage",
                extra={"key": key, "bucket": self.bucket},
            )
        except Exception as e:
            logger.error(
                "Failed to delete object from storage: %s",
                str(e),
                extra={"key": key, "bucket": self.bucket},
            )
            # Deletion is best-effort for account removal flows and must not
            # interrupt the higher-level process if storage is unavailable.
            return None

    async def exists(self, key: str) -> bool:
        """Check if an object exists.

        Args:
            key: Object key

        Returns:
            True if object exists, False otherwise
        """
        try:
            async with await self._get_client() as client:
                await client.head_object(Bucket=self.bucket, Key=key)
                return True
        except Exception:
            return False

    async def get(self, key: str) -> bytes:
        """Get object data.

        Args:
            key: Object key

        Returns:
            Object data as bytes
        """
        try:
            async with await self._get_client() as client:
                response = await client.get_object(Bucket=self.bucket, Key=key)
                async with response["Body"] as stream:
                    return await stream.read()
        except Exception as e:
            logger.error(
                "Failed to get object from storage: %s",
                str(e),
                extra={"key": key, "bucket": self.bucket},
            )
            raise
