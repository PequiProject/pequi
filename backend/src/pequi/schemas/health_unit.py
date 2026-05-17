from uuid import UUID

from pydantic import BaseModel


class HealthUnitRead(BaseModel):
    id: UUID
    name: str
    city: str
    state: str
    cnes: str | None
