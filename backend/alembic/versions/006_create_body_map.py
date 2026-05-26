"""create body map tables — M5 Body Map

Revision ID: 006_create_body_map
Revises: 005_create_checkins
Create Date: 2026-05-26
"""

import uuid
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "006_create_body_map"
down_revision: str | None = "005_create_checkins"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    body_side_enum = postgresql.ENUM(
        "left",
        "right",
        "center",
        "bilateral",
        name="body_side_enum",
    )
    body_system_part_enum = postgresql.ENUM(
        "head",
        "trunk",
        "upper_limb",
        "lower_limb",
        name="body_system_part_enum",
    )
    body_finding_type_enum = postgresql.ENUM(
        "lesion",
        "hypoesthesia",
        "anesthesia",
        "nodule",
        "other",
        name="body_finding_type_enum",
    )

    body_side_enum.create(op.get_bind(), checkfirst=True)
    body_system_part_enum.create(op.get_bind(), checkfirst=True)
    body_finding_type_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "body_areas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column(
            "side",
            postgresql.ENUM(
                "left",
                "right",
                "center",
                "bilateral",
                name="body_side_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "system_part",
            postgresql.ENUM(
                "head",
                "trunk",
                "upper_limb",
                "lower_limb",
                name="body_system_part_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.UniqueConstraint("code", name="uq_body_areas_code"),
    )

    op.create_index("ix_body_areas_system_part", "body_areas", ["system_part"])
    op.create_index("ix_body_areas_label", "body_areas", ["label"])

    op.create_table(
        "body_map_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("body_area_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "finding_type",
            postgresql.ENUM(
                "lesion",
                "hypoesthesia",
                "anesthesia",
                "nodule",
                "other",
                name="body_finding_type_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("intensity", sa.SmallInteger(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("image_key", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "recorded_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.CheckConstraint(
            "intensity IS NULL OR (intensity >= 0 AND intensity <= 3)",
            name="ck_body_map_entries_body_map_entries_intensity_range",
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patient_profiles.id"],
            name="fk_body_map_entries_patient_id_patient_profiles",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["body_area_id"],
            ["body_areas.id"],
            name="fk_body_map_entries_body_area_id_body_areas",
            ondelete="RESTRICT",
        ),
    )
    op.create_index("ix_body_map_entries_patient_id", "body_map_entries", ["patient_id"])
    op.create_index("ix_body_map_entries_body_area_id", "body_map_entries", ["body_area_id"])
    op.create_index("ix_body_map_entries_deleted_at", "body_map_entries", ["deleted_at"])
    op.create_index(
        "uq_body_map_entries_active_patient_area",
        "body_map_entries",
        ["patient_id", "body_area_id"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "body_area_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("checkin_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("body_area_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "finding_type",
            postgresql.ENUM(
                "lesion",
                "hypoesthesia",
                "anesthesia",
                "nodule",
                "other",
                name="body_finding_type_enum",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("intensity", sa.SmallInteger(), nullable=True),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("image_key", sa.Text(), nullable=True),
        sa.Column(
            "snapshot_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "intensity IS NULL OR (intensity >= 0 AND intensity <= 3)",
            name="ck_body_area_history_body_area_history_intensity_range",
        ),
        sa.ForeignKeyConstraint(
            ["patient_id"],
            ["patient_profiles.id"],
            name="fk_body_area_history_patient_id_patient_profiles",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["checkin_id"],
            ["checkins.id"],
            name="fk_body_area_history_checkin_id_checkins",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["body_area_id"],
            ["body_areas.id"],
            name="fk_body_area_history_body_area_id_body_areas",
            ondelete="RESTRICT",
        ),
    )
    op.create_index("ix_body_area_history_patient_id", "body_area_history", ["patient_id"])
    op.create_index("ix_body_area_history_body_area_id", "body_area_history", ["body_area_id"])
    op.create_index("ix_body_area_history_snapshot_at", "body_area_history", ["snapshot_at"])

    body_areas = sa.table(
        "body_areas",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("code", sa.Text()),
        sa.column("label", sa.Text()),
        sa.column("side", sa.Text()),
        sa.column("system_part", sa.Text()),
    )
    op.bulk_insert(
        body_areas,
        [
            _row(
                "5e5e2316-0fcc-4a3d-a2b4-51b856f6bf26",
                "left_cheek",
                "Bochecha esquerda",
                "left",
                "head",
            ),
            _row(
                "bcc5f7ce-2632-47f0-adf2-bbf22bd4ec8a",
                "right_cheek",
                "Bochecha direita",
                "right",
                "head",
            ),
            _row("0de315f6-90d4-4637-a81f-ac2f34512bd7", "forehead", "Testa", "center", "head"),
            _row("760d7f14-e2df-4426-8f85-0f2750f176ef", "nose", "Nariz", "center", "head"),
            _row(
                "b2fb1f7f-6542-4f4b-916c-092f95aa0088",
                "left_ear",
                "Orelha esquerda",
                "left",
                "head",
            ),
            _row(
                "df80aa7b-a0db-48e2-ae9a-662c2fd8a466",
                "right_ear",
                "Orelha direita",
                "right",
                "head",
            ),
            _row("ce426de8-8108-4e4f-b06f-7e6a2177d7ab", "chest", "Tórax", "center", "trunk"),
            _row(
                "f49fd957-89a8-46c5-b69f-4296a8f95784",
                "upper_back",
                "Dorso superior",
                "center",
                "trunk",
            ),
            _row("64d0af93-f2d5-484f-a1a6-53d8f3778cad", "abdomen", "Abdômen", "center", "trunk"),
            _row("15f12935-ad64-44d3-a39a-b2fc1f614469", "lower_back", "Lombar", "center", "trunk"),
            _row(
                "af6a2d96-dde2-4bd8-a67e-beb3a4122f4d",
                "left_shoulder",
                "Ombro esquerdo",
                "left",
                "upper_limb",
            ),
            _row(
                "ef2f6ed8-25d9-4df0-a6e3-83e85b3fd522",
                "right_shoulder",
                "Ombro direito",
                "right",
                "upper_limb",
            ),
            _row(
                "e4995804-017b-47bd-b91f-7a05eb1f6710",
                "left_arm",
                "Braço esquerdo",
                "left",
                "upper_limb",
            ),
            _row(
                "95c7800d-0099-4222-b28a-b4f68b80f473",
                "right_arm",
                "Braço direito",
                "right",
                "upper_limb",
            ),
            _row(
                "f6e8149e-a72f-4c0c-b44a-a7f5a64f7f26",
                "left_forearm",
                "Antebraço esquerdo",
                "left",
                "upper_limb",
            ),
            _row(
                "2db83785-7f37-4a6f-9fdc-8b4f8ea2cd8d",
                "right_forearm",
                "Antebraço direito",
                "right",
                "upper_limb",
            ),
            _row(
                "e8b845d9-8d28-4821-8409-f2b46f7d3e71",
                "left_hand",
                "Mão esquerda",
                "left",
                "upper_limb",
            ),
            _row(
                "4cfc2ea9-729f-45f1-a077-45e814d9ecf2",
                "right_hand",
                "Mão direita",
                "right",
                "upper_limb",
            ),
            _row(
                "eeb12cd1-e21b-4832-b84f-c87f8dca76f8",
                "left_thigh",
                "Coxa esquerda",
                "left",
                "lower_limb",
            ),
            _row(
                "9d495f41-6334-4e60-b7ff-ec76349fd319",
                "right_thigh",
                "Coxa direita",
                "right",
                "lower_limb",
            ),
            _row(
                "6ff9629e-c5c7-4cd2-ac17-95f40eeec54b",
                "left_knee",
                "Joelho esquerdo",
                "left",
                "lower_limb",
            ),
            _row(
                "c4bbf2ac-d58e-4917-90d3-f8fcd7a68eb8",
                "right_knee",
                "Joelho direito",
                "right",
                "lower_limb",
            ),
            _row(
                "8f42d97f-cbb8-4c7c-a2f9-dbe463aa6f57",
                "left_leg",
                "Perna esquerda",
                "left",
                "lower_limb",
            ),
            _row(
                "b1307f4a-1783-47bc-82f8-6d28242ee379",
                "right_leg",
                "Perna direita",
                "right",
                "lower_limb",
            ),
            _row(
                "337f9fd7-34dc-42e8-ba32-a5751945163b",
                "left_foot",
                "Pé esquerdo",
                "left",
                "lower_limb",
            ),
            _row(
                "b87c851f-5dcf-4fb7-8e0d-96f1f4d2af8c",
                "right_foot",
                "Pé direito",
                "right",
                "lower_limb",
            ),
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_body_area_history_snapshot_at", table_name="body_area_history")
    op.drop_index("ix_body_area_history_body_area_id", table_name="body_area_history")
    op.drop_index("ix_body_area_history_patient_id", table_name="body_area_history")
    op.drop_table("body_area_history")

    op.drop_index("uq_body_map_entries_active_patient_area", table_name="body_map_entries")
    op.drop_index("ix_body_map_entries_deleted_at", table_name="body_map_entries")
    op.drop_index("ix_body_map_entries_body_area_id", table_name="body_map_entries")
    op.drop_index("ix_body_map_entries_patient_id", table_name="body_map_entries")
    op.drop_table("body_map_entries")

    op.drop_index("ix_body_areas_label", table_name="body_areas")
    op.drop_index("ix_body_areas_system_part", table_name="body_areas")
    op.drop_table("body_areas")

    sa.Enum(name="body_finding_type_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="body_system_part_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="body_side_enum").drop(op.get_bind(), checkfirst=True)


def _row(
    id_value: str,
    code: str,
    label: str,
    side: str,
    system_part: str,
) -> dict[str, object]:
    return {
        "id": uuid.UUID(id_value),
        "code": code,
        "label": label,
        "side": side,
        "system_part": system_part,
    }
