"""community posts support multiple categories

Revision ID: 104_community_post_categories
Revises: 103_user_patient_and_author_mode
Create Date: 2026-06-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "104_community_post_categories"
down_revision: str | None = "103_user_patient_and_author_mode"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

POST_CATEGORY_ENUM = postgresql.ENUM(
    "experience",
    "question",
    "support",
    "news",
    name="post_category_enum",
    create_type=False,
)


def upgrade() -> None:
    op.add_column(
        "community_posts",
        sa.Column("categories", postgresql.ARRAY(POST_CATEGORY_ENUM), nullable=True),
    )
    op.execute(
        """
        UPDATE community_posts
        SET categories = ARRAY[category]::post_category_enum[]
        WHERE categories IS NULL
        """
    )
    op.alter_column("community_posts", "categories", nullable=False)
    op.drop_column("community_posts", "category")


def downgrade() -> None:
    op.add_column(
        "community_posts",
        sa.Column(
            "category",
            POST_CATEGORY_ENUM,
            nullable=True,
        ),
    )
    op.execute(
        """
        UPDATE community_posts
        SET category = categories[1]
        WHERE category IS NULL AND categories IS NOT NULL
        """
    )
    op.alter_column("community_posts", "category", nullable=False)
    op.drop_column("community_posts", "categories")
