import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

_REGISTER_PAYLOAD = {
    "email": "test@example.com",
    "username": "testuser",
    "password": "strongpassword123",
    "full_name": "Test User",
}


async def test_register_user_success(create_tables, async_client: AsyncClient):
    response = await async_client.post("/v1/auth/register", json=_REGISTER_PAYLOAD)

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["username"] == "testuser"
    assert data["role"] == "patient"
    assert "password" not in data
    assert "hashed_password" not in data


async def test_register_username_is_returned_normalized(create_tables, async_client: AsyncClient):
    response = await async_client.post(
        "/v1/auth/register",
        json={
            "email": "norm@example.com",
            "username": "NormUser",
            "password": "strongpassword123",
            "full_name": "Norm User",
        },
    )
    assert response.status_code == 201
    assert response.json()["username"] == "normuser"


async def test_register_rejects_missing_username(create_tables, async_client: AsyncClient):
    response = await async_client.post(
        "/v1/auth/register",
        json={
            "email": "nousername@example.com",
            "password": "strongpassword123",
            "full_name": "No Username",
        },
    )
    assert response.status_code == 422


async def test_register_rejects_role_in_body(create_tables, async_client: AsyncClient):
    response = await async_client.post(
        "/v1/auth/register",
        json={
            "email": "admin@example.com",
            "username": "badactor",
            "password": "strongpassword123",
            "full_name": "Bad Actor",
            "role": "admin",
        },
    )
    assert response.status_code == 422


async def test_register_user_duplicate_email(create_tables, async_client: AsyncClient):
    await async_client.post(
        "/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "username": "dupuser1",
            "password": "strongpassword123",
            "full_name": "Test User",
        },
    )
    response = await async_client.post(
        "/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "username": "dupuser2",
            "password": "anotherpassword",
            "full_name": "Another User",
        },
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Não foi possível cadastrar com estes dados."


async def test_register_user_duplicate_username(create_tables, async_client: AsyncClient):
    await async_client.post(
        "/v1/auth/register",
        json={
            "email": "first@example.com",
            "username": "sharedusername",
            "password": "strongpassword123",
            "full_name": "First User",
        },
    )
    response = await async_client.post(
        "/v1/auth/register",
        json={
            "email": "second@example.com",
            "username": "sharedusername",
            "password": "anotherpassword",
            "full_name": "Second User",
        },
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Este nome de usuário já está em uso."


async def test_register_duplicate_username_case_insensitive(
    create_tables, async_client: AsyncClient
):
    await async_client.post(
        "/v1/auth/register",
        json={
            "email": "ci1@example.com",
            "username": "casetest",
            "password": "strongpassword123",
            "full_name": "CI User 1",
        },
    )
    response = await async_client.post(
        "/v1/auth/register",
        json={
            "email": "ci2@example.com",
            "username": "CaseTest",
            "password": "strongpassword123",
            "full_name": "CI User 2",
        },
    )
    assert response.status_code == 409


async def test_login_by_email_success(create_tables, async_client: AsyncClient):
    await async_client.post(
        "/v1/auth/register",
        json={
            "email": "login@example.com",
            "username": "loginuser",
            "password": "loginpassword123",
            "full_name": "Login User",
        },
    )

    response = await async_client.post(
        "/v1/auth/login",
        json={"identifier": "login@example.com", "password": "loginpassword123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "expires_in" in data
    assert data["user"]["email"] == "login@example.com"
    assert data["user"]["username"] == "loginuser"


async def test_login_by_username_success(create_tables, async_client: AsyncClient):
    await async_client.post(
        "/v1/auth/register",
        json={
            "email": "byusername@example.com",
            "username": "myusername",
            "password": "loginpassword123",
            "full_name": "By Username",
        },
    )

    response = await async_client.post(
        "/v1/auth/login",
        json={"identifier": "myusername", "password": "loginpassword123"},
    )

    assert response.status_code == 200
    assert response.json()["user"]["username"] == "myusername"


async def test_login_by_username_case_insensitive(create_tables, async_client: AsyncClient):
    await async_client.post(
        "/v1/auth/register",
        json={
            "email": "caselogin@example.com",
            "username": "caseloginuser",
            "password": "loginpassword123",
            "full_name": "Case Login",
        },
    )

    response = await async_client.post(
        "/v1/auth/login",
        json={"identifier": "CaseLoginUser", "password": "loginpassword123"},
    )

    assert response.status_code == 200


async def test_login_user_invalid_credentials(create_tables, async_client: AsyncClient):
    await async_client.post(
        "/v1/auth/register",
        json={
            "email": "invalid@example.com",
            "username": "invaliduser",
            "password": "correctpassword",
            "full_name": "Invalid User",
        },
    )

    response = await async_client.post(
        "/v1/auth/login",
        json={"identifier": "invalid@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401

    response = await async_client.post(
        "/v1/auth/login",
        json={"identifier": "notfound@example.com", "password": "correctpassword"},
    )
    assert response.status_code == 401


async def test_refresh_token_success(create_tables, async_client: AsyncClient):
    await async_client.post(
        "/v1/auth/register",
        json={
            "email": "refresh@example.com",
            "username": "refreshuser",
            "password": "refreshpassword",
            "full_name": "Refresh User",
        },
    )

    login_response = await async_client.post(
        "/v1/auth/login",
        json={"identifier": "refresh@example.com", "password": "refreshpassword"},
    )
    refresh_token = login_response.json()["refresh_token"]

    response = await async_client.post(
        "/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["access_token"] != login_response.json()["access_token"]


async def test_refresh_token_invalid(create_tables, async_client: AsyncClient):
    response = await async_client.post(
        "/v1/auth/refresh",
        json={"refresh_token": "invalid_or_fake_token"},
    )
    assert response.status_code == 401


async def test_full_journey_register_login_profile(create_tables, async_client: AsyncClient):
    """Jornada E2E: cadastro → login por email → login por username → token refresh."""
    reg = await async_client.post(
        "/v1/auth/register",
        json={
            "email": "journey@example.com",
            "username": "journeyuser",
            "password": "journeypass123",
            "full_name": "Journey User",
        },
    )
    assert reg.status_code == 201
    assert reg.json()["username"] == "journeyuser"

    by_email = await async_client.post(
        "/v1/auth/login",
        json={"identifier": "journey@example.com", "password": "journeypass123"},
    )
    assert by_email.status_code == 200
    assert by_email.json()["user"]["username"] == "journeyuser"

    by_username = await async_client.post(
        "/v1/auth/login",
        json={"identifier": "journeyuser", "password": "journeypass123"},
    )
    assert by_username.status_code == 200

    refresh_resp = await async_client.post(
        "/v1/auth/refresh",
        json={"refresh_token": by_email.json()["refresh_token"]},
    )
    assert refresh_resp.status_code == 200
