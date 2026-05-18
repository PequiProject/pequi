from slowapi import Limiter
from slowapi.util import get_remote_address

from pequi.config import get_settings

settings = get_settings()

# Em produção usa Redis; em desenvolvimento/testes usa memória para não
# exigir Redis ativo durante smoke tests e desenvolvimento local sem infra.
_storage_uri = settings.REDIS_URL if settings.is_production else "memory://"

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
    default_limits=["1000/hour"],
)

__all__ = ["limiter"]
