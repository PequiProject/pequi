from uuid import UUID

from jose import JWTError

from pequi.config import get_settings
from pequi.core.auth import (
    TOKEN_TYPE_REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    is_token_type,
)
from pequi.core.exceptions import UnauthorizedError
from pequi.core.token_blacklist import is_token_revoked
from pequi.repositories.user_repo import UserRepository
from pequi.schemas.user import AuthResponse, RefreshRequest, UserResponse

settings = get_settings()


class RefreshTokenUseCase:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def execute(self, data: RefreshRequest) -> AuthResponse:
        try:
            payload = decode_token(data.refresh_token)
        except JWTError as exc:
            raise UnauthorizedError("Invalid or expired refresh token") from exc

        if not is_token_type(payload, TOKEN_TYPE_REFRESH):
            raise UnauthorizedError("Invalid token type")

        if await is_token_revoked(payload):
            raise UnauthorizedError("Token revoked")

        user_id = UUID(payload["sub"])
        user = await self.user_repo.get_by_id(user_id)

        if not user:
            raise UnauthorizedError("User not found")

        if not user.is_active:
            raise UnauthorizedError("User is inactive")

        # TODO: Para evolução pós-M1, considerar armazenar jti ativo (Redis/sessões)
        # e rejeitar reutilização do token vazado
        access_token = create_access_token(subject=user.id, role=user.role)
        refresh_token = create_refresh_token(subject=user.id, role=user.role)

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user),
        )
