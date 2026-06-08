from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TreatmentCreateV1(BaseModel):
    """Contrato legado v1 — profissional cria tratamento para um paciente."""

    model_config = ConfigDict(extra="forbid")

    patient_id: UUID
    regimen: str = Field(..., pattern="^(PB|MB)$")
    start_date: date
    notes: str | None = Field(default=None, max_length=2000)


class TreatmentResponseV1(BaseModel):
    id: UUID
    patient_id: UUID
    prescribed_by: UUID
    regimen: str
    start_date: date
    expected_end: date
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdherenceSnapshotResponseV1(BaseModel):
    id: UUID
    patient_id: UUID
    treatment_id: UUID
    period_start: date
    period_end: date
    total_doses: int
    taken_doses: int
    adherence_pct: Decimal
    calculated_at: datetime

    model_config = ConfigDict(from_attributes=True)
