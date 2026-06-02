"""Testes de integração para o fluxo de registro de doses (M3).

Usa banco de dados real (PostgreSQL via conftest). Não usa HTTP — chama
use cases diretamente para testar o comportamento observável no banco.
"""

from datetime import UTC, date, datetime
from uuid import uuid4

import pytest

from pequi.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from pequi.models.dose_log import AdherenceSnapshot
from pequi.models.health_professional import HealthProfessional
from pequi.models.health_unit import HealthUnit
from pequi.models.patient import PatientProfile
from pequi.models.treatment import Treatment, TreatmentRegimen, TreatmentStatus
from pequi.models.user import User
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.dose_log import DoseLogCreate
from pequi.use_cases.get_adherence import GetAdherenceUseCase
from pequi.use_cases.register_dose import RegisterDoseUseCase

# ---------------------------------------------------------------------------
# Helpers de fixtures
# ---------------------------------------------------------------------------


async def _create_health_unit(session, *, name: str = "UBS Central") -> HealthUnit:
    hu = HealthUnit(id=uuid4(), name=name, city="Cidade", state="SP", cnes=str(uuid4())[:11])
    session.add(hu)
    await session.flush()
    return hu


async def _create_user(session, *, email: str, role: str) -> User:
    username = email.split("@")[0].replace(".", "_").replace("-", "_")[:30]
    user = User(
        id=uuid4(),
        email=email,
        username=username,
        hashed_password="$2b$12$placeholder",
        full_name="Test User",
        role=role,
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
    )
    session.add(patient)
    await session.flush()
    return patient


async def _create_professional(
    session, *, user: User, health_unit: HealthUnit
) -> HealthProfessional:
    professional = HealthProfessional(
        id=uuid4(),
        user_id=user.id,
        health_unit_id=health_unit.id,
    )
    session.add(professional)
    await session.flush()
    return professional


async def _create_treatment(
    session,
    *,
    patient: PatientProfile,
    professional: HealthProfessional,
    status: TreatmentStatus = TreatmentStatus.active,
) -> Treatment:
    treatment = Treatment(
        id=uuid4(),
        patient_id=patient.id,
        prescribed_by=professional.id,
        regimen=TreatmentRegimen.PB,
        start_date=date(2026, 1, 1),
        expected_end=date(2026, 7, 1),
        status=status,
    )
    session.add(treatment)
    await session.flush()
    return treatment


def _make_use_case(session) -> RegisterDoseUseCase:
    return RegisterDoseUseCase(
        TreatmentRepository(session),
        DoseRepository(session),
        PatientRepository(session),
        HealthProfessionalRepository(session),
    )


# ---------------------------------------------------------------------------
# Testes
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_patient_can_register_daily_dose(create_tables, db_session):
    """Paciente registra dose diária do próprio tratamento ativo com sucesso."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient1@test.com", role="patient")
    prof_user = await _create_user(db_session, email="prof1@test.com", role="health_professional")
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    professional = await _create_professional(db_session, user=prof_user, health_unit=health_unit)
    treatment = await _create_treatment(db_session, patient=patient, professional=professional)

    data = DoseLogCreate(
        drug_name="Dapsona",
        expected_at=datetime(2026, 2, 15, 8, 0, tzinfo=UTC),
        taken_at=datetime(2026, 2, 15, 8, 30, tzinfo=UTC),
    )

    use_case = _make_use_case(db_session)
    result = await use_case.execute(patient_user.id, "patient", treatment.id, data)

    assert result.id is not None
    assert result.treatment_id == treatment.id
    assert result.drug_name == "Dapsona"
    assert result.supervised is False
    assert result.registered_by is None


@pytest.mark.asyncio
async def test_duplicate_dose_returns_conflict(create_tables, db_session):
    """Dose duplicada (treatment_id + drug_name + expected_at) lança ConflictError."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient2@test.com", role="patient")
    prof_user = await _create_user(db_session, email="prof2@test.com", role="health_professional")
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    professional = await _create_professional(db_session, user=prof_user, health_unit=health_unit)
    treatment = await _create_treatment(db_session, patient=patient, professional=professional)

    expected_at = datetime(2026, 3, 1, 8, 0, tzinfo=UTC)
    data = DoseLogCreate(drug_name="Clofazimina", expected_at=expected_at)

    use_case = _make_use_case(db_session)
    await use_case.execute(patient_user.id, "patient", treatment.id, data)

    with pytest.raises(ConflictError):
        await use_case.execute(patient_user.id, "patient", treatment.id, data)


@pytest.mark.asyncio
async def test_professional_from_another_unit_cannot_access(create_tables, db_session):
    """Profissional de outra unidade não pode registrar dose no tratamento."""
    unit_a = await _create_health_unit(db_session, name="UBS Norte")
    unit_b = await _create_health_unit(db_session, name="UBS Sul")

    patient_user = await _create_user(db_session, email="patient3@test.com", role="patient")
    prof_a_user = await _create_user(
        db_session, email="prof_a@test.com", role="health_professional"
    )
    prof_b_user = await _create_user(
        db_session, email="prof_b@test.com", role="health_professional"
    )

    patient = await _create_patient(db_session, user=patient_user, health_unit=unit_a)
    prof_a = await _create_professional(db_session, user=prof_a_user, health_unit=unit_a)
    await _create_professional(db_session, user=prof_b_user, health_unit=unit_b)

    treatment = await _create_treatment(db_session, patient=patient, professional=prof_a)

    data = DoseLogCreate(
        drug_name="Rifampicina",
        expected_at=datetime(2026, 3, 10, 8, 0, tzinfo=UTC),
    )

    use_case = _make_use_case(db_session)

    with pytest.raises(ForbiddenError):
        await use_case.execute(prof_b_user.id, "health_professional", treatment.id, data)


