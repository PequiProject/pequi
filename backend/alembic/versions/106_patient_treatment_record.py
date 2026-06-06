"""add treatment_record JSONB to patient_profiles

Revision ID: 106_patient_treatment_record
Revises: 105_community_author_username
Create Date: 2026-06-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "106_patient_treatment_record"
down_revision: str | None = "105_community_author_username"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "patient_profiles",
        sa.Column("treatment_record", JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("patient_profiles", "treatment_record")
