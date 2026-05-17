from datetime import date
from uuid import uuid4

import pytest

from pequi.models.health_unit import HealthUnit
from pequi.models.patient import PatientProfile
from pequi.repositories.patient_repo import PatientRepository
from pequi.use_cases.get_patient_profile import GetPatientProfileUseCase


@pytest.mark.asyncio
async def test_get_patient_profile(create_tables, db_session):
    # create health unit
    hu = HealthUnit(id=uuid4(), name="HU", city="Cidade", state="ST", cnes="123")
    db_session.add(hu)
    await db_session.flush()

    user_id = uuid4()
    from sqlalchemy import text
    await db_session.execute(text("INSERT INTO users (id) VALUES (:id)"), {"id": user_id})

    patient = PatientProfile(
        id=uuid4(),
        user_id=user_id,
        health_unit_id=hu.id,
        date_of_birth=date(1990, 1, 1),
    )
    db_session.add(patient)
    await db_session.flush()

    repo = PatientRepository(db_session)
    uc = GetPatientProfileUseCase(repo)

    result = await uc.execute(user_id)
    assert result is not None
    assert result.user_id == user_id
