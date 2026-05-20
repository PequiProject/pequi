import uuid

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.treatment import AdherenceSnapshotResponse


class GetAdherenceUseCase:
    """Retorna o snapshot de adesão mais recente para um tratamento.

    Nunca recalcula — lê exclusivamente de ``adherence_snapshots``.
    Retorna NotFoundError se nenhum snapshot foi calculado ainda pelo worker.
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
    ) -> AdherenceSnapshotResponse:
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

        snapshot = await self._treatment_repo.get_latest_adherence_snapshot(treatment_id)
        if snapshot is None:
            raise NotFoundError(
                "AdherenceSnapshot",
                "Nenhum snapshot calculado ainda para este tratamento.",
            )

        return AdherenceSnapshotResponse.model_validate(snapshot)


async def _assert_access(
    *,
    actor_user_id: uuid.UUID,
    actor_role: str,
    treatment,
    patient_repo: PatientRepository,
    professional_repo: HealthProfessionalRepository,
) -> None:
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
