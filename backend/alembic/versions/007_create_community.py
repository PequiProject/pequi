"""create community tables — M6 Community (PEQ-106)

Revision ID: 007_create_community
Revises: 006_create_body_map
Create Date: 2026-05-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "007_create_community"
down_revision: str | None = "006_create_body_map"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    post_category_enum = postgresql.ENUM(
        "experience",
        "question",
        "support",
        "news",
        name="post_category_enum",
    )

    post_category_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "community_anonymous_map",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("anonymous_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_anonymous_map_user_id",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("user_id", name="uq_community_anonymous_map_user_id"),
        sa.UniqueConstraint("anonymous_id", name="uq_community_anonymous_map_anonymous_id"),
    )

    op.create_index(
        "ix_community_anonymous_map_user_id",
        "community_anonymous_map",
        ["user_id"],
    )
    op.create_index(
        "ix_community_anonymous_map_anonymous_id",
        "community_anonymous_map",
        ["anonymous_id"],
    )

    op.create_table(
        "community_posts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("author_anonymous_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(
                "experience",
                "question",
                "support",
                "news",
                name="post_category_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("is_pinned", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_moderated", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("like_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("comment_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["author_anonymous_id"],
            ["community_anonymous_map.anonymous_id"],
            name="fk_community_posts_author_anonymous_id_community_anonymous_map",
            ondelete="RESTRICT",
        ),
    )

    op.create_index(
        "ix_community_posts_author_anonymous_id",
        "community_posts",
        ["author_anonymous_id"],
    )

    op.create_table(
        "community_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("author_anonymous_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["post_id"],
            ["community_posts.id"],
            name="fk_comments_post_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["author_anonymous_id"],
            ["community_anonymous_map.anonymous_id"],
            name="fk_comments_anonymous_id",
            ondelete="RESTRICT",
        ),
    )

    op.create_index(
        "ix_community_comments_post_id",
        "community_comments",
        ["post_id"],
    )
    op.create_index(
        "ix_community_comments_author_anonymous_id",
        "community_comments",
        ["author_anonymous_id"],
    )

    op.create_table(
        "community_likes",
        sa.Column("anonymous_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("post_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["anonymous_id"],
            ["community_anonymous_map.anonymous_id"],
            name="fk_likes_anonymous_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["post_id"],
            ["community_posts.id"],
            name="fk_likes_post_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("anonymous_id", "post_id"),
    )


def downgrade() -> None:
    op.drop_table("community_likes")

    op.drop_index("ix_community_comments_anonymous_id", table_name="community_comments")
    op.drop_index("ix_community_comments_post_id", table_name="community_comments")
    op.drop_table("community_comments")

    op.drop_index("ix_community_posts_anonymous_id", table_name="community_posts")
    op.drop_table("community_posts")

    op.drop_index("ix_community_anonymous_map_anonymous_id", table_name="community_anonymous_map")
    op.drop_index("ix_community_anonymous_map_user_id", table_name="community_anonymous_map")
    op.drop_table("community_anonymous_map")

    sa.Enum(name="post_category_enum").drop(op.get_bind(), checkfirst=True)
