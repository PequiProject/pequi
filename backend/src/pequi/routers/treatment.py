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
from pequi.schemas.dose_log import DoseLogCreate, DoseLogResponse
from pequi.schemas.treatment import (
    AdherenceSnapshotResponse,
    SymptomResponse,
    TreatmentCreate,
    TreatmentResponse,
)
from pequi.use_cases.create_treatment import CreateTreatmentUseCase
from pequi.use_cases.get_adherence import GetAdherenceUseCase
from pequi.use_cases.get_treatment import GetTreatmentUseCase
from pequi.use_cases.list_symptoms import ListSymptomsUseCase
from pequi.use_cases.register_dose import RegisterDoseUseCase

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


# ---------------------------------------------------------------------------
# POST /v1/treatments — apenas profissionais
# ---------------------------------------------------------------------------


@router.post("", response_model=TreatmentResponse, status_code=201)
@limiter.limit("10/minute")
async def create_treatment(
    request: Request,
    body: TreatmentCreate,
    professional_user_id: UUID = Depends(get_current_professional),
    session: AsyncSession = Depends(get_db),
) -> TreatmentResponse:
    treatment_repo, patient_repo, professional_repo, _, _ = _make_repos(session)
    use_case = CreateTreatmentUseCase(treatment_repo, patient_repo, professional_repo)
    return await use_case.execute(professional_user_id, body)


# ---------------------------------------------------------------------------
# GET /v1/treatments/{id} — paciente ou profissional
# ---------------------------------------------------------------------------


@router.get("/{treatment_id}", response_model=TreatmentResponse)
@limiter.limit("100/minute")
async def get_treatment(
    request: Request,
    treatment_id: UUID,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
) -> TreatmentResponse:
    actor_user_id, actor_role = actor

    treatment_repo, patient_repo, professional_repo, _, _ = _make_repos(session)
    use_case = GetTreatmentUseCase(treatment_repo, patient_repo, professional_repo)
    return await use_case.execute(actor_user_id, actor_role, treatment_id)


# ---------------------------------------------------------------------------
# POST /v1/treatments/{id}/doses — paciente ou profissional
# ---------------------------------------------------------------------------


@router.post("/{treatment_id}/doses", response_model=DoseLogResponse, status_code=201)
@limiter.limit("20/minute")
async def register_dose(
    request: Request,
    treatment_id: UUID,
    body: DoseLogCreate,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
) -> DoseLogResponse:
    actor_user_id, actor_role = actor

    treatment_repo, patient_repo, professional_repo, dose_repo, _ = _make_repos(session)
    use_case = RegisterDoseUseCase(treatment_repo, dose_repo, patient_repo, professional_repo)
    return await use_case.execute(actor_user_id, actor_role, treatment_id, body)


# ---------------------------------------------------------------------------
# GET /v1/treatments/{id}/adherence — paciente ou profissional
# ---------------------------------------------------------------------------


@router.get("/{treatment_id}/adherence", response_model=AdherenceSnapshotResponse)
@limiter.limit("100/minute")
async def get_adherence(
    request: Request,
    treatment_id: UUID,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
) -> AdherenceSnapshotResponse:
    actor_user_id, actor_role = actor

    treatment_repo, patient_repo, professional_repo, _, _ = _make_repos(session)
    use_case = GetAdherenceUseCase(treatment_repo, patient_repo, professional_repo)
    return await use_case.execute(actor_user_id, actor_role, treatment_id)


# ---------------------------------------------------------------------------
# GET /v1/symptoms — qualquer usuário autenticado
# Registrado em main.py como prefix="/v1/symptoms"
# ---------------------------------------------------------------------------


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
