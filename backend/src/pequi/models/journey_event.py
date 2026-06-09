import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func

from pequi.database import Base


class JourneyEvent(Base):
    """Evento unificado e persistido da jornada do paciente."""

    __tablename__ = "journey_events"
    __table_args__ = (
        UniqueConstraint("source_type", "source_id", name="uq_journey_events_source"),
        Index("ix_journey_events_patient_occurred_at", "patient_id", "occurred_at"),
        Index("ix_journey_events_treatment_id", "treatment_id"),
        Index("ix_journey_events_event_type", "event_type"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    treatment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("treatments.id", ondelete="RESTRICT"),
        nullable=True,
    )
    event_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    event_metadata = Column("metadata", JSONB, nullable=False, default=dict, server_default="{}")
    source_type = Column(String(50), nullable=True)
    source_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
