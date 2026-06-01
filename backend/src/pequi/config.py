import json
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Aplicação
    ENV: Literal["development", "staging", "production"] = "development"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:4200"]

    # Banco de dados
    DATABASE_URL: str
    DATABASE_URL_TEST: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Object storage
    STORAGE_ENDPOINT: str = "http://localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET_IMAGES: str = "pequi-images"
    STORAGE_REGION: str = "us-east-1"
    STORAGE_PUBLIC_URL: str = "http://localhost:9000"

    # WhatsApp
    WHATSAPP_PROVIDER: Literal["twilio", "evolution"] = "twilio"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"
    TWILIO_CONTENT_SIDS: dict[str, str] = Field(default_factory=dict)
    EVOLUTION_API_URL: str = ""
    EVOLUTION_API_KEY: str = ""
    EVOLUTION_INSTANCE: str = ""
    EVOLUTION_TEMPLATE_LANGUAGE: str = "pt_BR"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-haiku-20241022"

    # Sentry
    SENTRY_DSN: str = ""

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return json.loads(v)
        return v

    @field_validator("TWILIO_CONTENT_SIDS", mode="before")
    @classmethod
    def parse_twilio_content_sids(cls, v: str | dict[str, str]) -> dict[str, str]:
        if isinstance(v, str):
            if not v.strip():
                return {}
            return json.loads(v)
        return v

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.ENV == "development"

    def get_test_database_url(self) -> str:
        """URL do PostgreSQL de testes.

        Nunca derive por ``str.replace`` na URL completa: isso altera o usuário
        em ``://pequi:`` quando o path já contém ``pequi_test`` (comum no CI).
        """
        if self.DATABASE_URL_TEST:
            return self.DATABASE_URL_TEST
        return (
            make_url(self.DATABASE_URL)
            .set(database="pequi_test")
            .render_as_string(hide_password=False)
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
