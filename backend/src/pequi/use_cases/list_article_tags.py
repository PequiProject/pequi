from pequi.repositories.article_repo import ArticleRepository
from pequi.schemas.article import ArticleTagResponse


class ListArticleTagsUseCase:
    def __init__(self, article_repo: ArticleRepository) -> None:
        self._article_repo = article_repo

    async def execute(self) -> list[ArticleTagResponse]:
        tags = await self._article_repo.list_all_tags()
        return [ArticleTagResponse.model_validate(t) for t in tags]
