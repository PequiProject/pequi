from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.core.logging import get_logger
from pequi.repositories.audit_repo import AuditRepository
from pequi.repositories.community_repo import CommunityRepository
from pequi.schemas.community import DeanonymizeResponse

logger = get_logger(__name__)


class DeanonymizeUseCase:
    def __init__(
        self,
        community_repo: CommunityRepository,
        audit_repo: AuditRepository,
    ) -> None:
        self._community_repo = community_repo
        self._audit_repo = audit_repo

    async def execute(self, anonymous_id: UUID, admin_user_id: UUID) -> DeanonymizeResponse:
        """Deanonymiza anonymous_id (admin only) — ação auditada em tabela audit_logs."""
        mapping = await self._community_repo.deanonymize(anonymous_id)
        if mapping is None:
            raise NotFoundError("CommunityAnonymousMap", str(anonymous_id))

        # Persistir auditoria em tabela (LGPD compliance - append-only)
        await self._audit_repo.log_action(
            actor_user_id=admin_user_id,
            actor_role="admin",
            entity_type="community_anonymous_map",
            entity_id=str(anonymous_id),
            action="deanonymize",
            details="Deanonymized anonymous_id to real user",
        )

        # Log estruturado adicional para observabilidade
        logger.warning(
            "community.deanonymize",
            admin_user_id=str(admin_user_id),
            anonymous_id=str(anonymous_id),
        )

        return DeanonymizeResponse.model_validate(mapping)
