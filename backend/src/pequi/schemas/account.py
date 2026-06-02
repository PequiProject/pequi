from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ConsentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    term_version: str = Field(..., min_length=1, max_length=50)
    accepted: bool


class ConsentResponse(BaseModel):
    id: UUID
    user_id: UUID
    term_version: str
    accepted_at: datetime
    ip_address: str | None = None
    user_agent: str | None = None

    model_config = ConfigDict(from_attributes=True)
