from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CheckinCreate(BaseModel):
    """Payload para registro de check-in diário (PEQ-100)."""

    model_config = ConfigDict(extra="forbid")

    mood: str = Field(
        ...,
        pattern="^(terrible|bad|ok|good|great)$",
        description="Humor do paciente no dia",
    )
    symptom_intensity: int = Field(
        ...,
        ge=0,
        le=10,
        description="Intensidade geral dos sintomas (0-10)",
    )
    symptom_ids: list[UUID] = Field(
        ...,
        min_length=1,
        description="Sintomas observados — referências ao catálogo",
    )
    general_notes: str | None = Field(default=None, max_length=4000)


class SymptomBrief(BaseModel):
    id: UUID
    name: str
    category: str

    model_config = ConfigDict(from_attributes=True)


class CheckinResponse(BaseModel):
    id: UUID
    patient_id: UUID
    mood: str
    symptom_intensity: int
    symptom_ids: list[UUID]
    symptoms: list[SymptomBrief]
    general_notes: str | None
    ai_feedback: str | None
    ai_feedback_at: datetime | None
    checked_in_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CheckinListResponse(BaseModel):
    items: list[CheckinResponse]
    total: int


def checkin_to_response(checkin) -> CheckinResponse:
    symptoms = checkin.symptoms or []
    return CheckinResponse(
        id=checkin.id,
        patient_id=checkin.patient_id,
        mood=checkin.mood.value,
        symptom_intensity=checkin.symptom_intensity,
        symptom_ids=[s.id for s in symptoms],
        symptoms=[SymptomBrief.model_validate(s) for s in symptoms],
        general_notes=checkin.general_notes,
        ai_feedback=checkin.ai_feedback,
        ai_feedback_at=checkin.ai_feedback_at,
        checked_in_at=checkin.checked_in_at,
        created_at=checkin.created_at,
    )
