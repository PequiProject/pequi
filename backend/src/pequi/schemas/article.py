from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from pequi.models.article import ArticleCategory


class ArticleTagResponse(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class ArticleCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=500)
    summary: str = Field(..., min_length=10, max_length=2000)
    content: str = Field(..., min_length=1)
    category: ArticleCategory
    author_name: str = Field(..., min_length=1, max_length=200)
    cover_image_url: str | None = None
    cover_image_key: str | None = None
    is_published: bool = False
    tags: list[str] = Field(default_factory=list)


class ArticleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=500)
    summary: str | None = Field(default=None, min_length=10, max_length=2000)
    content: str | None = Field(default=None, min_length=1)
    category: ArticleCategory | None = None
    author_name: str | None = Field(default=None, min_length=1, max_length=200)
    cover_image_url: str | None = None
    cover_image_key: str | None = None
    is_published: bool | None = None
    tags: list[str] | None = None


class ArticleResponse(BaseModel):
    id: UUID
    title: str
    slug: str
    summary: str
    content: str
    category: ArticleCategory
    author_name: str
    cover_image_url: str | None
    cover_image_key: str | None
    is_published: bool
    published_at: datetime | None
    reading_time_min: int | None
    view_count: int
    tags: list[ArticleTagResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ArticleListResponse(BaseModel):
    items: list[ArticleResponse]
    total: int


def article_to_response(article) -> ArticleResponse:
    tags = article.tags or []
    return ArticleResponse(
        id=article.id,
        title=article.title,
        slug=article.slug,
        summary=article.summary,
        content=article.content,
        category=article.category,
        author_name=article.author_name,
        cover_image_url=article.cover_image_url,
        cover_image_key=article.cover_image_key,
        is_published=article.is_published,
        published_at=article.published_at,
        reading_time_min=article.reading_time_min,
        view_count=article.view_count,
        tags=[ArticleTagResponse.model_validate(t) for t in tags],
        created_at=article.created_at,
        updated_at=article.updated_at,
    )
