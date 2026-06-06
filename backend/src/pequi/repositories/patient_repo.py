from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.patient import PatientProfile


class PatientRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user_id(self, user_id: UUID) -> PatientProfile | None:
        q = select(PatientProfile).where(
            PatientProfile.user_id == user_id,
            PatientProfile.deleted_at.is_(None),
        )
        r = await self.session.execute(q)
        return r.scalars().first()

    async def get_by_id(self, id: UUID) -> PatientProfile | None:
        q = select(PatientProfile).where(
            PatientProfile.id == id,
            PatientProfile.deleted_at.is_(None),
        )
        r = await self.session.execute(q)
        return r.scalars().first()

    async def create(self, patient: PatientProfile) -> PatientProfile:
        self.session.add(patient)
        await self.session.flush()
        return patient

    async def get_or_create_by_user_id(self, user_id: UUID) -> PatientProfile:
        patient = await self.get_by_user_id(user_id)
        if patient is not None:
            return patient

        try:
            async with self.session.begin_nested():
                patient = PatientProfile(user_id=user_id)
                self.session.add(patient)
                await self.session.flush()
        except IntegrityError:
            patient = await self.get_by_user_id(user_id)
            if patient is not None:
                return patient
            raise

        await self.session.refresh(patient)
        return patient

    async def update(self, id: UUID, **fields) -> PatientProfile | None:
        q = (
            update(PatientProfile)
            .where(
                PatientProfile.id == id,
                PatientProfile.deleted_at.is_(None),
            )
            .values(**fields)
            .returning(PatientProfile)
        )
        r = await self.session.execute(q)
        await self.session.flush()
        return r.scalar_one_or_none()
