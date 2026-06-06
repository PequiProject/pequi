"""Integração: caderneta Meu tratamento + checklist de medicamentos."""

from datetime import date
from uuid import uuid4

import pytest

from pequi.models.health_professional import HealthProfessional
from pequi.models.health_unit import HealthUnit
from pequi.models.treatment import TreatmentRegimen, TreatmentStatus
from pequi.models.user import User
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.patient_treatment import PatientTreatmentRecordSave
from pequi.use_cases.patient_treatment_record import (
    GetMedicationChecklistUseCase,
    GetPatientTreatmentRecordUseCase,
    SavePatientTreatmentRecordUseCase,
)


async def _seed_professional(db_session) -> HealthProfessional:
    unit = HealthUnit(
        id=uuid4(),
        name="UBS Teste",
        city="Test",
        state="GO",
        cnes=str(uuid4())[:11],
    )
    db_session.add(unit)
    await db_session.flush()

    user = User(
        id=uuid4(),
        email=f"prof-{uuid4()}@test.com",
        username=f"prof_{uuid4().hex[:8]}",
        hashed_password="x",
        full_name="Profissional Teste",
        role="health_professional",
    )
    db_session.add(user)
    await db_session.flush()

    professional = HealthProfessional(
        id=uuid4(),
        user_id=user.id,
        health_unit_id=unit.id,
    )
    db_session.add(professional)
    await db_session.flush()
    return professional


@pytest.mark.asyncio
async def test_save_and_load_treatment_record(create_tables, db_session):
    await _seed_professional(db_session)

    user = User(
        id=uuid4(),
        email=f"patient-{uuid4()}@test.com",
        username=f"pat_{uuid4().hex[:8]}",
        hashed_password="x",
        full_name="Paciente Teste",
        role="patient",
    )
    db_session.add(user)
    await db_session.flush()

    patient_repo = PatientRepository(db_session)
    treatment_repo = TreatmentRepository(db_session)
    professional_repo = HealthProfessionalRepository(db_session)

    save_uc = SavePatientTreatmentRecordUseCase(
        patient_repo,
        treatment_repo,
        professional_repo,
    )
    payload = PatientTreatmentRecordSave(
        diagnosis_date=date(2025, 1, 10),
        classification="PB",
        treatment_start_date=date(2025, 2, 1),
        current_dose_medication="Rifampicina + Dapsona",
        instituted_medications=[
            {"name": "Dapsona", "dose": "100", "unit": "mg", "frequency": "dia"},
        ],
        scheme_dapsone=True,
        scheme_rifampicina=True,
    )
    saved = await save_uc.execute(user.id, payload)
    assert saved.classification == "PB"
    assert saved.current_dose_medication == "Rifampicina + Dapsona"
    assert len(saved.instituted_medications) == 1

    loaded = await GetPatientTreatmentRecordUseCase(patient_repo).execute(user.id)
    assert loaded.classification == "PB"
    assert loaded.current_dose_medication == "Rifampicina + Dapsona"

    patient = await patient_repo.get_by_user_id(user.id)
    active = await treatment_repo.get_active_by_patient_id(patient.id)
    assert active is not None
    assert active.regimen == TreatmentRegimen.PB
    assert active.status == TreatmentStatus.active

    checklist = await GetMedicationChecklistUseCase(patient_repo, treatment_repo).execute(user.id)
    assert checklist.active_treatment_id == active.id
    assert checklist.can_register_doses is True
    assert checklist.instituted_medications[0].name == "Dapsona"
    assert checklist.treatment_start_date == date(2025, 2, 1)
