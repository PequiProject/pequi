from datetime import UTC, datetime
from uuid import UUID

from redis.asyncio import Redis
from redis.exceptions import RedisError

from pequi.config import get_settings

_blacklisted_jtis: set[str] = set()
_revoked_user_after: dict[str, int] = {}
_redis: Redis | None = None


def _settings_use_redis() -> bool:
    return bool(get_settings().REDIS_URL)


def _get_redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(get_settings().REDIS_URL, decode_responses=True)
    return _redis


async def blacklist_token(jti: str | None, exp: int | None) -> None:
    if not jti:
        return
    _blacklisted_jtis.add(jti)
    if _settings_use_redis():
        ttl = max((exp or 0) - int(datetime.now(UTC).timestamp()), 1)
        try:
            await _get_redis().setex(f"blacklist:{jti}", ttl, "1")
        except RedisError:
            return


async def revoke_user_tokens(user_id: UUID, revoked_at: datetime | None = None) -> None:
    value = int((revoked_at or datetime.now(UTC)).timestamp())
    _revoked_user_after[str(user_id)] = value
    if _settings_use_redis():
        ttl = get_settings().REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
        try:
            await _get_redis().setex(f"user_revoked_after:{user_id}", ttl, str(value))
        except RedisError:
            return


async def is_token_revoked(payload: dict) -> bool:
    jti = payload.get("jti")
    if jti and jti in _blacklisted_jtis:
        return True

    sub = payload.get("sub")
    iat = payload.get("iat")
    revoked_after = _revoked_user_after.get(str(sub))
    if revoked_after is not None and isinstance(iat, int) and iat <= revoked_after:
        return True

    if not _settings_use_redis():
        return False

    redis = _get_redis()
    try:
        if jti and await redis.exists(f"blacklist:{jti}"):
            return True
        if sub and iat:
            value = await redis.get(f"user_revoked_after:{sub}")
            if value is not None and int(iat) <= int(value):
                return True
    except RedisError:
        return False
    return False
