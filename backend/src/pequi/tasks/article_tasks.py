from uuid import UUID

from pequi.core.logging import get_logger
from pequi.database import AsyncSessionLocal
from pequi.repositories.article_repo import ArticleRepository

logger = get_logger(__name__)


async def increment_article_view_count(article_id: UUID) -> None:
    try:
        async with AsyncSessionLocal() as session:
            repo = ArticleRepository(session)
            await repo.increment_view_count(article_id)
            await session.commit()
    except Exception:
        logger.exception("article.view_count_increment_failed", article_id=str(article_id))
