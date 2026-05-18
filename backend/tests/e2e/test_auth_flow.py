import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_register_user_success(create_tables, async_client: AsyncClient):
    response = await async_client.post(
        "/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "strongpassword123",
            "full_name": "Test User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "patient"
    assert "password" not in data
    assert "hashed_password" not in data


async def test_register_rejects_role_in_body(create_tables, async_client: AsyncClient):
    response = await async_client.post(
        "/v1/auth/register",
        json={
            "email": "admin@example.com",
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
            "password": "strongpassword123",
            "full_name": "Test User",
        },
    )
    response = await async_client.post(
        "/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "anotherpassword",
            "full_name": "Another User",
        },
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Unable to register with these credentials."


async def test_login_user_success(create_tables, async_client: AsyncClient):
    await async_client.post(
        "/v1/auth/register",
        json={
            "email": "login@example.com",
            "password": "loginpassword123",
            "full_name": "Login User",
        },
    )

    response = await async_client.post(
        "/v1/auth/login",
        json={"email": "login@example.com", "password": "loginpassword123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert "expires_in" in data
    assert "user" in data
    assert data["user"]["email"] == "login@example.com"


async def test_login_user_invalid_credentials(create_tables, async_client: AsyncClient):
    await async_client.post(
        "/v1/auth/register",
        json={
            "email": "invalid@example.com",
            "password": "correctpassword",
            "full_name": "Invalid User",
        },
    )

    response = await async_client.post(
        "/v1/auth/login",
        json={"email": "invalid@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401

    response = await async_client.post(
        "/v1/auth/login",
        json={"email": "notfound@example.com", "password": "correctpassword"},
    )
    assert response.status_code == 401


async def test_refresh_token_success(create_tables, async_client: AsyncClient):
    await async_client.post(
        "/v1/auth/register",
        json={
            "email": "refresh@example.com",
            "password": "refreshpassword",
            "full_name": "Refresh User",
        },
    )

    login_response = await async_client.post(
        "/v1/auth/login",
        json={"email": "refresh@example.com", "password": "refreshpassword"},
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
