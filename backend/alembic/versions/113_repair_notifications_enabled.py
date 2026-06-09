"""repair missing notifications_enabled column

Revision ID: 113_repair_notifications_enabled
Revises: aeb509f804c0
Create Date: 2026-06-09
"""

from collections.abc import Sequence

from alembic import op

revision: str = "113_repair_notifications_enabled"
down_revision: str | None = "aeb509f804c0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE patient_profiles
        ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT true
        """
    )


def downgrade() -> None:
    # The previous schema already expects this column from migration 101.
    pass
