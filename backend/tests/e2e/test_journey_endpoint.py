from datetime import date
from uuid import uuid4

import pytest

from pequi.core.auth import create_access_token
from pequi.models.health_unit import HealthUnit
from pequi.models.patient import PatientProfile
from pequi.models.treatment import Treatment, TreatmentRegimen, TreatmentStatus
from pequi.models.user import User


@pytest.mark.asyncio
async def test_patient_journey_endpoint_matches_frontend_contract(
    create_tables, db_session, async_client
):
    user = User(
        id=uuid4(),
        email=f"journey-endpoint-{uuid4()}@test.com",
        username=f"journey_{str(uuid4())[:8]}",
        hashed_password="$2b$12$placeholder",
        full_name="Journey Patient",
        role="patient",
    )
    unit = HealthUnit(id=uuid4(), name="UBS Journey", city="Cidade", state="SP", cnes="12345678901")
    db_session.add_all([user, unit])
    await db_session.flush()
    patient = PatientProfile(
        id=uuid4(),
        user_id=user.id,
        health_unit_id=unit.id,
        classification="PB",
    )
    db_session.add(patient)
    await db_session.flush()
    db_session.add(
        Treatment(
            id=uuid4(),
            patient_id=patient.id,
            regimen=TreatmentRegimen.PB,
            start_date=date(2026, 1, 1),
            expected_end=date(2026, 7, 1),
            status=TreatmentStatus.active,
        )
    )
    await db_session.flush()

    token = create_access_token(str(user.id), role="patient")
    response = await async_client.get(
        "/v1/patients/me/journey",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["summary"]["patient_id"] == str(patient.id)
    assert payload["summary"]["classification"] == "PB"
    assert payload["summary"]["treatment_duration_months"] == 6
    assert len(payload["months"]) == 6
    assert payload["months"][0]["month_index"] == 1
    assert payload["months"][-1]["month_index"] == 6
    assert "medication_summary" in payload["months"][0]
