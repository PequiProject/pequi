import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

_USERNAME_RE = re.compile(r"^(?=.*[a-z0-9])[a-z0-9._-]{3,30}$")
_USERNAME_VALIDATION_MSG = "O nome de usuário deve ter de 3 a 30 caracteres, sem espaços."
_USERNAME_SPACE_MSG = "O nome de usuário não pode conter espaços."


class UserCreate(BaseModel):
    """Cadastro público — sempre cria usuário com role ``patient`` no use case."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8, max_length=64)
    full_name: str = Field(..., min_length=2, max_length=100)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if any(ch.isspace() for ch in v):
            raise ValueError(_USERNAME_SPACE_MSG)
        normalized = v.lower()
        if not _USERNAME_RE.match(normalized):
            raise ValueError(_USERNAME_VALIDATION_MSG)
        return normalized


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    username: str
    full_name: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class LoginRequest(BaseModel):
    """Login por email ou username.

    ``identifier`` pode ser o endereço de e-mail ou o username do usuário.
    """

    identifier: str = Field(..., min_length=1, max_length=254)
    password: str


class UsernameUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(..., min_length=3, max_length=30)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if any(ch.isspace() for ch in v):
            raise ValueError(_USERNAME_SPACE_MSG)
        normalized = v.lower()
        if not _USERNAME_RE.match(normalized):
            raise ValueError(_USERNAME_VALIDATION_MSG)
        return normalized
