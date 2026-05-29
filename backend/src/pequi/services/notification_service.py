"""Notificações ao paciente — stub para integração WhatsApp (M10)."""

from uuid import UUID

from pequi.core.logging import get_logger
from pequi.integrations import WhatsAppClient

logger = get_logger(__name__)


class NotificationService:
    def __init__(self, whatsapp_client: WhatsAppClient | None = None) -> None:
        self.whatsapp_client = whatsapp_client

    async def send_feedback(self, patient_id: UUID, feedback: str) -> None:
        """Envia feedback de IA ao paciente (push/WhatsApp quando disponível)."""
        logger.info(
            "notification.feedback_queued",
            patient_id=str(patient_id),
            feedback_length=len(feedback),
        )
        if self.whatsapp_client is not None:
            logger.info(
                "notification.whatsapp_enabled",
                patient_id=str(patient_id),
            )

    async def send_dose_reminder(self, patient_id: UUID) -> None:
        """Envia lembrete diário de dose ao paciente."""
        logger.info(
            "notification.dose_reminder_queued",
            patient_id=str(patient_id),
        )

    async def send_low_adherence_alert(self, patient_id: UUID) -> None:
        """Envia alerta de baixa adesão para o profissional."""
        logger.info(
            "notification.low_adherence_alert_queued",
            patient_id=str(patient_id),
        )

    async def send_alert_notification(self, patient_id: UUID) -> None:
        """Envia notificação de novo alerta para o profissional."""
        logger.info(
            "notification.alert_notification_queued",
            patient_id=str(patient_id),
        )
