from uuid import UUID

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.core.logging import get_logger
from pequi.repositories.checkin_repo import CheckinRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.checkin import CheckinResponse, checkin_to_response

logger = get_logger(__name__)


class GetCheckinUseCase:
    def __init__(
        self,
        checkin_repo: CheckinRepository,
        patient_repo: PatientRepository,
        professional_repo: HealthProfessionalRepository,
    ) -> None:
        self._checkin_repo = checkin_repo
        self._patient_repo = patient_repo
        self._professional_repo = professional_repo

    async def execute(
        self,
        actor_user_id: UUID,
        actor_role: str,
        checkin_id: UUID,
    ) -> CheckinResponse:
        checkin = await self._checkin_repo.get_by_id(checkin_id)
        if checkin is None:
            raise NotFoundError("Checkin", str(checkin_id))

        if actor_role == "patient":
            patient = await self._patient_repo.get_by_user_id(actor_user_id)
            if patient is None or patient.id != checkin.patient_id:
                raise ForbiddenError("Paciente não tem acesso a este check-in.")
        elif actor_role == "health_professional":
            await self._validate_professional_access(actor_user_id, checkin.patient_id)
            logger.info(
                "audit.checkin.accessed_by_professional",
                professional_user_id=str(actor_user_id),
                patient_id=str(checkin.patient_id),
                checkin_id=str(checkin_id),
            )
        else:
            raise ForbiddenError("Acesso negado.")

        return checkin_to_response(checkin)

    async def _validate_professional_access(
        self,
        actor_user_id: UUID,
        patient_id: UUID,
    ) -> None:
        professional = await self._professional_repo.get_by_user_id(actor_user_id)
        if professional is None:
            raise ForbiddenError("Perfil de profissional não encontrado.")

        patient = await self._patient_repo.get_by_id(patient_id)
        if patient is None or patient.health_unit_id != professional.health_unit_id:
            raise ForbiddenError(
                "Profissional não tem acesso a dados de pacientes de outra unidade."
            )
