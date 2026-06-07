import calendar
import uuid
from datetime import date

from pequi.core.exceptions import NotFoundError, ValidationFailedError
from pequi.models.treatment import Treatment, TreatmentRegimen, TreatmentStatus
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.treatment import TreatmentCreate, TreatmentResponse

_REGIMEN_MONTHS = {
    TreatmentRegimen.PB: 6,
    TreatmentRegimen.MB: 12,
}


class CreateTreatmentUseCase:
    """Cria um tratamento MDT para o paciente autenticado."""

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
        expected_end = _calculate_expected_end(data.start_date, regimen)

        treatment = Treatment(
            id=uuid.uuid4(),
            patient_id=patient.id,
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
