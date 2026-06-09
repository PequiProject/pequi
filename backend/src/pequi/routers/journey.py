from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.dependencies import get_current_patient, get_db
from pequi.core.rate_limit import limiter
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_appointment_repo import HealthAppointmentRepository
from pequi.repositories.journey_event_repo import JourneyEventRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.journey import JourneyResponse
from pequi.use_cases.get_patient_journey import GetPatientJourneyUseCase

router = APIRouter()


@router.get("", response_model=JourneyResponse)
@limiter.limit("100/minute")
async def get_journey(
    request: Request,
    patient_user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> JourneyResponse:
    use_case = GetPatientJourneyUseCase(
        PatientRepository(session),
        TreatmentRepository(session),
        DoseRepository(session),
        HealthAppointmentRepository(session),
        JourneyEventRepository(session),
    )
    return await use_case.execute(patient_user_id)
