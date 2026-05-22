"""create checkins, checkin_symptoms, alerts tables — M4 Check-ins & Alerts

Revision ID: 005_create_checkins
Revises: 004_create_treatments
Create Date: 2026-05-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005_create_checkins"
down_revision: str | None = "004_create_treatments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    checkin_mood_enum = postgresql.ENUM(
        "terrible", "bad", "ok", "good", "great",
        name="checkin_mood_enum",
    )
    alert_type_enum = postgresql.ENUM(
        "symptom_spike", "missed_doses", "mood_decline", "new_lesion",
        name="alert_type_enum",
    )
    alert_severity_enum = postgresql.ENUM(
        "low", "medium", "high", "critical",
        name="alert_severity_enum",
    )

    checkin_mood_enum.create(op.get_bind(), checkfirst=True)
    alert_type_enum.create(op.get_bind(), checkfirst=True)
    alert_severity_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "checkins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "mood",
            postgresql.ENUM(
                "terrible", "bad", "ok", "good", "great",
                name="checkin_mood_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("symptom_intensity", sa.SmallInteger(), nullable=False),
        sa.Column("general_notes", sa.Text(), nullable=True),
        sa.Column("ai_feedback", sa.Text(), nullable=True),
        sa.Column("ai_feedback_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "checked_in_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "symptom_intensity >= 0 AND symptom_intensity <= 10",
            name="ck_checkins_symptom_intensity_range",
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patient_profiles.id"],
            name="fk_checkins_patient_id_patient_profiles",
            ondelete="RESTRICT",
        ),
    )

    op.create_index(
        "ix_checkins_patient_id",
        "checkins",
        ["patient_id"],
    )
    op.create_index(
        "uq_checkins_patient_one_per_day",
        "checkins",
        ["patient_id", sa.text("(checked_in_at AT TIME ZONE 'UTC')::date")],
        unique=True,
    )

    op.create_table(
        "checkin_symptoms",
        sa.Column("checkin_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("symptom_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["checkin_id"],
            ["checkins.id"],
            name="fk_checkin_symptoms_checkin_id_checkins",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["symptom_id"],
            ["symptoms.id"],
            name="fk_checkin_symptoms_symptom_id_symptoms",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("checkin_id", "symptom_id"),
    )

    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("checkin_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "type",
            postgresql.ENUM(
                "symptom_spike", "missed_doses", "mood_decline", "new_lesion",
                name="alert_type_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "severity",
            postgresql.ENUM(
                "low", "medium", "high", "critical",
                name="alert_severity_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("resolved", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("resolved_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patient_profiles.id"],
            name="fk_alerts_patient_id_patient_profiles",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["checkin_id"],
            ["checkins.id"],
            name="fk_alerts_checkin_id_checkins",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["resolved_by"],
            ["users.id"],
            name="fk_alerts_resolved_by_users",
            ondelete="RESTRICT",
        ),
    )

    op.create_index("ix_alerts_patient_id", "alerts", ["patient_id"])
    op.create_index(
        "ix_alerts_patient_unresolved",
        "alerts",
        ["patient_id"],
        postgresql_where=sa.text("resolved = false"),
    )


def downgrade() -> None:
    op.drop_index("ix_alerts_patient_unresolved", table_name="alerts")
    op.drop_index("ix_alerts_patient_id", table_name="alerts")
    op.drop_table("alerts")

    op.drop_table("checkin_symptoms")

    op.drop_index("uq_checkins_patient_one_per_day", table_name="checkins")
    op.drop_index("ix_checkins_patient_id", table_name="checkins")
    op.drop_table("checkins")

    sa.Enum(name="alert_severity_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="alert_type_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="checkin_mood_enum").drop(op.get_bind(), checkfirst=True)
