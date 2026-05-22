"""Testes unitários do AlertService — regras de negócio M4."""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from pequi.models.alert import AlertSeverity, AlertType
from pequi.models.checkin import Checkin, CheckinMood
from pequi.services.alert_service import AlertService


def _make_checkin(*, intensity: int = 5, mood: CheckinMood = CheckinMood.ok) -> Checkin:
    checkin = MagicMock(spec=Checkin)
    checkin.id = uuid4()
    checkin.patient_id = uuid4()
    checkin.symptom_intensity = intensity
    checkin.mood = mood
    return checkin


@pytest.mark.asyncio
async def test_symptom_spike_critical_when_intensity_ge_8():
    alert_repo = AsyncMock()
    alert_repo.create.side_effect = lambda a: a
    checkin_repo = AsyncMock()
    checkin_repo.get_recent_moods.return_value = []
    dose_repo = AsyncMock()
    dose_repo.count_missed_doses_in_week.return_value = 0

    service = AlertService(alert_repo, checkin_repo, dose_repo)
    checkin = _make_checkin(intensity=8)

    alerts = await service.evaluate_after_checkin(checkin)

    spike = next(a for a in alerts if a.type == AlertType.symptom_spike)
    assert spike.severity == AlertSeverity.critical


@pytest.mark.asyncio
async def test_symptom_spike_high_when_intensity_ge_6():
    alert_repo = AsyncMock()
    alert_repo.create.side_effect = lambda a: a
    alert_repo.has_unresolved = AsyncMock(return_value=False)
    checkin_repo = AsyncMock()
    checkin_repo.get_recent_moods.return_value = []
    dose_repo = AsyncMock()
    dose_repo.count_missed_doses_in_week.return_value = 0

    service = AlertService(alert_repo, checkin_repo, dose_repo)
    checkin = _make_checkin(intensity=7)

    alerts = await service.evaluate_after_checkin(checkin)

    spike = next(a for a in alerts if a.type == AlertType.symptom_spike)
    assert spike.severity == AlertSeverity.high


@pytest.mark.asyncio
async def test_no_spike_when_intensity_below_6():
    alert_repo = AsyncMock()
    alert_repo.create.side_effect = lambda a: a
    alert_repo.has_unresolved = AsyncMock(return_value=False)
    checkin_repo = AsyncMock()
    checkin_repo.get_recent_moods.return_value = []
    dose_repo = AsyncMock()
    dose_repo.count_missed_doses_in_week.return_value = 0

    service = AlertService(alert_repo, checkin_repo, dose_repo)
    checkin = _make_checkin(intensity=5)

    alerts = await service.evaluate_after_checkin(checkin)

    assert not any(a.type == AlertType.symptom_spike for a in alerts)


@pytest.mark.asyncio
async def test_mood_decline_after_three_terrible_days():
    alert_repo = AsyncMock()
    alert_repo.create.side_effect = lambda a: a
    alert_repo.has_unresolved = AsyncMock(return_value=False)
    checkin_repo = AsyncMock()
    checkin_repo.get_recent_moods.return_value = [
        CheckinMood.terrible,
        CheckinMood.terrible,
        CheckinMood.terrible,
    ]
    dose_repo = AsyncMock()
    dose_repo.count_missed_doses_in_week.return_value = 0

    service = AlertService(alert_repo, checkin_repo, dose_repo)
    checkin = _make_checkin(intensity=3, mood=CheckinMood.terrible)

    alerts = await service.evaluate_after_checkin(checkin)

    assert any(a.type == AlertType.mood_decline for a in alerts)


@pytest.mark.asyncio
async def test_mood_decline_not_created_with_only_two_terrible_days():
    alert_repo = AsyncMock()
    alert_repo.create.side_effect = lambda a: a
    alert_repo.has_unresolved.return_value = False
    checkin_repo = AsyncMock()
    checkin_repo.get_recent_moods.return_value = [CheckinMood.terrible, CheckinMood.terrible]
    dose_repo = AsyncMock()
    dose_repo.count_missed_doses_in_week.return_value = 0

    service = AlertService(alert_repo, checkin_repo, dose_repo)
    alerts = await service.evaluate_after_checkin(_make_checkin(mood=CheckinMood.terrible))

    assert not any(a.type == AlertType.mood_decline for a in alerts)


@pytest.mark.asyncio
async def test_missed_doses_when_more_than_three_in_week():
    alert_repo = AsyncMock()
    alert_repo.create.side_effect = lambda a: a
    alert_repo.has_unresolved.return_value = False
    checkin_repo = AsyncMock()
    checkin_repo.get_recent_moods.return_value = []
    dose_repo = AsyncMock()
    dose_repo.count_missed_doses_in_week.return_value = 4

    service = AlertService(alert_repo, checkin_repo, dose_repo)
    alerts = await service.evaluate_after_checkin(_make_checkin(intensity=2))

    dose = next(a for a in alerts if a.type == AlertType.missed_doses)
    assert dose.severity == AlertSeverity.high
