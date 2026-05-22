from uuid import UUID

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.repositories.alert_repo import AlertRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.alert import AlertListResponse, AlertResponse


class ListAlertsUseCase:
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
        actor_user_id: UUID,
        actor_role: str,
        *,
        patient_id: UUID | None = None,
        resolved: bool | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> AlertListResponse:
        target_patient_id = await self._resolve_patient_id(
            actor_user_id, actor_role, patient_id
        )
        items, total = await self._alert_repo.list_by_patient(
            target_patient_id,
            resolved=resolved,
            limit=limit,
            offset=offset,
        )
        return AlertListResponse(
            items=[AlertResponse.model_validate(a) for a in items],
            total=total,
        )

    async def _resolve_patient_id(
        self,
        actor_user_id: UUID,
        actor_role: str,
        patient_id: UUID | None,
    ) -> UUID:
        if actor_role == "patient":
            patient = await self._patient_repo.get_by_user_id(actor_user_id)
            if patient is None:
                raise NotFoundError("PatientProfile")
            return patient.id

        if actor_role == "health_professional":
            if patient_id is None:
                raise ForbiddenError(
                    "Profissional deve informar patient_id para listar alertas."
                )
            professional = await self._professional_repo.get_by_user_id(actor_user_id)
            if professional is None:
                raise ForbiddenError("Perfil de profissional não encontrado.")
            patient = await self._patient_repo.get_by_id(patient_id)
            if patient is None or patient.health_unit_id != professional.health_unit_id:
                raise ForbiddenError(
                    "Profissional não tem acesso a alertas de pacientes de outra unidade."
                )
            return patient.id

        raise ForbiddenError("Acesso negado.")
