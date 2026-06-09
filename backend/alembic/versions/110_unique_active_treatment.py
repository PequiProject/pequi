"""partial unique index: one active treatment per patient

Revision ID: 110_unique_active_treatment
Revises: 109_patient_only_treatments
Create Date: 2026-06-07
"""

from collections.abc import Sequence

from alembic import op

revision: str = "110_unique_active_treatment"
down_revision: str | None = "109_patient_only_treatments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "uq_treatments_one_active_per_patient",
        "treatments",
        ["patient_id"],
        unique=True,
        postgresql_where="status = 'active' AND deleted_at IS NULL",
    )


def downgrade() -> None:
    op.drop_index(
        "uq_treatments_one_active_per_patient",
        table_name="treatments",
    )
