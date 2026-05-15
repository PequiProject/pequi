"""Smoke tests da Milestone 0 — verifica que o app instancia corretamente."""

import pytest
from fastapi.testclient import TestClient

from pequi.main import app


def test_app_instantiates() -> None:
    assert app is not None
    assert app.title == "Pequi API"


def test_health_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_config_loads() -> None:
    from pequi.config import get_settings

    settings = get_settings()
    assert settings.SECRET_KEY != ""
    assert settings.DATABASE_URL.startswith("postgresql")


def test_hash_and_verify_password() -> None:
    from pequi.core.auth import hash_password, verify_password

    password = "SenhaSegura@2026"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("senha-errada", hashed) is False


def test_create_and_decode_access_token() -> None:
    from uuid import uuid4

    from pequi.core.auth import TOKEN_TYPE_ACCESS, create_access_token, decode_token

    user_id = uuid4()
    token = create_access_token(subject=user_id, role="patient")
    payload = decode_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["role"] == "patient"
    assert payload["type"] == TOKEN_TYPE_ACCESS


def test_create_and_decode_refresh_token() -> None:
    from uuid import uuid4

    from pequi.core.auth import TOKEN_TYPE_REFRESH, create_refresh_token, decode_token

    user_id = uuid4()
    token = create_refresh_token(subject=user_id, role="health_professional")
    payload = decode_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["type"] == TOKEN_TYPE_REFRESH


def test_invalid_token_raises() -> None:
    from jose import JWTError

    from pequi.core.auth import decode_token

    with pytest.raises(JWTError):
        decode_token("token.invalido.aqui")
