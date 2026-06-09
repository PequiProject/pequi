from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DoseLogCreate(BaseModel):
    """Payload para o paciente registrar uma dose (tomada ou pulada)."""

    model_config = ConfigDict(extra="forbid")

    drug_name: str = Field(..., min_length=1, max_length=200)
    expected_at: datetime
    taken_at: datetime | None = None
    skipped: bool = False
    skip_reason: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_skip_and_taken(self) -> "DoseLogCreate":
        if self.skipped and self.taken_at is not None:
            raise ValueError("Uma dose não pode ser simultaneamente tomada e pulada.")
        return self


class DoseLogResponse(BaseModel):
    id: UUID
    treatment_id: UUID
    drug_name: str
    expected_at: datetime
    taken_at: datetime | None = None
    skipped: bool
    skip_reason: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
