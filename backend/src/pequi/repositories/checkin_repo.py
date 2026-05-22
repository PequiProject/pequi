from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from pequi.models.checkin import Checkin, CheckinMood, checkin_symptoms
from pequi.schemas.checkin import CheckinCreate


class CheckinRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def has_checkin_on_date(self, patient_id: UUID, day: date) -> bool:
        stmt = select(Checkin.id).where(
            Checkin.patient_id == patient_id,
            func.date(func.timezone("UTC", Checkin.checked_in_at)) == day,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def create(
        self,
        patient_id: UUID,
        data: CheckinCreate,
        *,
        checked_in_at: datetime | None = None,
    ) -> Checkin:
        checkin = Checkin(
            patient_id=patient_id,
            mood=CheckinMood(data.mood),
            symptom_intensity=data.symptom_intensity,
            general_notes=data.general_notes,
            checked_in_at=checked_in_at or datetime.now(UTC),
        )
        self._session.add(checkin)
        await self._session.flush()

        if data.symptom_ids:
            await self._session.execute(
                insert(checkin_symptoms),
                [{"checkin_id": checkin.id, "symptom_id": sid} for sid in data.symptom_ids],
            )

        await self._session.flush()
        return await self.get_by_id(checkin.id)  # type: ignore[return-value]

    async def get_by_id(self, checkin_id: UUID) -> Checkin | None:
        stmt = (
            select(Checkin)
            .where(Checkin.id == checkin_id)
            .options(selectinload(Checkin.symptoms))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_patient(
        self,
        patient_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Checkin], int]:
        count_stmt = select(func.count()).select_from(Checkin).where(
            Checkin.patient_id == patient_id
        )
        total = (await self._session.execute(count_stmt)).scalar_one()

        stmt = (
            select(Checkin)
            .where(Checkin.patient_id == patient_id)
            .options(selectinload(Checkin.symptoms))
            .order_by(Checkin.checked_in_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def get_recent_moods(
        self,
        patient_id: UUID,
        *,
        limit: int = 3,
    ) -> list[CheckinMood]:
        stmt = (
            select(Checkin.mood)
            .where(Checkin.patient_id == patient_id)
            .order_by(Checkin.checked_in_at.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def update_ai_feedback(
        self,
        checkin_id: UUID,
        feedback: str,
        *,
        feedback_at: datetime | None = None,
    ) -> Checkin | None:
        checkin = await self.get_by_id(checkin_id)
        if checkin is None:
            return None
        checkin.ai_feedback = feedback
        checkin.ai_feedback_at = feedback_at or datetime.now(UTC)
        await self._session.flush()
        await self._session.refresh(checkin)
        return checkin
