from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.dependencies import get_current_patient, get_db
from pequi.core.rate_limit import limiter
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.dose_log import DoseLogCreate, DoseLogResponse
from pequi.schemas.treatment import (
    AdherenceSnapshotResponse,
    TreatmentCreate,
    TreatmentResponse,
)
from pequi.use_cases.create_treatment import CreateTreatmentUseCase
from pequi.use_cases.get_adherence import GetAdherenceUseCase
from pequi.use_cases.get_treatment import GetTreatmentUseCase
from pequi.use_cases.register_dose import RegisterDoseUseCase

router = APIRouter()


def _make_repos(
    session: AsyncSession,
) -> tuple[TreatmentRepository, PatientRepository, DoseRepository]:
    return (
        TreatmentRepository(session),
        PatientRepository(session),
        DoseRepository(session),
    )


@router.post("", response_model=TreatmentResponse, status_code=201)
@limiter.limit("10/minute")
async def create_treatment(
    request: Request,
    body: TreatmentCreate,
    patient_user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> TreatmentResponse:
    treatment_repo, patient_repo, _ = _make_repos(session)
    use_case = CreateTreatmentUseCase(treatment_repo, patient_repo)
    return await use_case.execute(patient_user_id, body)


@router.get("/{treatment_id}", response_model=TreatmentResponse)
@limiter.limit("100/minute")
async def get_treatment(
    request: Request,
    treatment_id: UUID,
    patient_user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> TreatmentResponse:
    treatment_repo, patient_repo, _ = _make_repos(session)
    use_case = GetTreatmentUseCase(treatment_repo, patient_repo)
    return await use_case.execute(patient_user_id, treatment_id)


@router.post("/{treatment_id}/doses", response_model=DoseLogResponse, status_code=201)
@limiter.limit("20/minute")
async def register_dose(
    request: Request,
    treatment_id: UUID,
    body: DoseLogCreate,
    patient_user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> DoseLogResponse:
    treatment_repo, patient_repo, dose_repo = _make_repos(session)
    use_case = RegisterDoseUseCase(treatment_repo, dose_repo, patient_repo)
    return await use_case.execute(patient_user_id, treatment_id, body)


@router.get("/{treatment_id}/adherence", response_model=AdherenceSnapshotResponse)
@limiter.limit("100/minute")
async def get_adherence(
    request: Request,
    treatment_id: UUID,
    patient_user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> AdherenceSnapshotResponse:
    treatment_repo, patient_repo, _ = _make_repos(session)
    use_case = GetAdherenceUseCase(treatment_repo, patient_repo)
    return await use_case.execute(patient_user_id, treatment_id)
