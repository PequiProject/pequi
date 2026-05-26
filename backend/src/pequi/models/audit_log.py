import uuid

from sqlalchemy import Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from pequi.database import Base


class AuditLog(Base):
    """Tabela de auditoria para ações sensíveis — append-only, sem DELETE ou UPDATE.

    Registra consultas a dados clínicos (patient_profile) e ações de admin
    em community_anonymous_map (deanonymization).
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    actor_role = Column(String(50), nullable=False)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
