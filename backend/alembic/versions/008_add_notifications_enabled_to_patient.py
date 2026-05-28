"""add notifications_enabled to patient profiles

Revision ID: 008_add_notifications_enabled_to_patient
Revises: 007_create_weekly_symptom_summaries
Create Date: 2026-05-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008_add_notifications_enabled_to_patient'
down_revision: Union[str, None] = '007_create_weekly_symptom_summaries'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('patient_profiles', sa.Column('notifications_enabled', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    op.drop_column('patient_profiles', 'notifications_enabled')
