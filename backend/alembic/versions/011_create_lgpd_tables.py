"""create LGPD data deletion requests

Revision ID: 011_create_lgpd_tables
Revises: 102_unique_constraints
Create Date: 2026-06-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "011_create_lgpd_tables"
down_revision: str | None = "102_unique_constraints"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    data_deletion_status_enum = postgresql.ENUM(
        "pending",
        "processing",
        "completed",
        "failed",
        name="data_deletion_status_enum",
    )
    data_deletion_status_enum.create(op.get_bind(), checkfirst=True)

    op.alter_column("patient_profiles", "date_of_birth", existing_type=sa.DATE(), nullable=True)
    op.create_table(
        "data_deletion_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "requested_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "status",
            data_deletion_status_enum,
            server_default="pending",
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
    )
    op.create_index(
        "ix_data_deletion_requests_user_id",
        "data_deletion_requests",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_data_deletion_requests_user_id", table_name="data_deletion_requests")
    op.drop_table("data_deletion_requests")
    op.alter_column("patient_profiles", "date_of_birth", existing_type=sa.DATE(), nullable=False)
    postgresql.ENUM(name="data_deletion_status_enum").drop(op.get_bind(), checkfirst=True)
