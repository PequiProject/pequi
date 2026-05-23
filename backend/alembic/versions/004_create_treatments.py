"""create health_professionals, symptoms, treatments, dose_schedules, dose_logs,
adherence_snapshots tables — M3 Treatments & Doses

Revision ID: 004_create_treatments
Revises: 003_add_user_foreign_keys
Create Date: 2026-05-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004_create_treatments"
down_revision: str | None = "003_add_user_foreign_keys"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # ENUM types
    # ------------------------------------------------------------------
    op.execute(
        "CREATE TYPE IF NOT EXISTS symptom_category_enum "
        "AS ENUM ('dermatological', 'neurological', 'systemic')"
    )
    op.execute("CREATE TYPE IF NOT EXISTS treatment_regimen_enum AS ENUM ('PB', 'MB')")
    op.execute(
        "CREATE TYPE IF NOT EXISTS treatment_status_enum "
        "AS ENUM ('active', 'completed', 'abandoned', 'suspended')"
    )
    op.execute(
        "CREATE TYPE IF NOT EXISTS dose_frequency_enum AS ENUM ('daily', 'monthly_supervised')"
    )

    # ------------------------------------------------------------------
    # health_professionals — stub mínimo para FK de treatments.
    # Campos adicionais (CRM, especialidade) serão adicionados no M8.
    # ------------------------------------------------------------------
    op.create_table(
        "health_professionals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("health_unit_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("professional_registration", sa.Text(), nullable=True),
        sa.Column("specialty", sa.Text(), nullable=True),
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
        sa.UniqueConstraint("user_id", name="uq_health_professionals_user_id"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_health_professionals_user_id_users",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["health_unit_id"],
            ["health_units.id"],
            name="fk_health_professionals_health_unit_id_health_units",
            ondelete="RESTRICT",
        ),
    )
    op.create_index(
        "ix_health_professionals_health_unit_id",
        "health_professionals",
        ["health_unit_id"],
    )

    # Adiciona FK de patient_profiles.health_unit_id → health_units.id
    # (o campo existia desde 002 mas sem constraint explícita)
    op.create_foreign_key(
        "fk_patient_profiles_health_unit_id_health_units",
        "patient_profiles",
        "health_units",
        ["health_unit_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # ------------------------------------------------------------------
    # symptoms
    # ------------------------------------------------------------------
    op.create_table(
        "symptoms",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "category",
            sa.Enum(
                "dermatological",
                "neurological",
                "systemic",
                name="symptom_category_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.UniqueConstraint("name", name="uq_symptoms_name"),
    )

    # ------------------------------------------------------------------
    # treatments
    # ------------------------------------------------------------------
    op.create_table(
        "treatments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("prescribed_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "regimen",
            sa.Enum("PB", "MB", name="treatment_regimen_enum", create_type=False),
            nullable=False,
        ),
        sa.Column("start_date", sa.DATE(), nullable=False),
        sa.Column("expected_end", sa.DATE(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "active",
                "completed",
                "abandoned",
                "suspended",
                name="treatment_status_enum",
                create_type=False,
            ),
            nullable=False,
            server_default="active",
        ),
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
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patient_profiles.id"],
            name="fk_treatments_patient_id_patient_profiles",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["prescribed_by"],
            ["health_professionals.id"],
            name="fk_treatments_prescribed_by_health_professionals",
            ondelete="RESTRICT",
        ),
    )
    op.create_index("ix_treatments_patient_id", "treatments", ["patient_id"])
    op.create_index("ix_treatments_prescribed_by", "treatments", ["prescribed_by"])
    op.create_index("ix_treatments_status", "treatments", ["status"])
    op.create_index("ix_treatments_deleted_at", "treatments", ["deleted_at"])

    # ------------------------------------------------------------------
    # dose_schedules
    # ------------------------------------------------------------------
    op.create_table(
        "dose_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("treatment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("drug_name", sa.Text(), nullable=False),
        sa.Column(
            "frequency",
            sa.Enum("daily", "monthly_supervised", name="dose_frequency_enum", create_type=False),
            nullable=False,
        ),
        sa.Column("dose_mg", sa.Numeric(6, 2), nullable=True),
        sa.Column("month_number", sa.SmallInteger(), nullable=True),
        sa.ForeignKeyConstraint(
            ["treatment_id"],
            ["treatments.id"],
            name="fk_dose_schedules_treatment_id_treatments",
            ondelete="RESTRICT",
        ),
    )
    op.create_index("ix_dose_schedules_treatment_id", "dose_schedules", ["treatment_id"])

    # ------------------------------------------------------------------
    # dose_logs
    # ------------------------------------------------------------------
    op.create_table(
        "dose_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("treatment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("drug_name", sa.Text(), nullable=False),
        sa.Column("expected_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("taken_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("skipped", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("skip_reason", sa.Text(), nullable=True),
        sa.Column("supervised", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("registered_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "treatment_id",
            "drug_name",
            "expected_at",
            name="uq_dose_logs_dedup",
        ),
        sa.ForeignKeyConstraint(
            ["treatment_id"],
            ["treatments.id"],
            name="fk_dose_logs_treatment_id_treatments",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["registered_by"],
            ["users.id"],
            name="fk_dose_logs_registered_by_users",
            ondelete="SET NULL",
        ),
    )
    op.create_index("ix_dose_logs_treatment_id", "dose_logs", ["treatment_id"])
    op.create_index("ix_dose_logs_expected_at", "dose_logs", ["expected_at"])

    # ------------------------------------------------------------------
    # adherence_snapshots
    # ------------------------------------------------------------------
    op.create_table(
        "adherence_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("treatment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period_start", sa.DATE(), nullable=False),
        sa.Column("period_end", sa.DATE(), nullable=False),
        sa.Column("total_doses", sa.Integer(), nullable=False),
        sa.Column("taken_doses", sa.Integer(), nullable=False),
        sa.Column("adherence_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column(
            "calculated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patient_profiles.id"],
            name="fk_adherence_snapshots_patient_id_patient_profiles",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["treatment_id"],
            ["treatments.id"],
            name="fk_adherence_snapshots_treatment_id_treatments",
            ondelete="RESTRICT",
        ),
    )
    op.create_index("ix_adherence_snapshots_treatment_id", "adherence_snapshots", ["treatment_id"])
    op.create_index("ix_adherence_snapshots_patient_id", "adherence_snapshots", ["patient_id"])
    op.create_index(
        "ix_adherence_snapshots_calculated_at", "adherence_snapshots", ["calculated_at"]
    )


def downgrade() -> None:
    op.drop_table("adherence_snapshots")
    op.drop_table("dose_logs")
    op.drop_table("dose_schedules")
    op.drop_table("treatments")
    op.drop_table("symptoms")

    op.drop_constraint(
        "fk_patient_profiles_health_unit_id_health_units",
        "patient_profiles",
        type_="foreignkey",
    )

    op.drop_index("ix_health_professionals_health_unit_id", "health_professionals")
    op.drop_table("health_professionals")

    op.execute("DROP TYPE IF EXISTS dose_frequency_enum")
    op.execute("DROP TYPE IF EXISTS treatment_status_enum")
    op.execute("DROP TYPE IF EXISTS treatment_regimen_enum")
    op.execute("DROP TYPE IF EXISTS symptom_category_enum")
