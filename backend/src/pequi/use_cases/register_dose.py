import uuid

from pequi.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationFailedError,
)
from pequi.models.dose_log import DoseLog
from pequi.models.treatment import TreatmentStatus
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.dose_log import DoseLogCreate, DoseLogResponse


class RegisterDoseUseCase:
    """Registra uma dose (tomada ou pulada) pelo paciente dono do tratamento.

    Regras de negócio:
    - Paciente pode registrar qualquer dose do próprio tratamento ativo.
    - Duplicidade (treatment_id + drug_name + expected_at) retorna ConflictError → HTTP 409.
    """

    def __init__(
        self,
        treatment_repo: TreatmentRepository,
        dose_repo: DoseRepository,
        patient_repo: PatientRepository,
    ) -> None:
        self._treatment_repo = treatment_repo
        self._dose_repo = dose_repo
        self._patient_repo = patient_repo

    async def execute(
        self,
        patient_user_id: uuid.UUID,
        treatment_id: uuid.UUID,
        data: DoseLogCreate,
    ) -> DoseLogResponse:
        treatment = await self._treatment_repo.get_by_id(treatment_id)
        if treatment is None:
            raise NotFoundError("Treatment", str(treatment_id))

        patient = await self._patient_repo.get_by_user_id(patient_user_id)
        if patient is None or patient.id != treatment.patient_id:
            raise ForbiddenError("Paciente não tem acesso a este tratamento.")

        if treatment.status != TreatmentStatus.active:
            raise ValidationFailedError(
                "Registro de dose permitido apenas em tratamentos com status 'active'."
            )

        duplicate = await self._dose_repo.exists_duplicate(
            treatment_id=treatment_id,
            drug_name=data.drug_name,
            expected_at=data.expected_at,
        )
        if duplicate:
            raise ConflictError(
                f"Dose duplicada: já existe registro para '{data.drug_name}' "
                f"em {data.expected_at.isoformat()} neste tratamento."
            )

        dose_log = DoseLog(
            id=uuid.uuid4(),
            treatment_id=treatment_id,
            drug_name=data.drug_name,
            expected_at=data.expected_at,
            taken_at=data.taken_at,
            skipped=data.skipped,
            skip_reason=data.skip_reason,
        )
        dose_log = await self._dose_repo.create(dose_log)
        return DoseLogResponse.model_validate(dose_log)
