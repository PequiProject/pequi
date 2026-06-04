from uuid import UUID

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
        """Create a community post for a patient user."""
        await self._patient_repo.get_or_create_by_user_id(user_id)
        post = await self._community_repo.create_post(user_id, data)
        return PostResponse.model_validate(post)
