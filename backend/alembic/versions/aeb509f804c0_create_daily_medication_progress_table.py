"""create daily medication progress table

Revision ID: aeb509f804c0
Revises: 108_patient_health_appointments
Create Date: 2026-06-08 23:56:27.762692

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "aeb509f804c0"
down_revision: str | None = "108_patient_health_appointments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "daily_medication_progress",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("progress_date", sa.Date(), nullable=False),
        sa.Column("expected_count", sa.Integer(), nullable=False),
        sa.Column("taken_count", sa.Integer(), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patient_profiles.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "patient_id",
            "progress_date",
            name="uq_daily_medication_progress_patient_date",
        ),
    )

    op.create_index(
        "ix_daily_medication_progress_patient_id",
        "daily_medication_progress",
        ["patient_id"],
        unique=False,
    )
    op.create_index(
        "ix_daily_medication_progress_progress_date",
        "daily_medication_progress",
        ["progress_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_daily_medication_progress_progress_date",
        table_name="daily_medication_progress",
    )
    op.drop_index(
        "ix_daily_medication_progress_patient_id",
        table_name="daily_medication_progress",
    )
    op.drop_table("daily_medication_progress")
