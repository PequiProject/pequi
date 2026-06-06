from uuid import UUID

from pequi.core.auth import hash_password, verify_password
from pequi.core.exceptions import UnauthorizedError, ValidationFailedError
from pequi.repositories.user_repo import UserRepository
from pequi.schemas.account import ChangePasswordRequest


class ChangePasswordUseCase:
    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, user_id: UUID, data: ChangePasswordRequest) -> None:
        if data.new_password != data.confirm_password:
            raise ValidationFailedError("A nova senha e a confirmação não coincidem.")

        user = await self._user_repo.get_by_id(user_id)
        if user is None:
            raise UnauthorizedError("Usuário não encontrado.")

        if not verify_password(data.current_password, user.hashed_password):
            raise UnauthorizedError("Senha atual incorreta.")

        await self._user_repo.update_password(user_id, hash_password(data.new_password))
