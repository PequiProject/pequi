"""add notifications_enabled to patient profiles

Revision ID: 101_notifications_enabled
Revises: 100_weekly_summaries
Create Date: 2026-05-28 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "101_notifications_enabled"
down_revision: str | None = "100_weekly_summaries"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "patient_profiles",
        sa.Column("notifications_enabled", sa.Boolean(), server_default="true", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("patient_profiles", "notifications_enabled")
