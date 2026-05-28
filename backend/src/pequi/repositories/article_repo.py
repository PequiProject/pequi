from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from pequi.core.exceptions import NotFoundError
from pequi.models.article import Article, ArticleCategory, ArticleTag, article_tag_associations


class ArticleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(
        self,
        *,
        limit: int,
        offset: int,
        category: ArticleCategory | None = None,
        tag_name: str | None = None,
        title_search: str | None = None,
        published_only: bool = True,
    ) -> tuple[list[Article], int]:
        base = (
            select(Article).where(Article.deleted_at.is_(None)).options(selectinload(Article.tags))
        )
        if published_only:
            base = base.where(Article.is_published.is_(True))

        if category is not None:
            base = base.where(Article.category == category)

        if title_search:
            pattern = f"%{title_search.strip()}%"
            base = base.where(Article.title.ilike(pattern))

        if tag_name:
            normalized = tag_name.strip().lower()
            base = (
                base.join(article_tag_associations)
                .join(ArticleTag)
                .where(func.lower(ArticleTag.name) == normalized)
            )

        count_stmt = select(func.count()).select_from(base.subquery())
        total = (await self._session.execute(count_stmt)).scalar_one()

        stmt = base.order_by(Article.published_at.desc().nullslast()).limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        return list(result.scalars().unique().all()), total

    async def get_by_slug(
        self,
        slug: str,
        *,
        published_only: bool = True,
    ) -> Article | None:
        stmt = (
            select(Article)
            .where(Article.slug == slug, Article.deleted_at.is_(None))
            .options(selectinload(Article.tags))
        )
        if published_only:
            stmt = stmt.where(Article.is_published.is_(True))
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, article_id: UUID) -> Article | None:
        stmt = (
            select(Article)
            .where(Article.id == article_id, Article.deleted_at.is_(None))
            .options(selectinload(Article.tags))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id_or_raise(self, article_id: UUID) -> Article:
        article = await self.get_by_id(article_id)
        if article is None:
            raise NotFoundError("Article", str(article_id))
        return article

    async def list_slugs_with_prefix(
        self,
        base_slug: str,
        *,
        exclude_id: UUID | None = None,
    ) -> list[str]:
        stmt = select(Article.slug).where(
            Article.deleted_at.is_(None),
            or_(Article.slug == base_slug, Article.slug.like(f"{base_slug}-%")),
        )
        if exclude_id is not None:
            stmt = stmt.where(Article.id != exclude_id)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, article: Article, tag_names: list[str]) -> Article:
        tags = await self.get_or_create_tags(tag_names)
        article.tags = tags
        self._session.add(article)
        await self._session.flush()
        reloaded = await self.get_by_id(article.id)
        assert reloaded is not None
        return reloaded

    async def update(self, article: Article, tag_names: list[str] | None) -> Article:
        if tag_names is not None:
            article.tags = await self.get_or_create_tags(tag_names)
        await self._session.flush()
        reloaded = await self.get_by_id(article.id)
        assert reloaded is not None
        return reloaded

    async def soft_delete(self, article_id: UUID) -> None:
        article = await self.get_by_id_or_raise(article_id)
        article.deleted_at = datetime.now(UTC)
        await self._session.flush()

    async def increment_view_count(self, article_id: UUID) -> None:
        # UPDATE atômico no PostgreSQL: view_count = view_count + 1
        await self._session.execute(
            text(
                "UPDATE articles SET view_count = view_count + 1 "
                "WHERE id = :article_id AND deleted_at IS NULL"
            ),
            {"article_id": article_id},
        )

    async def get_or_create_tags(self, names: list[str]) -> list[ArticleTag]:
        if not names:
            return []
        normalized_names = []
        seen: set[str] = set()
        for raw in names:
            name = raw.strip().lower()
            if not name or name in seen:
                continue
            seen.add(name)
            normalized_names.append(name)
        if not normalized_names:
            return []

        stmt = select(ArticleTag).where(ArticleTag.name.in_(normalized_names))
        existing = {t.name: t for t in (await self._session.execute(stmt)).scalars().all()}

        tags: list[ArticleTag] = []
        for name in normalized_names:
            if name in existing:
                tags.append(existing[name])
            else:
                tag = ArticleTag(name=name)
                self._session.add(tag)
                tags.append(tag)
        await self._session.flush()
        return tags

    async def list_all_tags(self) -> list[ArticleTag]:
        stmt = select(ArticleTag).order_by(ArticleTag.name.asc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
