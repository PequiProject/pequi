from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AlertResponse(BaseModel):
    id: UUID
    patient_id: UUID
    checkin_id: UUID | None
    type: str
    severity: str
    resolved: bool
    resolved_at: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertListResponse(BaseModel):
    items: list[AlertResponse]
    total: int


class AlertResolve(BaseModel):
    model_config = ConfigDict(extra="forbid")

    notes: str | None = Field(default=None, max_length=2000)
