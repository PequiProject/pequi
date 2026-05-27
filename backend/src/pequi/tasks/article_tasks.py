from uuid import UUID

from pequi.database import AsyncSessionLocal
from pequi.repositories.article_repo import ArticleRepository


async def increment_article_view_count(article_id: UUID) -> None:
    async with AsyncSessionLocal() as session:
        repo = ArticleRepository(session)
        await repo.increment_view_count(article_id)
        await session.commit()
