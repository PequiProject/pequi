"""Testes unitários de validação Pydantic — schemas de usuário."""

import pytest

from pequi.schemas.user import UserCreate


def test_username_is_normalized_to_lowercase():
    data = UserCreate(
        email="u@example.com",
        username="JoaoSilva",
        password="strongpass123",
        full_name="João Silva",
    )
    assert data.username == "joaosilva"


def test_username_accepts_valid_characters():
    data = UserCreate(
        email="u@example.com",
        username="joao_silva-42",
        password="strongpass123",
        full_name="João Silva",
    )
    assert data.username == "joao_silva-42"


def test_username_rejects_spaces():
    with pytest.raises(ValueError, match="username"):
        UserCreate(
            email="u@example.com",
            username="joao silva",
            password="strongpass123",
            full_name="João Silva",
        )


def test_username_rejects_leading_hyphen():
    with pytest.raises(ValueError, match="username"):
        UserCreate(
            email="u@example.com",
            username="-joao",
            password="strongpass123",
            full_name="João Silva",
        )


def test_username_rejects_trailing_hyphen():
    with pytest.raises(ValueError, match="username"):
        UserCreate(
            email="u@example.com",
            username="joao-",
            password="strongpass123",
            full_name="João Silva",
        )


def test_username_rejects_too_short():
    with pytest.raises(ValueError):
        UserCreate(
            email="u@example.com",
            username="ab",
            password="strongpass123",
            full_name="João Silva",
        )


def test_username_rejects_too_long():
    with pytest.raises(ValueError):
        UserCreate(
            email="u@example.com",
            username="a" * 31,
            password="strongpass123",
            full_name="João Silva",
        )


def test_username_minimum_length_3():
    data = UserCreate(
        email="u@example.com",
        username="abc",
        password="strongpass123",
        full_name="João Silva",
    )
    assert data.username == "abc"


def test_username_rejects_special_chars():
    with pytest.raises(ValueError, match="username"):
        UserCreate(
            email="u@example.com",
            username="joao@silva",
            password="strongpass123",
            full_name="João Silva",
        )
