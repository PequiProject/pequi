"""Testes unitários do summary_worker."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.checkin import Checkin
from pequi.models.patient import PatientProfile
from pequi.models.user import User
from pequi.models.weekly_summary import WeeklySymptomSummary
from pequi.repositories.weekly_summary_repo import WeeklySummaryRepository
from pequi.workers.summary_worker import summary_job


@pytest.mark.asyncio
async def test_summary_job_processes_active_patients(db_session: AsyncSession, mocker):
    """Testa que o job de resumo processa pacientes ativos."""
    # Mock do logger para evitar logs reais
    mocker.patch("pequi.workers.summary_worker.logger")

    patient_id = uuid4()
    user_id = uuid4()

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

    # Criar patient_profile necessário para FK
    patient = PatientProfile(
        id=patient_id,
        user_id=user_id,
        date_of_birth=datetime(1990, 1, 1).date(),
    )
    db_session.add(patient)
    await db_session.flush()

    # Criar checkins na semana
    now = datetime.now(UTC)

    checkin1 = Checkin(
        id=uuid4(),
        patient_id=patient_id,
        symptom_intensity=5,
        mood="good",
        created_at=now - timedelta(days=1),
    )
    checkin2 = Checkin(
        id=uuid4(),
        patient_id=patient_id,
        symptom_intensity=7,
        mood="neutral",
        created_at=now - timedelta(days=3),
    )
    db_session.add_all([checkin1, checkin2])
    await db_session.flush()

    # Executar o job
    ctx = {"db_session": db_session}
    await summary_job(ctx)

    # Verificar que summary foi criado
    stmt = select(WeeklySymptomSummary).where(WeeklySymptomSummary.patient_id == patient_id)
    result = await db_session.execute(stmt)
    summary = result.scalar_one_or_none()

    assert summary is not None
    assert summary.checkin_count == 2


@pytest.mark.asyncio
async def test_summary_job_handles_errors_gracefully(db_session: AsyncSession, mocker):
    """Testa que o job trata erros gracefully."""
    # Mock do logger para capturar erros
    mock_logger = mocker.MagicMock()
    mocker.patch("pequi.workers.summary_worker.logger", mock_logger)

    # Mock do repo para lançar erro
    async def mock_list_active_patients():
        return [uuid4()]

    async def mock_get_weekly_stats(*args, **kwargs):
        raise Exception("Test error")

    mocker.patch.object(
        WeeklySummaryRepository,
        "list_active_patients",
        mock_list_active_patients,
    )
    mocker.patch.object(
        WeeklySummaryRepository,
        "get_weekly_stats",
        mock_get_weekly_stats,
    )

    # Executar o job - não deve lançar exceção
    ctx = {"db_session": db_session}
    await summary_job(ctx)

    # Verificar que erro foi logado
    assert mock_logger.error.called
