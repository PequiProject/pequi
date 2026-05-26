from dataclasses import dataclass
from typing import Protocol
from uuid import UUID, uuid4


@dataclass(frozen=True)
class PresignedUpload:
    upload_url: str
    file_key: str
    public_url: str


class StorageService(Protocol):
    async def generate_body_map_upload_url(
        self,
        *,
        patient_id: UUID,
        content_type: str,
        extension: str,
    ) -> PresignedUpload: ...


class FakeStorageService:
    def __init__(self, *, base_url: str = "https://storage.mock.local") -> None:
        self._base_url = base_url.rstrip("/")

    async def generate_body_map_upload_url(
        self,
        *,
        patient_id: UUID,
        content_type: str,
        extension: str,
    ) -> PresignedUpload:
        del content_type  # reservado para validação mais forte com provider real no M10
        object_id = uuid4()
        file_key = f"body-map/{patient_id}/{object_id}.{extension}"
        public_url = f"{self._base_url}/public/{file_key}"
        upload_url = f"{self._base_url}/upload/{file_key}?signature=fake-signature"
        return PresignedUpload(upload_url=upload_url, file_key=file_key, public_url=public_url)
