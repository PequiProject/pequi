from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.repositories.checkin_repo import CheckinRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.checkin import CheckinListResponse
from pequi.use_cases.submit_checkin import _to_response


class GetCheckinHistoryUseCase:
    def __init__(
        self,
        checkin_repo: CheckinRepository,
        patient_repo: PatientRepository,
    ) -> None:
        self._checkin_repo = checkin_repo
        self._patient_repo = patient_repo

    async def execute(
        self,
        user_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> CheckinListResponse:
        patient = await self._patient_repo.get_by_user_id(user_id)
        if patient is None:
            raise NotFoundError("PatientProfile")

        items, total = await self._checkin_repo.list_by_patient(
            patient.id, limit=limit, offset=offset
        )
        return CheckinListResponse(
            items=[_to_response(c) for c in items],
            total=total,
        )
