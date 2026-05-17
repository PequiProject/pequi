"""
FastAPI Depends centralizados.

Implementações concretas de get_current_patient / get_current_professional
serão adicionadas em M1 após a criação dos models User e das roles.
Este arquivo já exporta get_db para uso imediato.
"""

from collections.abc import AsyncGenerator
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.auth import TOKEN_TYPE_ACCESS, JWTError, decode_token
from pequi.core.exceptions import UnauthorizedError
from pequi.database import get_db as _get_db
from pequi.repositories.patient_repo import PatientRepository
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


from pequi.core.exceptions import UnauthorizedError, ForbiddenError

async def get_current_user(payload: dict = Depends(get_token_payload)) -> UUID:
    return UUID(payload["sub"])


class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, payload: dict = Depends(get_token_payload)) -> UUID:
        if payload.get("role") not in self.allowed_roles:
            raise ForbiddenError(f"Access denied. Allowed roles: {', '.join(self.allowed_roles)}")
        return UUID(payload["sub"])


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


__all__ = [
    "get_db",
    "get_token_payload",
    "get_current_user",
    "get_current_patient",
    "get_current_professional",
    "get_current_admin",
    "get_patient_profile_use_case",
    "get_update_patient_profile_use_case",
]
