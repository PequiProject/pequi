from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from pequi.config import get_settings
from pequi.core.auth import TOKEN_TYPE_ACCESS, JWTError, decode_token

settings = get_settings()
_storage_uri = settings.REDIS_URL if settings.is_production else "memory://"

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
    default_limits=["1000/hour"],
)


def get_user_or_ip_key(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = decode_token(auth[7:])
            if payload.get("type") == TOKEN_TYPE_ACCESS and payload.get("sub"):
                return f"user:{payload['sub']}"
        except JWTError:
            pass
    return get_remote_address(request)


user_limiter = Limiter(
    key_func=get_user_or_ip_key,
    storage_uri=_storage_uri,
    default_limits=["1000/hour"],
)

__all__ = ["limiter", "user_limiter", "get_user_or_ip_key"]
