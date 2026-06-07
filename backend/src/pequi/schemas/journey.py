from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class JourneyEventResponse(BaseModel):
    """Evento na timeline — extensível para check-ins e alertas futuros."""

    type: str
    date: datetime | date
    title: str
    description: str

    model_config = ConfigDict(from_attributes=True)


class JourneyMonthResponse(BaseModel):
    month: int
    events: list[JourneyEventResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class JourneySummaryBlock(BaseModel):
    completed_doses: int
    pending_doses: int
    skipped_doses: int = 0
    adherence_pct: Decimal | None = None

    model_config = ConfigDict(from_attributes=True)


class JourneyResponse(BaseModel):
    patient_id: UUID
    regimen: str
    start_date: date
    expected_end: date
    current_month: int
    progress_pct: Decimal
    months: list[JourneyMonthResponse]
    summary: JourneySummaryBlock

    model_config = ConfigDict(from_attributes=True)
