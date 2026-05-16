from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.patient import PatientProfile


class PatientRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user_id(self, user_id: UUID) -> PatientProfile | None:
        q = select(PatientProfile).where(PatientProfile.user_id == user_id)
        r = await self.session.execute(q)
        return r.scalars().first()

    async def get_by_id(self, id: UUID) -> PatientProfile | None:
        q = select(PatientProfile).where(PatientProfile.id == id)
        r = await self.session.execute(q)
        return r.scalars().first()

    async def create(self, patient: PatientProfile) -> PatientProfile:
        self.session.add(patient)
        await self.session.flush()
        return patient

    async def update(self, id: UUID, **fields) -> PatientProfile | None:
        q = (
            update(PatientProfile)
            .where(PatientProfile.id == id)
            .values(**fields)
            .returning(PatientProfile)
        )
        r = await self.session.execute(q)
        await self.session.commit()
        return r.fetchone()
