"""Enfileiramento de jobs ARQ — desacoplado para testes."""

from uuid import UUID

from pequi.core.logging import get_logger

logger = get_logger(__name__)


class JobEnqueuer:
    async def enqueue_ai_feedback(self, checkin_id: UUID) -> None:
        raise NotImplementedError


class ArqJobEnqueuer(JobEnqueuer):
    async def enqueue_ai_feedback(self, checkin_id: UUID) -> None:
        from arq import create_pool
        from arq.connections import RedisSettings

        from pequi.config import get_settings
        from pequi.workers.settings import WorkerSettings

        settings = get_settings()
        redis = RedisSettings.from_dsn(settings.REDIS_URL)
        pool = await create_pool(redis)
        try:
            await pool.enqueue_job(
                "ai_feedback_job",
                str(checkin_id),
                _queue_name=WorkerSettings.queue_name,
            )
            logger.info("ai_feedback.enqueued", checkin_id=str(checkin_id))
        finally:
            await pool.close()


class NoOpJobEnqueuer(JobEnqueuer):
    """Usado em testes — não exige Redis."""

    def __init__(self) -> None:
        self.enqueued: list[UUID] = []

    async def enqueue_ai_feedback(self, checkin_id: UUID) -> None:
        self.enqueued.append(checkin_id)
