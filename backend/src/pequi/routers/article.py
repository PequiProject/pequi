from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.dependencies import (
    get_actor_from_token,
    get_current_admin,
    get_current_user,
    get_db,
)
from pequi.core.rate_limit import user_limiter
from pequi.models.article import ArticleCategory
from pequi.repositories.article_repo import ArticleRepository
from pequi.repositories.audit_repo import AuditRepository
from pequi.schemas.article import (
    ArticleCreate,
    ArticleListResponse,
    ArticleResponse,
    ArticleTagResponse,
    ArticleUpdate,
)
from pequi.tasks.article_tasks import increment_article_view_count
from pequi.use_cases.create_article import CreateArticleUseCase
from pequi.use_cases.delete_article import DeleteArticleUseCase
from pequi.use_cases.get_article import GetArticleUseCase
from pequi.use_cases.list_article_tags import ListArticleTagsUseCase
from pequi.use_cases.list_articles import ListArticlesUseCase
from pequi.use_cases.update_article import UpdateArticleUseCase

router = APIRouter()


def _article_repo(session: AsyncSession = Depends(get_db)) -> ArticleRepository:
    return ArticleRepository(session)


def _article_repos(
    session: AsyncSession = Depends(get_db),
) -> tuple[ArticleRepository, AuditRepository]:
    return ArticleRepository(session), AuditRepository(session)


@router.get("/tags", response_model=list[ArticleTagResponse])
@user_limiter.limit("200/minute")
async def list_article_tags(
    request: Request,
    _user_id: UUID = Depends(get_current_user),
    repo: ArticleRepository = Depends(_article_repo),
) -> list[ArticleTagResponse]:
    use_case = ListArticleTagsUseCase(repo)
    return await use_case.execute()


@router.get("", response_model=ArticleListResponse)
@user_limiter.limit("100/minute")
async def list_articles(
    request: Request,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    repo: ArticleRepository = Depends(_article_repo),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    category: ArticleCategory | None = None,
    tag: str | None = None,
    search: str | None = None,
) -> ArticleListResponse:
    _, role = actor
    use_case = ListArticlesUseCase(repo)
    return await use_case.execute(
        actor_role=role,
        limit=limit,
        offset=offset,
        category=category,
        tag=tag,
        search=search,
    )


@router.get("/{slug}", response_model=ArticleResponse)
@user_limiter.limit("100/minute")
async def get_article(
    request: Request,
    slug: str,
    background_tasks: BackgroundTasks,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    repo: ArticleRepository = Depends(_article_repo),
) -> ArticleResponse:
    _, role = actor
    use_case = GetArticleUseCase(repo)
    result = await use_case.execute(slug, actor_role=role)
    background_tasks.add_task(increment_article_view_count, result.id)
    return result


@router.post("", response_model=ArticleResponse, status_code=status.HTTP_201_CREATED)
@user_limiter.limit("10/hour")
async def create_article(
    request: Request,
    body: ArticleCreate,
    admin_id: UUID = Depends(get_current_admin),
    repos: tuple[ArticleRepository, AuditRepository] = Depends(_article_repos),
) -> ArticleResponse:
    article_repo, audit_repo = repos
    use_case = CreateArticleUseCase(article_repo, audit_repo)
    return await use_case.execute(admin_id, body)


@router.patch("/{article_id}", response_model=ArticleResponse)
@user_limiter.limit("10/hour")
async def update_article(
    request: Request,
    article_id: UUID,
    body: ArticleUpdate,
    admin_id: UUID = Depends(get_current_admin),
    repos: tuple[ArticleRepository, AuditRepository] = Depends(_article_repos),
) -> ArticleResponse:
    article_repo, audit_repo = repos
    use_case = UpdateArticleUseCase(article_repo, audit_repo)
    return await use_case.execute(admin_id, article_id, body)


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
@user_limiter.limit("10/hour")
async def delete_article(
    request: Request,
    article_id: UUID,
    admin_id: UUID = Depends(get_current_admin),
    repos: tuple[ArticleRepository, AuditRepository] = Depends(_article_repos),
) -> None:
    article_repo, audit_repo = repos
    use_case = DeleteArticleUseCase(article_repo, audit_repo)
    await use_case.execute(admin_id, article_id)
