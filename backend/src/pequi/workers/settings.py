from arq.connections import RedisSettings

from pequi.config import get_settings
from pequi.workers.ai_feedback_worker import ai_feedback_job

settings = get_settings()


class WorkerSettings:
    """Configuração do worker ARQ."""

    queue_name = "pequi:default"
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    functions = [ai_feedback_job]
    max_jobs = 10
    job_timeout = 120
