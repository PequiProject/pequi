import uuid

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from pequi.database import Base
from pequi.models.checkin import CheckinMood


class WeeklySymptomSummary(Base):
    """Resumo semanal de sintomas — calculado exclusivamente pelo worker (M9).

    Nunca recalculado em tempo real. Os endpoints leem apenas desta tabela.
    """

    __tablename__ = "weekly_symptom_summaries"
    __table_args__ = (
        UniqueConstraint(
            "patient_id",
            "week_start",
            name="uq_weekly_symptom_summaries_period",
        ),
        Index("ix_weekly_symptom_summaries_patient_id", "patient_id"),
        Index("ix_weekly_symptom_summaries_week_start", "week_start"),
        Index("ix_weekly_symptom_summaries_calculated_at", "calculated_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    avg_intensity = Column(SmallInteger, nullable=True)
    dominant_mood = Column(Text, nullable=True)
    checkin_count = Column(SmallInteger, nullable=False)
    alert_count = Column(SmallInteger, nullable=False)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
