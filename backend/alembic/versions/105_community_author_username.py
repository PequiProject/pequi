"""store username in community author_display_name

Revision ID: 105_community_author_username
Revises: 104_community_post_categories
Create Date: 2026-06-04
"""

from collections.abc import Sequence

from alembic import op

revision: str = "105_community_author_username"
down_revision: str | None = "104_community_post_categories"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE community_posts AS cp
        SET author_display_name = u.username
        FROM community_anonymous_map AS cam
        JOIN users AS u ON u.id = cam.user_id
        WHERE cp.author_anonymous_id = cam.anonymous_id
          AND cp.author_mode = 'identified'
          AND cp.author_display_name IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE community_comments AS cc
        SET author_display_name = u.username
        FROM community_anonymous_map AS cam
        JOIN users AS u ON u.id = cam.user_id
        WHERE cc.author_anonymous_id = cam.anonymous_id
          AND cc.author_mode = 'identified'
          AND cc.author_display_name IS NOT NULL
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE community_posts AS cp
        SET author_display_name = u.full_name
        FROM community_anonymous_map AS cam
        JOIN users AS u ON u.id = cam.user_id
        WHERE cp.author_anonymous_id = cam.anonymous_id
          AND cp.author_mode = 'identified'
          AND cp.author_display_name IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE community_comments AS cc
        SET author_display_name = u.full_name
        FROM community_anonymous_map AS cam
        JOIN users AS u ON u.id = cam.user_id
        WHERE cc.author_anonymous_id = cam.anonymous_id
          AND cc.author_mode = 'identified'
          AND cc.author_display_name IS NOT NULL
        """
    )
