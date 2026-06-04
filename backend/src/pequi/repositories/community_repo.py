from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import and_, delete, func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.community import (
    CommunityAnonymousMap,
    CommunityComment,
    CommunityLike,
    CommunityPost,
)
from pequi.models.user import User
from pequi.schemas.community import CommentCreate, PostCreate


class CommunityRepository:
    """Repository para operações da comunidade com lógica de anonimização.

    Nunca expõe user_id via API — apenas anonymous_id.
    O mapeamento real fica em community_anonymous_map com acesso restrito.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_anonymous_id(self, user_id: UUID) -> UUID | None:
        """Retorna anonymous_id existente ou None (read-only)."""
        stmt = select(CommunityAnonymousMap.anonymous_id).where(
            CommunityAnonymousMap.user_id == user_id
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_create_anonymous_id(self, user_id: UUID) -> UUID:
        """Retorna anonymous_id existente ou cria novo mapeamento (race-safe).

        O anonymous_id é estável por usuário — o mesmo em todos os posts.
        """
        from sqlalchemy.exc import IntegrityError

        stmt = select(CommunityAnonymousMap.anonymous_id).where(
            CommunityAnonymousMap.user_id == user_id
        )
        result = await self._session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            return existing

        # Criar novo mapeamento (tratar race condition)
        try:
            mapping = CommunityAnonymousMap(user_id=user_id)
            self._session.add(mapping)
            await self._session.flush()
            await self._session.refresh(mapping)
            return mapping.anonymous_id
        except IntegrityError:
            # Outra requisição criou o mapeamento, buscar novamente
            result = await self._session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                return existing
            raise

    async def deanonymize(self, anonymous_id: UUID) -> CommunityAnonymousMap | None:
        """Retorna o mapeamento completo (user_id real) — acesso restrito a admin.

        Esta operação deve ser auditada quando chamada via API.
        """
        stmt = select(CommunityAnonymousMap).where(
            CommunityAnonymousMap.anonymous_id == anonymous_id
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_post(
        self,
        user_id: UUID,
        data: PostCreate,
    ) -> CommunityPost:
        """Cria post anônimo — usa anonymous_id, nunca expõe user_id."""
        anonymous_id = await self.get_or_create_anonymous_id(user_id)
        author_display_name = await self._get_author_display_name(user_id, data.author_mode)

        post = CommunityPost(
            author_anonymous_id=anonymous_id,
            author_mode=data.author_mode,
            author_display_name=author_display_name,
            title=data.title,
            content=data.content,
            categories=data.categories,
        )
        self._session.add(post)
        await self._session.flush()
        await self._session.refresh(post)
        return post

    async def get_post_by_id(self, post_id: UUID) -> CommunityPost | None:
        """Retorna post por ID — retorna apenas anonymous_id."""
        stmt = (
            select(CommunityPost)
            .where(CommunityPost.id == post_id)
            .where(CommunityPost.deleted_at.is_(None))
            .where(CommunityPost.is_moderated.is_(False))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_posts(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        category: str | None = None,
        exclude_moderated: bool = True,
    ) -> tuple[list[CommunityPost], int]:
        """Lista posts paginados — nunca expõe user_id."""
        filters = [CommunityPost.deleted_at.is_(None)]
        if exclude_moderated:
            filters.append(CommunityPost.is_moderated.is_(False))
        if category:
            filters.append(CommunityPost.categories.overlap([category]))

        count_stmt = select(func.count()).select_from(CommunityPost).where(*filters)
        total = (await self._session.execute(count_stmt)).scalar_one()

        stmt = (
            select(CommunityPost)
            .where(*filters)
            .order_by(CommunityPost.is_pinned.desc(), CommunityPost.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def update_post_moderation(
        self,
        post_id: UUID,
        is_moderated: bool,
    ) -> CommunityPost | None:
        """Atualiza status de moderação (admin only)."""
        stmt = (
            update(CommunityPost)
            .where(CommunityPost.id == post_id)
            .values(is_moderated=is_moderated)
            .returning(CommunityPost)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.scalar_one_or_none()

    async def soft_delete_post(self, post_id: UUID) -> CommunityPost | None:
        """Soft delete de post (próprio autor ou admin)."""
        stmt = (
            update(CommunityPost)
            .where(CommunityPost.id == post_id)
            .values(deleted_at=datetime.now(UTC))
            .returning(CommunityPost)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.scalar_one_or_none()

    async def check_post_ownership(
        self,
        post_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Verifica se o usuário é dono do post via anonymous_id."""
        anonymous_id = await self.get_anonymous_id(user_id)
        if anonymous_id is None:
            return False
        stmt = select(CommunityPost.id).where(
            and_(
                CommunityPost.id == post_id,
                CommunityPost.author_anonymous_id == anonymous_id,
                CommunityPost.deleted_at.is_(None),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def create_comment(
        self,
        user_id: UUID,
        post_id: UUID,
        data: CommentCreate,
    ) -> CommunityComment:
        """Cria comentário anônimo — usa anonymous_id, nunca expõe user_id."""
        anonymous_id = await self.get_or_create_anonymous_id(user_id)
        author_display_name = await self._get_author_display_name(user_id, data.author_mode)

        comment = CommunityComment(
            post_id=post_id,
            author_anonymous_id=anonymous_id,
            author_mode=data.author_mode,
            author_display_name=author_display_name,
            content=data.content,
        )
        self._session.add(comment)
        await self._session.flush()

        # Incrementar contador de comentários no post
        await self._session.execute(
            update(CommunityPost)
            .where(CommunityPost.id == post_id)
            .values(comment_count=CommunityPost.comment_count + 1)
        )
        await self._session.flush()

        await self._session.refresh(comment)
        return comment

    async def list_comments(
        self,
        post_id: UUID,
        *,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[CommunityComment], int]:
        """Lista comentários de um post — nunca expõe user_id."""
        filters = [
            CommunityComment.post_id == post_id,
            CommunityComment.deleted_at.is_(None),
        ]

        count_stmt = select(func.count()).select_from(CommunityComment).where(*filters)
        total = (await self._session.execute(count_stmt)).scalar_one()

        stmt = (
            select(CommunityComment)
            .where(*filters)
            .order_by(CommunityComment.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def add_like(
        self,
        user_id: UUID,
        post_id: UUID,
    ) -> tuple[bool, int]:
        """Adiciona like em post — retorna (liked, like_count).

        Atômico: incrementa like_count apenas se insert for bem-sucedido.
        Levanta IntegrityError se like já existe.
        """
        anonymous_id = await self.get_or_create_anonymous_id(user_id)

        # Adicionar like
        await self._session.execute(
            insert(CommunityLike).values(
                anonymous_id=anonymous_id,
                post_id=post_id,
            )
        )
        await self._session.execute(
            update(CommunityPost)
            .where(CommunityPost.id == post_id)
            .values(like_count=CommunityPost.like_count + 1)
        )
        await self._session.flush()
        return True, await self._get_post_like_count(post_id)

    async def remove_like(
        self,
        user_id: UUID,
        post_id: UUID,
    ) -> tuple[bool, int]:
        """Remove like em post — retorna (liked, like_count)."""
        anonymous_id = await self.get_or_create_anonymous_id(user_id)

        result = await self._session.execute(
            delete(CommunityLike).where(
                and_(
                    CommunityLike.anonymous_id == anonymous_id,
                    CommunityLike.post_id == post_id,
                )
            )
        )
        if result.rowcount:
            await self._session.execute(
                update(CommunityPost)
                .where(CommunityPost.id == post_id)
                .values(like_count=func.greatest(CommunityPost.like_count - 1, 0))
            )
            await self._session.flush()

        return False, await self._get_post_like_count(post_id)

    async def check_like_exists(
        self,
        user_id: UUID,
        post_id: UUID,
    ) -> bool:
        """Verifica se o usuário já curtiu o post."""
        anonymous_id = await self.get_or_create_anonymous_id(user_id)
        stmt = select(CommunityLike).where(
            and_(
                CommunityLike.anonymous_id == anonymous_id,
                CommunityLike.post_id == post_id,
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def _get_post_like_count(self, post_id: UUID) -> int:
        """Retorna contador atual de likes de um post."""
        stmt = select(CommunityPost.like_count).where(CommunityPost.id == post_id)
        result = await self._session.execute(stmt)
        return result.scalar_one() or 0

    async def _get_author_display_name(self, user_id: UUID, author_mode: str) -> str | None:
        if author_mode == "anonymous":
            return None

        stmt = select(User.username).where(
            User.id == user_id,
            User.deleted_at.is_(None),
            User.is_active.is_(True),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_comment_by_id(self, comment_id: UUID) -> CommunityComment | None:
        """Retorna comentário por ID — ignora soft-deleted."""
        stmt = select(CommunityComment).where(
            CommunityComment.id == comment_id,
            CommunityComment.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def soft_delete_comment(self, comment_id: UUID) -> CommunityComment | None:
        """Soft delete de comentário e decrementa contador do post."""
        comment = await self.get_comment_by_id(comment_id)
        if comment is None:
            return None

        stmt = (
            update(CommunityComment)
            .where(CommunityComment.id == comment_id)
            .values(deleted_at=datetime.now(UTC))
            .returning(CommunityComment)
        )
        result = await self._session.execute(stmt)
        deleted_comment = result.scalar_one_or_none()
        if deleted_comment is None:
            return None

        await self._session.execute(
            update(CommunityPost)
            .where(CommunityPost.id == comment.post_id)
            .values(comment_count=func.greatest(CommunityPost.comment_count - 1, 0))
        )
        await self._session.flush()
        return deleted_comment

    async def check_comment_ownership(
        self,
        comment_id: UUID,
        user_id: UUID,
    ) -> bool:
        """Verifica se o usuário é dono do comentário via anonymous_id."""
        anonymous_id = await self.get_anonymous_id(user_id)
        if anonymous_id is None:
            return False
        stmt = select(CommunityComment.id).where(
            and_(
                CommunityComment.id == comment_id,
                CommunityComment.author_anonymous_id == anonymous_id,
                CommunityComment.deleted_at.is_(None),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None
