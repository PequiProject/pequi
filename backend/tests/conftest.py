import asyncio
import os
import time
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from pequi.config import get_settings
from pequi.core.dependencies import get_db
from pequi.core.rate_limit import limiter
from pequi.database import Base
from pequi.main import app

# Disable rate limiting for tests
limiter.enabled = False

settings = get_settings()

TEST_DATABASE_URL = settings.DATABASE_URL_TEST or settings.DATABASE_URL.replace(
    "/pequi", "/pequi_test"
)

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    poolclass=NullPool,
)

TestAsyncSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

_DB_LOCK_TIMEOUT_SEC = 120.0
_DB_POLL_INTERVAL_SEC = 0.05


def _xdist_shared_root(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Diretório compartilhado entre workers do pytest-xdist."""
    return tmp_path_factory.getbasetemp().parent


def _try_acquire_file_lock(lock_path: Path) -> bool:
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.close(fd)
        return True
    except FileExistsError:
        return False


def _release_file_lock(lock_path: Path) -> None:
    lock_path.unlink(missing_ok=True)


def _wait_until_ready(ready_path: Path, timeout: float = _DB_LOCK_TIMEOUT_SEC) -> None:
    deadline = time.monotonic() + timeout
    while not ready_path.is_file():
        if time.monotonic() >= deadline:
            msg = f"Timed out waiting for test database schema at {ready_path}"
            raise TimeoutError(msg)
        time.sleep(_DB_POLL_INTERVAL_SEC)


async def _reset_schema() -> None:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest.fixture(scope="session")
def event_loop_policy():
    import sys

    if sys.platform == "win32":
        return asyncio.WindowsSelectorEventLoopPolicy()
    return asyncio.DefaultEventLoopPolicy()


@pytest.fixture(scope="session")
async def create_tables(tmp_path_factory: pytest.TempPathFactory):
    """Cria o schema uma vez por execução, mesmo com pytest-xdist (-n > 1).

    Sem sincronização, cada worker chama create_all em paralelo e disputa
    tipos ENUM no PostgreSQL (ex.: user_role_enum).
    """
    root = _xdist_shared_root(tmp_path_factory)
    lock_path = root / "pequi_test_db.lock"
    ready_path = root / "pequi_test_db.ready"

    if ready_path.is_file():
        pass
    elif _try_acquire_file_lock(lock_path):
        try:
            if not ready_path.is_file():
                await _reset_schema()
                ready_path.touch()
        finally:
            _release_file_lock(lock_path)
    else:
        _wait_until_ready(ready_path)

    yield

    await test_engine.dispose()


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Cada teste roda em uma transação que é revertida ao final."""
    async with test_engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await conn.rollback()


@pytest.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Cliente HTTP assíncrono com override de sessão de banco."""

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()
