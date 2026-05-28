"""Worker ARQ: envio de notificações WhatsApp."""

from uuid import UUID

from pequi.core.logging import get_logger
from pequi.database import AsyncSessionLocal
from pequi.repositories.patient_repo import PatientRepository
from pequi.services.notification_service import NotificationService

logger = get_logger(__name__)


async def notification_job(
    ctx: dict,
    patient_id: str,
    notification_type: str,
    feedback_content: str = "",
) -> None:
    """Envia notificação ao paciente via WhatsApp.

    Tipos suportados:
    - 'dose_reminder': lembrete diário de dose
    - 'ai_feedback': feedback gerado pela IA
    - 'low_adherence': alerta de baixa adesão para profissional
    - 'alert_generated': novo alerta para profissional
    """
    VALID_NOTIFICATION_TYPES = {"dose_reminder", "ai_feedback", "low_adherence", "alert_generated"}

    if notification_type not in VALID_NOTIFICATION_TYPES:
        logger.error(
            "notification_job.invalid_type",
            patient_id=patient_id,
            notification_type=notification_type,
        )
        raise ValueError(f"Invalid notification_type: {notification_type}")

    patient_uuid = UUID(patient_id)
    logger.info(
        "notification_job.started",
        patient_id=str(patient_uuid),
        notification_type=notification_type,
    )

    async with AsyncSessionLocal() as session:
        patient_repo = PatientRepository(session)
        notification_service = NotificationService()

        patient = await patient_repo.get_by_id(patient_uuid)
        if patient is None:
            logger.warning(
                "notification_job.patient_not_found",
                patient_id=str(patient_uuid),
            )
            return

        try:
            # Check if patient has notifications enabled (only for dose reminders)
            if notification_type == "dose_reminder" and not patient.notifications_enabled:
                logger.info(
                    "notification_job.skipped_notifications_disabled",
                    patient_id=str(patient_uuid),
                    notification_type=notification_type,
                )
                return

            if notification_type == "dose_reminder":
                await notification_service.send_dose_reminder(patient_uuid)
            elif notification_type == "ai_feedback":
                await notification_service.send_feedback(patient_uuid, feedback_content)
            elif notification_type == "low_adherence":
                await notification_service.send_low_adherence_alert(patient_uuid)
            elif notification_type == "alert_generated":
                await notification_service.send_alert_notification(patient_uuid)

            logger.info(
                "notification_job.sent",
                patient_id=str(patient_uuid),
                notification_type=notification_type,
            )

        except Exception as e:
            logger.error(
                "notification_job.error",
                patient_id=str(patient_uuid),
                notification_type=notification_type,
                error=str(e),
                exc_info=True,
            )
            # Don't raise - we don't want to crash the worker on notification failures
            # The notification can be retried later

        await session.commit()

    logger.info("notification_job.completed")
