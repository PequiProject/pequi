from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.health_appointment import PatientHealthAppointment
from pequi.repositories.base import BaseRepository


class HealthAppointmentRepository(BaseRepository[PatientHealthAppointment]):
    model = PatientHealthAppointment

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def list_by_patient_id(
        self,
        patient_id: UUID,
        *,
        limit: int = 100,
    ) -> list[PatientHealthAppointment]:
        stmt = (
            select(PatientHealthAppointment)
            .where(
                PatientHealthAppointment.patient_id == patient_id,
                PatientHealthAppointment.deleted_at.is_(None),
            )
            .order_by(
                PatientHealthAppointment.appointment_date.desc(),
                PatientHealthAppointment.created_at.desc(),
            )
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_for_patient(
        self,
        appointment_id: UUID,
        patient_id: UUID,
    ) -> PatientHealthAppointment | None:
        stmt = select(PatientHealthAppointment).where(
            PatientHealthAppointment.id == appointment_id,
            PatientHealthAppointment.patient_id == patient_id,
            PatientHealthAppointment.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, appointment: PatientHealthAppointment) -> PatientHealthAppointment:
        return await self.add(appointment)

    async def save(self, appointment: PatientHealthAppointment) -> PatientHealthAppointment:
        await self._session.flush()
        await self._session.refresh(appointment)
        return appointment
