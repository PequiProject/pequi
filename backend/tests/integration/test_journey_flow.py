"""Testes de integração para GET /v1/journey (via use case)."""

from datetime import UTC, date, datetime
from uuid import uuid4

import pytest

from pequi.core.exceptions import NotFoundError
from pequi.models.health_appointment import PatientHealthAppointment
from pequi.models.health_unit import HealthUnit
from pequi.models.patient import PatientProfile
from pequi.models.treatment import Treatment, TreatmentRegimen, TreatmentStatus
from pequi.models.user import User
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_appointment_repo import HealthAppointmentRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.dose_log import DoseLogCreate
from pequi.use_cases.get_patient_journey import GetPatientJourneyUseCase
from pequi.use_cases.register_dose import RegisterDoseUseCase


async def _create_health_unit(session, *, name: str = "UBS Central") -> HealthUnit:
    hu = HealthUnit(id=uuid4(), name=name, city="Cidade", state="SP", cnes=str(uuid4())[:11])
    session.add(hu)
    await session.flush()
    return hu


async def _create_user(session, *, email: str) -> User:
    username = email.split("@")[0].replace(".", "_")[:30]
    user = User(
        id=uuid4(),
        email=email,
        username=username,
        hashed_password="$2b$12$placeholder",
        full_name="Test User",
        role="patient",
    )
    session.add(user)
    await session.flush()
    return user


async def _create_patient(session, *, user: User, health_unit: HealthUnit) -> PatientProfile:
    patient = PatientProfile(
        id=uuid4(),
        user_id=user.id,
        health_unit_id=health_unit.id,
        date_of_birth=date(1985, 3, 10),
        classification="PB",
    )
    session.add(patient)
    await session.flush()
    return patient


async def _create_treatment(session, *, patient: PatientProfile) -> Treatment:
    treatment = Treatment(
        id=uuid4(),
        patient_id=patient.id,
        regimen=TreatmentRegimen.PB,
        start_date=date(2025, 1, 10),
        expected_end=date(2025, 7, 10),
        status=TreatmentStatus.active,
    )
    session.add(treatment)
    await session.flush()
    return treatment


def _journey_use_case(session) -> GetPatientJourneyUseCase:
    return GetPatientJourneyUseCase(
        PatientRepository(session),
        TreatmentRepository(session),
        DoseRepository(session),
        HealthAppointmentRepository(session),
    )


@pytest.mark.asyncio
async def test_journey_returns_timeline_with_doses(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    user = await _create_user(db_session, email="journey1@test.com")
    patient = await _create_patient(db_session, user=user, health_unit=health_unit)
    treatment = await _create_treatment(db_session, patient=patient)

    register = RegisterDoseUseCase(
        TreatmentRepository(db_session),
        DoseRepository(db_session),
        PatientRepository(db_session),
    )
    await register.execute(
        user.id,
        treatment.id,
        DoseLogCreate(
            drug_name="Dapsona",
            expected_at=datetime(2025, 2, 5, 8, 0, tzinfo=UTC),
            taken_at=datetime(2025, 2, 5, 8, 30, tzinfo=UTC),
        ),
    )

    result = await _journey_use_case(db_session).execute(user.id)

    assert result.patient_id == patient.id
    assert result.regimen == "PB"
    assert result.start_date == date(2025, 1, 10)
    assert result.expected_end == date(2025, 7, 10)
    assert result.current_month >= 1
    assert len(result.months) == 6

    dose_events = [
        event for month in result.months for event in month.events if event.type == "dose_taken"
    ]
    assert len(dose_events) == 1
    assert result.summary.completed_doses == 1


@pytest.mark.asyncio
async def test_journey_includes_consultation_events(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    user = await _create_user(db_session, email="journey2@test.com")
    patient = await _create_patient(db_session, user=user, health_unit=health_unit)
    await _create_treatment(db_session, patient=patient)

    appointment = PatientHealthAppointment(
        id=uuid4(),
        patient_id=patient.id,
        appointment_date=date(2025, 2, 20),
        appointment_time="09:00",
        location="UBS Norte",
        appointment_type="consulta",
        professional="Dr. Silva",
        performed=True,
        status="completed",
        wants_follow_up_details=False,
    )
    db_session.add(appointment)
    await db_session.flush()

    result = await _journey_use_case(db_session).execute(user.id)

    consultation_events = [
        event
        for month in result.months
        for event in month.events
        if event.type == "consultation_registered"
    ]
    assert len(consultation_events) == 1


@pytest.mark.asyncio
async def test_journey_raises_not_found_without_active_treatment(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    user = await _create_user(db_session, email="journey3@test.com")
    await _create_patient(db_session, user=user, health_unit=health_unit)

    with pytest.raises(NotFoundError):
        await _journey_use_case(db_session).execute(user.id)
