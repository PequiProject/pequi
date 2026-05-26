from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PostCreate(BaseModel):
    """Payload para criação de post na comunidade anônima (PEQ-106)."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3, max_length=200, description="Título do post")
    content: str = Field(..., min_length=10, max_length=5000, description="Conteúdo do post")
    category: str = Field(
        ...,
        pattern="^(experience|question|support|news)$",
        description="Categoria do post",
    )


class CommentCreate(BaseModel):
    """Payload para criação de comentário em post (PEQ-106)."""

    model_config = ConfigDict(extra="forbid")

    content: str = Field(..., min_length=3, max_length=2000, description="Conteúdo do comentário")


class PostResponse(BaseModel):
    """Resposta de post da comunidade — nunca expõe user_id, apenas anonymous_id."""

    id: UUID
    author_anonymous_id: UUID
    title: str
    content: str
    category: str
    is_pinned: bool
    is_moderated: bool
    like_count: int
    comment_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommentResponse(BaseModel):
    """Resposta de comentário — nunca expõe user_id, apenas anonymous_id."""

    id: UUID
    post_id: UUID
    author_anonymous_id: UUID
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostListResponse(BaseModel):
    """Lista paginada de posts da comunidade."""

    items: list[PostResponse]
    total: int


class CommentListResponse(BaseModel):
    """Lista de comentários de um post."""

    items: list[CommentResponse]
    total: int


class PostModerate(BaseModel):
    """Payload para moderação de post (admin only)."""

    is_moderated: bool = Field(..., description="Marca o post como moderado/removido")


class DeanonymizeResponse(BaseModel):
    """Resposta de deanonymização (admin only) — expõe user_id real com auditoria."""

    anonymous_id: UUID
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
