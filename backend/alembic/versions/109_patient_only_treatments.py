"""make professional treatment fields optional for patient-only v2

Revision ID: 109_patient_only_treatments
Revises: 108_patient_health_appointments
Create Date: 2026-06-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "109_patient_only_treatments"
down_revision: str | None = "108_patient_health_appointments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("treatments", "prescribed_by", nullable=True)


def downgrade() -> None:
    op.execute(
        """
        UPDATE treatments t
        SET prescribed_by = hp.id
        FROM (
            SELECT id FROM health_professionals
            WHERE deleted_at IS NULL
            ORDER BY created_at
            LIMIT 1
        ) hp
        WHERE t.prescribed_by IS NULL
        """
    )
    bind = op.get_bind()
    null_count = bind.execute(
        sa.text("SELECT COUNT(*) FROM treatments WHERE prescribed_by IS NULL")
    ).scalar_one()
    if null_count != 0:
        raise RuntimeError(
            "Cannot downgrade to required treatments.prescribed_by while treatments without "
            "a prescriber exist and no health professional is available to backfill them."
        )
    op.alter_column("treatments", "prescribed_by", nullable=False)
