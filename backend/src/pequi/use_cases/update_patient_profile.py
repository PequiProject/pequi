from uuid import UUID

from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.patient import PatientProfileRead, PatientProfileUpdate


class UpdatePatientProfileUseCase:
    def __init__(self, patient_repo: PatientRepository):
        self.patient_repo = patient_repo

    async def execute(self, user_id: UUID, data: PatientProfileUpdate) -> PatientProfileRead | None:
        patient = await self.patient_repo.get_or_create_by_user_id(user_id)
        fields = {k: v for k, v in data.model_dump().items() if v is not None}
        if not fields:
            return PatientProfileRead.model_validate(patient)

        await self.patient_repo.update(patient.id, **fields)
        refreshed = await self.patient_repo.get_by_id(patient.id)
        if not refreshed:
            return None
        return PatientProfileRead.model_validate(refreshed)
