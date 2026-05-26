"""Garante derivação segura da URL de testes (regressão CI/local)."""

from sqlalchemy.engine import make_url

from pequi.config import Settings


def test_get_test_database_url_from_explicit_setting() -> None:
    settings = Settings(
        SECRET_KEY="test",
        DATABASE_URL="postgresql+asyncpg://pequi:pequi@localhost:5432/pequi",
        DATABASE_URL_TEST="postgresql+asyncpg://pequi:pequi@localhost:5432/pequi_test",
    )
    assert settings.get_test_database_url() == settings.DATABASE_URL_TEST


def test_get_test_database_url_derives_only_database_name() -> None:
    settings = Settings(
        SECRET_KEY="test",
        DATABASE_URL="postgresql+asyncpg://pequi:pequi@localhost:5432/pequi",
    )
    url = make_url(settings.get_test_database_url())
    assert url.username == "pequi"
    assert url.password == "pequi"
    assert url.database == "pequi_test"


def test_get_test_database_url_does_not_corrupt_ci_style_url() -> None:
    """CI costuma definir só DATABASE_URL apontando para pequi_test."""
    ci_url = "postgresql+asyncpg://pequi:pequi@localhost:5432/pequi_test"
    settings = Settings(SECRET_KEY="test", DATABASE_URL=ci_url)
    assert settings.get_test_database_url() == ci_url
