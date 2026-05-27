from uuid import UUID

from pequi.repositories.article_repo import ArticleRepository


class DeleteArticleUseCase:
    def __init__(self, article_repo: ArticleRepository) -> None:
        self._article_repo = article_repo

    async def execute(self, article_id: UUID) -> None:
        await self._article_repo.soft_delete(article_id)
