from uuid import UUID

from pequi.core.exceptions import ConflictError, NotFoundError
from pequi.core.logging import get_logger
from pequi.repositories.user_repo import UserRepository
from pequi.schemas.user import UsernameUpdate, UserResponse

logger = get_logger(__name__)


class UpdateUsernameUseCase:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def execute(self, user_id: UUID, data: UsernameUpdate) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User", str(user_id))

        if user.username.lower() == data.username:
            return UserResponse.model_validate(user)

        existing = await self.user_repo.get_by_username(data.username)
        if existing and existing.id != user_id:
            raise ConflictError("Este nome de usuário já está em uso.")

        updated = await self.user_repo.update_username(user_id, data.username)
        if not updated:
            raise NotFoundError("User", str(user_id))

        logger.info("user.username_updated", user_id=str(user_id), username=updated.username)
        return UserResponse.model_validate(updated)
