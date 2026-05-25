from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pequi.core.exceptions import ConflictError, UnauthorizedError
from pequi.schemas.user import LoginRequest, UserCreate
from pequi.use_cases.login_user import LoginUserUseCase
from pequi.use_cases.register_user import RegisterUserUseCase

pytestmark = pytest.mark.asyncio


def _user(**overrides):
    base = {
        "id": uuid4(),
        "email": "user@example.com",
        "hashed_password": "hashed-password",
        "full_name": "Test User",
        "role": "patient",
        "is_active": True,
        "is_verified": False,
        "created_at": datetime(2026, 1, 1, tzinfo=UTC),
        "updated_at": datetime(2026, 1, 1, tzinfo=UTC),
    }
    base.update(overrides)
    return SimpleNamespace(**base)


class FakeUserRepository:
    def __init__(self, existing_user=None):
        self.existing_user = existing_user
        self.added_user = None

    async def get_by_email(self, email):
        if self.existing_user is None or self.existing_user.email != email:
            return None
        return self.existing_user

    async def add(self, user):
        self.added_user = user
        user.id = uuid4()
        user.is_active = True
        user.is_verified = False
        user.created_at = datetime(2026, 1, 1, tzinfo=UTC)
        user.updated_at = datetime(2026, 1, 1, tzinfo=UTC)
        return user


def _hashed_password(_password):
    return "hashed"


def _password_matches(_password, _hashed):
    return True


def _password_does_not_match(_password, _hashed):
    return False


def _access_token(**_kwargs):
    return "access"


def _refresh_token(**_kwargs):
    return "refresh"


async def test_register_user_hashes_password_and_always_creates_patient(monkeypatch):
    repo = FakeUserRepository()
    monkeypatch.setattr("pequi.use_cases.register_user.hash_password", _hashed_password)
    use_case = RegisterUserUseCase(repo)

    result = await use_case.execute(
        UserCreate(
            email="new@example.com",
            password="strongpassword123",
            full_name="New Patient",
        )
    )

    assert result.email == "new@example.com"
    assert result.role == "patient"
    assert repo.added_user is not None
    assert repo.added_user.hashed_password == "hashed"
    assert repo.added_user.full_name == "New Patient"


async def test_register_user_rejects_duplicate_email():
    repo = FakeUserRepository(existing_user=_user(email="taken@example.com"))
    use_case = RegisterUserUseCase(repo)

    with pytest.raises(ConflictError):
        await use_case.execute(
            UserCreate(
                email="taken@example.com",
                password="strongpassword123",
                full_name="Taken User",
            )
        )


async def test_login_user_returns_tokens_for_active_user(monkeypatch):
    user = _user(email="login@example.com")
    repo = FakeUserRepository(existing_user=user)
    monkeypatch.setattr("pequi.use_cases.login_user.verify_password", _password_matches)
    monkeypatch.setattr("pequi.use_cases.login_user.create_access_token", _access_token)
    monkeypatch.setattr("pequi.use_cases.login_user.create_refresh_token", _refresh_token)
    use_case = LoginUserUseCase(repo)

    result = await use_case.execute(
        LoginRequest(email="login@example.com", password="strongpassword123")
    )

    assert result.access_token == "access"
    assert result.refresh_token == "refresh"
    assert result.user.id == user.id


async def test_login_user_rejects_missing_user():
    use_case = LoginUserUseCase(FakeUserRepository(existing_user=None))

    with pytest.raises(UnauthorizedError):
        await use_case.execute(
            LoginRequest(email="missing@example.com", password="strongpassword123")
        )


async def test_login_user_rejects_wrong_password(monkeypatch):
    repo = FakeUserRepository(existing_user=_user(email="login@example.com"))
    monkeypatch.setattr("pequi.use_cases.login_user.verify_password", _password_does_not_match)
    use_case = LoginUserUseCase(repo)

    with pytest.raises(UnauthorizedError):
        await use_case.execute(LoginRequest(email="login@example.com", password="wrongpassword"))


async def test_login_user_rejects_inactive_user(monkeypatch):
    repo = FakeUserRepository(existing_user=_user(email="inactive@example.com", is_active=False))
    monkeypatch.setattr("pequi.use_cases.login_user.verify_password", _password_matches)
    use_case = LoginUserUseCase(repo)

    with pytest.raises(UnauthorizedError):
        await use_case.execute(
            LoginRequest(email="inactive@example.com", password="strongpassword123")
        )
