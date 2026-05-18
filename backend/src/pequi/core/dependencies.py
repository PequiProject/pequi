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


async def get_stub_patient_user_id() -> UUID | None:
    """Stub até M1: substituir por subject do JWT (role patient)."""
    return None


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
    "get_stub_patient_user_id",
    "get_patient_profile_use_case",
    "get_update_patient_profile_use_case",
]
