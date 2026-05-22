from datetime import UTC, datetime
from uuid import UUID

from pequi.core.exceptions import ConflictError, NotFoundError, ValidationFailedError
from pequi.repositories.alert_repo import AlertRepository
from pequi.repositories.checkin_repo import CheckinRepository
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import SymptomRepository
from pequi.schemas.checkin import CheckinCreate, CheckinResponse, SymptomBrief
from pequi.services.alert_service import AlertService
from pequi.workers.job_enqueue import ArqJobEnqueuer, JobEnqueuer

_AI_FEEDBACK_INTENSITY_THRESHOLD = 7


def _to_response(checkin) -> CheckinResponse:
    symptoms = checkin.symptoms or []
    return CheckinResponse(
        id=checkin.id,
        patient_id=checkin.patient_id,
        mood=checkin.mood.value,
        symptom_intensity=checkin.symptom_intensity,
        symptom_ids=[s.id for s in symptoms],
        symptoms=[SymptomBrief.model_validate(s) for s in symptoms],
        general_notes=checkin.general_notes,
        ai_feedback=checkin.ai_feedback,
        ai_feedback_at=checkin.ai_feedback_at,
        checked_in_at=checkin.checked_in_at,
        created_at=checkin.created_at,
    )


class SubmitCheckinUseCase:
    def __init__(
        self,
        checkin_repo: CheckinRepository,
        patient_repo: PatientRepository,
        symptom_repo: SymptomRepository,
        alert_service: AlertService,
        job_enqueuer: JobEnqueuer | None = None,
    ) -> None:
        self._checkin_repo = checkin_repo
        self._patient_repo = patient_repo
        self._symptom_repo = symptom_repo
        self._alert_service = alert_service
        self._job_enqueuer = job_enqueuer or ArqJobEnqueuer()

    async def execute(self, user_id: UUID, data: CheckinCreate) -> CheckinResponse:
        patient = await self._patient_repo.get_by_user_id(user_id)
        if patient is None:
            raise NotFoundError("PatientProfile")

        today = datetime.now(UTC).date()
        if await self._checkin_repo.has_checkin_on_date(patient.id, today):
            raise ConflictError("Já existe um check-in registrado para hoje.")

        catalog = await self._symptom_repo.get_by_ids(data.symptom_ids)
        if len(catalog) != len(set(data.symptom_ids)):
            raise ValidationFailedError(
                "Um ou mais symptom_ids são inválidos ou não existem no catálogo."
            )

        checkin = await self._checkin_repo.create(patient.id, data)
        await self._alert_service.evaluate_after_checkin(checkin)

        if data.symptom_intensity >= _AI_FEEDBACK_INTENSITY_THRESHOLD:
            await self._job_enqueuer.enqueue_ai_feedback(checkin.id)

        return _to_response(checkin)


def build_alert_service(session) -> AlertService:
    return AlertService(
        AlertRepository(session),
        CheckinRepository(session),
        DoseRepository(session),
    )
