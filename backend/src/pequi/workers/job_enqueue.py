"""Enfileiramento de jobs ARQ — desacoplado para testes."""

from uuid import UUID

from arq import create_pool
from arq.connections import ArqRedis, RedisSettings

from pequi.config import get_settings
from pequi.core.logging import get_logger
from pequi.workers.settings import WorkerSettings

logger = get_logger(__name__)
_arq_pool: ArqRedis | None = None


async def _get_pool() -> ArqRedis:
    global _arq_pool
    if _arq_pool is None:
        settings = get_settings()
        _arq_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    return _arq_pool


class JobEnqueuer:
    async def enqueue_ai_feedback(self, checkin_id: UUID) -> None:
        raise NotImplementedError

    async def enqueue_notification(
        self, patient_id: UUID, notification_type: str, feedback_content: str = ""
    ) -> None:
        raise NotImplementedError


class ArqJobEnqueuer(JobEnqueuer):
    async def enqueue_ai_feedback(self, checkin_id: UUID) -> None:
        pool = await _get_pool()
        await pool.enqueue_job(
            "ai_feedback_job",
            str(checkin_id),
            _queue_name=WorkerSettings.queue_name,
        )
        logger.info("ai_feedback.enqueued", checkin_id=str(checkin_id))

    async def enqueue_notification(
        self, patient_id: UUID, notification_type: str, feedback_content: str = ""
    ) -> None:
        pool = await _get_pool()
        await pool.enqueue_job(
            "notification_job",
            str(patient_id),
            notification_type,
            feedback_content,
            _queue_name=WorkerSettings.queue_name,
        )
        logger.info(
            "notification.enqueued",
            patient_id=str(patient_id),
            notification_type=notification_type,
        )


class NoOpJobEnqueuer(JobEnqueuer):
    def __init__(self) -> None:
        self.enqueued_ai_feedback: list[UUID] = []
        self.enqueued_notifications: list[tuple[UUID, str, str]] = []

    async def enqueue_ai_feedback(self, checkin_id: UUID) -> None:
        self.enqueued_ai_feedback.append(checkin_id)

    async def enqueue_notification(
        self, patient_id: UUID, notification_type: str, feedback_content: str = ""
    ) -> None:
        self.enqueued_notifications.append((patient_id, notification_type, feedback_content))
