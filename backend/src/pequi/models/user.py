import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from pequi.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String(30), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(
        Enum("patient", "health_professional", "admin", name="user_role_enum"),
        nullable=False,
    )
    is_active = Column(Boolean, server_default="true", nullable=False)
    is_verified = Column(Boolean, server_default="false", nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
        nullable=False,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)
