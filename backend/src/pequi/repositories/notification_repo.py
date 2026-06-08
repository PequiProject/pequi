from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.notification import Notification, NotificationType


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        patient_id: UUID,
        type: NotificationType,
        title: str,
        body: str,
        whatsapp_phone: str | None = None,
    ) -> Notification:
        notification = Notification(
            patient_id=patient_id,
            type=type,
            title=title,
            body=body,
            whatsapp_phone=whatsapp_phone,
        )
        self.session.add(notification)
        await self.session.flush()
        await self.session.refresh(notification)
        return notification

    async def list_by_patient(self, patient_id: UUID, *, limit: int = 50) -> list[Notification]:
        result = await self.session.execute(
            select(Notification)
            .where(Notification.patient_id == patient_id)
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def unread_count(self, patient_id: UUID) -> int:
        result = await self.session.execute(
            select(func.count(Notification.id)).where(
                Notification.patient_id == patient_id,
                Notification.unread.is_(True),
            )
        )
        return int(result.scalar_one())

    async def mark_as_read(self, patient_id: UUID, notification_id: UUID) -> None:
        await self.session.execute(
            update(Notification)
            .where(
                Notification.id == notification_id,
                Notification.patient_id == patient_id,
                Notification.unread.is_(True),
            )
            .values(unread=False, read_at=datetime.now(timezone.utc))
        )

    async def mark_all_as_read(self, patient_id: UUID) -> None:
        await self.session.execute(
            update(Notification)
            .where(
                Notification.patient_id == patient_id,
                Notification.unread.is_(True),
            )
            .values(unread=False, read_at=datetime.now(timezone.utc))
        )

    async def mark_whatsapp_sent(self, notification_id: UUID) -> None:
        await self.session.execute(
            update(Notification)
            .where(Notification.id == notification_id)
            .values(whatsapp_sent=True)
        )