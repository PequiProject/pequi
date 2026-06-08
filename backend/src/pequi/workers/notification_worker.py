"""Worker ARQ: envio de notificações in-app + WhatsApp."""

from uuid import UUID

from pequi.core.logging import get_logger
from pequi.database import AsyncSessionLocal
from pequi.integrations import WhatsAppClient
from pequi.repositories.notification_repo import NotificationRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.services.notification_service import NotificationService

logger = get_logger(__name__)


async def notification_job(
    ctx: dict,
    patient_id: str,
    notification_type: str,
    feedback_content: str = "",
) -> None:
    valid_notification_types = {
        "dose_reminder",
        "ai_feedback",
        "low_adherence",
        "alert_generated",
    }

    if notification_type not in valid_notification_types:
        logger.error(
            "notification_job.invalid_type",
            patient_id=patient_id,
            notification_type=notification_type,
        )
        raise ValueError(f"Invalid notification_type: {notification_type}")

    patient_uuid = UUID(patient_id)

    async with AsyncSessionLocal() as session:
        patient_repo = PatientRepository(session)
        notification_repo = NotificationRepository(session)
        notification_service = NotificationService(
            notification_repo=notification_repo,
            whatsapp_client=WhatsAppClient(),
        )

        patient = await patient_repo.get_by_id(patient_uuid)
        if patient is None:
            logger.warning(
                "notification_job.patient_not_found",
                patient_id=str(patient_uuid),
            )
            return

        recipient_phone = getattr(patient, "phone", None)
        notifications_enabled = bool(getattr(patient, "notifications_enabled", False))
        send_whatsapp = bool(recipient_phone and notifications_enabled)

        if notification_type == "dose_reminder":
            await notification_service.send_dose_reminder(
                patient_uuid,
                recipient_phone=recipient_phone,
                send_whatsapp=send_whatsapp,
            )
        elif notification_type == "ai_feedback":
            await notification_service.send_feedback(
                patient_uuid,
                feedback_content,
                recipient_phone=recipient_phone,
                send_whatsapp=send_whatsapp,
            )
        elif notification_type == "low_adherence":
            await notification_service.send_low_adherence_alert(patient_uuid)
        elif notification_type == "alert_generated":
            await notification_service.send_alert_notification(patient_uuid)

        await session.commit()

    logger.info(
        "notification_job.completed",
        patient_id=patient_id,
        notification_type=notification_type,
    )