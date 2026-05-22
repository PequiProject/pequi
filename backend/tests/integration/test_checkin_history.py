"""PEQ-102 — histórico e detalhe de check-ins."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.models.symptom import Symptom, SymptomCategory
from pequi.repositories.checkin_repo import CheckinRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.checkin import CheckinCreate
from pequi.use_cases.get_checkin import GetCheckinUseCase
from pequi.use_cases.get_checkin_history import GetCheckinHistoryUseCase
from tests.integration.test_dose_flow import (
    _create_health_unit,
    _create_patient,
    _create_professional,
    _create_user,
)


async def _symptom(session) -> Symptom:
    s = Symptom(id=uuid4(), name="Fraqueza", category=SymptomCategory.systemic)
    session.add(s)
    await session.flush()
    return s


@pytest.mark.asyncio
async def test_history_lists_patient_checkins_newest_first(create_tables, db_session):
    hu = await _create_health_unit(db_session)
    user = await _create_user(db_session, email="h1@test.com", role="patient")
    patient = await _create_patient(db_session, user=user, health_unit=hu)
    symptom = await _symptom(db_session)
    repo = CheckinRepository(db_session)
    data = CheckinCreate(mood="ok", symptom_intensity=4, symptom_ids=[symptom.id])
    now = datetime.now(UTC)
    older = await repo.create(patient.id, data, checked_in_at=now - timedelta(days=2))
    newer = await repo.create(patient.id, data, checked_in_at=now - timedelta(days=1))

    result = await GetCheckinHistoryUseCase(repo, PatientRepository(db_session)).execute(user.id)

    assert result.total == 2
    assert result.items[0].id == newer.id
    assert result.items[1].id == older.id


@pytest.mark.asyncio
async def test_get_checkin_detail_for_patient(create_tables, db_session):
    hu = await _create_health_unit(db_session)
    user = await _create_user(db_session, email="h2@test.com", role="patient")
    patient = await _create_patient(db_session, user=user, health_unit=hu)
    symptom = await _symptom(db_session)
    checkin = await CheckinRepository(db_session).create(
        patient.id,
        CheckinCreate(mood="good", symptom_intensity=2, symptom_ids=[symptom.id]),
    )

    detail = await GetCheckinUseCase(
        CheckinRepository(db_session),
        PatientRepository(db_session),
        HealthProfessionalRepository(db_session),
    ).execute(user.id, "patient", checkin.id)

    assert detail.id == checkin.id
    assert detail.mood == "good"


@pytest.mark.asyncio
async def test_patient_cannot_view_other_patient_checkin(create_tables, db_session):
    hu = await _create_health_unit(db_session)
    u1 = await _create_user(db_session, email="h3a@test.com", role="patient")
    u2 = await _create_user(db_session, email="h3b@test.com", role="patient")
    p1 = await _create_patient(db_session, user=u1, health_unit=hu)
    await _create_patient(db_session, user=u2, health_unit=hu)
    symptom = await _symptom(db_session)
    checkin = await CheckinRepository(db_session).create(
        p1.id, CheckinCreate(mood="ok", symptom_intensity=1, symptom_ids=[symptom.id])
    )

    with pytest.raises(ForbiddenError):
        await GetCheckinUseCase(
            CheckinRepository(db_session),
            PatientRepository(db_session),
            HealthProfessionalRepository(db_session),
        ).execute(u2.id, "patient", checkin.id)


@pytest.mark.asyncio
async def test_get_checkin_not_found(create_tables, db_session):
    user = await _create_user(db_session, email="h4@test.com", role="patient")
    hu = await _create_health_unit(db_session)
    await _create_patient(db_session, user=user, health_unit=hu)

    with pytest.raises(NotFoundError):
        await GetCheckinUseCase(
            CheckinRepository(db_session),
            PatientRepository(db_session),
            HealthProfessionalRepository(db_session),
        ).execute(user.id, "patient", uuid4())
