import uuid
from enum import StrEnum

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    SmallInteger,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from pequi.database import Base


class BodySide(StrEnum):
    left = "left"
    right = "right"
    center = "center"
    bilateral = "bilateral"


class BodySystemPart(StrEnum):
    head = "head"
    trunk = "trunk"
    upper_limb = "upper_limb"
    lower_limb = "lower_limb"


class BodyFindingType(StrEnum):
    lesion = "lesion"
    hypoesthesia = "hypoesthesia"
    anesthesia = "anesthesia"
    nodule = "nodule"
    other = "other"


class BodyArea(Base):
    __tablename__ = "body_areas"
    __table_args__ = (
        Index("ix_body_areas_system_part", "system_part"),
        Index("ix_body_areas_label", "label"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(Text, nullable=False, unique=True)
    label = Column(Text, nullable=False)
    side = Column(
        Enum(BodySide, name="body_side_enum"),
        nullable=False,
    )
    system_part = Column(
        Enum(BodySystemPart, name="body_system_part_enum"),
        nullable=False,
    )


class BodyMapEntry(Base):
    __tablename__ = "body_map_entries"
    __table_args__ = (
        CheckConstraint(
            "intensity IS NULL OR (intensity >= 0 AND intensity <= 3)",
            name="body_map_entries_intensity_range",
        ),
        Index("ix_body_map_entries_patient_id", "patient_id"),
        Index("ix_body_map_entries_body_area_id", "body_area_id"),
        Index("ix_body_map_entries_deleted_at", "deleted_at"),
        Index(
            "uq_body_map_entries_active_patient_area",
            "patient_id",
            "body_area_id",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    body_area_id = Column(
        UUID(as_uuid=True),
        ForeignKey("body_areas.id", ondelete="RESTRICT"),
        nullable=False,
    )
    finding_type = Column(
        Enum(BodyFindingType, name="body_finding_type_enum"),
        nullable=False,
    )
    intensity = Column(SmallInteger, nullable=True)
    image_url = Column(Text, nullable=True)
    image_key = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    recorded_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    body_area = relationship("BodyArea", lazy="joined")


class BodyAreaHistory(Base):
    __tablename__ = "body_area_history"
    __table_args__ = (
        CheckConstraint(
            "intensity IS NULL OR (intensity >= 0 AND intensity <= 3)",
            name="body_area_history_intensity_range",
        ),
        Index("ix_body_area_history_patient_id", "patient_id"),
        Index("ix_body_area_history_body_area_id", "body_area_id"),
        Index("ix_body_area_history_snapshot_at", "snapshot_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    checkin_id = Column(
        UUID(as_uuid=True),
        ForeignKey("checkins.id", ondelete="RESTRICT"),
        nullable=True,
    )
    body_area_id = Column(
        UUID(as_uuid=True),
        ForeignKey("body_areas.id", ondelete="RESTRICT"),
        nullable=False,
    )
    finding_type = Column(
        Enum(BodyFindingType, name="body_finding_type_enum"),
        nullable=False,
    )
    intensity = Column(SmallInteger, nullable=True)
    image_url = Column(Text, nullable=True)
    image_key = Column(Text, nullable=True)
    snapshot_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    body_area = relationship("BodyArea", lazy="joined")
