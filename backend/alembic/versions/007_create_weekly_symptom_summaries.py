"""create weekly symptom summaries

Revision ID: 007_create_weekly_symptom_summaries
Revises: 006_create_body_map
Create Date: 2026-05-28 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '007_create_weekly_symptom_summaries'
down_revision: str | None = '006_create_body_map'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'weekly_symptom_summaries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('patient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('week_start', sa.Date(), nullable=False),
        sa.Column('week_end', sa.Date(), nullable=False),
        sa.Column('avg_intensity', sa.SmallInteger(), nullable=True),
        sa.Column('dominant_mood', sa.Text(), nullable=True),
        sa.Column('checkin_count', sa.SmallInteger(), nullable=False),
        sa.Column('alert_count', sa.SmallInteger(), nullable=False),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patient_profiles.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_weekly_symptom_summaries_patient_id', 'weekly_symptom_summaries', ['patient_id'], unique=False)
    op.create_index('ix_weekly_symptom_summaries_week_start', 'weekly_symptom_summaries', ['week_start'], unique=False)
    op.create_index('ix_weekly_symptom_summaries_calculated_at', 'weekly_symptom_summaries', ['calculated_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_weekly_symptom_summaries_calculated_at', table_name='weekly_symptom_summaries')
    op.drop_index('ix_weekly_symptom_summaries_week_start', table_name='weekly_symptom_summaries')
    op.drop_index('ix_weekly_symptom_summaries_patient_id', table_name='weekly_symptom_summaries')
    op.drop_table('weekly_symptom_summaries')
