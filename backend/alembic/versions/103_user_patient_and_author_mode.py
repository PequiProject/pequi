"""make every user a patient and add community author mode

Revision ID: 103_user_patient_and_author_mode
Revises: 103_add_username_to_users
Create Date: 2026-06-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "103_user_patient_and_author_mode"
down_revision: str | None = "103_add_username_to_users"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    author_mode_enum = postgresql.ENUM(
        "anonymous",
        "identified",
        name="community_author_mode_enum",
    )
    author_mode_enum.create(op.get_bind(), checkfirst=True)

    op.alter_column("patient_profiles", "health_unit_id", nullable=True)
    op.create_unique_constraint(
        "uq_patient_profiles_user_id",
        "patient_profiles",
        ["user_id"],
    )

    op.add_column(
        "community_posts",
        sa.Column(
            "author_mode",
            author_mode_enum,
            server_default="anonymous",
            nullable=False,
        ),
    )
    op.add_column(
        "community_posts",
        sa.Column("author_display_name", sa.Text(), nullable=True),
    )
    op.add_column(
        "community_comments",
        sa.Column(
            "author_mode",
            author_mode_enum,
            server_default="anonymous",
            nullable=False,
        ),
    )
    op.add_column(
        "community_comments",
        sa.Column("author_display_name", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("community_comments", "author_display_name")
    op.drop_column("community_comments", "author_mode")
    op.drop_column("community_posts", "author_display_name")
    op.drop_column("community_posts", "author_mode")

    op.drop_constraint("uq_patient_profiles_user_id", "patient_profiles", type_="unique")
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM patient_profiles
                WHERE health_unit_id IS NULL
            ) THEN
                RAISE EXCEPTION
                    'Cannot downgrade: patient_profiles.health_unit_id has NULL values. '
                    'Assign a health_unit_id to minimal patient profiles before rollback.';
            END IF;
        END $$;
        """
    )
    op.alter_column(
        "patient_profiles",
        "health_unit_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    sa.Enum(name="community_author_mode_enum").drop(op.get_bind(), checkfirst=True)
