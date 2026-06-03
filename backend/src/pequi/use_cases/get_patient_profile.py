from uuid import UUID

from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.patient import PatientProfileRead


class GetPatientProfileUseCase:
    def __init__(self, patient_repo: PatientRepository):
        self.patient_repo = patient_repo

    async def execute(self, user_id: UUID) -> PatientProfileRead | None:
        patient = await self.patient_repo.get_or_create_by_user_id(user_id)
        return PatientProfileRead.model_validate(patient)
