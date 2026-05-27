from pequi.repositories.community_repo import CommunityRepository
from pequi.schemas.community import PostListResponse, PostResponse


class ListPostsUseCase:
    def __init__(self, community_repo: CommunityRepository) -> None:
        self._community_repo = community_repo

    async def execute(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        category: str | None = None,
    ) -> PostListResponse:
        """Lista posts da comunidade paginados."""
        posts, total = await self._community_repo.list_posts(
            limit=limit,
            offset=offset,
            category=category,
            exclude_moderated=True,
        )
        return PostListResponse(
            items=[PostResponse.model_validate(p) for p in posts],
            total=total,
        )
