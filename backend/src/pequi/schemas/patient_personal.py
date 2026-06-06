from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PatientPersonalRecordSave(BaseModel):
    """Caderneta — dados pessoais (JSON no perfil do paciente)."""

    model_config = ConfigDict(extra="forbid")

    social_name: str = Field(default="", max_length=200)
    cpf: str = Field(default="", max_length=20)
    sus_card: str = Field(default="", max_length=30)
    birth_date: date | None = None
    marital_status: str = Field(default="", max_length=30)
    nationality: str = Field(default="", max_length=50)
    race_color: str = Field(default="", max_length=30)
    indigenous_ethnicity: str = Field(default="", max_length=100)
    sex: str = Field(default="", max_length=20)
    wants_gender_identity: str = Field(default="", max_length=10)
    gender_identity: str = Field(default="", max_length=50)
    gender_identity_other: str = Field(default="", max_length=100)
    wants_sexual_orientation: str = Field(default="", max_length=10)
    sexual_orientation: str = Field(default="", max_length=50)
    sexual_orientation_other: str = Field(default="", max_length=100)
    address: str = Field(default="", max_length=500)
    phone: str = Field(default="", max_length=30)
    email: str = Field(default="", max_length=254)
    education: str = Field(default="", max_length=50)
    occupation: str = Field(default="", max_length=100)
    health_unit: str = Field(default="", max_length=200)
    acs_name: str = Field(default="", max_length=200)
    nurse_name: str = Field(default="", max_length=200)
    doctor_name: str = Field(default="", max_length=200)
    emergency_contact: str = Field(default="", max_length=200)
    blood_type: str = Field(default="", max_length=10)
    medication_allergies: str = Field(default="", max_length=500)


class PatientPersonalRecordRead(PatientPersonalRecordSave):
    """Mesmos campos do save; leitura preenche defaults vazios."""


def personal_record_to_storage(data: PatientPersonalRecordSave) -> dict[str, Any]:
    return data.model_dump(mode="json")


def storage_to_personal_record(stored: dict[str, Any] | None) -> PatientPersonalRecordRead:
    if not stored:
        return PatientPersonalRecordRead()
    return PatientPersonalRecordRead.model_validate(stored)
