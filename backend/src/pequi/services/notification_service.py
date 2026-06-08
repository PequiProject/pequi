"""Notificações in-app + WhatsApp."""

from uuid import UUID

from pequi.core.logging import get_logger
from pequi.integrations import WhatsAppClient
from pequi.models.notification import NotificationType
from pequi.repositories.notification_repo import NotificationRepository

logger = get_logger(__name__)


class NotificationService:
    def __init__(
        self,
        notification_repo: NotificationRepository,
        whatsapp_client: WhatsAppClient | None = None,
    ) -> None:
        self.notification_repo = notification_repo
        self.whatsapp_client = whatsapp_client

    async def create_and_dispatch(
        self,
        *,
        patient_id: UUID,
        notification_type: NotificationType,
        title: str,
        body: str,
        recipient_phone: str | None = None,
        send_whatsapp: bool = False,
    ) -> None:
        notification = await self.notification_repo.create(
            patient_id=patient_id,
            type=notification_type,
            title=title,
            body=body,
            whatsapp_phone=recipient_phone,
        )

        logger.info(
            "notification.created",
            patient_id=str(patient_id),
            notification_id=str(notification.id),
            notification_type=notification_type.value,
        )

        if not send_whatsapp:
            return

        if self.whatsapp_client is None:
            logger.info(
                "notification.whatsapp_skipped_no_client",
                patient_id=str(patient_id),
                notification_id=str(notification.id),
            )
            return

        if recipient_phone is None:
            logger.info(
                "notification.whatsapp_skipped_no_phone",
                patient_id=str(patient_id),
                notification_id=str(notification.id),
            )
            return

        try:
            # Fora da janela de atendimento, provedores de WhatsApp Business
            # normalmente exigem template aprovado para mensagens proativas.
            message_id = await self.whatsapp_client.send_message(recipient_phone, body)

            if message_id:
                await self.notification_repo.mark_whatsapp_sent(notification.id)

            logger.info(
                "notification.whatsapp_sent",
                patient_id=str(patient_id),
                notification_id=str(notification.id),
                message_sent=bool(message_id),
            )
        except Exception as exc:
            logger.warning(
                "notification.whatsapp_failed",
                patient_id=str(patient_id),
                notification_id=str(notification.id),
                error_type=type(exc).__name__,
            )

    async def send_feedback(
        self,
        patient_id: UUID,
        feedback: str,
        recipient_phone: str | None = None,
        send_whatsapp: bool = True,
    ) -> None:
        await self.create_and_dispatch(
            patient_id=patient_id,
            notification_type=NotificationType.AI_FEEDBACK,
            title="Feedback do acompanhamento",
            body=feedback,
            recipient_phone=recipient_phone,
            send_whatsapp=send_whatsapp,
        )

    async def send_dose_reminder(
        self,
        patient_id: UUID,
        recipient_phone: str | None = None,
        send_whatsapp: bool = True,
    ) -> None:
        await self.create_and_dispatch(
            patient_id=patient_id,
            notification_type=NotificationType.DOSE_REMINDER,
            title="Lembrete de dose",
            body="Não esqueça de registrar sua dose de hoje.",
            recipient_phone=recipient_phone,
            send_whatsapp=send_whatsapp,
        )

    async def send_low_adherence_alert(
        self,
        patient_id: UUID,
        recipient_phone: str | None = None,
        send_whatsapp: bool = False,
    ) -> None:
        await self.create_and_dispatch(
            patient_id=patient_id,
            notification_type=NotificationType.LOW_ADHERENCE,
            title="Baixa adesão identificada",
            body="Foi identificado um possível risco de baixa adesão no acompanhamento.",
            recipient_phone=recipient_phone,
            send_whatsapp=send_whatsapp,
        )

    async def send_alert_notification(
        self,
        patient_id: UUID,
        recipient_phone: str | None = None,
        send_whatsapp: bool = False,
    ) -> None:
        await self.create_and_dispatch(
            patient_id=patient_id,
            notification_type=NotificationType.ALERT_GENERATED,
            title="Novo alerta gerado",
            body="Um novo alerta foi gerado no acompanhamento do paciente.",
            recipient_phone=recipient_phone,
            send_whatsapp=send_whatsapp,
        )