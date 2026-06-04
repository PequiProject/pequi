from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.repositories.community_repo import CommunityRepository
from pequi.repositories.patient_repo import PatientRepository


class ToggleLikeUseCase:
    def __init__(
        self,
        community_repo: CommunityRepository,
        patient_repo: PatientRepository,
    ) -> None:
        self._community_repo = community_repo
        self._patient_repo = patient_repo

    async def execute(self, user_id: UUID, post_id: UUID) -> dict:
        """Toggle like em post — retorna liked e like_count atualizados."""
        await self._patient_repo.get_or_create_by_user_id(user_id)

        post = await self._community_repo.get_post_by_id(post_id)
        if post is None:
            raise NotFoundError("CommunityPost", str(post_id))

        if await self._community_repo.check_like_exists(user_id, post_id):
            liked, like_count = await self._community_repo.remove_like(user_id, post_id)
        else:
            liked, like_count = await self._community_repo.add_like(user_id, post_id)

        return {"liked": liked, "like_count": like_count}
