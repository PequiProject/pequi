from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.exc import IntegrityError

from pequi.core.exceptions import ConflictError, NotFoundError, ValidationFailedError
from pequi.core.logging import get_logger
from pequi.repositories.body_map_repo import BodyMapRepository
from pequi.repositories.checkin_repo import CheckinRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import SymptomRepository
from pequi.schemas.checkin import CheckinCreate, CheckinResponse, checkin_to_response
from pequi.services.alert_service import AlertService
from pequi.use_cases.update_body_map import create_body_map_snapshot

logger = get_logger(__name__)
_AI_FEEDBACK_INTENSITY_THRESHOLD = 7
_DUPLICATE_CHECKIN_MSG = "Já existe um check-in registrado para hoje."


class SubmitCheckinUseCase:
    def __init__(
        self,
        checkin_repo: CheckinRepository,
        patient_repo: PatientRepository,
        symptom_repo: SymptomRepository,
        alert_service: AlertService,
        body_map_repo: BodyMapRepository | None = None,
    ) -> None:
        self._checkin_repo = checkin_repo
        self._patient_repo = patient_repo
        self._symptom_repo = symptom_repo
        self._alert_service = alert_service
        self._body_map_repo = body_map_repo

    async def execute(self, user_id: UUID, data: CheckinCreate) -> CheckinResponse:
        patient = await self._patient_repo.get_by_user_id(user_id)
        if patient is None:
            raise NotFoundError("PatientProfile")

        if len(data.symptom_ids) != len(set(data.symptom_ids)):
            raise ValidationFailedError("symptom_ids não pode conter duplicatas.")

        today = datetime.now(UTC).date()
        if await self._checkin_repo.has_checkin_on_date(patient.id, today):
            raise ConflictError(_DUPLICATE_CHECKIN_MSG)

        catalog = await self._symptom_repo.get_by_ids(data.symptom_ids)
        if len(catalog) != len(set(data.symptom_ids)):
            raise ValidationFailedError(
                "Um ou mais symptom_ids são inválidos ou não existem no catálogo."
            )

        try:
            checkin = await self._checkin_repo.create(patient.id, data)
        except IntegrityError as exc:
            cname = getattr(getattr(exc, "orig", None), "constraint_name", None) or ""
            if cname == "uq_checkins_patient_one_per_day":
                raise ConflictError(_DUPLICATE_CHECKIN_MSG) from exc
            if "checkin_symptoms" in cname:
                raise ValidationFailedError("symptom_ids não pode conter duplicatas.") from exc
            raise

        if self._body_map_repo is not None:
            await create_body_map_snapshot(
                body_map_repo=self._body_map_repo,
                patient_id=patient.id,
                checkin_id=checkin.id,
            )

        await self._alert_service.evaluate_after_checkin(checkin)
        return checkin_to_response(checkin)
