from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ConsentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    term_version: str = Field(..., min_length=1, max_length=50)
    accepted: bool


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=64)
    confirm_password: str = Field(..., min_length=8, max_length=64)


class ConsentResponse(BaseModel):
    id: UUID
    user_id: UUID
    term_version: str
    accepted_at: datetime
    ip_address: str | None = None
    user_agent: str | None = None

    model_config = ConfigDict(from_attributes=True)
