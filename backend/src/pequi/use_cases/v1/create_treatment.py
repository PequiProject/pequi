import uuid

from pequi.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from pequi.models.treatment import Treatment, TreatmentRegimen, TreatmentStatus
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.v1.treatment import TreatmentCreateV1, TreatmentResponseV1
from pequi.use_cases.treatment_schedule import calculate_expected_end


class CreateTreatmentV1UseCase:
    """v1 — profissional cria tratamento para paciente da mesma unidade."""

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
        professional_user_id: uuid.UUID,
        data: TreatmentCreateV1,
    ) -> TreatmentResponseV1:
        professional = await self._professional_repo.get_by_user_id(professional_user_id)
        if professional is None:
            raise NotFoundError("HealthProfessional", str(professional_user_id))

        patient = await self._patient_repo.get_by_id(data.patient_id)
        if patient is None:
            raise NotFoundError("PatientProfile", str(data.patient_id))

        if patient.health_unit_id != professional.health_unit_id:
            raise ForbiddenError(
                "Profissional não tem acesso a pacientes de outra unidade de saúde."
            )

        regimen = TreatmentRegimen(data.regimen)
        expected_end = calculate_expected_end(data.start_date, regimen)

        treatment = Treatment(
            id=uuid.uuid4(),
            patient_id=data.patient_id,
            prescribed_by=professional.id,
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

        return TreatmentResponseV1.model_validate(treatment)
