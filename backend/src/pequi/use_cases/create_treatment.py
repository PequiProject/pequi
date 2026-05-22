import calendar
import uuid
from datetime import date

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.models.treatment import Treatment, TreatmentRegimen, TreatmentStatus
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.treatment import TreatmentCreate, TreatmentResponse

_REGIMEN_MONTHS = {
    TreatmentRegimen.PB: 6,
    TreatmentRegimen.MB: 12,
}


class CreateTreatmentUseCase:
    """Cria um tratamento MDT para um paciente.

    Apenas profissionais de saúde podem criar tratamentos, e somente para
    pacientes da mesma unidade de saúde.
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
        professional_user_id: uuid.UUID,
        data: TreatmentCreate,
    ) -> TreatmentResponse:
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
        expected_end = _calculate_expected_end(data.start_date, regimen)

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
        treatment = await self._treatment_repo.create(treatment)
        return TreatmentResponse.model_validate(treatment)


def _calculate_expected_end(start_date: date, regimen: TreatmentRegimen) -> date:
    """Adiciona N meses à data de início, limitando ao último dia do mês destino."""
    months = _REGIMEN_MONTHS[regimen]
    total_months = start_date.month - 1 + months
    year = start_date.year + total_months // 12
    month = total_months % 12 + 1
    day = min(start_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)
