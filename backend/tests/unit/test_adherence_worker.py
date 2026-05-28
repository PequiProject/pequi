"""Testes unitários do adherence_worker."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.dose_log import AdherenceSnapshot, DoseLog
from pequi.models.treatment import Treatment, TreatmentStatus
from pequi.repositories.adherence_repo import AdherenceRepository
from pequi.services.adherence_service import AdherenceService
from pequi.workers.adherence_worker import adherence_job


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
    patient_id = uuid4()
    treatment_id = uuid4()
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
    treatment_id = uuid4()

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
    patient_id = uuid4()

    # Criar tratamento ativo
    active_treatment = Treatment(
        patient_id=patient_id,
        prescribed_by=uuid4(),
        regimen="MB",
        start_date=date(2026, 1, 1),
        expected_end=date(2026, 12, 31),
        status=TreatmentStatus.active,
    )

    # Criar tratamento completado
    completed_treatment = Treatment(
        patient_id=patient_id,
        prescribed_by=uuid4(),
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

    ctx = {"redis": mock_redis}

    # Criar tratamento ativo com doses
    patient_id = uuid4()
    treatment_id = uuid4()
    treatment = Treatment(
        patient_id=patient_id,
        prescribed_by=uuid4(),
        regimen="MB",
        start_date=date(2026, 1, 1),
        expected_end=date(2026, 12, 31),
        status=TreatmentStatus.active,
    )

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

    db_session.add_all([treatment, dose1, dose2, dose3])
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
