"""align body area catalog with frontend

Revision ID: 112_align_body_areas_with_frontend
Revises: 111_create_journey_events
Create Date: 2026-06-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "112_align_body_areas_with_frontend"
down_revision: str | None = "111_create_journey_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


BODY_AREAS = (
    ("d7246d41-427a-4acf-b7f1-19c87e045a23", "face", "Face", "center", "head", 50, 10, "front"),
    ("e4718197-848b-488c-a9e6-29ce3c978526", "neck", "Pescoço", "center", "head", 50, 17, "front"),
    (
        "7a9d2743-a641-46f2-8206-a6bc967652e0",
        "shoulders",
        "Ombros",
        "center",
        "upper_limb",
        25,
        25,
        "front",
    ),
    (
        "57d0040e-9cb5-4930-8d68-e5db16409026",
        "arms",
        "Braços",
        "center",
        "upper_limb",
        20,
        50,
        "front",
    ),
    (
        "d0427a6e-14da-4f46-a2f5-6df4581e0b3b",
        "hands",
        "Mãos",
        "center",
        "upper_limb",
        15,
        75,
        "front",
    ),
    (
        "64d0af93-f2d5-484f-a1a6-53d8f3778cad",
        "abdomen",
        "Abdômen",
        "center",
        "trunk",
        50,
        35,
        "front",
    ),
    ("93d7f00b-cde9-4e2d-a84d-f6618e3dafaf", "hip", "Quadril", "center", "trunk", 50, 50, "front"),
    (
        "2c242eb6-0c2f-43ee-a625-7aed0593c953",
        "legs",
        "Pernas",
        "center",
        "lower_limb",
        35,
        65,
        "front",
    ),
    (
        "3ae541eb-62b2-4298-aa6f-b95a785a35a9",
        "knees",
        "Joelhos",
        "center",
        "lower_limb",
        35,
        80,
        "front",
    ),
    (
        "b0d125a5-366f-43b4-b17c-d0b61743ed69",
        "feet",
        "Pés",
        "center",
        "lower_limb",
        35,
        95,
        "front",
    ),
    (
        "5c19647e-df64-4bc1-893a-c8a077612631",
        "scalp",
        "Couro cabeludo",
        "center",
        "head",
        50,
        8,
        "back",
    ),
    ("49201184-5df7-4f50-a3de-d28258586138", "nape", "Nuca", "center", "head", 50, 17, "back"),
    ("04947b01-d28b-4db1-993a-3bb18b68ecac", "back", "Costas", "center", "trunk", 50, 35, "back"),
    (
        "e224e751-dff5-4215-b165-d9a2d03c4431",
        "buttocks",
        "Glúteos",
        "center",
        "trunk",
        50,
        52,
        "back",
    ),
    (
        "43265efe-892f-45f6-afb4-639373512cfb",
        "posterior_thighs",
        "Posterior das coxas",
        "center",
        "lower_limb",
        35,
        65,
        "back",
    ),
    (
        "3d0353f1-5c81-4c17-9d22-b900f67d141e",
        "calves",
        "Panturrilhas",
        "center",
        "lower_limb",
        35,
        85,
        "back",
    ),
)


def upgrade() -> None:
    body_view_enum = sa.Enum("front", "back", name="body_view_enum")
    body_view_enum.create(op.get_bind(), checkfirst=True)

    op.add_column("body_areas", sa.Column("x", sa.SmallInteger(), nullable=True))
    op.add_column("body_areas", sa.Column("y", sa.SmallInteger(), nullable=True))
    op.add_column("body_areas", sa.Column("view", body_view_enum, nullable=True))
    op.add_column(
        "body_areas",
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )

    op.execute("UPDATE body_areas SET x = 50, y = 50, view = 'front', is_active = false")
    op.alter_column("body_areas", "x", nullable=False)
    op.alter_column("body_areas", "y", nullable=False)
    op.alter_column("body_areas", "view", nullable=False)
    op.create_check_constraint("body_areas_x_range", "body_areas", "x >= 0 AND x <= 100")
    op.create_check_constraint("body_areas_y_range", "body_areas", "y >= 0 AND y <= 100")

    body_areas = sa.table(
        "body_areas",
        sa.column("id", UUID(as_uuid=True)),
        sa.column("code", sa.Text()),
        sa.column("label", sa.Text()),
        sa.column("side", sa.Enum(name="body_side_enum")),
        sa.column("system_part", sa.Enum(name="body_system_part_enum")),
        sa.column("x", sa.SmallInteger()),
        sa.column("y", sa.SmallInteger()),
        sa.column("view", sa.Enum(name="body_view_enum")),
        sa.column("is_active", sa.Boolean()),
    )
    op.bulk_insert(
        body_areas,
        [
            {
                "id": area_id,
                "code": code,
                "label": label,
                "side": side,
                "system_part": system_part,
                "x": x,
                "y": y,
                "view": view,
                "is_active": True,
            }
            for area_id, code, label, side, system_part, x, y, view in BODY_AREAS
            if code != "abdomen"
        ],
    )
    op.execute(
        """
        UPDATE body_areas
        SET label = 'Abdômen', side = 'center', system_part = 'trunk',
            x = 50, y = 35, view = 'front', is_active = true
        WHERE code = 'abdomen'
        """
    )


def downgrade() -> None:
    codes = ", ".join(f"'{area[1]}'" for area in BODY_AREAS if area[1] != "abdomen")
    op.execute(f"DELETE FROM body_areas WHERE code IN ({codes})")
    op.execute("UPDATE body_areas SET is_active = true WHERE code = 'abdomen'")
    op.drop_constraint("body_areas_y_range", "body_areas", type_="check")
    op.drop_constraint("body_areas_x_range", "body_areas", type_="check")
    op.drop_column("body_areas", "is_active")
    op.drop_column("body_areas", "view")
    op.drop_column("body_areas", "y")
    op.drop_column("body_areas", "x")
    sa.Enum(name="body_view_enum").drop(op.get_bind(), checkfirst=True)
