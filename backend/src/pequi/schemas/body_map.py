from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from pequi.models.body_map import BodyFindingType, BodySide, BodySystemPart, BodyView


class BodyAreaResponse(BaseModel):
    id: UUID
    code: str
    label: str
    side: BodySide
    system_part: BodySystemPart
    x: int = Field(ge=0, le=100)
    y: int = Field(ge=0, le=100)
    view: BodyView

    model_config = ConfigDict(from_attributes=True)


class BodyMapEntryBase(BaseModel):
    body_area_id: UUID
    finding_type: BodyFindingType | None = None
    intensity: int | None = Field(default=None, ge=0, le=3)
    image_url: str | None = Field(default=None, max_length=2048)
    image_key: str | None = Field(default=None, max_length=512)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("image_url", "image_key", "notes")
    @classmethod
    def _strip_nullable_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None


class BodyMapEntryCreate(BodyMapEntryBase):
    finding_type: BodyFindingType

    model_config = ConfigDict(extra="forbid")


class BodyMapEntryUpdate(BodyMapEntryBase):
    remove: bool = False

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def _validate_required_fields(self) -> "BodyMapEntryUpdate":
        if not self.remove and self.finding_type is None:
            msg = "finding_type é obrigatório quando remove=false."
            raise ValueError(msg)
        return self


class BodyMapUpdateRequest(BaseModel):
    entries: list[BodyMapEntryUpdate] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")


class BodyMapEntryResponse(BaseModel):
    id: UUID
    patient_id: UUID
    body_area_id: UUID
    body_area: BodyAreaResponse
    finding_type: BodyFindingType
    intensity: int | None
    image_url: str | None
    image_key: str | None
    notes: str | None
    recorded_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BodyMapHistoryResponse(BaseModel):
    id: UUID
    patient_id: UUID
    checkin_id: UUID | None
    body_area_id: UUID
    body_area: BodyAreaResponse
    finding_type: BodyFindingType
    intensity: int | None
    image_url: str | None
    image_key: str | None
    snapshot_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UploadUrlResponse(BaseModel):
    upload_url: str
    file_key: str
    public_url: str


class BodyMapUploadRequest(BaseModel):
    filename: str = Field(min_length=3, max_length=255)
    content_type: str = Field(min_length=3, max_length=100)

    model_config = ConfigDict(extra="forbid")
