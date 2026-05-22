from datetime import UTC, datetime
from uuid import UUID

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.repositories.alert_repo import AlertRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.alert import AlertResolve, AlertResponse


class ResolveAlertUseCase:
    def __init__(
        self,
        alert_repo: AlertRepository,
        patient_repo: PatientRepository,
        professional_repo: HealthProfessionalRepository,
    ) -> None:
        self._alert_repo = alert_repo
        self._patient_repo = patient_repo
        self._professional_repo = professional_repo

    async def execute(
        self,
        professional_user_id: UUID,
        alert_id: UUID,
        data: AlertResolve,
    ) -> AlertResponse:
        alert = await self._alert_repo.get_by_id(alert_id)
        if alert is None:
            raise NotFoundError("Alert", str(alert_id))

        professional = await self._professional_repo.get_by_user_id(professional_user_id)
        if professional is None:
            raise ForbiddenError("Perfil de profissional não encontrado.")

        patient = await self._patient_repo.get_by_id(alert.patient_id)
        if patient is None or patient.health_unit_id != professional.health_unit_id:
            raise ForbiddenError(
                "Profissional não tem acesso a alertas de pacientes de outra unidade."
            )

        if alert.resolved:
            return AlertResponse.model_validate(alert)

        alert.resolved = True
        alert.resolved_at = datetime.now(UTC)
        alert.resolved_by = professional_user_id
        if data.notes is not None:
            alert.notes = data.notes

        alert = await self._alert_repo.save(alert)
        return AlertResponse.model_validate(alert)
