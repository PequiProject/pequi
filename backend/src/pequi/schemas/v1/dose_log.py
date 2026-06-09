from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DoseLogCreateV1(BaseModel):
    """Contrato legado v1 — paciente ou profissional registra dose."""

    model_config = ConfigDict(extra="forbid")

    drug_name: str = Field(..., min_length=1, max_length=200)
    expected_at: datetime
    taken_at: datetime | None = None
    skipped: bool = False
    skip_reason: str | None = Field(default=None, max_length=500)
    supervised: bool = False
    via_consultation: bool = False

    @model_validator(mode="after")
    def validate_skip_and_taken(self) -> "DoseLogCreateV1":
        if self.skipped and self.taken_at is not None:
            raise ValueError("Uma dose não pode ser simultaneamente tomada e pulada.")
        return self


class DoseLogResponseV1(BaseModel):
    id: UUID
    treatment_id: UUID
    drug_name: str
    expected_at: datetime
    taken_at: datetime | None = None
    skipped: bool
    skip_reason: str | None = None
    supervised: bool
    registered_by: UUID | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
