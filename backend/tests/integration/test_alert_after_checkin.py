"""Integração PEQ-101 — alertas automáticos após check-in."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from pequi.models.alert import AlertSeverity, AlertType
from pequi.models.dose_log import DoseLog
from pequi.models.symptom import Symptom, SymptomCategory
from pequi.repositories.alert_repo import AlertRepository
from pequi.repositories.checkin_repo import CheckinRepository
from pequi.repositories.dose_repo import DoseRepository
from pequi.schemas.checkin import CheckinCreate
from pequi.services.alert_service import AlertService
from tests.integration.test_dose_flow import (
    _create_health_unit,
    _create_patient,
    _create_professional,
    _create_treatment,
    _create_user,
)


async def _symptom(session) -> Symptom:
    s = Symptom(id=uuid4(), name="Dor", category=SymptomCategory.systemic)
    session.add(s)
    await session.flush()
    return s


@pytest.mark.asyncio
async def test_mood_decline_after_three_terrible_checkins(create_tables, db_session):
    hu = await _create_health_unit(db_session)
    user = await _create_user(db_session, email="al1@test.com", role="patient")
    patient = await _create_patient(db_session, user=user, health_unit=hu)
    symptom = await _symptom(db_session)
    repo = CheckinRepository(db_session)
    svc = AlertService(AlertRepository(db_session), repo, DoseRepository(db_session))
    data = CheckinCreate(mood="terrible", symptom_intensity=2, symptom_ids=[symptom.id])
    now = datetime.now(UTC)
    for days_ago in (2, 1):
        await repo.create(patient.id, data, checked_in_at=now - timedelta(days=days_ago))
    checkin = await repo.create(patient.id, data, checked_in_at=now)
    alerts = await svc.evaluate_after_checkin(checkin)
    assert any(
        a.type == AlertType.mood_decline and a.severity == AlertSeverity.medium for a in alerts
    )


@pytest.mark.asyncio
async def test_missed_doses_alert_when_four_missed_in_week(create_tables, db_session):
    hu = await _create_health_unit(db_session)
    pu = await _create_user(db_session, email="al2@test.com", role="patient")
    prof = await _create_user(db_session, email="pr2@test.com", role="health_professional")
    patient = await _create_patient(db_session, user=pu, health_unit=hu)
    await _create_professional(db_session, user=prof, health_unit=hu)
    treatment = await _create_treatment(db_session, patient=patient)
    symptom = await _symptom(db_session)
    now = datetime.now(UTC)
    for i in range(4):
        db_session.add(
            DoseLog(
                id=uuid4(),
                treatment_id=treatment.id,
                drug_name=f"Drug{i}",
                expected_at=now - timedelta(days=i + 1),
                skipped=False,
            )
        )
    await db_session.flush()
    repo = CheckinRepository(db_session)
    checkin = await repo.create(
        patient.id,
        CheckinCreate(mood="ok", symptom_intensity=3, symptom_ids=[symptom.id]),
    )
    alerts = await AlertService(
        AlertRepository(db_session), repo, DoseRepository(db_session)
    ).evaluate_after_checkin(checkin)
    assert any(
        a.type == AlertType.missed_doses and a.severity == AlertSeverity.high for a in alerts
    )
