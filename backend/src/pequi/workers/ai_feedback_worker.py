"""Worker ARQ: gera feedback de IA e notifica o paciente."""

from uuid import UUID

from pequi.core.logging import get_logger
from pequi.database import AsyncSessionLocal
from pequi.repositories.checkin_repo import CheckinRepository
from pequi.services.ai_feedback_service import AIFeedbackService
from pequi.services.notification_service import NotificationService

logger = get_logger(__name__)


async def ai_feedback_job(ctx: dict, checkin_id: str) -> None:
    """Gera feedback de IA para check-in com intensidade >= 7 e notifica o paciente."""
    checkin_uuid = UUID(checkin_id)
    logger.info("ai_feedback_job.started", checkin_id=str(checkin_uuid))

    ai_service = AIFeedbackService()
    notification_service = NotificationService()

    async with AsyncSessionLocal() as session:
        checkin_repo = CheckinRepository(session)
        checkin = await checkin_repo.get_by_id(checkin_uuid)
        if checkin is None:
            logger.warning("ai_feedback_job.checkin_not_found", checkin_id=str(checkin_uuid))
            return

        try:
            feedback = await ai_service.generate_feedback(checkin)
            await checkin_repo.update_ai_feedback(checkin_uuid, feedback)
            await notification_service.send_feedback(checkin.patient_id, feedback)
            await session.commit()

            logger.info(
                "ai_feedback_job.completed",
                checkin_id=str(checkin_uuid),
                patient_id=str(checkin.patient_id),
            )
        except Exception as e:
            logger.error(
                "ai_feedback_job.error",
                checkin_id=str(checkin_uuid),
                error=str(e),
                exc_info=True,
            )
            raise
