import uuid
from datetime import UTC, datetime
from uuid import UUID

from pequi.core.logging import get_logger
from pequi.models.article import Article
from pequi.repositories.article_repo import ArticleRepository
from pequi.repositories.audit_repo import AuditRepository
from pequi.schemas.article import ArticleCreate, ArticleResponse, article_to_response
from pequi.services.article_service import ArticleService
from pequi.utils.slug import slug_base_from_title, unique_slug

logger = get_logger(__name__)


class CreateArticleUseCase:
    def __init__(
        self,
        article_repo: ArticleRepository,
        audit_repo: AuditRepository,
    ) -> None:
        self._article_repo = article_repo
        self._audit_repo = audit_repo

    async def execute(self, admin_user_id: UUID, data: ArticleCreate) -> ArticleResponse:
        base_slug = slug_base_from_title(data.title)
        existing = await self._article_repo.list_slugs_with_prefix(base_slug)
        slug = unique_slug(base_slug, existing)

        content = data.content
        reading_time = ArticleService.calculate_reading_time_min(content)
        published_at = datetime.now(UTC) if data.is_published else None

        article = Article(
            id=uuid.uuid4(),
            title=data.title,
            slug=slug,
            summary=data.summary,
            content=content,
            category=data.category,
            author_name=data.author_name,
            cover_image_url=data.cover_image_url,
            cover_image_key=data.cover_image_key,
            is_published=data.is_published,
            published_at=published_at,
            reading_time_min=reading_time,
        )
        created = await self._article_repo.create(article, data.tags)

        await self._audit_repo.log_action(
            actor_user_id=admin_user_id,
            actor_role="admin",
            entity_type="article",
            entity_id=str(created.id),
            action="create",
            details=f"slug={created.slug}, is_published={created.is_published}",
        )
        logger.info(
            "article.created",
            admin_user_id=str(admin_user_id),
            article_id=str(created.id),
            slug=created.slug,
        )

        return article_to_response(created)
