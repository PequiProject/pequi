"""
FastAPI Depends centralizados.

Implementações concretas de get_current_patient / get_current_professional
serão adicionadas em M1 após a criação dos models User e das roles.
Este arquivo já exporta get_db para uso imediato.
"""

from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.auth import TOKEN_TYPE_ACCESS, JWTError, decode_token
from pequi.core.exceptions import UnauthorizedError
from pequi.database import get_db as _get_db

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


__all__ = ["get_db", "get_token_payload"]
