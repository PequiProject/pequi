import uuid
from enum import StrEnum

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    SmallInteger,
    Table,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from pequi.database import Base


class CheckinMood(StrEnum):
    terrible = "terrible"
    bad = "bad"
    ok = "ok"
    good = "good"
    great = "great"


checkin_symptoms = Table(
    "checkin_symptoms",
    Base.metadata,
    Column(
        "checkin_id",
        UUID(as_uuid=True),
        ForeignKey("checkins.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
    Column(
        "symptom_id",
        UUID(as_uuid=True),
        ForeignKey("symptoms.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)


class Checkin(Base):
    __tablename__ = "checkins"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    mood = Column(
        Enum(CheckinMood, name="checkin_mood_enum"),
        nullable=False,
    )
    symptom_intensity = Column(SmallInteger, nullable=False)
    general_notes = Column(Text, nullable=True)
    ai_feedback = Column(Text, nullable=True)
    ai_feedback_at = Column(DateTime(timezone=True), nullable=True)
    checked_in_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    symptoms = relationship(
        "Symptom",
        secondary=checkin_symptoms,
        lazy="selectin",
    )
