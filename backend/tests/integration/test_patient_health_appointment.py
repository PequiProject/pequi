from datetime import UTC, date, datetime
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from pequi.core.auth import hash_password
from pequi.models.dose_log import DoseLog
from pequi.models.health_appointment import PatientHealthAppointment
from pequi.models.user import User
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_appointment_repo import HealthAppointmentRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.health_appointment import (
    AppointmentFollowUpDraftIn,
    HealthAppointmentCreate,
)
from pequi.schemas.patient_treatment import PatientTreatmentRecordSave
from pequi.use_cases.patient_health_appointment import (
    CreatePatientHealthAppointmentUseCase,
    ListPatientHealthAppointmentsUseCase,
    UpdatePatientHealthAppointmentUseCase,
)
from pequi.use_cases.patient_treatment_record import SavePatientTreatmentRecordUseCase
from tests.integration.test_dose_flow import (
    _create_health_unit,
    _create_patient,
    _create_treatment,
    _create_user,
)


@pytest.mark.asyncio
async def test_create_appointment_with_supervised_dose(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email=f"appt-{uuid4()}@test.com", role="patient")
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    await _create_treatment(db_session, patient=patient)

    patient_repo = PatientRepository(db_session)
    await SavePatientTreatmentRecordUseCase(
        patient_repo,
        TreatmentRepository(db_session),
    ).execute(
        patient_user.id,
        PatientTreatmentRecordSave(
            classification="PB",
            treatment_start_date=date(2026, 1, 1),
            scheme_rifampicina=True,
            scheme_dapsone=True,
        ),
    )

    create_uc = CreatePatientHealthAppointmentUseCase(
        patient_repo,
        HealthAppointmentRepository(db_session),
        TreatmentRepository(db_session),
        DoseRepository(db_session),
    )
    created = await create_uc.execute(
        patient_user.id,
        HealthAppointmentCreate(
            appointment_date=date(2026, 3, 15),
            appointment_time="09:30",
            location="UBS Centro",
            appointment_type="dose_supervisionada",
            performed=True,
            follow_up=AppointmentFollowUpDraftIn(
                register_supervised_dose=True,
                update_dose_from_consultation=True,
                dose_scheme_rifampicina=True,
                dose_scheme_dapsone=True,
            ),
        ),
    )

    assert created.performed is True
    assert created.status == "completed"
    assert created.follow_up is not None
    assert created.follow_up.get("supervised_dose") is not None

    listed = await ListPatientHealthAppointmentsUseCase(
        patient_repo,
        HealthAppointmentRepository(db_session),
    ).execute(patient_user.id)
    assert len(listed) == 1
    assert listed[0].id == created.id


@pytest.mark.asyncio
async def test_completed_appointment_survives_duplicate_supervised_dose(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(
        db_session,
        email=f"appt-duplicate-{uuid4()}@test.com",
        role="patient",
    )
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    treatment = await _create_treatment(db_session, patient=patient)

    duplicate = DoseLog(
        treatment_id=treatment.id,
        drug_name="Rifampicina",
        expected_at=datetime(2026, 5, 20, 8, 0, tzinfo=UTC),
    )
    db_session.add(duplicate)
    await db_session.flush()

    created = await CreatePatientHealthAppointmentUseCase(
        PatientRepository(db_session),
        HealthAppointmentRepository(db_session),
        TreatmentRepository(db_session),
        DoseRepository(db_session),
    ).execute(
        patient_user.id,
        HealthAppointmentCreate(
            appointment_date=date(2026, 5, 20),
            appointment_time="09:30",
            location="UBS Centro",
            appointment_type="dose_supervisionada",
            performed=True,
            follow_up=AppointmentFollowUpDraftIn(
                register_supervised_dose=True,
                dose_scheme_rifampicina=True,
                dose_scheme_dapsone=True,
            ),
        ),
    )

    appointment_count = await db_session.scalar(
        select(func.count())
        .select_from(PatientHealthAppointment)
        .where(PatientHealthAppointment.id == created.id)
    )
    assert appointment_count == 1

    doses = (
        await db_session.execute(
            select(DoseLog.drug_name).where(DoseLog.treatment_id == treatment.id)
        )
    ).scalars().all()
    assert sorted(doses) == ["Dapsona", "Rifampicina"]

    await db_session.refresh(patient)
    assert patient.treatment_record["scheme_rifampicina"] is True
    assert patient.treatment_record["scheme_dapsone"] is True


@pytest.mark.asyncio
async def test_complete_scheduled_appointment_updates_same_row(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email=f"upd-{uuid4()}@test.com", role="patient")
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    await _create_treatment(db_session, patient=patient)

    patient_repo = PatientRepository(db_session)
    appointment_repo = HealthAppointmentRepository(db_session)
    treatment_repo = TreatmentRepository(db_session)
    dose_repo = DoseRepository(db_session)

    scheduled = await CreatePatientHealthAppointmentUseCase(
        patient_repo,
        appointment_repo,
        treatment_repo,
        dose_repo,
    ).execute(
        patient_user.id,
        HealthAppointmentCreate(
            appointment_date=date(2026, 4, 10),
            appointment_time="14:00",
            location="UBS Sul",
            appointment_type="consulta",
            performed=False,
        ),
    )

    completed = await UpdatePatientHealthAppointmentUseCase(
        patient_repo,
        appointment_repo,
        treatment_repo,
        dose_repo,
    ).execute(
        patient_user.id,
        scheduled.id,
        HealthAppointmentCreate(
            appointment_date=date(2026, 4, 10),
            appointment_time="14:00",
            location="UBS Sul",
            appointment_type="consulta",
            performed=True,
            notes="Consulta realizada",
        ),
    )

    assert completed.id == scheduled.id
    assert completed.performed is True
    assert completed.status == "completed"

    listed = await ListPatientHealthAppointmentsUseCase(
        patient_repo,
        appointment_repo,
    ).execute(patient_user.id)
    assert len(listed) == 1
    assert listed[0].performed is True


@pytest.mark.asyncio
async def test_list_appointments_empty_for_new_patient(create_tables, db_session):
    user = User(
        email=f"new-{uuid4()}@test.com",
        username=f"new_{uuid4().hex[:8]}",
        hashed_password=hash_password("secret"),
        full_name="Novo Paciente",
        role="patient",
    )
    db_session.add(user)
    await db_session.flush()

    listed = await ListPatientHealthAppointmentsUseCase(
        PatientRepository(db_session),
        HealthAppointmentRepository(db_session),
    ).execute(user.id)
    assert listed == []
