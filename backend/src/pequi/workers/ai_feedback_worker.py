"""Worker ARQ: gera feedback de IA e notifica o paciente."""

from uuid import UUID

from pequi.database import AsyncSessionLocal
from pequi.repositories.checkin_repo import CheckinRepository
from pequi.services.ai_feedback_service import AIFeedbackService
from pequi.services.notification_service import NotificationService


async def ai_feedback_job(ctx: dict, checkin_id: str) -> None:
    checkin_uuid = UUID(checkin_id)
    ai_service = AIFeedbackService()
    notification_service = NotificationService()

    async with AsyncSessionLocal() as session:
        checkin_repo = CheckinRepository(session)
        checkin = await checkin_repo.get_by_id(checkin_uuid)
        if checkin is None:
            return

        feedback = await ai_service.generate_feedback(checkin)
        await checkin_repo.update_ai_feedback(checkin_uuid, feedback)
        await notification_service.send_feedback(checkin.patient_id, feedback)
        await session.commit()
