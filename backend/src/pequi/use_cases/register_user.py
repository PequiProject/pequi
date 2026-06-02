from pequi.core.auth import hash_password
from pequi.core.exceptions import ConflictError
from pequi.core.logging import get_logger
from pequi.models.user import User
from pequi.repositories.user_repo import UserRepository
from pequi.schemas.user import UserCreate, UserResponse

logger = get_logger(__name__)


class RegisterUserUseCase:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def execute(self, data: UserCreate) -> UserResponse:
        if await self.user_repo.get_by_email(data.email):
            raise ConflictError("Unable to register with these credentials.")

        if await self.user_repo.get_by_username(data.username):
            raise ConflictError("Username already taken.")

        hashed = hash_password(data.password)
        user = User(
            email=data.email,
            username=data.username,
            hashed_password=hashed,
            full_name=data.full_name,
            role="patient",
        )
        user = await self.user_repo.add(user)
        logger.info("user.registered", user_id=str(user.id), username=user.username)
        return UserResponse.model_validate(user)
