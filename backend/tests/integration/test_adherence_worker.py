"""Testes de integração do adherence_worker."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.dose_log import AdherenceSnapshot, DoseLog
from pequi.models.health_professional import HealthProfessional
from pequi.models.health_unit import HealthUnit
from pequi.models.patient import PatientProfile
from pequi.models.treatment import Treatment, TreatmentStatus
from pequi.models.user import User
from pequi.repositories.adherence_repo import AdherenceRepository
from pequi.services.adherence_service import AdherenceService
from pequi.workers.adherence_worker import adherence_job


async def _create_patient_with_treatment(
    db_session: AsyncSession,
) -> tuple[UUID, UUID, UUID]:
    """Helper para criar paciente com tratamento ativo.

    Returns:
        (patient_id, treatment_id, professional_id)
    """
    patient_id = uuid4()
    treatment_id = uuid4()
    user_id = uuid4()
    health_unit_id = uuid4()
    professional_user_id = uuid4()
    professional_id = uuid4()

    # Criar user necessário para FK
    user = User(
        id=user_id,
        email=f"test{user_id}@example.com",
        hashed_password="hashed",
        full_name="Test User",
        role="patient",
    )
    db_session.add(user)
    await db_session.flush()

    # Criar health_unit necessário para FK
    health_unit = HealthUnit(
        id=health_unit_id,
        name="Test Health Unit",
        city="Test City",
        state="SP",
    )
    db_session.add(health_unit)
    await db_session.flush()

    # Criar patient_profile necessário para FK
    patient = PatientProfile(
        id=patient_id,
        user_id=user_id,
        health_unit_id=health_unit_id,
        date_of_birth=date(1990, 1, 1),
    )
    db_session.add(patient)
    await db_session.flush()

    # Criar user para health professional
    professional_user = User(
        id=professional_user_id,
        email=f"prof{professional_user_id}@example.com",
        hashed_password="hashed",
        full_name="Test Professional",
        role="health_professional",
    )
    db_session.add(professional_user)
    await db_session.flush()

    # Criar health professional necessário para FK
    health_professional = HealthProfessional(
        id=professional_id,
        user_id=professional_user_id,
        health_unit_id=health_unit_id,
    )
    db_session.add(health_professional)
    await db_session.flush()

    # Criar treatment necessário para FK
    treatment = Treatment(
        id=treatment_id,
        patient_id=patient_id,
        prescribed_by=professional_id,
        regimen="MB",
        start_date=date(2026, 1, 1),
        expected_end=date(2026, 12, 31),
        status=TreatmentStatus.active,
    )
    db_session.add(treatment)
    await db_session.flush()

    return patient_id, treatment_id, professional_id


@pytest.mark.asyncio
async def test_adherence_service_calculates_correctly():
    """Testa o cálculo de adesão do serviço."""
    service = AdherenceService()

    # 3 de 10 doses tomadas = 30%
    result = service.calculate_pct(10, 3)
    assert result == Decimal("30.00")

    # 0 doses = 0%
    result = service.calculate_pct(10, 0)
    assert result == Decimal("0.00")

    # 10 de 10 doses = 100%
    result = service.calculate_pct(10, 10)
    assert result == Decimal("100.00")

    # 0 total doses = 0% (evita divisão por zero)
    result = service.calculate_pct(0, 0)
    assert result == Decimal("0.00")


@pytest.mark.asyncio
async def test_adherence_repo_upsert_is_idempotent(db_session: AsyncSession):
    """Testa que upsert de snapshot é idempotente."""
    repo = AdherenceRepository(db_session)
    patient_id, treatment_id, _ = await _create_patient_with_treatment(db_session)
    period_start = date(2026, 1, 1)
    period_end = date(2026, 1, 7)

    # Primeiro upsert
    snapshot1 = await repo.upsert_snapshot(
        patient_id=patient_id,
        treatment_id=treatment_id,
        period_start=period_start,
        period_end=period_end,
        total_doses=10,
        taken_doses=7,
        adherence_pct=Decimal("70.00"),
    )
    assert snapshot1.adherence_pct == Decimal("70.00")

    # Commit para garantir que o snapshot foi persistido
    await db_session.commit()

    # Segundo upsert (deve atualizar, não duplicar)
    snapshot2 = await repo.upsert_snapshot(
        patient_id=patient_id,
        treatment_id=treatment_id,
        period_start=period_start,
        period_end=period_end,
        total_doses=10,
        taken_doses=8,
        adherence_pct=Decimal("80.00"),
    )
    assert snapshot2.id == snapshot1.id  # Mesmo ID
    assert snapshot2.adherence_pct == Decimal("80.00")  # Valores atualizados

    # Verificar que não há duplicatas
    from sqlalchemy import select

    stmt = select(AdherenceSnapshot).where(
        AdherenceSnapshot.treatment_id == treatment_id,
        AdherenceSnapshot.period_start == period_start,
        AdherenceSnapshot.period_end == period_end,
    )
    result = await db_session.execute(stmt)
    snapshots = list(result.scalars().all())
    assert len(snapshots) == 1


@pytest.mark.asyncio
async def test_adherence_repo_counts_doses_in_period(db_session: AsyncSession):
    """Testa contagem de doses em um período."""
    repo = AdherenceRepository(db_session)
    patient_id, treatment_id, _ = await _create_patient_with_treatment(db_session)

    # Criar doses no período
    now = datetime.now(UTC)
    week_ago = now - timedelta(days=7)

    dose1 = DoseLog(
        treatment_id=treatment_id,
        drug_name="Dapsone",
        expected_at=week_ago + timedelta(days=1),
        taken_at=week_ago + timedelta(days=1),
    )
    dose2 = DoseLog(
        treatment_id=treatment_id,
        drug_name="Rifampicin",
        expected_at=week_ago + timedelta(days=2),
        taken_at=None,  # Não tomada
    )
    dose3 = DoseLog(
        treatment_id=treatment_id,
        drug_name="Clofazimine",
        expected_at=week_ago + timedelta(days=3),
        taken_at=week_ago + timedelta(days=3),
    )

    db_session.add_all([dose1, dose2, dose3])
    await db_session.flush()

    # Contar doses no período
    total, taken = await repo.get_dose_counts_in_period(treatment_id, week_ago, now)
    assert total == 3
    assert taken == 2


@pytest.mark.asyncio
async def test_adherence_repo_lists_active_treatments(db_session: AsyncSession):
    """Testa listagem de tratamentos ativos."""
    repo = AdherenceRepository(db_session)
    patient_id, _, professional_id = await _create_patient_with_treatment(db_session)

    # Marcar tratamento existente como completed para não interferir
    stmt = (
        update(Treatment)
        .where(Treatment.patient_id == patient_id)
        .values(status=TreatmentStatus.completed)
    )
    await db_session.execute(stmt)
    await db_session.flush()

    # Criar tratamento ativo
    active_treatment = Treatment(
        patient_id=patient_id,
        prescribed_by=professional_id,
        regimen="MB",
        start_date=date(2026, 1, 1),
        expected_end=date(2026, 12, 31),
        status=TreatmentStatus.active,
    )

    # Criar tratamento completado
    completed_treatment = Treatment(
        patient_id=patient_id,
        prescribed_by=professional_id,
        regimen="PB",
        start_date=date(2025, 1, 1),
        expected_end=date(2025, 6, 30),
        status=TreatmentStatus.completed,
    )

    db_session.add_all([active_treatment, completed_treatment])
    await db_session.flush()

    # Listar tratamentos ativos
    active_treatments = await repo.list_active_treatments()
    assert len(active_treatments) == 1
    assert active_treatments[0].id == active_treatment.id
    assert active_treatments[0].status == TreatmentStatus.active


@pytest.mark.asyncio
async def test_adherence_job_processes_active_treatments(db_session: AsyncSession, mocker):
    """Testa que o job de adesão processa tratamentos ativos."""
    # Mock do Redis para evitar enqueue real
    mock_redis = mocker.AsyncMock()
    mock_redis.enqueue_job = mocker.AsyncMock()

    ctx = {"redis": mock_redis, "db_session": db_session}

    # Criar tratamento ativo com doses
    patient_id, treatment_id, _ = await _create_patient_with_treatment(db_session)

    now = datetime.now(UTC)
    week_ago = now - timedelta(days=7)

    dose1 = DoseLog(
        treatment_id=treatment_id,
        drug_name="Dapsone",
        expected_at=week_ago + timedelta(days=1),
        taken_at=week_ago + timedelta(days=1),
    )
    dose2 = DoseLog(
        treatment_id=treatment_id,
        drug_name="Rifampicin",
        expected_at=week_ago + timedelta(days=2),
        taken_at=week_ago + timedelta(days=2),
    )
    dose3 = DoseLog(
        treatment_id=treatment_id,
        drug_name="Clofazimine",
        expected_at=week_ago + timedelta(days=3),
        taken_at=None,
    )

    db_session.add_all([dose1, dose2, dose3])
    await db_session.flush()

    # Executar o job
    await adherence_job(ctx)

    # Verificar que snapshot foi criado
    from sqlalchemy import select

    stmt = select(AdherenceSnapshot).where(AdherenceSnapshot.treatment_id == treatment_id)
    result = await db_session.execute(stmt)
    snapshot = result.scalar_one_or_none()

    assert snapshot is not None
    assert snapshot.total_doses == 3
    assert snapshot.taken_doses == 2
    assert snapshot.adherence_pct == Decimal("66.67")  # 2/3 = 66.67%
