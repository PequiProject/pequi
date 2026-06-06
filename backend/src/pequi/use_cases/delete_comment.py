from uuid import UUID

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.repositories.community_repo import CommunityRepository
from pequi.schemas.community import CommentResponse


class DeleteCommentUseCase:
    def __init__(self, community_repo: CommunityRepository) -> None:
        self._community_repo = community_repo

    async def execute(
        self,
        user_id: UUID,
        post_id: UUID,
        comment_id: UUID,
        is_admin: bool = False,
    ) -> CommentResponse:
        """Soft delete de comentário (próprio autor ou admin)."""
        comment = await self._community_repo.get_comment_by_id(comment_id)
        if comment is None or comment.post_id != post_id:
            raise NotFoundError("CommunityComment", str(comment_id))

        if not is_admin:
            is_owner = await self._community_repo.check_comment_ownership(comment_id, user_id)
            if not is_owner:
                raise ForbiddenError("You can only delete your own comments")

        deleted_comment = await self._community_repo.soft_delete_comment(comment_id)
        if deleted_comment is None:
            raise NotFoundError("CommunityComment", str(comment_id))

        return CommentResponse.model_validate(deleted_comment)
