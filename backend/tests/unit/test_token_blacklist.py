from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pequi.core import token_blacklist

pytestmark = pytest.mark.asyncio


class FakeRedis:
    def __init__(self) -> None:
        self.setex_calls: list[tuple[str, int, str]] = []

    async def setex(self, key: str, ttl: int, value: str) -> None:
        self.setex_calls.append((key, ttl, value))


async def test_staging_uses_redis_for_user_revocation_with_ttl(monkeypatch):
    fake_redis = FakeRedis()
    settings = SimpleNamespace(
        ENV="staging",
        REDIS_URL="redis://localhost:6379/0",
        REFRESH_TOKEN_EXPIRE_DAYS=7,
        ACCESS_TOKEN_EXPIRE_MINUTES=30,
    )
    monkeypatch.setattr(token_blacklist, "get_settings", lambda: settings)
    monkeypatch.setattr(token_blacklist, "_get_redis", lambda: fake_redis)

    await token_blacklist.revoke_user_tokens(
        uuid4(),
        revoked_at=datetime.now(UTC) - timedelta(seconds=1),
    )

    assert fake_redis.setex_calls
    key, ttl, value = fake_redis.setex_calls[0]
    assert key.startswith("user_revoked_after:")
    assert ttl == 7 * 24 * 60 * 60
    assert value.isdigit()
