# pequi/schemas/daily_medication_progress.py
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DailyMedicationProgressUpsert(BaseModel):
    """Payload para salvar o progresso diário de medicações."""

    model_config = ConfigDict(extra="forbid")

    progress_date: date
    expected_count: int = Field(
        ...,
        ge=0,
        description="Quantidade total de doses/checkboxes esperados no dia",
    )
    taken_count: int = Field(
        ...,
        ge=0,
        description="Quantidade de doses/checkboxes marcados como tomados no dia",
    )

    @model_validator(mode="after")
    def validate_counts(self) -> "DailyMedicationProgressUpsert":
        if self.taken_count > self.expected_count:
            raise ValueError("taken_count não pode ser maior que expected_count.")
        return self


class DailyMedicationProgressResponse(BaseModel):
    id: UUID
    patient_id: UUID
    progress_date: date
    expected_count: int
    taken_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DailyMedicationSummaryResponse(BaseModel):
    progress_date: date
    expected_count: int
    taken_count: int
    remaining_count: int
    completed: bool


def daily_medication_progress_to_response(progress) -> DailyMedicationProgressResponse:
    return DailyMedicationProgressResponse(
        id=progress.id,
        patient_id=progress.patient_id,
        progress_date=progress.progress_date,
        expected_count=progress.expected_count,
        taken_count=progress.taken_count,
        created_at=progress.created_at,
        updated_at=progress.updated_at,
    )
