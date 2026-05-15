from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import bcrypt
from jose import JWTError, jwt

from pequi.config import get_settings

settings = get_settings()

ALGORITHM = "HS256"
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"

# bcrypt trunca em 72 bytes — pré-truncamos explicitamente para evitar
# comportamento silencioso com senhas longas.
_MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")[:_MAX_PASSWORD_BYTES]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")[:_MAX_PASSWORD_BYTES]
    return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))


def create_access_token(subject: str | UUID, role: str) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(subject),
        "role": role,
        "type": TOKEN_TYPE_ACCESS,
        "jti": str(uuid4()),
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: str | UUID, role: str) -> str:
    now = datetime.now(UTC)
    expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(subject),
        "role": role,
        "type": TOKEN_TYPE_REFRESH,
        "jti": str(uuid4()),
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decodifica e valida um token JWT. Levanta JWTError em caso de falha."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])


def is_token_type(payload: dict, expected_type: str) -> bool:
    return payload.get("type") == expected_type


__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "is_token_type",
    "TOKEN_TYPE_ACCESS",
    "TOKEN_TYPE_REFRESH",
    "JWTError",
]
