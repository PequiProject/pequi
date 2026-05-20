from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TreatmentCreate(BaseModel):
    """Payload para criar um novo tratamento MDT.

    ``expected_end`` é calculado automaticamente pelo use case:
    PB = start_date + 6 meses, MB = start_date + 12 meses.
    """

    model_config = ConfigDict(extra="forbid")

    patient_id: UUID
    regimen: str = Field(..., pattern="^(PB|MB)$", description="Esquema MDT: PB ou MB")
    start_date: date
    notes: str | None = Field(default=None, max_length=2000)


class TreatmentResponse(BaseModel):
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


class AdherenceSnapshotResponse(BaseModel):
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


class SymptomResponse(BaseModel):
    id: UUID
    name: str
    category: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)
