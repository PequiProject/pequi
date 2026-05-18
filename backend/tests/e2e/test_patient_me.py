from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.auth import hash_password
from pequi.models.health_unit import HealthUnit
from pequi.models.patient import PatientProfile
from pequi.models.user import User

pytestmark = pytest.mark.asyncio


async def test_get_me_unauthenticated(create_tables, async_client: AsyncClient):
    response = await async_client.get("/v1/patients/me")
    assert response.status_code == 401


async def test_get_me_wrong_role(
    create_tables, async_client: AsyncClient, db_session: AsyncSession
):
    # Create an admin user directly in DB
    admin_user = User(
        email="admin@example.com",
        hashed_password=hash_password("adminpassword"),
        full_name="Admin User",
        role="admin",
    )
    db_session.add(admin_user)
    await db_session.commit()

    # Log in
    login_response = await async_client.post(
        "/v1/auth/login",
        json={"email": "admin@example.com", "password": "adminpassword"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Try to access patient endpoint
    response = await async_client.get(
        "/v1/patients/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


async def test_get_me_success(create_tables, async_client: AsyncClient, db_session: AsyncSession):
    # Create a patient user directly in DB
    patient_user = User(
        email="patient@example.com",
        hashed_password=hash_password("patientpassword"),
        full_name="Patient User",
        role="patient",
    )
    db_session.add(patient_user)
    await db_session.commit()

    # Create Health Unit
    unit = HealthUnit(
        name="Posto de Saude",
        city="Cidade",
        state="ST",
        cnes="123456",
    )
    db_session.add(unit)
    await db_session.commit()

    # Create Patient Profile
    profile = PatientProfile(
        user_id=patient_user.id,
        health_unit_id=unit.id,
        date_of_birth=date(1990, 1, 1),
    )
    db_session.add(profile)
    await db_session.commit()

    # Log in
    login_response = await async_client.post(
        "/v1/auth/login",
        json={"email": "patient@example.com", "password": "patientpassword"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Access profile
    response = await async_client.get(
        "/v1/patients/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["date_of_birth"] == "1990-01-01"


async def test_patch_me_success(create_tables, async_client: AsyncClient, db_session: AsyncSession):
    # Create a patient user directly in DB
    patient_user = User(
        email="patient2@example.com",
        hashed_password=hash_password("patientpassword"),
        full_name="Patient User 2",
        role="patient",
    )
    db_session.add(patient_user)
    await db_session.commit()

    # Create Health Unit
    unit = HealthUnit(
        name="Posto de Saude 2",
        city="Cidade",
        state="ST",
        cnes="1234567",
    )
    db_session.add(unit)
    await db_session.commit()

    # Create Patient Profile
    profile = PatientProfile(
        user_id=patient_user.id,
        health_unit_id=unit.id,
        date_of_birth=date(1990, 1, 1),
    )
    db_session.add(profile)
    await db_session.commit()

    # Log in
    login_response = await async_client.post(
        "/v1/auth/login",
        json={"email": "patient2@example.com", "password": "patientpassword"},
    )
    token = login_response.json()["access_token"]

    # Update profile
    response = await async_client.patch(
        "/v1/patients/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"neighborhood": "New Neighborhood"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["neighborhood"] == "New Neighborhood"
