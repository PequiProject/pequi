from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pequi.core.exceptions import ConflictError, UnauthorizedError
from pequi.schemas.user import LoginRequest, RefreshRequest, UserCreate
from pequi.use_cases.login_user import LoginUserUseCase
from pequi.use_cases.refresh_token import RefreshTokenUseCase
from pequi.use_cases.register_user import RegisterUserUseCase

pytestmark = pytest.mark.asyncio


def _user(**overrides):
    base = {
        "id": uuid4(),
        "email": "user@example.com",
        "username": "testuser",
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

    async def get_by_username(self, username):
        if self.existing_user is None or self.existing_user.username.lower() != username.lower():
            return None
        return self.existing_user

    async def get_by_identifier(self, identifier):
        if "@" in identifier:
            return await self.get_by_email(identifier)
        return await self.get_by_username(identifier)

    async def add(self, user):
        self.added_user = user
        user.id = uuid4()
        user.is_active = True
        user.is_verified = False
        user.created_at = datetime(2026, 1, 1, tzinfo=UTC)
        user.updated_at = datetime(2026, 1, 1, tzinfo=UTC)
        return user

    async def get_by_id(self, user_id):
        if self.existing_user is None or self.existing_user.id != user_id:
            return None
        return self.existing_user


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


async def _token_is_revoked(_payload):
    return True


# ---------------------------------------------------------------------------
# RegisterUserUseCase
# ---------------------------------------------------------------------------


async def test_register_user_hashes_password_and_always_creates_patient(monkeypatch):
    repo = FakeUserRepository()
    monkeypatch.setattr("pequi.use_cases.register_user.hash_password", _hashed_password)
    use_case = RegisterUserUseCase(repo)

    result = await use_case.execute(
        UserCreate(
            email="new@example.com",
            username="newpatient",
            password="strongpassword123",
            full_name="New Patient",
        )
    )

    assert result.email == "new@example.com"
    assert result.username == "newpatient"
    assert result.role == "patient"
    assert repo.added_user is not None
    assert repo.added_user.hashed_password == "hashed"
    assert repo.added_user.full_name == "New Patient"


async def test_register_user_rejects_duplicate_email():
    repo = FakeUserRepository(existing_user=_user(email="taken@example.com", username="taken"))
    use_case = RegisterUserUseCase(repo)

    with pytest.raises(ConflictError):
        await use_case.execute(
            UserCreate(
                email="taken@example.com",
                username="otheruser",
                password="strongpassword123",
                full_name="Taken User",
            )
        )


async def test_register_user_rejects_duplicate_username():
    repo = FakeUserRepository(existing_user=_user(email="other@example.com", username="takenuser"))
    use_case = RegisterUserUseCase(repo)

    with pytest.raises(ConflictError, match="Username already taken"):
        await use_case.execute(
            UserCreate(
                email="new@example.com",
                username="takenuser",
                password="strongpassword123",
                full_name="New User",
            )
        )


async def test_register_user_username_case_insensitive_conflict():
    """Username 'TakenUser' deve conflitar com 'takenuser' já cadastrado."""
    repo = FakeUserRepository(existing_user=_user(email="other@example.com", username="takenuser"))
    use_case = RegisterUserUseCase(repo)

    with pytest.raises(ConflictError, match="Username already taken"):
        await use_case.execute(
            UserCreate(
                email="new@example.com",
                username="TakenUser",
                password="strongpassword123",
                full_name="New User",
            )
        )


# ---------------------------------------------------------------------------
# LoginUserUseCase
# ---------------------------------------------------------------------------


async def test_login_user_by_email_returns_tokens(monkeypatch):
    user = _user(email="login@example.com", username="loginuser")
    repo = FakeUserRepository(existing_user=user)
    monkeypatch.setattr("pequi.use_cases.login_user.verify_password", _password_matches)
    monkeypatch.setattr("pequi.use_cases.login_user.create_access_token", _access_token)
    monkeypatch.setattr("pequi.use_cases.login_user.create_refresh_token", _refresh_token)
    use_case = LoginUserUseCase(repo)

    result = await use_case.execute(
        LoginRequest(identifier="login@example.com", password="strongpassword123")
    )

    assert result.access_token == "access"
    assert result.refresh_token == "refresh"
    assert result.user.id == user.id


async def test_login_user_by_username_returns_tokens(monkeypatch):
    user = _user(email="login@example.com", username="loginuser")
    repo = FakeUserRepository(existing_user=user)
    monkeypatch.setattr("pequi.use_cases.login_user.verify_password", _password_matches)
    monkeypatch.setattr("pequi.use_cases.login_user.create_access_token", _access_token)
    monkeypatch.setattr("pequi.use_cases.login_user.create_refresh_token", _refresh_token)
    use_case = LoginUserUseCase(repo)

    result = await use_case.execute(
        LoginRequest(identifier="loginuser", password="strongpassword123")
    )

    assert result.access_token == "access"
    assert result.refresh_token == "refresh"
    assert result.user.id == user.id


async def test_login_user_rejects_missing_user():
    use_case = LoginUserUseCase(FakeUserRepository(existing_user=None))

    with pytest.raises(UnauthorizedError):
        await use_case.execute(
            LoginRequest(identifier="missing@example.com", password="strongpassword123")
        )


async def test_login_user_rejects_wrong_password(monkeypatch):
    repo = FakeUserRepository(existing_user=_user(email="login@example.com", username="loginuser"))
    monkeypatch.setattr("pequi.use_cases.login_user.verify_password", _password_does_not_match)
    use_case = LoginUserUseCase(repo)

    with pytest.raises(UnauthorizedError):
        await use_case.execute(
            LoginRequest(identifier="login@example.com", password="wrongpassword")
        )


async def test_login_user_rejects_inactive_user(monkeypatch):
    repo = FakeUserRepository(
        existing_user=_user(email="inactive@example.com", username="inactiveuser", is_active=False)
    )
    monkeypatch.setattr("pequi.use_cases.login_user.verify_password", _password_matches)
    use_case = LoginUserUseCase(repo)

    with pytest.raises(UnauthorizedError):
        await use_case.execute(
            LoginRequest(identifier="inactive@example.com", password="strongpassword123")
        )


async def test_refresh_token_rejects_revoked_token(monkeypatch):
    user = _user()
    payload = {
        "sub": str(user.id),
        "role": "patient",
        "type": "refresh",
        "jti": "revoked-refresh",
        "iat": int(datetime(2026, 1, 1, tzinfo=UTC).timestamp()),
        "exp": int(datetime(2026, 1, 2, tzinfo=UTC).timestamp()),
    }
    monkeypatch.setattr("pequi.use_cases.refresh_token.decode_token", lambda _token: payload)
    monkeypatch.setattr("pequi.use_cases.refresh_token.is_token_revoked", _token_is_revoked)

    use_case = RefreshTokenUseCase(FakeUserRepository(existing_user=user))

    with pytest.raises(UnauthorizedError, match="revoked"):
        await use_case.execute(RefreshRequest(refresh_token="refresh"))
