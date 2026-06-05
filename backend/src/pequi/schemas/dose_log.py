from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DoseLogCreate(BaseModel):
    """Payload para registrar uma dose (tomada, pulada ou supervisionada).

    Validações de permissão (paciente vs. profissional, supervisionada vs. diária)
    são realizadas no use case, não aqui.
    """

    model_config = ConfigDict(extra="forbid")

    drug_name: str = Field(..., min_length=1, max_length=200)
    expected_at: datetime
    taken_at: datetime | None = None
    skipped: bool = False
    skip_reason: str | None = Field(default=None, max_length=500)
    supervised: bool = False
    via_consultation: bool = Field(
        default=False,
        description=(
            "Quando true, paciente pode registrar dose supervisionada "
            "apenas após consulta na unidade (autodeclaração no app)."
        ),
    )

    @model_validator(mode="after")
    def validate_skip_and_taken(self) -> "DoseLogCreate":
        if self.skipped and self.taken_at is not None:
            raise ValueError("Uma dose não pode ser simultaneamente tomada e pulada.")
        if self.skipped is False and self.taken_at is None and not self.supervised:
            # Permite dose "pendente" (nem tomada nem pulada) apenas se não for o caso base
            pass
        return self


class DoseLogResponse(BaseModel):
    id: UUID
    treatment_id: UUID
    drug_name: str
    expected_at: datetime
    taken_at: datetime | None = None
    skipped: bool
    skip_reason: str | None = None
    supervised: bool
    registered_by: UUID | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
