"""Testes de integração — fluxo de check-in diário (M4 / PEQ-100)."""

from uuid import uuid4

import pytest

from pequi.core.exceptions import ConflictError, ForbiddenError, ValidationFailedError
from pequi.models.alert import AlertSeverity, AlertType
from pequi.models.symptom import Symptom, SymptomCategory
from pequi.repositories.alert_repo import AlertRepository
from pequi.repositories.checkin_repo import CheckinRepository
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import SymptomRepository
from pequi.schemas.checkin import CheckinCreate
from pequi.services.alert_service import AlertService
from pequi.use_cases.list_alerts import ListAlertsUseCase
from pequi.use_cases.submit_checkin import SubmitCheckinUseCase
from pequi.workers.job_enqueue import NoOpJobEnqueuer
from tests.integration.test_dose_flow import (
    _create_health_unit,
    _create_patient,
    _create_professional,
    _create_user,
)


async def _create_symptom(session, *, name: str = "Dormência") -> Symptom:
    symptom = Symptom(
        id=uuid4(),
        name=name,
        category=SymptomCategory.neurological,
        description="Test symptom",
    )
    session.add(symptom)
    await session.flush()
    return symptom


def _make_submit_use_case(session, enqueuer: NoOpJobEnqueuer | None = None) -> SubmitCheckinUseCase:
    checkin_repo = CheckinRepository(session)
    alert_service = AlertService(
        AlertRepository(session),
        checkin_repo,
        DoseRepository(session),
    )
    return SubmitCheckinUseCase(
        checkin_repo,
        PatientRepository(session),
        SymptomRepository(session),
        alert_service,
        job_enqueuer=enqueuer or NoOpJobEnqueuer(),
    )


@pytest.mark.asyncio
async def test_patient_submits_daily_checkin(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="chk1@test.com", role="patient")
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    symptom = await _create_symptom(db_session)

    data = CheckinCreate(
        mood="ok",
        symptom_intensity=5,
        symptom_ids=[symptom.id],
        general_notes="Dor leve nas mãos",
    )

    use_case = _make_submit_use_case(db_session)
    result = await use_case.execute(patient_user.id, data)

    assert result.patient_id == patient.id
    assert result.mood == "ok"
    assert result.symptom_intensity == 5
    assert symptom.id in result.symptom_ids
    assert result.ai_feedback is None


@pytest.mark.asyncio
async def test_duplicate_checkin_same_day_returns_conflict(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="chk2@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    symptom = await _create_symptom(db_session)

    data = CheckinCreate(mood="good", symptom_intensity=3, symptom_ids=[symptom.id])
    use_case = _make_submit_use_case(db_session)
    await use_case.execute(patient_user.id, data)

    with pytest.raises(ConflictError):
        await use_case.execute(patient_user.id, data)


@pytest.mark.asyncio
async def test_symptom_spike_critical_when_intensity_ge_8(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="chk3@test.com", role="patient")
    patient = await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    symptom = await _create_symptom(db_session)

    data = CheckinCreate(mood="bad", symptom_intensity=9, symptom_ids=[symptom.id])
    use_case = _make_submit_use_case(db_session)
    await use_case.execute(patient_user.id, data)

    alert_repo = AlertRepository(db_session)
    alerts, _ = await alert_repo.list_by_patient(patient.id)
    spike = next(a for a in alerts if a.type == AlertType.symptom_spike)
    assert spike.severity == AlertSeverity.critical


@pytest.mark.asyncio
async def test_ai_feedback_job_enqueued_when_intensity_ge_7(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="chk4@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    symptom = await _create_symptom(db_session)

    enqueuer = NoOpJobEnqueuer()
    data = CheckinCreate(mood="terrible", symptom_intensity=7, symptom_ids=[symptom.id])
    use_case = _make_submit_use_case(db_session, enqueuer=enqueuer)
    result = await use_case.execute(patient_user.id, data)

    assert len(enqueuer.enqueued) == 1
    assert enqueuer.enqueued[0] == result.id
    assert result.ai_feedback is None


@pytest.mark.asyncio
async def test_duplicate_symptom_ids_rejected(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="chk6b@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    symptom = await _create_symptom(db_session)
    data = CheckinCreate(mood="ok", symptom_intensity=3, symptom_ids=[symptom.id, symptom.id])
    with pytest.raises(ValidationFailedError):
        await _make_submit_use_case(db_session).execute(patient_user.id, data)


@pytest.mark.asyncio
async def test_enqueue_failure_does_not_block_checkin(create_tables, db_session):
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="chk6@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    symptom = await _create_symptom(db_session)

    class FailingEnqueuer(NoOpJobEnqueuer):
        async def enqueue_ai_feedback(self, checkin_id):
            raise RuntimeError("redis down")

    data = CheckinCreate(mood="bad", symptom_intensity=8, symptom_ids=[symptom.id])
    result = await _make_submit_use_case(db_session, enqueuer=FailingEnqueuer()).execute(
        patient_user.id, data
    )
    assert result.symptom_intensity == 8


@pytest.mark.asyncio
async def test_professional_from_another_unit_cannot_list_alerts(create_tables, db_session):
    unit_a = await _create_health_unit(db_session, name="UBS Norte")
    unit_b = await _create_health_unit(db_session, name="UBS Sul")

    patient_user = await _create_user(db_session, email="chk5@test.com", role="patient")
    prof_b_user = await _create_user(
        db_session, email="prof_b_chk@test.com", role="health_professional"
    )
    patient = await _create_patient(db_session, user=patient_user, health_unit=unit_a)
    await _create_professional(db_session, user=prof_b_user, health_unit=unit_b)

    use_case = ListAlertsUseCase(
        AlertRepository(db_session),
        PatientRepository(db_session),
        HealthProfessionalRepository(db_session),
    )

    with pytest.raises(ForbiddenError):
        await use_case.execute(
            prof_b_user.id,
            "health_professional",
            patient_id=patient.id,
        )
