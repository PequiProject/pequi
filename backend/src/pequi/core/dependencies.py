"""
FastAPI Depends centralizados.

Contém as dependências para injeção de banco de dados e controle de acesso
baseado em roles (paciente, profissional de saúde e admin).
"""

from collections.abc import AsyncGenerator
from functools import lru_cache
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.config import get_settings
from pequi.core.auth import TOKEN_TYPE_ACCESS, JWTError, decode_token
from pequi.core.exceptions import ForbiddenError, UnauthorizedError
from pequi.database import get_db as _get_db
from pequi.integrations import AIClient, ObjectStorageClient, WhatsAppClient, get_anthropic_client
from pequi.repositories.patient_repo import PatientRepository
from pequi.services.storage_service import FakeStorageService, StorageService
from pequi.use_cases.get_patient_profile import GetPatientProfileUseCase
from pequi.use_cases.update_patient_profile import UpdatePatientProfileUseCase

security = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in _get_db():
        yield session


async def get_token_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    if not credentials:
        raise UnauthorizedError("Bearer token required")
    try:
        payload = decode_token(credentials.credentials)
    except JWTError as exc:
        raise UnauthorizedError("Invalid or expired token") from exc

    if payload.get("type") != TOKEN_TYPE_ACCESS:
        raise UnauthorizedError("Access token required")

    return payload


def _parse_user_id_from_payload(payload: dict) -> UUID:
    try:
        return UUID(payload["sub"])
    except (KeyError, ValueError, TypeError) as exc:
        raise UnauthorizedError("Invalid token") from exc


async def get_current_user(payload: dict = Depends(get_token_payload)) -> UUID:
    return _parse_user_id_from_payload(payload)


async def get_actor_from_token(
    payload: dict = Depends(get_token_payload),
) -> tuple[UUID, str]:
    """Retorna (user_id, role) do token de acesso; 401 se sub ou role inválidos."""
    user_id = _parse_user_id_from_payload(payload)
    role = payload.get("role")
    if not role or not isinstance(role, str):
        raise UnauthorizedError("Invalid token")
    return user_id, role


class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, payload: dict = Depends(get_token_payload)) -> UUID:
        if payload.get("role") not in self.allowed_roles:
            raise ForbiddenError(f"Access denied. Allowed roles: {', '.join(self.allowed_roles)}")
        return _parse_user_id_from_payload(payload)


get_current_patient = RoleChecker(["patient"])
get_current_professional = RoleChecker(["health_professional"])
get_current_admin = RoleChecker(["admin"])


async def get_patient_profile_use_case(
    session: AsyncSession = Depends(get_db),
) -> GetPatientProfileUseCase:
    return GetPatientProfileUseCase(PatientRepository(session))


async def get_update_patient_profile_use_case(
    session: AsyncSession = Depends(get_db),
) -> UpdatePatientProfileUseCase:
    return UpdatePatientProfileUseCase(PatientRepository(session))


@lru_cache
def get_cached_whatsapp_client() -> WhatsAppClient:
    """Return the shared WhatsApp client used by FastAPI dependencies."""
    return WhatsAppClient()


async def get_whatsapp_client() -> WhatsAppClient:
    """Dependency that returns a configured WhatsApp client."""
    return get_cached_whatsapp_client()


async def close_cached_whatsapp_client() -> None:
    """Close the shared WhatsApp client, if it has been created."""
    if get_cached_whatsapp_client.cache_info().currsize == 0:
        return
    await get_cached_whatsapp_client().close()
    get_cached_whatsapp_client.cache_clear()


async def get_object_storage_client() -> ObjectStorageClient:
    """Dependency that returns a configured object storage client."""
    return ObjectStorageClient()


async def get_ai_client() -> AIClient | None:
    """Dependency that returns a configured AI client or None if unavailable."""
    return get_anthropic_client()


def get_storage_service() -> StorageService:
    settings = get_settings()
    return FakeStorageService(base_url=settings.STORAGE_PUBLIC_URL)


__all__ = [
    "get_db",
    "get_token_payload",
    "get_current_user",
    "get_actor_from_token",
    "get_current_patient",
    "get_current_professional",
    "get_current_admin",
    "get_patient_profile_use_case",
    "get_update_patient_profile_use_case",
    "get_cached_whatsapp_client",
    "get_whatsapp_client",
    "close_cached_whatsapp_client",
    "get_object_storage_client",
    "get_ai_client",
    "get_storage_service",
]
