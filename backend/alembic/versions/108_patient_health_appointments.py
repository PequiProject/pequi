"""patient_health_appointments table

Revision ID: 108_patient_health_appointments
Revises: 107_patient_personal_record
Create Date: 2026-06-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "108_patient_health_appointments"
down_revision: str | None = "107_patient_personal_record"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "patient_health_appointments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "patient_id",
            UUID(as_uuid=True),
            sa.ForeignKey("patient_profiles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("appointment_date", sa.Date(), nullable=False),
        sa.Column("appointment_time", sa.String(5), nullable=False),
        sa.Column("location", sa.String(500), nullable=False),
        sa.Column("appointment_type", sa.String(50), nullable=False),
        sa.Column("professional", sa.String(200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("performed", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("wants_follow_up_details", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("follow_up", JSONB(), nullable=True),
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
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_patient_health_appointments_patient_id",
        "patient_health_appointments",
        ["patient_id"],
    )
    op.create_index(
        "ix_patient_health_appointments_appointment_date",
        "patient_health_appointments",
        ["appointment_date"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_patient_health_appointments_appointment_date",
        table_name="patient_health_appointments",
    )
    op.drop_index(
        "ix_patient_health_appointments_patient_id",
        table_name="patient_health_appointments",
    )
    op.drop_table("patient_health_appointments")
