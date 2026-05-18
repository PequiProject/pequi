from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.health_unit import HealthUnit


class HealthUnitRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, id: UUID) -> HealthUnit | None:
        q = select(HealthUnit).where(HealthUnit.id == id)
        r = await self.session.execute(q)
        return r.scalars().first()
