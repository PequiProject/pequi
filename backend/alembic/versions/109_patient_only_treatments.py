"""remove professional fields from treatments and dose_logs

Revision ID: 109_patient_only_treatments
Revises: 108_patient_health_appointments
Create Date: 2026-06-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "109_patient_only_treatments"
down_revision: str | None = "108_patient_health_appointments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("fk_dose_logs_registered_by_users", "dose_logs", type_="foreignkey")
    op.drop_column("dose_logs", "registered_by")
    op.drop_column("dose_logs", "supervised")

    op.drop_index("ix_treatments_prescribed_by", table_name="treatments")
    op.drop_constraint(
        "fk_treatments_prescribed_by_health_professionals",
        "treatments",
        type_="foreignkey",
    )
    op.drop_column("treatments", "prescribed_by")


def downgrade() -> None:
    op.add_column(
        "treatments",
        sa.Column("prescribed_by", UUID(as_uuid=True), nullable=True),
    )
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
    if null_count == 0:
        op.alter_column("treatments", "prescribed_by", nullable=False)

    op.create_foreign_key(
        "fk_treatments_prescribed_by_health_professionals",
        "treatments",
        "health_professionals",
        ["prescribed_by"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_treatments_prescribed_by", "treatments", ["prescribed_by"])

    op.add_column(
        "dose_logs",
        sa.Column("supervised", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "dose_logs",
        sa.Column("registered_by", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_dose_logs_registered_by_users",
        "dose_logs",
        "users",
        ["registered_by"],
        ["id"],
        ondelete="SET NULL",
    )
