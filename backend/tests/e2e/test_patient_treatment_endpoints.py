"""E2E — endpoints de tratamento no router de pacientes."""

from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.auth import hash_password
from pequi.models.health_unit import HealthUnit
from pequi.models.patient import PatientProfile
from pequi.models.treatment import Treatment, TreatmentRegimen, TreatmentStatus
from pequi.models.user import User

pytestmark = pytest.mark.asyncio


async def _login_patient(async_client: AsyncClient, *, email: str, password: str) -> str:
    response = await async_client.post(
        "/v1/auth/login",
        json={"identifier": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


async def _seed_patient_with_active_treatment(
    db_session: AsyncSession,
    *,
    email: str = "treatment-e2e@example.com",
) -> tuple[User, Treatment]:
    user = User(
        email=email,
        username=email.split("@")[0],
        hashed_password=hash_password("patientpassword"),
        full_name="Patient E2E",
        role="patient",
    )
    db_session.add(user)
    await db_session.flush()

    unit = HealthUnit(name="UBS E2E", city="Cidade", state="SP", cnes="12345678901")
    db_session.add(unit)
    await db_session.flush()

    patient = PatientProfile(
        user_id=user.id,
        health_unit_id=unit.id,
        date_of_birth=date(1990, 1, 1),
        classification="PB",
    )
    db_session.add(patient)
    await db_session.flush()

    treatment = Treatment(
        patient_id=patient.id,
        regimen=TreatmentRegimen.PB,
        start_date=date(2025, 1, 10),
        expected_end=date(2025, 7, 10),
        status=TreatmentStatus.active,
    )
    db_session.add(treatment)
    await db_session.flush()
    return user, treatment


async def test_get_active_treatment_returns_200(
    create_tables,
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    user, treatment = await _seed_patient_with_active_treatment(db_session)
    token = await _login_patient(async_client, email=user.email, password="patientpassword")

    response = await async_client.get(
        "/v1/patients/me/active-treatment",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(treatment.id)
    assert data["regimen"] == "PB"


async def test_get_medication_checklist_returns_200(
    create_tables,
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    user, treatment = await _seed_patient_with_active_treatment(
        db_session,
        email="checklist-e2e@example.com",
    )
    token = await _login_patient(async_client, email=user.email, password="patientpassword")

    response = await async_client.get(
        "/v1/patients/me/medication-checklist",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["active_treatment_id"] == str(treatment.id)
    assert data["can_register_doses"] is True
