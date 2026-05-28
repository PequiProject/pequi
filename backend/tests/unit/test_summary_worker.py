"""Testes unitários do summary_worker."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.checkin import Checkin
from pequi.models.health_professional import HealthProfessional
from pequi.models.health_unit import HealthUnit
from pequi.models.patient import PatientProfile
from pequi.models.treatment import Treatment, TreatmentStatus
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
    health_unit_id = uuid4()
    professional_user_id = uuid4()
    professional_id = uuid4()
    treatment_id = uuid4()

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
        date_of_birth=datetime(1990, 1, 1).date(),
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

    # Criar treatment ativo necessário para list_active_patients
    treatment = Treatment(
        id=treatment_id,
        patient_id=patient_id,
        prescribed_by=professional_id,
        regimen="MB",
        start_date=datetime(2026, 1, 1).date(),
        expected_end=datetime(2026, 12, 31).date(),
        status=TreatmentStatus.active,
    )
    db_session.add(treatment)
    await db_session.flush()

    # Criar checkins na semana atual (usar datetime.now() real)
    now = datetime.now(UTC)
    # Calcular a semana da mesma forma que o worker faz
    today = now.date()
    days_since_sunday = (today.weekday() + 1) % 7
    week_end = today - timedelta(days=days_since_sunday)
    week_start = week_end - timedelta(days=6)
    # Criar checkins dentro da semana calculada
    checkin1_date = datetime.combine(week_start + timedelta(days=1), datetime.min.time()).replace(tzinfo=UTC)
    checkin2_date = datetime.combine(week_start + timedelta(days=2), datetime.min.time()).replace(tzinfo=UTC)
    checkin1 = Checkin(
        id=uuid4(),
        patient_id=patient_id,
        symptom_intensity=5,
        mood="good",
        checked_in_at=checkin1_date,
    )
    checkin2 = Checkin(
        id=uuid4(),
        patient_id=patient_id,
        symptom_intensity=7,
        mood="ok",
        checked_in_at=checkin2_date,
    )
    db_session.add_all([checkin1, checkin2])
    await db_session.flush()
    await db_session.commit()

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
    async def mock_list_active_patients(self):
        return [uuid4()]

    async def mock_get_weekly_stats(self, *args, **kwargs):
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
