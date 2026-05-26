from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.alert import Alert, AlertType


class AlertRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, alert: Alert) -> Alert:
        self._session.add(alert)
        await self._session.flush()
        await self._session.refresh(alert)
        return alert

    async def get_by_id(self, alert_id: UUID) -> Alert | None:
        stmt = select(Alert).where(Alert.id == alert_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_patient(
        self,
        patient_id: UUID,
        *,
        resolved: bool | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Alert], int]:
        filters = [Alert.patient_id == patient_id]
        if resolved is not None:
            filters.append(Alert.resolved == resolved)

        count_stmt = select(func.count()).select_from(Alert).where(*filters)
        total = (await self._session.execute(count_stmt)).scalar_one()

        stmt = (
            select(Alert)
            .where(*filters)
            .order_by(Alert.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def has_unresolved(self, patient_id: UUID, alert_type: AlertType) -> bool:
        stmt = select(Alert.id).where(
            Alert.patient_id == patient_id,
            Alert.type == alert_type,
            Alert.resolved.is_(False),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none() is not None

    async def list_active(self, patient_id: UUID) -> list[Alert]:
        items, _ = await self.list_by_patient(patient_id, resolved=False, limit=100)
        return items

    async def save(self, alert: Alert) -> Alert:
        await self._session.flush()
        await self._session.refresh(alert)
        return alert
