import uuid
from enum import StrEnum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from pequi.database import Base


class AlertType(StrEnum):
    symptom_spike = "symptom_spike"
    missed_doses = "missed_doses"
    mood_decline = "mood_decline"
    new_lesion = "new_lesion"


class AlertSeverity(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Alert(Base):
    __tablename__ = "alerts"

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
    type = Column(
        Enum(AlertType, name="alert_type_enum"),
        nullable=False,
    )
    severity = Column(
        Enum(AlertSeverity, name="alert_severity_enum"),
        nullable=False,
    )
    resolved = Column(Boolean, nullable=False, server_default="false")
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
