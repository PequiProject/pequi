from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.repositories.community_repo import CommunityRepository
from pequi.schemas.community import PostResponse


class GetPostUseCase:
    def __init__(self, community_repo: CommunityRepository) -> None:
        self._community_repo = community_repo

    async def execute(self, post_id: UUID) -> PostResponse:
        """Retorna um post específico por ID."""
        post = await self._community_repo.get_post_by_id(post_id)
        if post is None:
            raise NotFoundError("CommunityPost", str(post_id))
        return PostResponse.model_validate(post)
