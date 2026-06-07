import uuid

from pequi.core.exceptions import ConflictError, NotFoundError, ValidationFailedError
from pequi.models.treatment import Treatment, TreatmentRegimen, TreatmentStatus
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.treatment import TreatmentCreate, TreatmentResponse
from pequi.use_cases.treatment_schedule import calculate_expected_end


class CreateTreatmentUseCase:
    """v2 — paciente autenticado cria seu próprio tratamento MDT."""

    def __init__(
        self,
        treatment_repo: TreatmentRepository,
        patient_repo: PatientRepository,
    ) -> None:
        self._treatment_repo = treatment_repo
        self._patient_repo = patient_repo

    async def execute(
        self,
        patient_user_id: uuid.UUID,
        data: TreatmentCreate,
    ) -> TreatmentResponse:
        patient = await self._patient_repo.get_by_user_id(patient_user_id)
        if patient is None:
            raise NotFoundError("PatientProfile", str(patient_user_id))

        existing = await self._treatment_repo.get_active_by_patient_id(patient.id)
        if existing is not None:
            raise ValidationFailedError("Paciente já possui um tratamento ativo.")

        regimen = TreatmentRegimen(data.regimen)
        expected_end = calculate_expected_end(data.start_date, regimen)

        treatment = Treatment(
            id=uuid.uuid4(),
            patient_id=patient.id,
            regimen=regimen,
            start_date=data.start_date,
            expected_end=expected_end,
            status=TreatmentStatus.active,
            notes=data.notes,
        )
        try:
            treatment = await self._treatment_repo.create(treatment)
        except ConflictError:
            raise ConflictError("Paciente já possui um tratamento ativo.") from None

        return TreatmentResponse.model_validate(treatment)
