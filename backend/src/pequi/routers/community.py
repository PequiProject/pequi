from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.dependencies import (
    get_actor_from_token,
    get_current_admin,
    get_current_patient,
    get_db,
)
from pequi.core.rate_limit import user_limiter
from pequi.repositories.audit_repo import AuditRepository
from pequi.repositories.community_repo import CommunityRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.community import (
    CommentCreate,
    CommentListResponse,
    CommentResponse,
    DeanonymizeResponse,
    PostCreate,
    PostListResponse,
    PostModerate,
    PostResponse,
)
from pequi.use_cases.create_comment import CreateCommentUseCase
from pequi.use_cases.create_post import CreatePostUseCase
from pequi.use_cases.deanonymize import DeanonymizeUseCase
from pequi.use_cases.delete_post import DeletePostUseCase
from pequi.use_cases.get_post import GetPostUseCase
from pequi.use_cases.list_comments import ListCommentsUseCase
from pequi.use_cases.list_posts import ListPostsUseCase
from pequi.use_cases.moderate_post import ModeratePostUseCase
from pequi.use_cases.toggle_like import ToggleLikeUseCase

router = APIRouter()
admin_router = APIRouter()


def _community_repos(
    session: AsyncSession,
) -> tuple[CommunityRepository, PatientRepository]:
    return (
        CommunityRepository(session),
        PatientRepository(session),
    )


def _admin_community_repos(
    session: AsyncSession,
) -> tuple[CommunityRepository, AuditRepository]:
    return (
        CommunityRepository(session),
        AuditRepository(session),
    )


@router.get("/posts", response_model=PostListResponse)
@user_limiter.limit("100/minute")
async def list_posts(
    request: Request,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    category: str | None = Query(default=None),
) -> PostListResponse:
    """Lista posts da comunidade — qualquer usuário autenticado pode acessar."""
    community_repo, _ = _community_repos(session)
    use_case = ListPostsUseCase(community_repo)
    return await use_case.execute(limit=limit, offset=offset, category=category)


@router.post("/posts", response_model=PostResponse, status_code=201)
@user_limiter.limit("20/hour")
async def create_post(
    request: Request,
    body: PostCreate,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> PostResponse:
    """Cria post anônimo na comunidade — apenas pacientes."""
    community_repo, patient_repo = _community_repos(session)
    use_case = CreatePostUseCase(community_repo, patient_repo)
    return await use_case.execute(user_id, body)


@router.get("/posts/{post_id}", response_model=PostResponse)
@user_limiter.limit("100/minute")
async def get_post(
    request: Request,
    post_id: UUID,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
) -> PostResponse:
    """Retorna um post específico — qualquer usuário autenticado pode acessar."""
    community_repo, _ = _community_repos(session)
    use_case = GetPostUseCase(community_repo)
    return await use_case.execute(post_id)


@router.delete("/posts/{post_id}", response_model=PostResponse)
@user_limiter.limit("10/hour")
async def delete_post(
    request: Request,
    post_id: UUID,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
) -> PostResponse:
    """Soft delete de post — próprio autor ou admin."""
    user_id, role = actor
    community_repo, _ = _community_repos(session)
    use_case = DeletePostUseCase(community_repo)
    return await use_case.execute(user_id, post_id, is_admin=(role == "admin"))


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=201)
@user_limiter.limit("30/hour")
async def create_comment(
    request: Request,
    post_id: UUID,
    body: CommentCreate,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> CommentResponse:
    """Cria comentário anônimo em um post — apenas pacientes."""
    community_repo, patient_repo = _community_repos(session)
    use_case = CreateCommentUseCase(community_repo, patient_repo)
    return await use_case.execute(user_id, post_id, body)


@router.get("/posts/{post_id}/comments", response_model=CommentListResponse)
@user_limiter.limit("100/minute")
async def list_comments(
    request: Request,
    post_id: UUID,
    actor: tuple[UUID, str] = Depends(get_actor_from_token),
    session: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> CommentListResponse:
    """Lista comentários de um post — qualquer usuário autenticado pode acessar."""
    community_repo, _ = _community_repos(session)
    use_case = ListCommentsUseCase(community_repo)
    return await use_case.execute(post_id, limit=limit, offset=offset)


@router.post("/posts/{post_id}/like")
@user_limiter.limit("60/hour")
async def toggle_like(
    request: Request,
    post_id: UUID,
    user_id: UUID = Depends(get_current_patient),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Toggle like em post — apenas pacientes."""
    community_repo, patient_repo = _community_repos(session)
    use_case = ToggleLikeUseCase(community_repo, patient_repo)
    return await use_case.execute(user_id, post_id)


@admin_router.patch("/posts/{post_id}/moderate", response_model=PostResponse)
@user_limiter.limit("20/hour")
async def moderate_post(
    request: Request,
    post_id: UUID,
    body: PostModerate,
    admin_user_id: UUID = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db),
) -> PostResponse:
    """Modera post (admin only) — marca como moderado/removido."""
    community_repo, audit_repo = _admin_community_repos(session)
    use_case = ModeratePostUseCase(community_repo, audit_repo)
    return await use_case.execute(post_id, body, admin_user_id)


@admin_router.get("/deanonymize/{anonymous_id}", response_model=DeanonymizeResponse)
@user_limiter.limit("20/hour")
async def deanonymize(
    request: Request,
    anonymous_id: UUID,
    admin_user_id: UUID = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db),
) -> DeanonymizeResponse:
    """Deanonymiza anonymous_id (admin only) — expõe user_id real com auditoria."""
    community_repo, audit_repo = _admin_community_repos(session)
    use_case = DeanonymizeUseCase(community_repo, audit_repo)
    return await use_case.execute(anonymous_id, admin_user_id)
