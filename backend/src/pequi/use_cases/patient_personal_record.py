from uuid import UUID

from pequi.core.exceptions import ValidationFailedError
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.patient_personal import (
    PatientPersonalRecordRead,
    PatientPersonalRecordSave,
    personal_record_to_storage,
    storage_to_personal_record,
)


class GetPatientPersonalRecordUseCase:
    def __init__(self, patient_repo: PatientRepository) -> None:
        self._patient_repo = patient_repo

    async def execute(self, user_id: UUID) -> PatientPersonalRecordRead:
        patient = await self._patient_repo.get_or_create_by_user_id(user_id)
        stored = patient.personal_record if isinstance(patient.personal_record, dict) else None
        return storage_to_personal_record(stored)


class SavePatientPersonalRecordUseCase:
    def __init__(self, patient_repo: PatientRepository) -> None:
        self._patient_repo = patient_repo

    async def execute(
        self,
        user_id: UUID,
        data: PatientPersonalRecordSave,
    ) -> PatientPersonalRecordRead:
        patient = await self._patient_repo.get_or_create_by_user_id(user_id)
        record_json = personal_record_to_storage(data)

        update_fields: dict = {"personal_record": record_json}
        if data.birth_date is not None:
            update_fields["date_of_birth"] = data.birth_date
        if data.sex:
            update_fields["sex"] = data.sex[:10]

        await self._patient_repo.update(patient.id, **update_fields)

        refreshed = await self._patient_repo.get_by_id(patient.id)
        if refreshed is None:
            raise ValidationFailedError("Perfil do paciente não encontrado após atualização.")

        stored = refreshed.personal_record if isinstance(refreshed.personal_record, dict) else None
        return storage_to_personal_record(stored)
