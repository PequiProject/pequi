from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from pequi.schemas.patient_treatment import InstitutedMedicationItem


class NeurologicalAssessmentDraftIn(BaseModel):
    assessment_date: str = ""
    gif_eye: str = ""
    gif_hand: str = ""
    gif_foot: str = ""
    highest_gif: str = ""
    omp_sum: str = ""
    conduct: str = ""
    ubs: str = ""
    reference: str = ""

    model_config = ConfigDict(extra="forbid")


class AppointmentFollowUpDraftIn(BaseModel):
    conduct: str = ""
    guidance_received: str = ""
    next_appointment_date: str = ""
    dose_medication_changed: bool | None = None
    update_dose_from_consultation: bool = False
    dose_scheme_clofazimina: bool = False
    dose_scheme_ofloxacino: bool = False
    dose_scheme_rifampicina: bool = False
    dose_scheme_minociclina: bool = False
    dose_scheme_dapsone: bool = False
    update_instituted_meds_from_consultation: bool = False
    had_medication_change: bool | None = None
    register_supervised_dose: bool = False
    register_neurological_assessment: bool = False
    selected_medication_id: str = ""
    other_medication_name: str = ""
    medication_change_description: str = ""
    instituted_prednisone_mg_kg: str = ""
    instituted_aine_mg_day: str = ""
    instituted_thalidomide_mg_day: str = ""
    instituted_pentoxifylline_mg_day: str = ""
    instituted_other_medication: str = ""
    instituted_medications: list[InstitutedMedicationItem] = Field(default_factory=list)
    supervised_dose_notes: str = ""

    model_config = ConfigDict(extra="forbid")


class HealthAppointmentCreate(BaseModel):
    appointment_date: date
    appointment_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    location: str = Field(..., min_length=1, max_length=500)
    appointment_type: str = Field(..., min_length=1, max_length=50)
    professional: str = ""
    notes: str = ""
    performed: bool
    follow_up: AppointmentFollowUpDraftIn = Field(default_factory=AppointmentFollowUpDraftIn)
    neurological_assessment: NeurologicalAssessmentDraftIn | None = None

    model_config = ConfigDict(extra="forbid")


class HealthAppointmentUpdate(HealthAppointmentCreate):
    """Atualiza consulta existente (ex.: agendada → realizada)."""

    model_config = ConfigDict(extra="forbid")


class HealthAppointmentResponse(BaseModel):
    id: UUID
    appointment_date: date
    appointment_time: str
    location: str
    appointment_type: str
    professional: str | None = None
    notes: str | None = None
    performed: bool
    status: str
    wants_follow_up_details: bool
    follow_up: dict[str, Any] | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
