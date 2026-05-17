from pequi.config import get_settings
from pequi.core.auth import create_access_token, create_refresh_token, verify_password
from pequi.core.exceptions import UnauthorizedError
from pequi.repositories.user_repo import UserRepository
from pequi.schemas.user import AuthResponse, LoginRequest, UserResponse

settings = get_settings()

class LoginUserUseCase:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def execute(self, data: LoginRequest) -> AuthResponse:
        user = await self.user_repo.get_by_email(data.email)
        
        if not user or not verify_password(data.password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password")
            
        if not user.is_active:
            raise UnauthorizedError("User is inactive")
            
        access_token = create_access_token(subject=user.id, role=user.role)
        refresh_token = create_refresh_token(subject=user.id, role=user.role)
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user),
        )
