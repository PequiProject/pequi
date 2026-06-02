from arq import cron
from arq.connections import RedisSettings

from pequi.config import get_settings
from pequi.workers.adherence_worker import adherence_job
from pequi.workers.ai_feedback_worker import ai_feedback_job
from pequi.workers.notification_worker import notification_job
from pequi.workers.summary_worker import summary_job

settings = get_settings()


class WorkerSettings:
    """Configuração do worker ARQ."""

    queue_name = "pequi:default"
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    functions = [
        adherence_job,
        notification_job,
        summary_job,
        ai_feedback_job,
    ]
    cron_jobs = [
        cron(adherence_job, hour=0, minute=5),  # diário 00:05 UTC
        cron(summary_job, weekday=6, hour=1),  # domingo 01:00 UTC
    ]
    max_jobs = 10
    job_timeout = 300  # 5 minutos
    keep_result = 3600  # resultado mantido 1 hora
