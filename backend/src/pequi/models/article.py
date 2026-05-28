import uuid
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    Table,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from pequi.database import Base


class ArticleCategory(StrEnum):
    education = "education"
    news = "news"
    guidelines = "guidelines"
    faq = "faq"


article_tag_associations = Table(
    "article_tag_associations",
    Base.metadata,
    Column(
        "article_id",
        UUID(as_uuid=True),
        ForeignKey("articles.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        UUID(as_uuid=True),
        ForeignKey("article_tags.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)


class ArticleTag(Base):
    __tablename__ = "article_tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False, unique=True)


class Article(Base):
    __tablename__ = "articles"
    __table_args__ = (
        Index("ix_articles_slug", "slug"),
        Index("ix_articles_category", "category"),
        Index("ix_articles_is_published", "is_published"),
        Index("ix_articles_published_at", "published_at"),
        Index("ix_articles_deleted_at", "deleted_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    slug = Column(Text, nullable=False, unique=True)
    summary = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(
        Enum(ArticleCategory, name="article_category_enum"),
        nullable=False,
    )
    author_name = Column(Text, nullable=False)
    cover_image_url = Column(Text, nullable=True)
    cover_image_key = Column(Text, nullable=True)
    is_published = Column(Boolean, nullable=False, server_default="false", default=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    reading_time_min = Column(SmallInteger, nullable=True)
    view_count = Column(Integer, nullable=False, server_default="0", default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    tags = relationship(
        "ArticleTag",
        secondary=article_tag_associations,
        lazy="selectin",
    )
