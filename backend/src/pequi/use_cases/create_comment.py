from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.repositories.community_repo import CommunityRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.community import CommentCreate, CommentResponse


class CreateCommentUseCase:
    def __init__(
        self,
        community_repo: CommunityRepository,
        patient_repo: PatientRepository,
    ) -> None:
        self._community_repo = community_repo
        self._patient_repo = patient_repo

    async def execute(self, user_id: UUID, post_id: UUID, data: CommentCreate) -> CommentResponse:
        """Create a community comment for a patient user."""
        await self._patient_repo.get_or_create_by_user_id(user_id)

        post = await self._community_repo.get_post_by_id(post_id)
        if post is None:
            raise NotFoundError("CommunityPost", str(post_id))

        comment = await self._community_repo.create_comment(user_id, post_id, data)
        return CommentResponse.model_validate(comment)
