import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from pequi.database import Base


class CommunityAnonymousMap(Base):
    """Mapeamento entre user_id real e anonymous_id para posts anônimos.

    Acesso restrito a role admin. Nunca exposto via API pública.
    """

    __tablename__ = "community_anonymous_map"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
        index=True,
    )
    anonymous_id = Column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        index=True,
        default=uuid.uuid4,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    posts = relationship(
        "CommunityPost",
        back_populates="author_mapping",
    )
    comments = relationship(
        "CommunityComment",
        back_populates="author_mapping",
    )
    likes = relationship(
        "CommunityLike",
        back_populates="author_mapping",
    )


class CommunityPost(Base):
    """Posts da comunidade anônima."""

    __tablename__ = "community_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_anonymous_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_anonymous_map.anonymous_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    title = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(
        Enum("experience", "question", "support", "news", name="post_category_enum"),
        nullable=False,
    )
    is_pinned = Column(Boolean, server_default="false", nullable=False)
    is_moderated = Column(Boolean, server_default="false", nullable=False)
    like_count = Column(Integer, server_default="0", nullable=False)
    comment_count = Column(Integer, server_default="0", nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    author_mapping = relationship("CommunityAnonymousMap", back_populates="posts")
    comments = relationship("CommunityComment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("CommunityLike", back_populates="post", cascade="all, delete-orphan")


class CommunityComment(Base):
    """Comentários em posts da comunidade."""

    __tablename__ = "community_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_posts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    author_anonymous_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_anonymous_map.anonymous_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    content = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    post = relationship("CommunityPost", back_populates="comments")
    author_mapping = relationship("CommunityAnonymousMap", back_populates="comments")


class CommunityLike(Base):
    """Likes em posts da comunidade."""

    __tablename__ = "community_likes"

    anonymous_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_anonymous_map.anonymous_id", ondelete="CASCADE"),
        primary_key=True,
    )
    post_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_posts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    author_mapping = relationship("CommunityAnonymousMap", back_populates="likes")
    post = relationship("CommunityPost", back_populates="likes")
