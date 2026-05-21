import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from pequi.database import Base


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    health_unit_id = Column(
        UUID(as_uuid=True),
        ForeignKey("health_units.id", ondelete="RESTRICT"),
        nullable=False,
    )
    date_of_birth = Column(Date, nullable=False)
    sex = Column(String(10))
    neighborhood = Column(String)
    city = Column(String)
    state = Column(String(2))
    disability_grade = Column(Integer, default=0)
    diagnosis_date = Column(Date)
    classification = Column(String(10))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)
