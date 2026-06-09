import uuid
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.dose_log import DoseLog
from pequi.models.journey_event import JourneyEvent


class JourneyEventRepository:
    """Persistência de eventos emitidos por fluxos clínicos e workers."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, event: JourneyEvent) -> JourneyEvent:
        self._session.add(event)
        await self._session.flush()
        await self._session.refresh(event)
        return event

    async def create_for_dose(self, patient_id: UUID, dose: DoseLog) -> JourneyEvent:
        taken = dose.taken_at is not None and not dose.skipped
        title = "Dose registrada"
        if dose.skipped:
            description = f"{dose.drug_name} marcada como não tomada."
            display_type = "dose_skipped"
        elif taken:
            description = f"{dose.drug_name} registrada como tomada."
            display_type = "dose_taken"
        else:
            description = f"{dose.drug_name} registrada como pendente."
            display_type = "dose_pending"

        return await self.create(
            JourneyEvent(
                id=uuid.uuid4(),
                patient_id=patient_id,
                treatment_id=dose.treatment_id,
                event_type="dose_registered",
                title=title,
                description=description,
                occurred_at=dose.taken_at or dose.expected_at,
                event_metadata={
                    "drug_name": dose.drug_name,
                    "display_type": display_type,
                    "skipped": dose.skipped,
                },
                source_type="dose_log",
                source_id=dose.id,
            )
        )

    async def list_by_patient(self, patient_id: UUID) -> list[JourneyEvent]:
        stmt = (
            select(JourneyEvent)
            .where(JourneyEvent.patient_id == patient_id)
            .order_by(JourneyEvent.occurred_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_for_treatment(
        self,
        patient_id: UUID,
        treatment_id: UUID,
    ) -> list[JourneyEvent]:
        stmt = (
            select(JourneyEvent)
            .where(
                JourneyEvent.patient_id == patient_id,
                or_(
                    JourneyEvent.treatment_id == treatment_id,
                    JourneyEvent.treatment_id.is_(None),
                ),
            )
            .order_by(JourneyEvent.occurred_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_source(self, source_type: str, source_id: UUID) -> JourneyEvent | None:
        stmt = select(JourneyEvent).where(
            JourneyEvent.source_type == source_type,
            JourneyEvent.source_id == source_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()
