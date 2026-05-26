import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from pequi.database import Base


class DoseLog(Base):
    """Registro individual de dose — tomada, pulada ou perdida.

    Unique constraint ``uq_dose_logs_dedup`` impede duplicidade por
    (treatment_id, drug_name, expected_at) — retorna 409 se violada.
    ON DELETE RESTRICT para não perder histórico clínico.
    """

    __tablename__ = "dose_logs"
    __table_args__ = (
        UniqueConstraint(
            "treatment_id",
            "drug_name",
            "expected_at",
            name="uq_dose_logs_dedup",
        ),
        Index("ix_dose_logs_treatment_id", "treatment_id"),
        Index("ix_dose_logs_expected_at", "expected_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    treatment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("treatments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    drug_name = Column(Text, nullable=False)
    expected_at = Column(DateTime(timezone=True), nullable=False)
    taken_at = Column(DateTime(timezone=True), nullable=True)
    skipped = Column(Boolean, server_default="false", nullable=False, default=False)
    skip_reason = Column(Text, nullable=True)
    supervised = Column(Boolean, server_default="false", nullable=False, default=False)
    registered_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AdherenceSnapshot(Base):
    """Snapshot periódico de adesão — calculado exclusivamente pelo worker (M9).

    Nunca recalculado em tempo real. Os endpoints leem apenas desta tabela.
    """

    __tablename__ = "adherence_snapshots"
    __table_args__ = (
        Index("ix_adherence_snapshots_treatment_id", "treatment_id"),
        Index("ix_adherence_snapshots_patient_id", "patient_id"),
        Index("ix_adherence_snapshots_calculated_at", "calculated_at"),
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
        nullable=False,
    )
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    total_doses = Column(Integer, nullable=False)
    taken_doses = Column(Integer, nullable=False)
    adherence_pct = Column(Numeric(5, 2), nullable=False)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
