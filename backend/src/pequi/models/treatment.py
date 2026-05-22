import uuid
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Index, Numeric, SmallInteger, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from pequi.database import Base


class TreatmentRegimen(StrEnum):
    """Códigos WHO do esquema MDT (abreviações internacionais em inglês).

    PB — Paucibacillary (regime de 6 meses).
    MB — Multibacillary (regime de 12 meses).
    """

    PB = "PB"
    MB = "MB"


class TreatmentStatus(StrEnum):
    active = "active"
    completed = "completed"
    abandoned = "abandoned"
    suspended = "suspended"


class DoseFrequency(StrEnum):
    daily = "daily"
    monthly_supervised = "monthly_supervised"


class Treatment(Base):
    """Tratamento MDT — PB (6 meses) ou MB (12 meses).

    Soft delete via ``deleted_at``. Cascade DELETE proibido por regra de negócio
    clínica — usa ON DELETE RESTRICT em todas as FKs que referenciam esta tabela.
    """

    __tablename__ = "treatments"
    __table_args__ = (
        Index("ix_treatments_patient_id", "patient_id"),
        Index("ix_treatments_prescribed_by", "prescribed_by"),
        Index("ix_treatments_status", "status"),
        Index("ix_treatments_deleted_at", "deleted_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    prescribed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("health_professionals.id", ondelete="RESTRICT"),
        nullable=False,
    )
    regimen = Column(
        Enum(TreatmentRegimen, name="treatment_regimen_enum"),
        nullable=False,
    )
    start_date = Column(Date, nullable=False)
    expected_end = Column(Date, nullable=False)
    status = Column(
        Enum(TreatmentStatus, name="treatment_status_enum"),
        nullable=False,
        server_default="active",
    )
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)


class DoseSchedule(Base):
    """Grade de dosagem por fármaco por mês do tratamento.

    Utilizada pelo worker de M9 para gerar DoseLog entries antecipadas.
    Sem endpoints CRUD públicos em M3.
    """

    __tablename__ = "dose_schedules"
    __table_args__ = (Index("ix_dose_schedules_treatment_id", "treatment_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    treatment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("treatments.id", ondelete="RESTRICT"),
        nullable=False,
    )
    drug_name = Column(Text, nullable=False)
    frequency = Column(
        Enum(DoseFrequency, name="dose_frequency_enum"),
        nullable=False,
    )
    # Nullable no schema para migrações/import; obrigatório ao popular via worker (M9).
    dose_mg = Column(Numeric(6, 2), nullable=True)
    month_number = Column(SmallInteger, nullable=True)

    @staticmethod
    def validate_dose_mg(dose_mg: Decimal | None, drug_name: str) -> Decimal:
        """Garante dose em mg ao criar grades — evita schedules sem dosagem clínica."""
        if dose_mg is None or dose_mg <= 0:
            raise ValueError(f"dose_mg is required and must be positive for drug '{drug_name}'")
        return dose_mg
