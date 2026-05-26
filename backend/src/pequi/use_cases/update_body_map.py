from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from pequi.core.exceptions import NotFoundError, ValidationFailedError
from pequi.core.logging import get_logger
from pequi.repositories.body_map_repo import BodyMapRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.body_map import (
    BodyMapEntryResponse,
    BodyMapUpdateRequest,
    UploadUrlResponse,
)
from pequi.services.storage_service import StorageService

logger = get_logger(__name__)
_ALLOWED_UPLOAD_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}


class GetBodyMapUseCase:
    def __init__(
        self,
        body_map_repo: BodyMapRepository,
        patient_repo: PatientRepository,
    ) -> None:
        self._body_map_repo = body_map_repo
        self._patient_repo = patient_repo

    async def execute(self, patient_user_id: UUID) -> list[BodyMapEntryResponse]:
        patient = await self._patient_repo.get_by_user_id(patient_user_id)
        if patient is None:
            raise NotFoundError("PatientProfile")

        entries = await self._body_map_repo.list_active_entries_by_patient(patient.id)
        return [BodyMapEntryResponse.model_validate(entry) for entry in entries]


class UpdateBodyMapUseCase:
    def __init__(
        self,
        body_map_repo: BodyMapRepository,
        patient_repo: PatientRepository,
    ) -> None:
        self._body_map_repo = body_map_repo
        self._patient_repo = patient_repo

    async def execute(
        self,
        patient_user_id: UUID,
        payload: BodyMapUpdateRequest,
    ) -> list[BodyMapEntryResponse]:
        patient = await self._patient_repo.get_by_user_id(patient_user_id)
        if patient is None:
            raise NotFoundError("PatientProfile")

        body_area_ids = [entry.body_area_id for entry in payload.entries]
        if len(body_area_ids) != len(set(body_area_ids)):
            raise ValidationFailedError("entries não pode conter body_area_id duplicado.")

        existing_areas = await self._body_map_repo.get_body_areas_by_ids(body_area_ids)
        existing_area_ids = {area.id for area in existing_areas}
        invalid_ids = [area_id for area_id in body_area_ids if area_id not in existing_area_ids]
        if invalid_ids:
            raise NotFoundError("BodyArea", str(invalid_ids[0]))

        changed_count = 0
        now = datetime.now(UTC)
        for item in payload.entries:
            if item.remove:
                await self._body_map_repo.soft_delete_by_patient_and_area(
                    patient.id,
                    item.body_area_id,
                    deleted_at=now,
                )
                changed_count += 1
                continue

            finding_type = item.finding_type
            if finding_type is None:
                raise ValidationFailedError("finding_type é obrigatório para upsert.")

            await self._body_map_repo.create_or_update_entry(
                patient_id=patient.id,
                body_area_id=item.body_area_id,
                finding_type=finding_type,
                intensity=item.intensity,
                image_url=item.image_url,
                image_key=item.image_key,
                notes=item.notes,
                recorded_at=now,
            )
            changed_count += 1

        logger.info(
            "body_map.updated",
            patient_id=str(patient.id),
            changed_entries=changed_count,
        )

        entries = await self._body_map_repo.list_active_entries_by_patient(patient.id)
        return [BodyMapEntryResponse.model_validate(entry) for entry in entries]


class ListBodyAreasUseCase:
    def __init__(self, body_map_repo: BodyMapRepository) -> None:
        self._body_map_repo = body_map_repo

    async def execute(self) -> list:
        return await self._body_map_repo.list_body_areas()


class GenerateBodyMapUploadUrlUseCase:
    def __init__(
        self,
        patient_repo: PatientRepository,
        storage_service: StorageService,
    ) -> None:
        self._patient_repo = patient_repo
        self._storage_service = storage_service

    async def execute(
        self,
        patient_user_id: UUID,
        *,
        filename: str,
        content_type: str,
    ) -> UploadUrlResponse:
        patient = await self._patient_repo.get_by_user_id(patient_user_id)
        if patient is None:
            raise NotFoundError("PatientProfile")

        normalized_content_type = content_type.lower().strip()
        if normalized_content_type not in _ALLOWED_UPLOAD_CONTENT_TYPES:
            raise ValidationFailedError("content_type inválido para upload de imagem.")

        extension = Path(filename).suffix.lower().replace(".", "")
        if not extension:
            raise ValidationFailedError("filename deve conter extensão de arquivo.")

        upload = await self._storage_service.generate_body_map_upload_url(
            patient_id=patient.id,
            content_type=normalized_content_type,
            extension=extension,
        )
        logger.info(
            "body_map.upload_url_generated",
            patient_id=str(patient.id),
            file_key=upload.file_key,
        )
        return UploadUrlResponse(
            upload_url=upload.upload_url,
            file_key=upload.file_key,
            public_url=upload.public_url,
        )


async def create_body_map_snapshot(
    *,
    body_map_repo: BodyMapRepository,
    patient_id: UUID,
    checkin_id: UUID | None,
) -> int:
    entries = await body_map_repo.list_active_entries_by_patient(patient_id)
    if not entries:
        return 0

    snapshot_at = datetime.now(UTC)
    created_rows = await body_map_repo.create_history_from_entries(
        patient_id=patient_id,
        checkin_id=checkin_id,
        entries=entries,
        snapshot_at=snapshot_at,
    )
    logger.info(
        "body_map.snapshot_created",
        patient_id=str(patient_id),
        checkin_id=str(checkin_id) if checkin_id else None,
        count=len(created_rows),
    )
    return len(created_rows)
