"""Notificações ao paciente — stub para integração WhatsApp (M10)."""

from uuid import UUID

from pequi.core.logging import get_logger

logger = get_logger(__name__)


class NotificationService:
    async def send_feedback(self, patient_id: UUID, feedback: str) -> None:
        """Envia feedback de IA ao paciente (push/WhatsApp quando disponível)."""
        logger.info(
            "notification.feedback_queued",
            patient_id=str(patient_id),
            feedback_length=len(feedback),
        )
