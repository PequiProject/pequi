from pequi.models.article import ArticleCategory
from pequi.repositories.article_repo import ArticleRepository
from pequi.schemas.article import ArticleListResponse, article_to_response


class ListArticlesUseCase:
    def __init__(self, article_repo: ArticleRepository) -> None:
        self._article_repo = article_repo

    async def execute(
        self,
        *,
        actor_role: str,
        limit: int = 50,
        offset: int = 0,
        category: ArticleCategory | None = None,
        tag: str | None = None,
        search: str | None = None,
    ) -> ArticleListResponse:
        published_only = actor_role != "admin"
        articles, total = await self._article_repo.list(
            limit=limit,
            offset=offset,
            category=category,
            tag_name=tag,
            title_search=search,
            published_only=published_only,
        )
        return ArticleListResponse(
            items=[article_to_response(a) for a in articles],
            total=total,
        )
