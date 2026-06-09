# pequi/use_cases/get_daily_medication_summary.py
from datetime import date
from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.repositories.daily_medication_progress_repo import (
    DailyMedicationProgressRepository,
)
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.daily_medication_progress import DailyMedicationSummaryResponse


class GetDailyMedicationSummaryUseCase:
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
        progress_date: date,
    ) -> DailyMedicationSummaryResponse:
        patient = await self._patient_repo.get_by_user_id(user_id)
        if patient is None:
            raise NotFoundError("PatientProfile")

        progress = await self._progress_repo.get_by_patient_and_date(
            patient.id,
            progress_date,
        )

        if progress is None:
            return DailyMedicationSummaryResponse(
                progress_date=progress_date,
                expected_count=0,
                taken_count=0,
                remaining_count=0,
                completed=False,
            )

        return DailyMedicationSummaryResponse(
            progress_date=progress.progress_date,
            expected_count=progress.expected_count,
            taken_count=progress.taken_count,
            remaining_count=max(progress.expected_count - progress.taken_count, 0),
            completed=progress.expected_count > 0
            and progress.taken_count == progress.expected_count,
        )