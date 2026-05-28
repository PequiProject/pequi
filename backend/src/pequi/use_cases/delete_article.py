from uuid import UUID

from pequi.core.logging import get_logger
from pequi.repositories.article_repo import ArticleRepository
from pequi.repositories.audit_repo import AuditRepository

logger = get_logger(__name__)


class DeleteArticleUseCase:
    def __init__(
        self,
        article_repo: ArticleRepository,
        audit_repo: AuditRepository,
    ) -> None:
        self._article_repo = article_repo
        self._audit_repo = audit_repo

    async def execute(self, admin_user_id: UUID, article_id: UUID) -> None:
        article = await self._article_repo.get_by_id_or_raise(article_id)
        await self._article_repo.soft_delete(article_id)

        await self._audit_repo.log_action(
            actor_user_id=admin_user_id,
            actor_role="admin",
            entity_type="article",
            entity_id=str(article_id),
            action="delete",
            details=f"slug={article.slug}",
        )
        logger.info(
            "article.deleted",
            admin_user_id=str(admin_user_id),
            article_id=str(article_id),
        )
