"""create articles tables — M7 Articles

Revision ID: 007_create_articles
Revises: 007_create_community
Create Date: 2026-05-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "007_create_articles"
down_revision: str | None = "007_create_community"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    article_category_enum = postgresql.ENUM(
        "education",
        "news",
        "guidelines",
        "faq",
        name="article_category_enum",
    )
    article_category_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "article_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.UniqueConstraint("name", name="uq_article_tags_name"),
    )

    op.create_table(
        "articles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(
                "education",
                "news",
                "guidelines",
                "faq",
                name="article_category_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("author_name", sa.Text(), nullable=False),
        sa.Column("cover_image_url", sa.Text(), nullable=True),
        sa.Column("cover_image_key", sa.Text(), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reading_time_min", sa.SmallInteger(), nullable=True),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("slug", name="uq_articles_slug"),
    )

    op.create_index("ix_articles_slug", "articles", ["slug"])
    op.create_index("ix_articles_category", "articles", ["category"])
    op.create_index("ix_articles_is_published", "articles", ["is_published"])
    op.create_index("ix_articles_published_at", "articles", ["published_at"])
    op.create_index("ix_articles_deleted_at", "articles", ["deleted_at"])

    op.create_table(
        "article_tag_associations",
        sa.Column(
            "article_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("articles.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
        sa.Column(
            "tag_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("article_tags.id", ondelete="RESTRICT"),
            primary_key=True,
        ),
    )


def downgrade() -> None:
    op.drop_table("article_tag_associations")
    op.drop_index("ix_articles_deleted_at", table_name="articles")
    op.drop_index("ix_articles_published_at", table_name="articles")
    op.drop_index("ix_articles_is_published", table_name="articles")
    op.drop_index("ix_articles_category", table_name="articles")
    op.drop_index("ix_articles_slug", table_name="articles")
    op.drop_table("articles")
    op.drop_table("article_tags")
    op.execute("DROP TYPE IF EXISTS article_category_enum")
