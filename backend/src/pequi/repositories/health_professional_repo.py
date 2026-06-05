from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.health_professional import HealthProfessional


class HealthProfessionalRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_user_id(self, user_id: UUID) -> HealthProfessional | None:
        stmt = select(HealthProfessional).where(
            HealthProfessional.user_id == user_id,
            HealthProfessional.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, professional_id: UUID) -> HealthProfessional | None:
        stmt = select(HealthProfessional).where(
            HealthProfessional.id == professional_id,
            HealthProfessional.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, professional: HealthProfessional) -> HealthProfessional:
        self._session.add(professional)
        await self._session.flush()
        await self._session.refresh(professional)
        return professional

    async def get_first_available(self) -> HealthProfessional | None:
        """Profissional de referência para tratamentos autodeclarados (MVP)."""
        stmt = (
            select(HealthProfessional)
            .where(HealthProfessional.deleted_at.is_(None))
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()
