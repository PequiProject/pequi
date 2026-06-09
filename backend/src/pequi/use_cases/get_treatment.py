import uuid

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.treatment import TreatmentResponse


class GetTreatmentUseCase:
    """Retorna um tratamento — somente o paciente dono pode acessá-lo."""

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
    ) -> TreatmentResponse:
        treatment = await self._treatment_repo.get_by_id(treatment_id)
        if treatment is None:
            raise NotFoundError("Treatment", str(treatment_id))

        patient = await self._patient_repo.get_by_user_id(patient_user_id)
        if patient is None or patient.id != treatment.patient_id:
            raise ForbiddenError("Paciente não tem acesso a este tratamento.")

        return TreatmentResponse.model_validate(treatment)
