from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.daily_medication_progress import DailyMedicationProgress


class DailyMedicationProgressRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_patient_and_date(
        self,
        patient_id: UUID,
        progress_date: date,
    ) -> DailyMedicationProgress | None:
        stmt = select(DailyMedicationProgress).where(
            DailyMedicationProgress.patient_id == patient_id,
            DailyMedicationProgress.progress_date == progress_date,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_patient_id(self, patient_id: UUID) -> list[DailyMedicationProgress]:
        stmt = (
            select(DailyMedicationProgress)
            .where(DailyMedicationProgress.patient_id == patient_id)
            .order_by(DailyMedicationProgress.progress_date.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def upsert(
        self,
        patient_id: UUID,
        progress_date: date,
        expected_count: int,
        taken_count: int,
    ) -> DailyMedicationProgress:
        progress = await self.get_by_patient_and_date(patient_id, progress_date)

        if progress is None:
            progress = DailyMedicationProgress(
                patient_id=patient_id,
                progress_date=progress_date,
                expected_count=expected_count,
                taken_count=taken_count,
            )
            self._session.add(progress)
            await self._session.flush()
            return progress

        progress.expected_count = expected_count
        progress.taken_count = taken_count
        await self._session.flush()
        await self._session.refresh(progress)
        return progress
