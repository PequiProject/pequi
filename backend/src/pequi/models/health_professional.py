import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from pequi.database import Base


class HealthProfessional(Base):
    """Perfil de profissional de saúde — stub mínimo para FK de treatments.

    Campos adicionais (CRM, especialidade, etc.) serão expandidos no M8.
    """

    __tablename__ = "health_professionals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    health_unit_id = Column(
        UUID(as_uuid=True),
        ForeignKey("health_units.id", ondelete="RESTRICT"),
        nullable=False,
    )
    professional_registration = Column(String, nullable=True)
    specialty = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)
