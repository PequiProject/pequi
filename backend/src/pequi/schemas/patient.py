from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PatientProfileRead(BaseModel):
    id: UUID
    user_id: UUID
    health_unit_id: UUID | None = None
    date_of_birth: date | None = None
    sex: str | None = None
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    disability_grade: int | None = 0
    diagnosis_date: date | None = None
    classification: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PatientProfileUpdate(BaseModel):
    neighborhood: str | None = None
    city: str | None = None
    state: str | None = None
    disability_grade: int | None = None
    diagnosis_date: date | None = None
    classification: str | None = None

    model_config = ConfigDict(from_attributes=True)
