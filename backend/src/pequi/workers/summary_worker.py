"""Worker ARQ: resumo semanal de sintomas (cron semanal)."""

from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from pequi.core.logging import get_logger
from pequi.database import AsyncSessionLocal
from pequi.repositories.weekly_summary_repo import WeeklySummaryRepository

logger = get_logger(__name__)


async def summary_job(ctx: dict) -> None:
    """Gera resumos semanais de sintomas para todos os pacientes ativos (cron domingo 01:00 UTC)."""
    logger.info("summary_job.started")

    async with AsyncSessionLocal() as session:
        summary_repo = WeeklySummaryRepository(session)

        # Get all active patients
        patient_ids = await summary_repo.list_active_patients()
        logger.info("summary_job.active_patients", count=len(patient_ids))

        # Calculate week boundaries (Sunday to Saturday)
        today = datetime.now(UTC).date()
        # weekday(): Monday=0, Sunday=6
        # Calculate days since most recent Sunday (0 if today is Sunday)
        days_since_sunday = (today.weekday() + 1) % 7  # Sunday=0, Monday=1, ..., Saturday=6
        week_end = today - timedelta(days=days_since_sunday)
        week_start = week_end - timedelta(days=6)
        week_start_dt = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=UTC)
        week_end_dt = datetime.combine(week_end, datetime.max.time()).replace(tzinfo=UTC)

        for patient_id in patient_ids:
            try:
                avg_intensity, dominant_mood, checkin_count, alert_count = (
                    await summary_repo.get_weekly_stats(
                        patient_id, week_start_dt, week_end_dt
                    )
                )

                await summary_repo.upsert_summary(
                    patient_id=patient_id,
                    week_start=week_start,
                    week_end=week_end,
                    avg_intensity=avg_intensity,
                    dominant_mood=dominant_mood,
                    checkin_count=checkin_count,
                    alert_count=alert_count,
                )

                logger.info(
                    "weekly_summary.created",
                    patient_id=str(patient_id),
                    week_start=week_start.isoformat(),
                    week_end=week_end.isoformat(),
                    checkin_count=checkin_count,
                )

            except Exception as e:
                logger.error(
                    "summary_job.error",
                    patient_id=str(patient_id),
                    error=str(e),
                    exc_info=True,
                )

        await session.commit()

    logger.info("summary_job.completed")
