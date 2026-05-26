from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.core.logging import get_logger
from pequi.repositories.community_repo import CommunityRepository
from pequi.schemas.community import PostModerate, PostResponse

logger = get_logger(__name__)


class ModeratePostUseCase:
    def __init__(self, community_repo: CommunityRepository) -> None:
        self._community_repo = community_repo

    async def execute(self, post_id: UUID, data: PostModerate, admin_user_id: UUID) -> PostResponse:
        """Modera post (admin only) — ação auditada."""
        post = await self._community_repo.get_post_by_id(post_id)
        if post is None:
            raise NotFoundError("CommunityPost", str(post_id))

        updated_post = await self._community_repo.update_post_moderation(post_id, data.is_moderated)
        if updated_post is None:
            raise NotFoundError("CommunityPost", str(post_id))

        # Log de auditoria para ação de moderação
        logger.info(
            "community.post_moderated",
            admin_user_id=str(admin_user_id),
            post_id=str(post_id),
            is_moderated=data.is_moderated,
        )

        return PostResponse.model_validate(updated_post)
