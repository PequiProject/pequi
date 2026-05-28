"""add unique constraints for upsert operations

Revision ID: 012_unique_constraints
Revises: 011_notifications_enabled
Create Date: 2026-05-28 00:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "012_unique_constraints"
down_revision: str | None = "011_notifications_enabled"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add unique constraint for adherence_snapshots
    op.create_unique_constraint(
        "uq_adherence_snapshots_period",
        "adherence_snapshots",
        ["treatment_id", "period_start", "period_end"],
    )

    # Add unique constraint for weekly_symptom_summaries
    op.create_unique_constraint(
        "uq_weekly_symptom_summaries_period",
        "weekly_symptom_summaries",
        ["patient_id", "week_start"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_weekly_symptom_summaries_period", "weekly_symptom_summaries", type_="unique"
    )
    op.drop_constraint("uq_adherence_snapshots_period", "adherence_snapshots", type_="unique")
