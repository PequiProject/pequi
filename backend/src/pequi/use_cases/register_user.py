from pequi.core.auth import hash_password
from pequi.core.exceptions import ConflictError
from pequi.core.logging import get_logger
from pequi.models.user import User
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.user_repo import UserRepository
from pequi.schemas.user import UserCreate, UserResponse

logger = get_logger(__name__)


class RegisterUserUseCase:
    def __init__(self, user_repo: UserRepository, patient_repo: PatientRepository):
        self.user_repo = user_repo
        self.patient_repo = patient_repo

    async def execute(self, data: UserCreate) -> UserResponse:
        if await self.user_repo.get_by_email(data.email):
            raise ConflictError("Não foi possível cadastrar com estes dados.")

        if await self.user_repo.get_by_username(data.username):
            raise ConflictError("Este nome de usuário já está em uso.")

        hashed = hash_password(data.password)
        user = User(
            email=data.email,
            username=data.username,
            hashed_password=hashed,
            full_name=data.full_name,
            role="patient",
        )
        user = await self.user_repo.add(user)
        await self.patient_repo.get_or_create_by_user_id(user.id)
        logger.info("user.registered", user_id=str(user.id), username=user.username)
        return UserResponse.model_validate(user)
