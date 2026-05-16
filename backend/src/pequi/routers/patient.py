from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from pequi.schemas.patient import PatientProfileRead, PatientProfileUpdate
from pequi.use_cases.get_patient_profile import GetPatientProfileUseCase
from pequi.use_cases.update_patient_profile import UpdatePatientProfileUseCase

router = APIRouter()


@router.get("/me", response_model=PatientProfileRead)
async def get_my_profile(
    user_id: UUID = Depends(lambda: None),
    use_case: GetPatientProfileUseCase = Depends(),
):
    # Dependency wiring is done in application DI; this is a lightweight router definition.
    if user_id is None:
        raise HTTPException(status_code=401, detail="missing auth")
    profile = await use_case.execute(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="not found")
    return profile


@router.patch("/me", response_model=PatientProfileRead)
async def update_my_profile(
    body: PatientProfileUpdate,
    user_id: UUID = Depends(lambda: None),
    use_case: UpdatePatientProfileUseCase = Depends(),
):
    if user_id is None:
        raise HTTPException(status_code=401, detail="missing auth")
    updated = await use_case.execute(user_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="not found")
    return updated
