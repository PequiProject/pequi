import uuid
from uuid import UUID

from pequi.core.exceptions import ValidationFailedError
from pequi.models.treatment import Treatment, TreatmentRegimen, TreatmentStatus
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.patient_treatment import (
    MedicationChecklistResponse,
    PatientTreatmentRecordRead,
    PatientTreatmentRecordSave,
    storage_to_treatment_record,
    treatment_record_to_storage,
)
from pequi.schemas.treatment import TreatmentResponse
from pequi.use_cases.create_treatment import _calculate_expected_end


class GetPatientTreatmentRecordUseCase:
    def __init__(self, patient_repo: PatientRepository) -> None:
        self._patient_repo = patient_repo

    async def execute(self, user_id: UUID) -> PatientTreatmentRecordRead:
        patient = await self._patient_repo.get_or_create_by_user_id(user_id)
        stored = patient.treatment_record if isinstance(patient.treatment_record, dict) else None
        return storage_to_treatment_record(
            stored,
            diagnosis_date=patient.diagnosis_date,
            classification=patient.classification,
        )


class SavePatientTreatmentRecordUseCase:
    def __init__(
        self,
        patient_repo: PatientRepository,
        treatment_repo: TreatmentRepository,
    ) -> None:
        self._patient_repo = patient_repo
        self._treatment_repo = treatment_repo

    async def execute(
        self,
        user_id: UUID,
        data: PatientTreatmentRecordSave,
    ) -> PatientTreatmentRecordRead:
        patient = await self._patient_repo.get_or_create_by_user_id(user_id)
        record_json = treatment_record_to_storage(data)

        update_fields: dict = {"treatment_record": record_json}
        if data.diagnosis_date is not None:
            update_fields["diagnosis_date"] = data.diagnosis_date
        if data.classification is not None:
            update_fields["classification"] = data.classification

        await self._patient_repo.update(patient.id, **update_fields)
        await self._ensure_active_mdt(patient.id, data)

        refreshed = await self._patient_repo.get_by_id(patient.id)
        if refreshed is None:
            raise ValidationFailedError("Perfil do paciente não encontrado após atualização.")

        stored = (
            refreshed.treatment_record if isinstance(refreshed.treatment_record, dict) else None
        )
        return storage_to_treatment_record(
            stored,
            diagnosis_date=refreshed.diagnosis_date,
            classification=refreshed.classification,
        )

    async def _ensure_active_mdt(self, patient_id: UUID, data: PatientTreatmentRecordSave) -> None:
        if not data.classification or data.classification not in ("PB", "MB"):
            return
        if data.treatment_start_date is None:
            return

        existing = await self._treatment_repo.get_active_by_patient_id(patient_id)
        if existing is not None:
            return

        regimen = TreatmentRegimen(data.classification)
        expected_end = _calculate_expected_end(data.treatment_start_date, regimen)

        treatment = Treatment(
            id=uuid.uuid4(),
            patient_id=patient_id,
            regimen=regimen,
            start_date=data.treatment_start_date,
            expected_end=expected_end,
            status=TreatmentStatus.active,
            notes="Tratamento MDT iniciado a partir do registro do paciente no app.",
        )
        await self._treatment_repo.create(treatment)


class GetPatientActiveTreatmentUseCase:
    def __init__(
        self,
        patient_repo: PatientRepository,
        treatment_repo: TreatmentRepository,
    ) -> None:
        self._patient_repo = patient_repo
        self._treatment_repo = treatment_repo

    async def execute(self, user_id: UUID) -> TreatmentResponse | None:
        patient = await self._patient_repo.get_or_create_by_user_id(user_id)
        treatment = await self._treatment_repo.get_active_by_patient_id(patient.id)
        if treatment is None:
            return None
        return TreatmentResponse.model_validate(treatment)


class GetMedicationChecklistUseCase:
    def __init__(
        self,
        patient_repo: PatientRepository,
        treatment_repo: TreatmentRepository,
    ) -> None:
        self._patient_repo = patient_repo
        self._treatment_repo = treatment_repo

    async def execute(self, user_id: UUID) -> MedicationChecklistResponse:
        patient = await self._patient_repo.get_or_create_by_user_id(user_id)
        record = storage_to_treatment_record(
            patient.treatment_record if isinstance(patient.treatment_record, dict) else None,
            diagnosis_date=patient.diagnosis_date,
            classification=patient.classification,
        )
        active = await self._treatment_repo.get_active_by_patient_id(patient.id)

        return MedicationChecklistResponse(
            active_treatment_id=active.id if active else None,
            instituted_medications=record.instituted_medications,
            current_dose_medication=record.current_dose_medication,
            treatment_start_date=record.treatment_start_date,
            can_register_doses=active is not None and active.status == TreatmentStatus.active,
        )
