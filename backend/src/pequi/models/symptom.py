import uuid
from enum import StrEnum

from sqlalchemy import Column, Enum, Text
from sqlalchemy.dialects.postgresql import UUID

from pequi.database import Base


class SymptomCategory(StrEnum):
    dermatological = "dermatological"
    neurological = "neurological"
    systemic = "systemic"


class Symptom(Base):
    """Catálogo de sintomas — populado via seed, sem CRUD público de escrita."""

    __tablename__ = "symptoms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False, unique=True)
    category = Column(
        Enum(SymptomCategory, name="symptom_category_enum"),
        nullable=False,
    )
    description = Column(Text, nullable=True)
