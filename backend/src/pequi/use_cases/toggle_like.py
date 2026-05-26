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
        """Toggle like em post — retorna (liked, like_count)."""
        patient = await self._patient_repo.get_by_user_id(user_id)
        if patient is None:
            raise NotFoundError("PatientProfile")

        post = await self._community_repo.get_post_by_id(post_id)
        if post is None:
            raise NotFoundError("CommunityPost", str(post_id))

        liked, like_count = await self._community_repo.toggle_like(user_id, post_id)
        return {"liked": liked, "like_count": like_count}
