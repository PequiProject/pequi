# pequi/schemas/notification_schema.py
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationItemOut(BaseModel):
    id: UUID
    type: str
    title: str
    body: str
    unread: bool
    read_at: datetime | None
    created_at: datetime
    whatsapp_sent: bool

    model_config = {"from_attributes": True}


class NotificationUnreadCountOut(BaseModel):
    count: int