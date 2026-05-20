"""add user foreign keys to consents and patient_profiles

Revision ID: 003_add_user_foreign_keys
Revises: ab5619b6cb7a
Create Date: 2026-05-18
"""

from collections.abc import Sequence

from alembic import op

revision: str = "003_add_user_foreign_keys"
down_revision: str | None = "ab5619b6cb7a"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_foreign_key(
        op.f("fk_consents_user_id_users"), "consents", "users", ["user_id"], ["id"]
    )
    op.create_foreign_key(
        op.f("fk_patient_profiles_user_id_users"),
        "patient_profiles",
        "users",
        ["user_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_patient_profiles_user_id_users"), "patient_profiles", type_="foreignkey"
    )
    op.drop_constraint(op.f("fk_consents_user_id_users"), "consents", type_="foreignkey")
