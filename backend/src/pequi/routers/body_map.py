from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.dependencies import (
    get_actor_from_token,
    get_current_patient,
    get_current_user,
    get_db,
)
from pequi.core.rate_limit import user_limiter
from pequi.models.body_map import BodyFindingType
from pequi.repositories.body_map_repo import BodyMapRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.body_map import (
    BodyAreaResponse,
    BodyMapEntryResponse,
    BodyMapHistoryResponse,
    BodyMapUpdateRequest,
    BodyMapUploadRequest,
    UploadUrlResponse,
)
from pequi.services.storage_service import FakeStorageService
from pequi.use_cases.get_body_map_history import GetBodyMapHistoryUseCase
from pequi.use_cases.update_body_map import (
    GenerateBodyMapUploadUrlUseCase,
    GetBodyMapUseCase,
    ListBodyAreasUseCase,
    UpdateBodyMapUseCase,
)

router = APIRouter()
areas_router = APIRouter()


def _repos(
    session: AsyncSession,
) -> tuple[BodyMapRepository, PatientRepository, HealthProfessionalRepository]:
    return (
        BodyMapRepository(session),
        PatientRepository(session),
        HealthProfessionalRepository(session),
    )


@router.get("", response_model=list[BodyMapEntryResponse])
@user_limiter.limit("100/minute")
async def get_body_map(
    request: Request,
    patient_user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> list[BodyMapEntryResponse]:
    body_map_repo, patient_repo, _ = _repos(session)
    use_case = GetBodyMapUseCase(body_map_repo, patient_repo)
    return await use_case.execute(patient_user_id)


@router.put("", response_model=list[BodyMapEntryResponse])
@user_limiter.limit("20/minute")
async def update_body_map(
    request: Request,
    payload: BodyMapUpdateRequest,
    patient_user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> list[BodyMapEntryResponse]:
    body_map_repo, patient_repo, _ = _repos(session)
    use_case = UpdateBodyMapUseCase(body_map_repo, patient_repo)
    return await use_case.execute(patient_user_id, payload)


@router.get("/history", response_model=list[BodyMapHistoryResponse])
@user_limiter.limit("100/minute")
async def get_body_map_history(
    request: Request,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
    patient_id: UUID | None = Query(default=None),
    body_area_id: UUID | None = Query(default=None),
    finding_type: BodyFindingType | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
) -> list[BodyMapHistoryResponse]:
    actor_user_id, actor_role = actor
    body_map_repo, patient_repo, professional_repo = _repos(session)
    use_case = GetBodyMapHistoryUseCase(body_map_repo, patient_repo, professional_repo)
    return await use_case.execute(
        actor_user_id,
        actor_role,
        patient_id=patient_id,
        body_area_id=body_area_id,
        finding_type=finding_type,
        from_date=from_date,
        to_date=to_date,
    )


@router.post("/upload", response_model=UploadUrlResponse)
@user_limiter.limit("5/minute")
async def create_body_map_upload_url(
    request: Request,
    payload: BodyMapUploadRequest,
    patient_user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> UploadUrlResponse:
    _, patient_repo, _ = _repos(session)
    use_case = GenerateBodyMapUploadUrlUseCase(
        patient_repo,
        storage_service=FakeStorageService(),
    )
    return await use_case.execute(
        patient_user_id,
        filename=payload.filename,
        content_type=payload.content_type,
    )


@areas_router.get("", response_model=list[BodyAreaResponse])
@user_limiter.limit("200/minute")
async def list_body_areas(
    request: Request,
    _user_id: UUID = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[BodyAreaResponse]:
    body_map_repo, _, _ = _repos(session)
    use_case = ListBodyAreasUseCase(body_map_repo)
    body_areas = await use_case.execute()
    return [BodyAreaResponse.model_validate(area) for area in body_areas]
