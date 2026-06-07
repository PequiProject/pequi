from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.dependencies import (
    get_actor_from_token,
    get_current_professional,
    get_current_user,
    get_db,
)
from pequi.core.rate_limit import limiter
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import SymptomRepository, TreatmentRepository
from pequi.schemas.treatment import SymptomResponse
from pequi.schemas.v1.dose_log import DoseLogCreateV1, DoseLogResponseV1
from pequi.schemas.v1.treatment import (
    AdherenceSnapshotResponseV1,
    TreatmentCreateV1,
    TreatmentResponseV1,
)
from pequi.use_cases.list_symptoms import ListSymptomsUseCase
from pequi.use_cases.v1.create_treatment import CreateTreatmentV1UseCase
from pequi.use_cases.v1.get_adherence import GetAdherenceV1UseCase
from pequi.use_cases.v1.get_treatment import GetTreatmentV1UseCase
from pequi.use_cases.v1.register_dose import RegisterDoseV1UseCase

router = APIRouter()
symptoms_router = APIRouter()


def _make_repos(
    session: AsyncSession,
) -> tuple[
    TreatmentRepository,
    PatientRepository,
    HealthProfessionalRepository,
    DoseRepository,
    SymptomRepository,
]:
    return (
        TreatmentRepository(session),
        PatientRepository(session),
        HealthProfessionalRepository(session),
        DoseRepository(session),
        SymptomRepository(session),
    )


@router.post("", response_model=TreatmentResponseV1, status_code=201)
@limiter.limit("10/minute")
async def create_treatment(
    request: Request,
    body: TreatmentCreateV1,
    professional_user_id: UUID = Depends(get_current_professional),
    session: AsyncSession = Depends(get_db),
) -> TreatmentResponseV1:
    treatment_repo, patient_repo, professional_repo, _, _ = _make_repos(session)
    use_case = CreateTreatmentV1UseCase(treatment_repo, patient_repo, professional_repo)
    return await use_case.execute(professional_user_id, body)


@router.get("/{treatment_id}", response_model=TreatmentResponseV1)
@limiter.limit("100/minute")
async def get_treatment(
    request: Request,
    treatment_id: UUID,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
) -> TreatmentResponseV1:
    actor_user_id, actor_role = actor
    treatment_repo, patient_repo, professional_repo, _, _ = _make_repos(session)
    use_case = GetTreatmentV1UseCase(treatment_repo, patient_repo, professional_repo)
    return await use_case.execute(actor_user_id, actor_role, treatment_id)


@router.post("/{treatment_id}/doses", response_model=DoseLogResponseV1, status_code=201)
@limiter.limit("20/minute")
async def register_dose(
    request: Request,
    treatment_id: UUID,
    body: DoseLogCreateV1,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
) -> DoseLogResponseV1:
    actor_user_id, actor_role = actor
    treatment_repo, patient_repo, professional_repo, dose_repo, _ = _make_repos(session)
    use_case = RegisterDoseV1UseCase(treatment_repo, dose_repo, patient_repo, professional_repo)
    return await use_case.execute(actor_user_id, actor_role, treatment_id, body)


@router.get("/{treatment_id}/adherence", response_model=AdherenceSnapshotResponseV1)
@limiter.limit("100/minute")
async def get_adherence(
    request: Request,
    treatment_id: UUID,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
) -> AdherenceSnapshotResponseV1:
    actor_user_id, actor_role = actor
    treatment_repo, patient_repo, professional_repo, _, _ = _make_repos(session)
    use_case = GetAdherenceV1UseCase(treatment_repo, patient_repo, professional_repo)
    return await use_case.execute(actor_user_id, actor_role, treatment_id)


@symptoms_router.get("", response_model=list[SymptomResponse])
@limiter.limit("50/minute")
async def list_symptoms(
    request: Request,
    _user_id: UUID = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[SymptomResponse]:
    _, _, _, _, symptom_repo = _make_repos(session)
    use_case = ListSymptomsUseCase(symptom_repo)
    return await use_case.execute()
