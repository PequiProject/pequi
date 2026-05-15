from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

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
    EVOLUTION_API_URL: str = ""
    EVOLUTION_API_KEY: str = ""

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-haiku-20241022"

    # Sentry
    SENTRY_DSN: str = ""

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            import json

            return json.loads(v)
        return v

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.ENV == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
