# pequi/use_cases/upsert_daily_medication_progress.py
from uuid import UUID

from sqlalchemy.exc import IntegrityError

from pequi.core.exceptions import NotFoundError, ValidationFailedError
from pequi.repositories.daily_medication_progress_repo import (
    DailyMedicationProgressRepository,
)
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.daily_medication_progress import (
    DailyMedicationProgressResponse,
    DailyMedicationProgressUpsert,
    daily_medication_progress_to_response,
)


class UpsertDailyMedicationProgressUseCase:
    def __init__(
        self,
        progress_repo: DailyMedicationProgressRepository,
        patient_repo: PatientRepository,
    ) -> None:
        self._progress_repo = progress_repo
        self._patient_repo = patient_repo

    async def execute(
        self,
        user_id: UUID,
        data: DailyMedicationProgressUpsert,
    ) -> DailyMedicationProgressResponse:
        patient = await self._patient_repo.get_by_user_id(user_id)
        if patient is None:
            raise NotFoundError("PatientProfile")

        if data.taken_count > data.expected_count:
            raise ValidationFailedError("taken_count não pode ser maior que expected_count.")

        try:
            progress = await self._progress_repo.upsert(
                patient_id=patient.id,
                progress_date=data.progress_date,
                expected_count=data.expected_count,
                taken_count=data.taken_count,
            )
        except IntegrityError as exc:
            raise ValidationFailedError(
                "Não foi possível salvar o progresso diário de medicação."
            ) from exc

        return daily_medication_progress_to_response(progress)
