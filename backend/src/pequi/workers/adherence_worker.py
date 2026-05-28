"""Worker ARQ: cálculo de adesão periódico (cron diário)."""

from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from pequi.core.logging import get_logger
from pequi.database import AsyncSessionLocal
from pequi.repositories.adherence_repo import AdherenceRepository
from pequi.services.adherence_service import AdherenceService
from pequi.workers.notification_worker import notification_job

logger = get_logger(__name__)


async def adherence_job(ctx: dict) -> None:
    """Calcula adesão para todos os tratamentos ativos (cron diário 00:05 UTC)."""
    logger.info("adherence_job.started")

    async with AsyncSessionLocal() as session:
        adherence_repo = AdherenceRepository(session)
        adherence_service = AdherenceService()

        # Get all active treatments
        treatments = await adherence_repo.list_active_treatments()
        logger.info("adherence_job.active_treatments", count=len(treatments))

        for treatment in treatments:
            try:
                # Calculate for 7-day period
                period_end = datetime.now(UTC)
                period_start = period_end - timedelta(days=7)
                period_start_date = period_end.date() - timedelta(days=7)

                total_doses, taken_doses = await adherence_repo.get_dose_counts_in_period(
                    treatment.id, period_start, period_end
                )

                adherence_pct = adherence_service.calculate_pct(total_doses, taken_doses)

                await adherence_repo.upsert_snapshot(
                    patient_id=treatment.patient_id,
                    treatment_id=treatment.id,
                    period_start=period_start_date,
                    period_end=period_end.date(),
                    total_doses=total_doses,
                    taken_doses=taken_doses,
                    adherence_pct=adherence_pct,
                )

                logger.info(
                    "adherence_snapshot.created",
                    treatment_id=str(treatment.id),
                    patient_id=str(treatment.patient_id),
                    adherence_pct=float(adherence_pct),
                )

                # If adherence < 70%, enqueue notification job
                if adherence_pct < 70:
                    await ctx["redis"].enqueue_job(
                        "notification_job",
                        str(treatment.patient_id),
                        "low_adherence",
                        "",  # feedback_content (empty for low_adherence)
                        _queue_name="pequi:default",
                    )
                    logger.warning(
                        "adherence.low",
                        treatment_id=str(treatment.id),
                        patient_id=str(treatment.patient_id),
                        adherence_pct=float(adherence_pct),
                    )

            except Exception as e:
                logger.error(
                    "adherence_job.error",
                    treatment_id=str(treatment.id),
                    error=str(e),
                    exc_info=True,
                )
                continue  # Continue to next treatment

        await session.commit()

    logger.info("adherence_job.completed")
