import uuid
from datetime import UTC, datetime

from pequi.models.article import Article
from pequi.repositories.article_repo import ArticleRepository
from pequi.schemas.article import ArticleCreate, ArticleResponse, article_to_response
from pequi.services.article_service import ArticleService
from pequi.utils.slug import slugify_title, unique_slug


class CreateArticleUseCase:
    def __init__(self, article_repo: ArticleRepository) -> None:
        self._article_repo = article_repo

    async def execute(self, data: ArticleCreate) -> ArticleResponse:
        base_slug = slugify_title(data.title)
        if not base_slug:
            base_slug = "artigo"
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
        return article_to_response(created)
