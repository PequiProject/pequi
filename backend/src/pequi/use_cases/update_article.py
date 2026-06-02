from datetime import UTC, datetime
from uuid import UUID

from pequi.core.logging import get_logger
from pequi.repositories.article_repo import ArticleRepository
from pequi.repositories.audit_repo import AuditRepository
from pequi.schemas.article import ArticleResponse, ArticleUpdate, article_to_response
from pequi.services.article_service import ArticleService
from pequi.utils.slug import slug_base_from_title, unique_slug

logger = get_logger(__name__)


class UpdateArticleUseCase:
    def __init__(
        self,
        article_repo: ArticleRepository,
        audit_repo: AuditRepository,
    ) -> None:
        self._article_repo = article_repo
        self._audit_repo = audit_repo

    async def execute(
        self,
        admin_user_id: UUID,
        article_id: UUID,
        data: ArticleUpdate,
    ) -> ArticleResponse:
        article = await self._article_repo.get_by_id_or_raise(article_id)
        fields_set = data.model_fields_set

        if "title" in fields_set and data.title is not None:
            article.title = data.title
            base_slug = slug_base_from_title(data.title)
            existing = await self._article_repo.list_slugs_with_prefix(
                base_slug, exclude_id=article.id
            )
            article.slug = unique_slug(base_slug, existing)

        if "summary" in fields_set and data.summary is not None:
            article.summary = data.summary
        if "content" in fields_set and data.content is not None:
            article.content = data.content
            article.reading_time_min = ArticleService.calculate_reading_time_min(data.content)
        if "category" in fields_set and data.category is not None:
            article.category = data.category
        if "author_name" in fields_set and data.author_name is not None:
            article.author_name = data.author_name
        if "cover_image_url" in fields_set:
            article.cover_image_url = data.cover_image_url
        if "cover_image_key" in fields_set:
            article.cover_image_key = data.cover_image_key

        if "is_published" in fields_set and data.is_published is not None:
            article.is_published = data.is_published
            if data.is_published and article.published_at is None:
                article.published_at = datetime.now(UTC)

        tag_names = data.tags if "tags" in fields_set else None
        updated = await self._article_repo.update(article, tag_names)

        await self._audit_repo.log_action(
            actor_user_id=admin_user_id,
            actor_role="admin",
            entity_type="article",
            entity_id=str(article_id),
            action="update",
            details=f"fields={sorted(fields_set)}",
        )
        logger.info(
            "article.updated",
            admin_user_id=str(admin_user_id),
            article_id=str(article_id),
        )

        return article_to_response(updated)
