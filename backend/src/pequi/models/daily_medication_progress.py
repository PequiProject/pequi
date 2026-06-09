# pequi/models/daily_medication_progress.py
import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from pequi.database import Base


class DailyMedicationProgress(Base):
    __tablename__ = "daily_medication_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    progress_date = Column(Date, nullable=False)
    expected_count = Column(Integer, nullable=False)
    taken_count = Column(Integer, nullable=False)
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

    __table_args__ = (
        UniqueConstraint(
            "patient_id",
            "progress_date",
            name="uq_daily_medication_progress_patient_date",
        ),
    )