from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.repositories.community_repo import CommunityRepository
from pequi.schemas.community import CommentListResponse, CommentResponse


class ListCommentsUseCase:
    def __init__(self, community_repo: CommunityRepository) -> None:
        self._community_repo = community_repo

    async def execute(
        self,
        post_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> CommentListResponse:
        """Lista comentários de um post."""
        post = await self._community_repo.get_post_by_id(post_id)
        if post is None:
            raise NotFoundError("CommunityPost", str(post_id))

        comments, total = await self._community_repo.list_comments(
            post_id=post_id,
            limit=limit,
            offset=offset,
        )
        return CommentListResponse(
            items=[CommentResponse.model_validate(c) for c in comments],
            total=total,
        )
