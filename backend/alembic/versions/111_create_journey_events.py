"""create persisted journey events

Revision ID: 111_create_journey_events
Revises: 110_unique_active_treatment
Create Date: 2026-06-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "111_create_journey_events"
down_revision: str | None = "110_unique_active_treatment"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "journey_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "patient_id",
            UUID(as_uuid=True),
            sa.ForeignKey("patient_profiles.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "treatment_id",
            UUID(as_uuid=True),
            sa.ForeignKey("treatments.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("metadata", JSONB(), server_default="{}", nullable=False),
        sa.Column("source_type", sa.String(50), nullable=True),
        sa.Column("source_id", UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("source_type", "source_id", name="uq_journey_events_source"),
    )
    op.create_index(
        "ix_journey_events_patient_occurred_at",
        "journey_events",
        ["patient_id", "occurred_at"],
    )
    op.create_index("ix_journey_events_treatment_id", "journey_events", ["treatment_id"])
    op.create_index("ix_journey_events_event_type", "journey_events", ["event_type"])


def downgrade() -> None:
    op.drop_index("ix_journey_events_event_type", table_name="journey_events")
    op.drop_index("ix_journey_events_treatment_id", table_name="journey_events")
    op.drop_index("ix_journey_events_patient_occurred_at", table_name="journey_events")
    op.drop_table("journey_events")
