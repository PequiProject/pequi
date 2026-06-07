import uuid

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.treatment import AdherenceSnapshotResponse


class GetAdherenceUseCase:
    """Retorna o snapshot de adesão mais recente — somente o paciente dono.

    Nunca recalcula — lê exclusivamente de ``adherence_snapshots``.
    Retorna NotFoundError se nenhum snapshot foi calculado ainda pelo worker.
    """

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
        treatment_id: uuid.UUID,
    ) -> AdherenceSnapshotResponse:
        treatment = await self._treatment_repo.get_by_id(treatment_id)
        if treatment is None:
            raise NotFoundError("Treatment", str(treatment_id))

        patient = await self._patient_repo.get_by_user_id(patient_user_id)
        if patient is None or patient.id != treatment.patient_id:
            raise ForbiddenError("Paciente não tem acesso a este tratamento.")

        snapshot = await self._treatment_repo.get_latest_adherence_snapshot(treatment_id)
        if snapshot is None:
            raise NotFoundError(
                "AdherenceSnapshot",
                "Nenhum snapshot calculado ainda para este tratamento.",
            )

        return AdherenceSnapshotResponse.model_validate(snapshot)
