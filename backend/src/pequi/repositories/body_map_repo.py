from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.body_map import BodyArea, BodyAreaHistory, BodyFindingType, BodyMapEntry


class BodyMapRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_body_areas(self) -> list[BodyArea]:
        stmt = select(BodyArea).order_by(BodyArea.system_part, BodyArea.label)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_body_areas_by_ids(self, ids: Sequence[UUID]) -> list[BodyArea]:
        if not ids:
            return []
        stmt = select(BodyArea).where(BodyArea.id.in_(ids))
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_active_entries_by_patient(self, patient_id: UUID) -> list[BodyMapEntry]:
        stmt = (
            select(BodyMapEntry)
            .where(
                BodyMapEntry.patient_id == patient_id,
                BodyMapEntry.deleted_at.is_(None),
            )
            .order_by(BodyMapEntry.recorded_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_active_entry_by_patient_and_area(
        self,
        patient_id: UUID,
        body_area_id: UUID,
    ) -> BodyMapEntry | None:
        stmt = select(BodyMapEntry).where(
            BodyMapEntry.patient_id == patient_id,
            BodyMapEntry.body_area_id == body_area_id,
            BodyMapEntry.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_or_update_entry(
        self,
        *,
        patient_id: UUID,
        body_area_id: UUID,
        finding_type: BodyFindingType,
        intensity: int | None,
        image_url: str | None,
        image_key: str | None,
        notes: str | None,
        recorded_at: datetime,
    ) -> BodyMapEntry:
        entry = await self.get_active_entry_by_patient_and_area(patient_id, body_area_id)
        if entry is None:
            entry = BodyMapEntry(
                patient_id=patient_id,
                body_area_id=body_area_id,
                finding_type=finding_type,
                intensity=intensity,
                image_url=image_url,
                image_key=image_key,
                notes=notes,
                recorded_at=recorded_at,
            )
            self._session.add(entry)
        else:
            entry.finding_type = finding_type
            entry.intensity = intensity
            entry.image_url = image_url
            entry.image_key = image_key
            entry.notes = notes
            entry.recorded_at = recorded_at

        await self._session.flush()
        await self._session.refresh(entry)
        return entry

    async def soft_delete_by_patient_and_area(
        self,
        patient_id: UUID,
        body_area_id: UUID,
        *,
        deleted_at: datetime,
    ) -> BodyMapEntry | None:
        entry = await self.get_active_entry_by_patient_and_area(patient_id, body_area_id)
        if entry is None:
            return None
        entry.deleted_at = deleted_at
        await self._session.flush()
        return entry

    async def create_history_from_entries(
        self,
        *,
        patient_id: UUID,
        checkin_id: UUID | None,
        entries: Sequence[BodyMapEntry],
        snapshot_at: datetime,
    ) -> list[BodyAreaHistory]:
        history_rows = [
            BodyAreaHistory(
                patient_id=patient_id,
                checkin_id=checkin_id,
                body_area_id=entry.body_area_id,
                finding_type=entry.finding_type,
                intensity=entry.intensity,
                image_url=entry.image_url,
                image_key=entry.image_key,
                snapshot_at=snapshot_at,
            )
            for entry in entries
        ]
        self._session.add_all(history_rows)
        await self._session.flush()
        return history_rows

    async def list_history_by_patient(
        self,
        patient_id: UUID,
        *,
        body_area_id: UUID | None = None,
        finding_type: BodyFindingType | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> list[BodyAreaHistory]:
        filters = [BodyAreaHistory.patient_id == patient_id]
        if body_area_id is not None:
            filters.append(BodyAreaHistory.body_area_id == body_area_id)
        if finding_type is not None:
            filters.append(BodyAreaHistory.finding_type == finding_type)
        if from_date is not None:
            filters.append(BodyAreaHistory.snapshot_at >= from_date)
        if to_date is not None:
            filters.append(BodyAreaHistory.snapshot_at <= to_date)

        stmt = (
            select(BodyAreaHistory)
            .where(and_(*filters))
            .order_by(BodyAreaHistory.snapshot_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
