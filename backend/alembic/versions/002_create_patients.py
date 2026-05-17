"""create patients, health_units and consents tables

Revision ID: 002_create_patients
Revises:
Create Date: 2026-05-15
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "002_create_patients"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "health_units",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("city", sa.Text(), nullable=False),
        sa.Column("state", sa.CHAR(length=2), nullable=False),
        sa.Column("cnes", sa.Text(), nullable=True, unique=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )

    op.create_table(
        "patient_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("health_unit_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date_of_birth", sa.DATE(), nullable=False),
        sa.Column("sex", sa.Text(), nullable=True),
        sa.Column("neighborhood", sa.Text(), nullable=True),
        sa.Column("city", sa.Text(), nullable=True),
        sa.Column("state", sa.CHAR(length=2), nullable=True),
        sa.Column("disability_grade", sa.SmallInteger(), nullable=True, server_default="0"),
        sa.Column("diagnosis_date", sa.DATE(), nullable=True),
        sa.Column("classification", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )

    op.create_table(
        "consents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("term_version", sa.Text(), nullable=False),
        sa.Column(
            "accepted_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("consents")
    op.drop_table("patient_profiles")
    op.drop_table("health_units")
