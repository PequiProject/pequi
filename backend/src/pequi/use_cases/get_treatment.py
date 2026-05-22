import uuid

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.treatment import TreatmentResponse


class GetTreatmentUseCase:
    """Retorna um tratamento verificando permissões de acesso.

    - Paciente: só acessa o próprio tratamento.
    - Profissional: só acessa tratamentos de pacientes da mesma unidade.
    """

    def __init__(
        self,
        treatment_repo: TreatmentRepository,
        patient_repo: PatientRepository,
        professional_repo: HealthProfessionalRepository,
    ) -> None:
        self._treatment_repo = treatment_repo
        self._patient_repo = patient_repo
        self._professional_repo = professional_repo

    async def execute(
        self,
        actor_user_id: uuid.UUID,
        actor_role: str,
        treatment_id: uuid.UUID,
    ) -> TreatmentResponse:
        treatment = await self._treatment_repo.get_by_id(treatment_id)
        if treatment is None:
            raise NotFoundError("Treatment", str(treatment_id))

        await _assert_access(
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            treatment=treatment,
            patient_repo=self._patient_repo,
            professional_repo=self._professional_repo,
        )

        return TreatmentResponse.model_validate(treatment)


async def _assert_access(
    *,
    actor_user_id: uuid.UUID,
    actor_role: str,
    treatment,
    patient_repo: PatientRepository,
    professional_repo: HealthProfessionalRepository,
) -> None:
    """Verifica se o ator tem permissão para acessar o tratamento."""
    if actor_role == "patient":
        patient = await patient_repo.get_by_user_id(actor_user_id)
        if patient is None or patient.id != treatment.patient_id:
            raise ForbiddenError("Paciente não tem acesso a este tratamento.")

    elif actor_role == "health_professional":
        professional = await professional_repo.get_by_user_id(actor_user_id)
        if professional is None:
            raise ForbiddenError("Perfil de profissional não encontrado.")

        patient = await patient_repo.get_by_id(treatment.patient_id)
        if patient is None:
            raise NotFoundError("PatientProfile", str(treatment.patient_id))

        if patient.health_unit_id != professional.health_unit_id:
            raise ForbiddenError(
                "Profissional não tem acesso a tratamentos de pacientes de outra unidade."
            )

    else:
        raise ForbiddenError("Acesso negado.")
