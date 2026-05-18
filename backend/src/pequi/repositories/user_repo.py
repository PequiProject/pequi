from uuid import UUID

from sqlalchemy import select

from pequi.models.user import User
from pequi.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(self.model).where(self.model.email == email, self.model.deleted_at.is_(None))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, id: UUID) -> User | None:
        stmt = select(self.model).where(self.model.id == id, self.model.deleted_at.is_(None))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()
