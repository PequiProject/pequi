import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from pequi.database import Base


class PatientHealthAppointment(Base):
    __tablename__ = "patient_health_appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(String(5), nullable=False)
    location = Column(String(500), nullable=False)
    appointment_type = Column(String(50), nullable=False)
    professional = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    performed = Column(Boolean, nullable=False)
    status = Column(String(20), nullable=False)
    wants_follow_up_details = Column(Boolean, nullable=False, default=False)
    follow_up = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)
