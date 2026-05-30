from pequi.core.exceptions import NotFoundError
from pequi.repositories.article_repo import ArticleRepository
from pequi.schemas.article import ArticleResponse, article_to_response


class GetArticleUseCase:
    def __init__(self, article_repo: ArticleRepository) -> None:
        self._article_repo = article_repo

    async def execute(self, slug: str, *, actor_role: str) -> ArticleResponse:
        published_only = actor_role != "admin"
        article = await self._article_repo.get_by_slug(slug, published_only=published_only)
        if article is None:
            raise NotFoundError("Article", slug)
        return article_to_response(article)
