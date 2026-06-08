"""E2E — contrato legado v1 de tratamentos e doses."""

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.auth import create_access_token, hash_password
from pequi.models.dose_log import DoseLog
from pequi.models.health_professional import HealthProfessional
from pequi.models.health_unit import HealthUnit
from pequi.models.patient import PatientProfile
from pequi.models.user import User

pytestmark = pytest.mark.asyncio


async def _seed_v1_actors(
    db_session: AsyncSession,
) -> tuple[User, User, PatientProfile, HealthProfessional]:
    unit = HealthUnit(
        id=uuid4(),
        name="UBS V1",
        city="Cidade",
        state="SP",
        cnes=str(uuid4())[:11],
    )
    db_session.add(unit)
    await db_session.flush()

    patient_user = User(
        id=uuid4(),
        email=f"patient-v1-{uuid4()}@test.com",
        username=f"patient_v1_{uuid4().hex[:8]}",
        hashed_password=hash_password("patientpassword"),
        full_name="Patient V1",
        role="patient",
    )
    professional_user = User(
        id=uuid4(),
        email=f"professional-v1-{uuid4()}@test.com",
        username=f"professional_v1_{uuid4().hex[:8]}",
        hashed_password=hash_password("professionalpassword"),
        full_name="Professional V1",
        role="health_professional",
    )
    db_session.add_all([patient_user, professional_user])
    await db_session.flush()

    patient = PatientProfile(
        id=uuid4(),
        user_id=patient_user.id,
        health_unit_id=unit.id,
        date_of_birth=date(1990, 1, 1),
    )
    professional = HealthProfessional(
        id=uuid4(),
        user_id=professional_user.id,
        health_unit_id=unit.id,
    )
    db_session.add_all([patient, professional])
    await db_session.flush()
    return patient_user, professional_user, patient, professional


async def test_v1_treatment_contract_preserves_professional_fields(
    create_tables,
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    patient_user, professional_user, patient, professional = await _seed_v1_actors(db_session)
    professional_token = create_access_token(professional_user.id, "health_professional")
    patient_token = create_access_token(patient_user.id, "patient")

    create_response = await async_client.post(
        "/v1/treatments",
        headers={"Authorization": f"Bearer {professional_token}"},
        json={
            "patient_id": str(patient.id),
            "regimen": "PB",
            "start_date": "2026-01-01",
            "notes": "Tratamento legado",
        },
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["prescribed_by"] == str(professional.id)

    treatment_id = created["id"]
    patient_get = await async_client.get(
        f"/v1/treatments/{treatment_id}",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert patient_get.status_code == 200
    assert patient_get.json()["prescribed_by"] == str(professional.id)

    professional_get = await async_client.get(
        f"/v1/treatments/{treatment_id}",
        headers={"Authorization": f"Bearer {professional_token}"},
    )
    assert professional_get.status_code == 200
    assert professional_get.json()["prescribed_by"] == str(professional.id)

    dose_response = await async_client.post(
        f"/v1/treatments/{treatment_id}/doses",
        headers={"Authorization": f"Bearer {professional_token}"},
        json={
            "drug_name": "Rifampicina",
            "expected_at": "2026-02-01T08:00:00Z",
            "taken_at": "2026-02-01T08:15:00Z",
            "supervised": True,
        },
    )
    assert dose_response.status_code == 201
    dose = dose_response.json()
    assert dose["supervised"] is True
    assert dose["registered_by"] == str(professional_user.id)

    persisted = await db_session.scalar(
        select(DoseLog).where(
            DoseLog.treatment_id == UUID(treatment_id),
            DoseLog.drug_name == "Rifampicina",
            DoseLog.expected_at == datetime(2026, 2, 1, 8, 0, tzinfo=UTC),
        )
    )
    assert persisted is not None
    assert persisted.supervised is True
    assert persisted.registered_by == professional_user.id
