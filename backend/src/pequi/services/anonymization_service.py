from datetime import UTC, datetime
from hashlib import sha256
from typing import Protocol

from pequi.models.body_map import BodyAreaHistory, BodyMapEntry
from pequi.models.patient import PatientProfile
from pequi.models.user import User


class ObjectDeleter(Protocol):
    async def delete(self, key: str) -> None: ...


class AnonymizationService:
    async def anonymize_account(
        self,
        *,
        user: User,
        patient: PatientProfile,
        body_map_entries: list[BodyMapEntry],
        body_area_history: list[BodyAreaHistory],
        storage: ObjectDeleter,
    ) -> None:
        now = datetime.now(UTC)
        digest = sha256(str(user.id).encode("utf-8")).hexdigest()

        user.email = f"deleted:{digest}@anonymous.local"
        user.full_name = "Usuario Removido"
        user.is_active = False
        user.deleted_at = now

        patient.date_of_birth = None
        patient.neighborhood = None
        patient.city = None
        patient.state = None
        patient.deleted_at = now

        await self._delete_body_map_media(body_map_entries, storage)
        await self._delete_body_map_media(body_area_history, storage)

    async def _delete_body_map_media(
        self,
        rows: list[BodyMapEntry] | list[BodyAreaHistory],
        storage: ObjectDeleter,
    ) -> None:
        for row in rows:
            if row.image_key:
                await storage.delete(row.image_key)
            row.image_key = None
            row.image_url = None
