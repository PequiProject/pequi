from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.repositories.community_repo import CommunityRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.community import PostCreate, PostResponse


class CreatePostUseCase:
    def __init__(
        self,
        community_repo: CommunityRepository,
        patient_repo: PatientRepository,
    ) -> None:
        self._community_repo = community_repo
        self._patient_repo = patient_repo

    async def execute(self, user_id: UUID, data: PostCreate) -> PostResponse:
        """Cria post anônimo na comunidade."""
        patient = await self._patient_repo.get_by_user_id(user_id)
        if patient is None:
            raise NotFoundError("PatientProfile")

        post = await self._community_repo.create_post(user_id, data)
        return PostResponse.model_validate(post)
