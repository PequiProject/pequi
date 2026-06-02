"""Testes unitários de validação Pydantic — schemas de usuário."""

import pytest
from pydantic import ValidationError

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
    with pytest.raises(ValueError, match="espaços"):
        UserCreate(
            email="u@example.com",
            username="joao silva",
            password="strongpass123",
            full_name="João Silva",
        )


def test_username_accepts_dot_and_edge_punctuation():
    data = UserCreate(
        email="u@example.com",
        username="joao.silva_1",
        password="strongpass123",
        full_name="João Silva",
    )
    assert data.username == "joao.silva_1"


def test_username_accepts_leading_or_trailing_separator():
    data = UserCreate(
        email="u@example.com",
        username="_user-",
        password="strongpass123",
        full_name="João Silva",
    )
    assert data.username == "_user-"


def test_username_rejects_only_separators():
    with pytest.raises(ValueError, match="nome de usuário"):
        UserCreate(
            email="u@example.com",
            username="...",
            password="strongpass123",
            full_name="João Silva",
        )


def test_username_rejects_too_short():
    with pytest.raises(ValidationError):
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
    with pytest.raises(ValueError, match="nome de usuário"):
        UserCreate(
            email="u@example.com",
            username="joao@silva",
            password="strongpass123",
            full_name="João Silva",
        )
