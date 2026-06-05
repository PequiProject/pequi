"""add personal_record JSONB to patient_profiles

Revision ID: 107_patient_personal_record
Revises: 106_patient_treatment_record
Create Date: 2026-06-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "107_patient_personal_record"
down_revision: str | None = "106_patient_treatment_record"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "patient_profiles",
        sa.Column("personal_record", JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("patient_profiles", "personal_record")
