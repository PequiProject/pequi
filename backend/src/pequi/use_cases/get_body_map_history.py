from datetime import UTC, date, datetime, time
from uuid import UUID

from pequi.core.exceptions import ForbiddenError, NotFoundError, ValidationFailedError
from pequi.core.logging import get_logger
from pequi.models.body_map import BodyFindingType
from pequi.repositories.body_map_repo import BodyMapRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.body_map import BodyMapHistoryResponse

logger = get_logger(__name__)


class GetBodyMapHistoryUseCase:
    def __init__(
        self,
        body_map_repo: BodyMapRepository,
        patient_repo: PatientRepository,
        professional_repo: HealthProfessionalRepository,
    ) -> None:
        self._body_map_repo = body_map_repo
        self._patient_repo = patient_repo
        self._professional_repo = professional_repo

    async def execute(
        self,
        actor_user_id: UUID,
        actor_role: str,
        *,
        patient_id: UUID | None = None,
        body_area_id: UUID | None = None,
        finding_type: BodyFindingType | None = None,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[BodyMapHistoryResponse]:
        target_patient_id = await self._resolve_patient_id(actor_user_id, actor_role, patient_id)
        from_snapshot_at = (
            datetime.combine(from_date, time.min, tzinfo=UTC) if from_date is not None else None
        )
        to_snapshot_at = (
            datetime.combine(to_date, time.max.replace(microsecond=999999), tzinfo=UTC)
            if to_date is not None
            else None
        )
        items = await self._body_map_repo.list_history_by_patient(
            target_patient_id,
            body_area_id=body_area_id,
            finding_type=finding_type,
            from_date=from_snapshot_at,
            to_date=to_snapshot_at,
        )
        return [BodyMapHistoryResponse.model_validate(item) for item in items]

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
                raise ValidationFailedError(
                    "Profissional deve informar patient_id para consultar histórico."
                )

            professional = await self._professional_repo.get_by_user_id(actor_user_id)
            if professional is None:
                raise ForbiddenError("Perfil de profissional não encontrado.")

            patient = await self._patient_repo.get_by_id(patient_id)
            if patient is None:
                raise NotFoundError("PatientProfile", str(patient_id))

            if (
                not patient.health_unit_id
                or not professional.health_unit_id
                or patient.health_unit_id != professional.health_unit_id
            ):
                logger.warning(
                    "body_map.forbidden_cross_tenant_access",
                    professional_user_id=str(actor_user_id),
                    patient_id=str(patient_id),
                )
                raise ForbiddenError(
                    "Profissional não tem acesso ao histórico de pacientes de outra unidade."
                )

            logger.info(
                "audit.body_map_history.accessed_by_professional",
                professional_user_id=str(actor_user_id),
                patient_id=str(patient_id),
            )
            return patient.id

        raise ForbiddenError("Acesso negado.")
