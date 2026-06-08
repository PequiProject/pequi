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
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.v1.dose_log import DoseLogCreateV1, DoseLogResponseV1


class RegisterDoseV1UseCase:
    """v1 — paciente ou profissional; contrato legado com campos supervisionados."""

    def __init__(
        self,
        treatment_repo: TreatmentRepository,
        dose_repo: DoseRepository,
        patient_repo: PatientRepository,
        professional_repo: HealthProfessionalRepository,
    ) -> None:
        self._treatment_repo = treatment_repo
        self._dose_repo = dose_repo
        self._patient_repo = patient_repo
        self._professional_repo = professional_repo

    async def execute(
        self,
        actor_user_id: uuid.UUID,
        actor_role: str,
        treatment_id: uuid.UUID,
        data: DoseLogCreateV1,
    ) -> DoseLogResponseV1:
        treatment = await self._treatment_repo.get_by_id(treatment_id)
        if treatment is None:
            raise NotFoundError("Treatment", str(treatment_id))

        registered_by: uuid.UUID | None = None

        if actor_role == "patient":
            await self._validate_patient_access(
                actor_user_id=actor_user_id,
                treatment=treatment,
                data=data,
            )
        elif actor_role == "health_professional":
            registered_by = await self._validate_professional_access(
                actor_user_id=actor_user_id,
                treatment=treatment,
                data=data,
            )
        else:
            raise ForbiddenError("Acesso negado.")

        dose_log = DoseLog(
            id=uuid.uuid4(),
            treatment_id=treatment_id,
            drug_name=data.drug_name,
            expected_at=data.expected_at,
            taken_at=data.taken_at,
            skipped=data.skipped,
            skip_reason=data.skip_reason,
            supervised=data.supervised,
            registered_by=registered_by,
        )
        try:
            dose_log = await self._dose_repo.create(dose_log)
        except ConflictError:
            raise ConflictError(
                f"Dose duplicada: já existe registro para '{data.drug_name}' "
                f"em {data.expected_at.isoformat()} neste tratamento."
            ) from None

        return DoseLogResponseV1.model_validate(dose_log)

    async def _validate_patient_access(
        self,
        actor_user_id: uuid.UUID,
        treatment,
        data: DoseLogCreateV1,
    ) -> None:
        if data.supervised and not data.via_consultation:
            raise ForbiddenError(
                "Dose supervisionada só pode ser registrada ao informar uma consulta realizada."
            )

        patient = await self._patient_repo.get_by_user_id(actor_user_id)
        if patient is None or patient.id != treatment.patient_id:
            raise ForbiddenError("Paciente não tem acesso a este tratamento.")

        if treatment.status != TreatmentStatus.active:
            raise ValidationFailedError(
                "Autoregistro permitido apenas em tratamentos com status 'active'."
            )

    async def _validate_professional_access(
        self,
        actor_user_id: uuid.UUID,
        treatment,
        data: DoseLogCreateV1,
    ) -> uuid.UUID:
        professional = await self._professional_repo.get_by_user_id(actor_user_id)
        if professional is None:
            raise ForbiddenError("Perfil de profissional não encontrado.")

        patient = await self._patient_repo.get_by_id(treatment.patient_id)
        if patient is None or patient.health_unit_id != professional.health_unit_id:
            raise ForbiddenError(
                "Profissional não tem acesso a tratamentos de pacientes de outra unidade."
            )

        if data.supervised and professional is None:
            raise ValidationFailedError(
                "Dose supervisionada deve ser registrada por um profissional."
            )

        return professional.user_id
