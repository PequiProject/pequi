from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.dependencies import get_current_patient, get_db
from pequi.core.rate_limit import limiter
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_appointment_repo import HealthAppointmentRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.health_appointment import (
    HealthAppointmentCreate,
    HealthAppointmentResponse,
    HealthAppointmentUpdate,
)
from pequi.schemas.patient import PatientProfileRead, PatientProfileUpdate
from pequi.schemas.patient_personal import (
    PatientPersonalRecordRead,
    PatientPersonalRecordSave,
)
from pequi.schemas.patient_treatment import (
    MedicationChecklistResponse,
    PatientTreatmentRecordRead,
    PatientTreatmentRecordSave,
)
from pequi.schemas.treatment import TreatmentResponse
from pequi.use_cases.get_patient_profile import GetPatientProfileUseCase
from pequi.use_cases.patient_health_appointment import (
    CreatePatientHealthAppointmentUseCase,
    ListPatientHealthAppointmentsUseCase,
    UpdatePatientHealthAppointmentUseCase,
)
from pequi.use_cases.patient_personal_record import (
    GetPatientPersonalRecordUseCase,
    SavePatientPersonalRecordUseCase,
)
from pequi.use_cases.patient_treatment_record import (
    GetMedicationChecklistUseCase,
    GetPatientActiveTreatmentUseCase,
    GetPatientTreatmentRecordUseCase,
    SavePatientTreatmentRecordUseCase,
)
from pequi.use_cases.update_patient_profile import UpdatePatientProfileUseCase

from pequi.repositories.checkin_repo import CheckinRepository
from pequi.schemas.patient_journey import PatientJourneyResponse
from pequi.use_cases.get_patient_journey import GetPatientJourneyUseCase

router = APIRouter()


def _treatment_repos(
    session: AsyncSession,
) -> tuple[
    PatientRepository,
    TreatmentRepository,
    HealthProfessionalRepository,
]:
    return (
        PatientRepository(session),
        TreatmentRepository(session),
        HealthProfessionalRepository(session),
    )


@router.get("/me", response_model=PatientProfileRead)
async def get_my_profile(
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
):
    use_case = GetPatientProfileUseCase(PatientRepository(session))
    profile = await use_case.execute(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="not found")
    return profile


@router.patch("/me", response_model=PatientProfileRead)
async def update_my_profile(
    body: PatientProfileUpdate,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
):
    use_case = UpdatePatientProfileUseCase(PatientRepository(session))
    updated = await use_case.execute(user_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="not found")
    return updated


@router.get("/me/personal-record", response_model=PatientPersonalRecordRead)
@limiter.limit("100/minute")
async def get_my_personal_record(
    request: Request,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> PatientPersonalRecordRead:
    use_case = GetPatientPersonalRecordUseCase(PatientRepository(session))
    return await use_case.execute(user_id)


@router.put("/me/personal-record", response_model=PatientPersonalRecordRead)
@limiter.limit("20/minute")
async def save_my_personal_record(
    request: Request,
    body: PatientPersonalRecordSave,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> PatientPersonalRecordRead:
    use_case = SavePatientPersonalRecordUseCase(PatientRepository(session))
    return await use_case.execute(user_id, body)


@router.get("/me/treatment-record", response_model=PatientTreatmentRecordRead)
@limiter.limit("100/minute")
async def get_my_treatment_record(
    request: Request,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> PatientTreatmentRecordRead:
    patient_repo, _, _ = _treatment_repos(session)
    use_case = GetPatientTreatmentRecordUseCase(patient_repo)
    return await use_case.execute(user_id)


@router.put("/me/treatment-record", response_model=PatientTreatmentRecordRead)
@limiter.limit("20/minute")
async def save_my_treatment_record(
    request: Request,
    body: PatientTreatmentRecordSave,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> PatientTreatmentRecordRead:
    patient_repo, treatment_repo, professional_repo = _treatment_repos(session)
    use_case = SavePatientTreatmentRecordUseCase(
        patient_repo,
        treatment_repo,
        professional_repo,
    )
    return await use_case.execute(user_id, body)


@router.get("/me/active-treatment", response_model=TreatmentResponse | None)
@limiter.limit("100/minute")
async def get_my_active_treatment(
    request: Request,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> TreatmentResponse | None:
    patient_repo, treatment_repo, _ = _treatment_repos(session)
    use_case = GetPatientActiveTreatmentUseCase(patient_repo, treatment_repo)
    return await use_case.execute(user_id)


@router.get("/me/medication-checklist", response_model=MedicationChecklistResponse)
@limiter.limit("100/minute")
async def get_my_medication_checklist(
    request: Request,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> MedicationChecklistResponse:
    patient_repo, treatment_repo, _ = _treatment_repos(session)
    use_case = GetMedicationChecklistUseCase(patient_repo, treatment_repo)
    return await use_case.execute(user_id)


@router.get("/me/appointments", response_model=list[HealthAppointmentResponse])
@limiter.limit("100/minute")
async def list_my_appointments(
    request: Request,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> list[HealthAppointmentResponse]:
    patient_repo = PatientRepository(session)
    appointment_repo = HealthAppointmentRepository(session)
    use_case = ListPatientHealthAppointmentsUseCase(patient_repo, appointment_repo)
    return await use_case.execute(user_id)


@router.post(
    "/me/appointments",
    response_model=HealthAppointmentResponse,
    status_code=201,
)
@limiter.limit("20/minute")
async def create_my_appointment(
    request: Request,
    body: HealthAppointmentCreate,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> HealthAppointmentResponse:
    patient_repo, treatment_repo, professional_repo = _treatment_repos(session)
    appointment_repo = HealthAppointmentRepository(session)
    dose_repo = DoseRepository(session)
    use_case = CreatePatientHealthAppointmentUseCase(
        patient_repo,
        appointment_repo,
        treatment_repo,
        professional_repo,
        dose_repo,
    )
    return await use_case.execute(user_id, body)


@router.patch(
    "/me/appointments/{appointment_id}",
    response_model=HealthAppointmentResponse,
)
@limiter.limit("20/minute")
async def update_my_appointment(
    request: Request,
    appointment_id: UUID,
    body: HealthAppointmentUpdate,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> HealthAppointmentResponse:
    patient_repo, treatment_repo, professional_repo = _treatment_repos(session)
    appointment_repo = HealthAppointmentRepository(session)
    dose_repo = DoseRepository(session)
    use_case = UpdatePatientHealthAppointmentUseCase(
        patient_repo,
        appointment_repo,
        treatment_repo,
        professional_repo,
        dose_repo,
    )
    return await use_case.execute(user_id, appointment_id, body)

@router.get("/me/journey", response_model=PatientJourneyResponse)
@limiter.limit("100/minute")
async def get_my_journey(
    request: Request,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> PatientJourneyResponse:
    use_case = GetPatientJourneyUseCase(
        PatientRepository(session),
        TreatmentRepository(session),
        HealthAppointmentRepository(session),
        CheckinRepository(session),
        DoseRepository(session),
    )
    return await use_case.execute(user_id)