@pytest.mark.asyncio
async def test_patient_cannot_register_supervised_dose(create_tables, db_session):
    """Paciente não pode registrar dose supervisionada — retorna ForbiddenError."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient4@test.com", role="patient")
    prof_user = await _create_user(db_session, email="prof4@test.com", role="health_professional")
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    professional = await _create_professional(db_session, user=prof_user, health_unit=health_unit)
    treatment = await _create_treatment(db_session, patient=patient, professional=professional)

    data = DoseLogCreate(
        drug_name="Rifampicina",
        expected_at=datetime(2026, 2, 1, 10, 0, tzinfo=UTC),
        supervised=True,
    )

    use_case = _make_use_case(db_session)

    with pytest.raises(ForbiddenError):
        await use_case.execute(patient_user.id, "patient", treatment.id, data)


@pytest.mark.asyncio
async def test_patient_cannot_register_dose_on_inactive_treatment(create_tables, db_session):
    """Paciente não pode autoregistrar em tratamento não-ativo."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient5@test.com", role="patient")
    prof_user = await _create_user(db_session, email="prof5@test.com", role="health_professional")
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    professional = await _create_professional(db_session, user=prof_user, health_unit=health_unit)
    treatment = await _create_treatment(
        db_session,
        patient=patient,
        professional=professional,
        status=TreatmentStatus.completed,
    )

    data = DoseLogCreate(
        drug_name="Dapsona",
        expected_at=datetime(2026, 8, 1, 8, 0, tzinfo=UTC),
    )

    use_case = _make_use_case(db_session)

    from pequi.core.exceptions import ValidationFailedError

    with pytest.raises(ValidationFailedError):
        await use_case.execute(patient_user.id, "patient", treatment.id, data)


@pytest.mark.asyncio
async def test_get_adherence_returns_latest_snapshot(create_tables, db_session):
    """get_adherence retorna o snapshot mais recente quando disponível."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient6@test.com", role="patient")
    prof_user = await _create_user(db_session, email="prof6@test.com", role="health_professional")
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    professional = await _create_professional(db_session, user=prof_user, health_unit=health_unit)
    treatment = await _create_treatment(db_session, patient=patient, professional=professional)

    snapshot = AdherenceSnapshot(
        id=uuid4(),
        patient_id=patient.id,
        treatment_id=treatment.id,
        period_start=date(2026, 1, 1),
        period_end=date(2026, 1, 31),
        total_doses=30,
        taken_doses=25,
        adherence_pct="83.33",
        calculated_at=datetime(2026, 2, 1, 0, 0, tzinfo=UTC),
    )
    db_session.add(snapshot)
    await db_session.flush()

    use_case = GetAdherenceUseCase(
        TreatmentRepository(db_session),
        PatientRepository(db_session),
        HealthProfessionalRepository(db_session),
    )
    result = await use_case.execute(patient_user.id, "patient", treatment.id)

    assert result.treatment_id == treatment.id
    assert result.total_doses == 30
    assert result.taken_doses == 25


@pytest.mark.asyncio
async def test_get_adherence_raises_not_found_when_no_snapshot(create_tables, db_session):
    """Sem snapshot calculado, get_adherence lança NotFoundError."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient7@test.com", role="patient")
    prof_user = await _create_user(db_session, email="prof7@test.com", role="health_professional")
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    professional = await _create_professional(db_session, user=prof_user, health_unit=health_unit)
    treatment = await _create_treatment(db_session, patient=patient, professional=professional)

    use_case = GetAdherenceUseCase(
        TreatmentRepository(db_session),
        PatientRepository(db_session),
        HealthProfessionalRepository(db_session),
    )

    with pytest.raises(NotFoundError):
        await use_case.execute(patient_user.id, "patient", treatment.id)


@pytest.mark.asyncio
async def test_professional_registers_supervised_dose(create_tables, db_session):
    """Profissional registra dose supervisionada com registered_by preenchido."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient8@test.com", role="patient")
    prof_user = await _create_user(db_session, email="prof8@test.com", role="health_professional")
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    professional = await _create_professional(db_session, user=prof_user, health_unit=health_unit)
    treatment = await _create_treatment(db_session, patient=patient, professional=professional)

    data = DoseLogCreate(
        drug_name="Rifampicina",
        expected_at=datetime(2026, 2, 1, 9, 0, tzinfo=UTC),
        taken_at=datetime(2026, 2, 1, 9, 15, tzinfo=UTC),
        supervised=True,
    )

    use_case = _make_use_case(db_session)
    result = await use_case.execute(prof_user.id, "health_professional", treatment.id, data)

    assert result.supervised is True
    assert result.registered_by == prof_user.id
