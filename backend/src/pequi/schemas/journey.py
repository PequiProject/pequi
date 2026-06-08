from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class JourneyEventResponse(BaseModel):
    """Evento unificado da timeline."""

    type: str
    event_type: str
    date: datetime | date
    occurred_at: datetime | date
    title: str
    description: str
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class JourneyMonthResponse(BaseModel):
    month: int
    month_number: int
    is_current: bool
    events: list[JourneyEventResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class JourneySummaryBlock(BaseModel):
    completed_doses: int
    pending_doses: int
    skipped_doses: int = 0
    adherence_pct: Decimal | None = None
    total_months: int
    current_month: int
    progress_pct: Decimal
    total_consultations: int
    total_doses_registered: int

    model_config = ConfigDict(from_attributes=True)


class JourneyPatientBlock(BaseModel):
    id: UUID
    classification: str | None = None


class JourneyTreatmentBlock(BaseModel):
    id: UUID
    regimen: str
    start_date: date
    expected_end: date
    status: str


class JourneyResponse(BaseModel):
    patient: JourneyPatientBlock
    treatment: JourneyTreatmentBlock
    patient_id: UUID
    regimen: str
    start_date: date
    expected_end: date
    current_month: int
    progress_pct: Decimal
    months: list[JourneyMonthResponse]
    summary: JourneySummaryBlock

    model_config = ConfigDict(from_attributes=True)
