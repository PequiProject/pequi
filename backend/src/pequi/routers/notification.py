from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.database import get_session
from pequi.repositories.notification_repo import NotificationRepository

router = APIRouter(prefix="/notifications", tags=["notifications"])


def get_current_patient_id() -> UUID:
    # Substitua pela dependência real da sua autenticação.
    raise NotImplementedError


class NotificationItemOut(BaseModel):
    id: UUID
    type: str
    title: str
    body: str
    unread: bool
    read_at: str | None
    created_at: str
    whatsapp_sent: bool

    model_config = ConfigDict(from_attributes=True)


class NotificationUnreadCountOut(BaseModel):
    count: int


@router.get("", response_model=list[NotificationItemOut])
async def list_notifications(
    session: AsyncSession = Depends(get_session),
    patient_id: UUID = Depends(get_current_patient_id),
) -> list[NotificationItemOut]:
    repo = NotificationRepository(session)
    items = await repo.list_by_patient(patient_id)

    return [
        NotificationItemOut(
            id=item.id,
            type=item.type.value,
            title=item.title,
            body=item.body,
            unread=item.unread,
            read_at=item.read_at.isoformat() if item.read_at else None,
            created_at=item.created_at.isoformat(),
            whatsapp_sent=item.whatsapp_sent,
        )
        for item in items
    ]


@router.get("/unread-count", response_model=NotificationUnreadCountOut)
async def unread_count(
    session: AsyncSession = Depends(get_session),
    patient_id: UUID = Depends(get_current_patient_id),
) -> NotificationUnreadCountOut:
    repo = NotificationRepository(session)
    return NotificationUnreadCountOut(count=await repo.unread_count(patient_id))


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_as_read(
    notification_id: UUID,
    session: AsyncSession = Depends(get_session),
    patient_id: UUID = Depends(get_current_patient_id),
) -> Response:
    repo = NotificationRepository(session)
    await repo.mark_as_read(patient_id, notification_id)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_as_read(
    session: AsyncSession = Depends(get_session),
    patient_id: UUID = Depends(get_current_patient_id),
) -> Response:
    repo = NotificationRepository(session)
    await repo.mark_all_as_read(patient_id)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)