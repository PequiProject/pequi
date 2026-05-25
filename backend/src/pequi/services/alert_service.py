import uuid

from pequi.core.logging import get_logger
from pequi.models.alert import Alert, AlertSeverity, AlertType
from pequi.models.checkin import Checkin, CheckinMood
from pequi.repositories.alert_repo import AlertRepository
from pequi.repositories.checkin_repo import CheckinRepository
from pequi.repositories.dose_repo import DoseRepository

logger = get_logger(__name__)

_MISSED_DOSES_THRESHOLD = 3
_MOOD_DECLINE_CONSECUTIVE_DAYS = 3


class AlertService:
    def __init__(
        self,
        alert_repo: AlertRepository,
        checkin_repo: CheckinRepository,
        dose_repo: DoseRepository,
    ) -> None:
        self._alert_repo = alert_repo
        self._checkin_repo = checkin_repo
        self._dose_repo = dose_repo

    async def evaluate_after_checkin(self, checkin: Checkin) -> list[Alert]:
        """Avalia regras de alerta após um check-in e persiste os gerados."""
        created: list[Alert] = []

        spike = self._evaluate_symptom_spike(checkin)
        if spike is not None and not await self._alert_repo.has_unresolved(
            checkin.patient_id, AlertType.symptom_spike
        ):
            created.append(await self._alert_repo.create(spike))

        if await self._should_create_mood_decline(
            checkin.patient_id
        ) and not await self._alert_repo.has_unresolved(checkin.patient_id, AlertType.mood_decline):
            mood_alert = Alert(
                id=uuid.uuid4(),
                patient_id=checkin.patient_id,
                checkin_id=checkin.id,
                type=AlertType.mood_decline,
                severity=AlertSeverity.medium,
            )
            created.append(await self._alert_repo.create(mood_alert))

        missed_count = await self._dose_repo.count_missed_doses_in_week(checkin.patient_id)
        if missed_count > _MISSED_DOSES_THRESHOLD and not await self._alert_repo.has_unresolved(
            checkin.patient_id, AlertType.missed_doses
        ):
            dose_alert = Alert(
                id=uuid.uuid4(),
                patient_id=checkin.patient_id,
                checkin_id=checkin.id,
                type=AlertType.missed_doses,
                severity=AlertSeverity.high,
            )
            created.append(await self._alert_repo.create(dose_alert))

        for alert in created:
            logger.warning(
                "alert.generated",
                type=alert.type.value,
                severity=alert.severity.value,
                patient_id=str(checkin.patient_id),
            )

        return created

    def _evaluate_symptom_spike(self, checkin: Checkin) -> Alert | None:
        intensity = checkin.symptom_intensity
        if intensity >= 8:
            severity = AlertSeverity.critical
        elif intensity >= 6:
            severity = AlertSeverity.high
        else:
            return None

        return Alert(
            id=uuid.uuid4(),
            patient_id=checkin.patient_id,
            checkin_id=checkin.id,
            type=AlertType.symptom_spike,
            severity=severity,
        )

    async def _should_create_mood_decline(self, patient_id: uuid.UUID) -> bool:
        moods = await self._checkin_repo.get_recent_moods(
            patient_id,
            limit=_MOOD_DECLINE_CONSECUTIVE_DAYS,
        )
        if len(moods) < _MOOD_DECLINE_CONSECUTIVE_DAYS:
            return False
        return all(m == CheckinMood.terrible for m in moods)
