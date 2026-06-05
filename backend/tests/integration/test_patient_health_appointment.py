from datetime import date
from uuid import uuid4

import pytest

from pequi.core.auth import hash_password
from pequi.models.user import User
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_appointment_repo import HealthAppointmentRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
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
    _create_professional,
    _create_treatment,
    _create_user,
)


@pytest.mark.asyncio
async def test_create_appointment_with_supervised_dose(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email=f"appt-{uuid4()}@test.com", role="patient")
    prof_user = await _create_user(
        db_session,
        email=f"prof-{uuid4()}@test.com",
        role="health_professional",
    )
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    professional = await _create_professional(db_session, user=prof_user, health_unit=health_unit)
    await _create_treatment(db_session, patient=patient, professional=professional)

    patient_repo = PatientRepository(db_session)
    await SavePatientTreatmentRecordUseCase(
        patient_repo,
        TreatmentRepository(db_session),
        HealthProfessionalRepository(db_session),
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
        HealthProfessionalRepository(db_session),
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
async def test_complete_scheduled_appointment_updates_same_row(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email=f"upd-{uuid4()}@test.com", role="patient")
    prof_user = await _create_user(
        db_session,
        email=f"prof-u-{uuid4()}@test.com",
        role="health_professional",
    )
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    professional = await _create_professional(db_session, user=prof_user, health_unit=health_unit)
    await _create_treatment(db_session, patient=patient, professional=professional)

    patient_repo = PatientRepository(db_session)
    appointment_repo = HealthAppointmentRepository(db_session)
    treatment_repo = TreatmentRepository(db_session)
    professional_repo = HealthProfessionalRepository(db_session)
    dose_repo = DoseRepository(db_session)

    scheduled = await CreatePatientHealthAppointmentUseCase(
        patient_repo,
        appointment_repo,
        treatment_repo,
        professional_repo,
        dose_repo,
    ).execute(
        patient_user.id,
        HealthAppointmentCreate(
            appointment_date=date(2026, 6, 27),
            appointment_time="15:30",
            location="UBS Centro",
            appointment_type="consulta",
            performed=False,
        ),
    )
    assert scheduled.status == "scheduled"

    completed = await UpdatePatientHealthAppointmentUseCase(
        patient_repo,
        appointment_repo,
        treatment_repo,
        professional_repo,
        dose_repo,
    ).execute(
        patient_user.id,
        scheduled.id,
        HealthAppointmentCreate(
            appointment_date=date(2026, 6, 27),
            appointment_time="15:30",
            location="UBS Centro",
            appointment_type="consulta",
            performed=True,
            follow_up=AppointmentFollowUpDraftIn(conduct="Retorno em 30 dias"),
        ),
    )

    assert completed.id == scheduled.id
    assert completed.status == "completed"
    assert completed.performed is True

    listed = await ListPatientHealthAppointmentsUseCase(
        patient_repo,
        appointment_repo,
    ).execute(patient_user.id)
    assert len(listed) == 1
    assert listed[0].id == scheduled.id
    assert listed[0].status == "completed"


@pytest.mark.asyncio
async def test_list_appointments_empty_for_new_patient(create_tables, db_session):
    user = User(
        id=uuid4(),
        email=f"new-{uuid4()}@test.com",
        username=f"u_{uuid4().hex[:8]}",
        hashed_password=hash_password("senha12345"),
        full_name="Novo Paciente",
        role="patient",
    )
    db_session.add(user)
    await db_session.flush()

    patient_repo = PatientRepository(db_session)
    listed = await ListPatientHealthAppointmentsUseCase(
        patient_repo,
        HealthAppointmentRepository(db_session),
    ).execute(user.id)
    assert listed == []
