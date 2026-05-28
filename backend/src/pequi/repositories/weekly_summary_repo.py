from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.checkin import Checkin
from pequi.models.weekly_summary import WeeklySymptomSummary


class WeeklySummaryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def upsert_summary(
        self,
        patient_id: UUID,
        week_start: date,
        week_end: date,
        avg_intensity: int | None,
        dominant_mood: str | None,
        checkin_count: int,
        alert_count: int,
    ) -> WeeklySymptomSummary:
        """Upsert weekly symptom summary (idempotent)."""
        stmt = (
            insert(WeeklySymptomSummary)
            .values(
                patient_id=patient_id,
                week_start=week_start,
                week_end=week_end,
                avg_intensity=avg_intensity,
                dominant_mood=dominant_mood,
                checkin_count=checkin_count,
                alert_count=alert_count,
                calculated_at=datetime.now(UTC),
            )
            .on_conflict_do_update(
                index_elements=["patient_id", "week_start"],
                set_={
                    "avg_intensity": avg_intensity,
                    "dominant_mood": dominant_mood,
                    "checkin_count": checkin_count,
                    "alert_count": alert_count,
                    "calculated_at": datetime.now(UTC),
                },
            )
            .returning(WeeklySymptomSummary)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.scalar_one()

    async def get_weekly_stats(
        self,
        patient_id: UUID,
        week_start: datetime,
        week_end: datetime,
    ) -> tuple[int | None, str | None, int, int]:
        """Returns (avg_intensity, dominant_mood, checkin_count, alert_count)
        for a patient in a week.
        """
        # Get checkin stats
        stmt = select(
            func.avg(Checkin.symptom_intensity).label("avg_intensity"),
            func.mode().within_group(Checkin.mood).label("dominant_mood"),
            func.count(Checkin.id).label("checkin_count"),
        ).where(
            and_(
                Checkin.patient_id == patient_id,
                Checkin.checked_in_at >= week_start,
                Checkin.checked_in_at <= week_end,
            )
        )
        result = await self._session.execute(stmt)
        row = result.one()

        avg_intensity = int(row.avg_intensity) if row.avg_intensity else None
        dominant_mood = row.dominant_mood if row.dominant_mood else None
        checkin_count = int(row.checkin_count)

        # Get alert count from alerts table
        from pequi.models.alert import Alert

        alert_stmt = select(func.count(Alert.id)).where(
            and_(
                Alert.patient_id == patient_id,
                Alert.created_at >= week_start,
                Alert.created_at <= week_end,
            )
        )
        alert_result = await self._session.execute(alert_stmt)
        alert_count = int(alert_result.scalar() or 0)

        return (avg_intensity, dominant_mood, checkin_count, alert_count)

    async def list_active_patients(self) -> list[UUID]:
        """Returns all patient IDs with active treatments."""
        from pequi.models.treatment import Treatment, TreatmentStatus

        stmt = (
            select(Treatment.patient_id)
            .where(Treatment.status == TreatmentStatus.active)
            .distinct()
        )
        result = await self._session.execute(stmt)
        return [row[0] for row in result.all()]
