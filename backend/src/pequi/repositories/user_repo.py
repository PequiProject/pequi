from uuid import UUID

from sqlalchemy import func, select

from pequi.models.user import User
from pequi.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(self.model).where(self.model.email == email, self.model.deleted_at.is_(None))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        """Busca por username de forma case-insensitive."""
        stmt = select(self.model).where(
            func.lower(self.model.username) == username.lower(),
            self.model.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_identifier(self, identifier: str) -> User | None:
        """Busca por email ou username (case-insensitive)."""
        if "@" in identifier:
            return await self.get_by_email(identifier)
        return await self.get_by_username(identifier)

    async def get_by_id(self, id: UUID) -> User | None:
        stmt = select(self.model).where(self.model.id == id, self.model.deleted_at.is_(None))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_username(self, user_id: UUID, username: str) -> User | None:
        user = await self.get_by_id(user_id)
        if not user:
            return None
        user.username = username
        await self._session.flush()
        await self._session.refresh(user)
        return user
