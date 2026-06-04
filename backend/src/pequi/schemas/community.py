from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PostCreate(BaseModel):
    """Payload for creating a community post."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=3, max_length=200, description="Post title")
    content: str = Field(..., min_length=10, max_length=5000, description="Post content")
    category: str = Field(
        ...,
        pattern="^(experience|question|support|news)$",
        description="Post category",
    )
    author_mode: str = Field(
        ...,
        pattern="^(anonymous|identified)$",
        description="Public author mode",
    )


class CommentCreate(BaseModel):
    """Payload for creating a community comment."""

    model_config = ConfigDict(extra="forbid")

    content: str = Field(..., min_length=3, max_length=2000, description="Comment content")
    author_mode: str = Field(
        ...,
        pattern="^(anonymous|identified)$",
        description="Public author mode",
    )


class PostResponse(BaseModel):
    """Community post response. Never exposes user_id."""

    id: UUID
    author_anonymous_id: UUID
    author_mode: str
    author_display_name: str | None = None
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
    """Community comment response. Never exposes user_id."""

    id: UUID
    post_id: UUID
    author_anonymous_id: UUID
    author_mode: str
    author_display_name: str | None = None
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostListResponse(BaseModel):
    """Paginated community posts."""

    items: list[PostResponse]
    total: int


class CommentListResponse(BaseModel):
    """Paginated community comments."""

    items: list[CommentResponse]
    total: int


class PostModerate(BaseModel):
    """Admin-only post moderation payload."""

    is_moderated: bool = Field(..., description="Marks the post as moderated/removed")


class DeanonymizeResponse(BaseModel):
    """Admin-only deanonymization response."""

    anonymous_id: UUID
    user_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
