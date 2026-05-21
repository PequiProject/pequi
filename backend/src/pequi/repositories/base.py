from typing import Any, TypeVar
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.database import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository[ModelT]:
    """Repository genérico com operações CRUD básicas.

    Subclasses devem definir `model` como atributo de classe.
    Lógica de negócio nunca pertence aqui — apenas queries.
    """

    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, entity_id: UUID) -> ModelT | None:
        result = await self._session.execute(
            select(self.model).where(self.model.id == entity_id)  # type: ignore[attr-defined]
        )
        return result.scalar_one_or_none()

    async def get_by_id_or_raise(self, entity_id: UUID, resource_name: str | None = None) -> ModelT:
        from pequi.core.exceptions import NotFoundError

        instance = await self.get_by_id(entity_id)
        if instance is None:
            raise NotFoundError(resource_name or self.model.__name__, str(entity_id))
        return instance

    async def add(self, instance: ModelT) -> ModelT:
        self._session.add(instance)
        await self._session.flush()
        await self._session.refresh(instance)
        return instance

    async def delete(self, instance: ModelT) -> None:
        await self._session.delete(instance)
        await self._session.flush()

    async def list_all(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        filters: list[Any] | None = None,
    ) -> list[ModelT]:
        stmt = select(self.model)
        if filters:
            stmt = stmt.where(*filters)
        stmt = stmt.limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
