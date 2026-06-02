from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.dependencies import (
    get_actor_from_token,
    get_current_patient,
    get_current_professional,
    get_db,
)
from pequi.core.rate_limit import user_limiter
from pequi.repositories.alert_repo import AlertRepository
from pequi.repositories.body_map_repo import BodyMapRepository
from pequi.repositories.checkin_repo import CheckinRepository
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import SymptomRepository
from pequi.schemas.alert import AlertListResponse, AlertResolve, AlertResponse
from pequi.schemas.checkin import CheckinCreate, CheckinListResponse, CheckinResponse
from pequi.services.alert_service import AlertService
from pequi.use_cases.get_checkin import GetCheckinUseCase
from pequi.use_cases.get_checkin_history import GetCheckinHistoryUseCase
from pequi.use_cases.list_alerts import ListAlertsUseCase
from pequi.use_cases.resolve_alert import ResolveAlertUseCase
from pequi.use_cases.submit_checkin import SubmitCheckinUseCase
from pequi.workers.job_enqueue import ArqJobEnqueuer

router = APIRouter()
alerts_router = APIRouter()


def _checkin_repos(
    session: AsyncSession,
) -> tuple[
    CheckinRepository,
    PatientRepository,
    SymptomRepository,
    AlertRepository,
    DoseRepository,
    HealthProfessionalRepository,
    BodyMapRepository,
]:
    return (
        CheckinRepository(session),
        PatientRepository(session),
        SymptomRepository(session),
        AlertRepository(session),
        DoseRepository(session),
        HealthProfessionalRepository(session),
        BodyMapRepository(session),
    )


@router.post("", response_model=CheckinResponse, status_code=201)
@user_limiter.limit("10/minute")
async def submit_checkin(
    request: Request,
    background_tasks: BackgroundTasks,
    body: CheckinCreate,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> CheckinResponse:
    (
        checkin_repo,
        patient_repo,
        symptom_repo,
        alert_repo,
        dose_repo,
        _,
        body_map_repo,
    ) = _checkin_repos(session)
    alert_service = AlertService(alert_repo, checkin_repo, dose_repo)
    use_case = SubmitCheckinUseCase(
        checkin_repo,
        patient_repo,
        symptom_repo,
        alert_service,
        body_map_repo,
    )
    result = await use_case.execute(user_id, body)

    # Enqueue AI feedback after transaction commit (runs after response is sent)
    if body.symptom_intensity >= 7:
        enqueuer = ArqJobEnqueuer()

        async def enqueue_after_commit() -> None:
            try:
                await enqueuer.enqueue_ai_feedback(result.id)
            except Exception:
                from pequi.core.logging import get_logger

                logger = get_logger(__name__)
                logger.exception("ai_feedback.enqueue_failed", checkin_id=str(result.id))

        background_tasks.add_task(enqueue_after_commit)

    return result


@router.get("", response_model=CheckinListResponse)
@user_limiter.limit("100/minute")
async def get_checkin_history(
    request: Request,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> CheckinListResponse:
    checkin_repo, patient_repo, _, _, _, _, _ = _checkin_repos(session)
    use_case = GetCheckinHistoryUseCase(checkin_repo, patient_repo)
    return await use_case.execute(user_id, limit=limit, offset=offset)


@router.get("/{checkin_id}", response_model=CheckinResponse)
@user_limiter.limit("100/minute")
async def get_checkin(
    request: Request,
    checkin_id: UUID,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
) -> CheckinResponse:
    actor_user_id, actor_role = actor
    checkin_repo, patient_repo, _, _, _, professional_repo, _ = _checkin_repos(session)
    use_case = GetCheckinUseCase(checkin_repo, patient_repo, professional_repo)
    return await use_case.execute(actor_user_id, actor_role, checkin_id)


@alerts_router.get("", response_model=AlertListResponse)
@user_limiter.limit("100/minute")
async def list_alerts(
    request: Request,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
    patient_id: UUID | None = Query(default=None),
    resolved: bool | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AlertListResponse:
    actor_user_id, actor_role = actor
    _, patient_repo, _, alert_repo, _, professional_repo, _ = _checkin_repos(session)
    use_case = ListAlertsUseCase(alert_repo, patient_repo, professional_repo)
    return await use_case.execute(
        actor_user_id,
        actor_role,
        patient_id=patient_id,
        resolved=resolved,
        limit=limit,
        offset=offset,
    )


@alerts_router.patch("/{alert_id}/resolve", response_model=AlertResponse)
@user_limiter.limit("20/minute")
async def resolve_alert(
    request: Request,
    alert_id: UUID,
    body: AlertResolve,
    professional_user_id: UUID = Depends(get_current_professional),
    session: AsyncSession = Depends(get_db),
) -> AlertResponse:
    _, patient_repo, _, alert_repo, _, professional_repo, _ = _checkin_repos(session)
    use_case = ResolveAlertUseCase(alert_repo, patient_repo, professional_repo)
    return await use_case.execute(professional_user_id, alert_id, body)
