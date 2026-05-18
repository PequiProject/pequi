import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import INET, UUID
from sqlalchemy.sql import func

from pequi.database import Base


class Consent(Base):
    __tablename__ = "consents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    term_version = Column(String, nullable=False)
    accepted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ip_address = Column(INET)
    user_agent = Column(String)
