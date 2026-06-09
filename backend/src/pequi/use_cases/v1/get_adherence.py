import uuid

from pequi.core.exceptions import NotFoundError
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.v1.treatment import AdherenceSnapshotResponseV1
from pequi.use_cases.v1.get_treatment import _assert_access


class GetAdherenceV1UseCase:
    """v1 — lê snapshot sem recalcular; paciente ou profissional."""

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
    ) -> AdherenceSnapshotResponseV1:
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

        return AdherenceSnapshotResponseV1.model_validate(snapshot)
