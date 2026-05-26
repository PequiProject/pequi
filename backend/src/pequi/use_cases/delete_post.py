from uuid import UUID

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.repositories.community_repo import CommunityRepository
from pequi.schemas.community import PostResponse


class DeletePostUseCase:
    def __init__(self, community_repo: CommunityRepository) -> None:
        self._community_repo = community_repo

    async def execute(self, user_id: UUID, post_id: UUID, is_admin: bool = False) -> PostResponse:
        """Soft delete de post (próprio autor ou admin)."""
        post = await self._community_repo.get_post_by_id(post_id)
        if post is None:
            raise NotFoundError("CommunityPost", str(post_id))

        if not is_admin:
            is_owner = await self._community_repo.check_post_ownership(post_id, user_id)
            if not is_owner:
                raise ForbiddenError("You can only delete your own posts")

        deleted_post = await self._community_repo.soft_delete_post(post_id)
        if deleted_post is None:
            raise NotFoundError("CommunityPost", str(post_id))

        return PostResponse.model_validate(deleted_post)
