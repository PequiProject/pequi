from datetime import date
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InstitutedMedicationItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    dose: str = Field(default="", max_length=50)
    unit: str = Field(default="mg", max_length=30)
    frequency: str = Field(default="dia", max_length=30)

    model_config = ConfigDict(extra="forbid")


class PatientTreatmentRecordSave(BaseModel):
    """Caderneta de tratamento (Meu tratamento) — persistida em JSON no perfil."""

    model_config = ConfigDict(extra="forbid")

    diagnosis_date: date | None = None
    classification: str | None = Field(default=None, pattern="^(PB|MB)?$")
    current_dose_medication: str = Field(default="", max_length=500)
    treatment_start_date: date | None = None
    cns_number: str = Field(default="", max_length=50)
    sinan_number: str = Field(default="", max_length=50)
    clinical_form: str = Field(default="", max_length=10)
    baciloscopy_date: date | None = None
    baciloscopy_ib: str = Field(default="", max_length=50)
    diagnostic_support_exam: str = Field(default="", max_length=500)
    gif_assessment: str = Field(default="", max_length=20)
    reaction_episode_at_diagnosis: str = Field(default="", max_length=10)
    reaction_episode_type: str = Field(default="", max_length=30)
    reaction_episode_date: date | None = None
    prednisone_mg_kg: str = Field(default="", max_length=30)
    aine_mg_day: str = Field(default="", max_length=30)
    thalidomide_mg_day: str = Field(default="", max_length=30)
    pentoxifylline_mg_day: str = Field(default="", max_length=30)
    other_medication: str = Field(default="", max_length=500)
    instituted_medications: list[InstitutedMedicationItem] = Field(default_factory=list)
    other_conducts: str = Field(default="", max_length=1000)
    substitute_scheme_change_date: date | None = None
    intolerance_dapsone: bool = False
    intolerance_rifampicin: bool = False
    intolerance_clofazimine: bool = False
    scheme_clofazimina: bool = False
    scheme_ofloxacino: bool = False
    scheme_rifampicina: bool = False
    scheme_minociclina: bool = False
    scheme_dapsone: bool = False
    pqt_discharge_date: date | None = None
    gif_assessment_at_discharge: str = Field(default="", max_length=20)
    reaction_episode_at_discharge: str = Field(default="", max_length=10)
    reaction_episode_type_at_discharge: str = Field(default="", max_length=30)
    reaction_episode_date_at_discharge: date | None = None
    discharge_prednisone_mg_kg: str = Field(default="", max_length=30)
    discharge_aine_mg_day: str = Field(default="", max_length=30)
    discharge_thalidomide_mg_day: str = Field(default="", max_length=30)
    discharge_pentoxifylline_mg_day: str = Field(default="", max_length=30)
    discharge_other_medication: str = Field(default="", max_length=500)
    discharge_other_conducts: str = Field(default="", max_length=1000)


class PatientTreatmentRecordRead(PatientTreatmentRecordSave):
    """Mesmos campos do save; leitura pode preencher defaults vazios."""

    model_config = ConfigDict(extra="forbid")


class MedicationChecklistResponse(BaseModel):
    active_treatment_id: UUID | None = None
    instituted_medications: list[InstitutedMedicationItem]
    current_dose_medication: str = ""
    treatment_start_date: date | None = None
    can_register_doses: bool = False

    model_config = ConfigDict(extra="forbid")


def treatment_record_to_storage(data: PatientTreatmentRecordSave) -> dict[str, Any]:
    return data.model_dump(
        exclude={"diagnosis_date", "classification"},
        mode="json",
    )


def storage_to_treatment_record(
    stored: dict[str, Any] | None,
    *,
    diagnosis_date: date | None,
    classification: str | None,
) -> PatientTreatmentRecordRead:
    base = PatientTreatmentRecordRead(
        diagnosis_date=diagnosis_date,
        classification=classification,
    )
    if not stored:
        return base
    merged = {**base.model_dump(), **stored}
    merged["diagnosis_date"] = diagnosis_date
    merged["classification"] = classification
    return PatientTreatmentRecordRead.model_validate(merged)
