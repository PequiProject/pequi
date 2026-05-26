from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.core.logging import get_logger
from pequi.repositories.community_repo import CommunityRepository
from pequi.schemas.community import DeanonymizeResponse

logger = get_logger(__name__)


class DeanonymizeUseCase:
    def __init__(self, community_repo: CommunityRepository) -> None:
        self._community_repo = community_repo

    async def execute(self, anonymous_id: UUID, admin_user_id: UUID) -> DeanonymizeResponse:
        """Deanonymiza anonymous_id (admin only) — ação auditada."""
        mapping = await self._community_repo.deanonymize(anonymous_id)
        if mapping is None:
            raise NotFoundError("CommunityAnonymousMap", str(anonymous_id))

        # Log de auditoria crítico para ação de deanonymização
        logger.warning(
            "community.deanonymize",
            admin_user_id=str(admin_user_id),
            anonymous_id=str(anonymous_id),
            real_user_id=str(mapping.user_id),
        )

        return DeanonymizeResponse.model_validate(mapping)
