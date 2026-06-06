"""Testes de integração — username no fluxo de cadastro e login.

Exercita UserRepository, RegisterUserUseCase e LoginUserUseCase diretamente
contra o banco de dados real (PostgreSQL), sem HTTP.
"""

import pytest

from pequi.core.exceptions import ConflictError, UnauthorizedError
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.user_repo import UserRepository
from pequi.schemas.user import LoginRequest, UserCreate
from pequi.use_cases.login_user import LoginUserUseCase
from pequi.use_cases.register_user import RegisterUserUseCase

pytestmark = pytest.mark.asyncio


def _register_use_case(db_session):
    return RegisterUserUseCase(UserRepository(db_session), PatientRepository(db_session))


async def test_register_persists_username(db_session):
    repo = UserRepository(db_session)
    use_case = _register_use_case(db_session)

    result = await use_case.execute(
        UserCreate(
            email="persist@example.com",
            username="persistuser",
            password="strongpassword123",
            full_name="Persist User",
        )
    )

    assert result.username == "persistuser"

    fetched = await repo.get_by_username("persistuser")
    assert fetched is not None
    assert fetched.email == "persist@example.com"


async def test_register_username_stored_lowercase(db_session):
    use_case = _register_use_case(db_session)

    result = await use_case.execute(
        UserCreate(
            email="lower@example.com",
            username="UpperCaseUser",
            password="strongpassword123",
            full_name="Upper Case",
        )
    )

    assert result.username == "uppercaseuser"


async def test_get_by_username_case_insensitive(db_session):
    repo = UserRepository(db_session)
    use_case = _register_use_case(db_session)

    await use_case.execute(
        UserCreate(
            email="ci@example.com",
            username="myciuser",
            password="strongpassword123",
            full_name="CI User",
        )
    )

    assert await repo.get_by_username("myciuser") is not None
    assert await repo.get_by_username("MyCIUser") is not None
    assert await repo.get_by_username("MYCIUSER") is not None


async def test_register_rejects_duplicate_username(db_session):
    use_case = _register_use_case(db_session)

    await use_case.execute(
        UserCreate(
            email="first@example.com",
            username="duplicated",
            password="strongpassword123",
            full_name="First User",
        )
    )

    with pytest.raises(ConflictError, match="Este nome de usuário já está em uso"):
        await use_case.execute(
            UserCreate(
                email="second@example.com",
                username="duplicated",
                password="strongpassword123",
                full_name="Second User",
            )
        )


async def test_register_rejects_duplicate_username_case_insensitive(db_session):
    use_case = _register_use_case(db_session)

    await use_case.execute(
        UserCreate(
            email="orig@example.com",
            username="uniquename",
            password="strongpassword123",
            full_name="Original User",
        )
    )

    with pytest.raises(ConflictError, match="Este nome de usuário já está em uso"):
        await use_case.execute(
            UserCreate(
                email="other@example.com",
                username="UniqueName",
                password="strongpassword123",
                full_name="Other User",
            )
        )


async def test_login_by_email(db_session):
    repo = UserRepository(db_session)
    await _register_use_case(db_session).execute(
        UserCreate(
            email="emaillogin@example.com",
            username="emailloginuser",
            password="mypassword123",
            full_name="Email Login",
        )
    )

    result = await LoginUserUseCase(repo).execute(
        LoginRequest(identifier="emaillogin@example.com", password="mypassword123")
    )

    assert result.user.username == "emailloginuser"
    assert result.access_token


async def test_login_by_username(db_session):
    repo = UserRepository(db_session)
    await _register_use_case(db_session).execute(
        UserCreate(
            email="userlogin@example.com",
            username="userloginuser",
            password="mypassword123",
            full_name="User Login",
        )
    )

    result = await LoginUserUseCase(repo).execute(
        LoginRequest(identifier="userloginuser", password="mypassword123")
    )

    assert result.user.email == "userlogin@example.com"
    assert result.access_token


async def test_login_by_username_case_insensitive(db_session):
    repo = UserRepository(db_session)
    await _register_use_case(db_session).execute(
        UserCreate(
            email="cilogin@example.com",
            username="ciloginuser",
            password="mypassword123",
            full_name="CI Login",
        )
    )

    result = await LoginUserUseCase(repo).execute(
        LoginRequest(identifier="CILoginUser", password="mypassword123")
    )

    assert result.user.username == "ciloginuser"


async def test_login_rejects_unknown_identifier(db_session):
    repo = UserRepository(db_session)

    with pytest.raises(UnauthorizedError):
        await LoginUserUseCase(repo).execute(
            LoginRequest(identifier="ghost@example.com", password="anypassword")
        )
