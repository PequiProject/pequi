from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class JourneySummary(BaseModel):
    patient_id: UUID
    user_id: UUID
    display_name: str | None = None
    classification: str | None = None
    diagnosis_date: date | None = None
    treatment_start_date: date | None = None
    estimated_end_date: date | None = None
    treatment_status: str | None = None
    treatment_duration_months: int
    total_days: int
    elapsed_days: int
    remaining_days: int
    progress_percent: int
    current_month: int

    model_config = ConfigDict(from_attributes=True)


class JourneyMedicationSummary(BaseModel):
    doses_taken: int = 0
    doses_expected: int = 0
    adherence_percent: int = 0

    model_config = ConfigDict(from_attributes=True)


class JourneyEvent(BaseModel):
    id: str
    type: str
    date: datetime | date
    title: str
    description: str
    status: str = "neutral"
    metadata: dict[str, Any] | None = None

    model_config = ConfigDict(from_attributes=True)


class JourneyMonth(BaseModel):
    month_index: int
    label: str
    start_date: date
    end_date: date
    status: str
    medication_summary: JourneyMedicationSummary
    events: list[JourneyEvent] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PatientJourneyResponse(BaseModel):
    summary: JourneySummary
    months: list[JourneyMonth]

    model_config = ConfigDict(from_attributes=True)