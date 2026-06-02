import pytest
from pydantic import ValidationError

from pequi.schemas.body_map import BodyMapUpdateRequest


def test_intensity_must_be_between_0_and_3():
    with pytest.raises(ValidationError):
        BodyMapUpdateRequest.model_validate(
            {
                "entries": [
                    {
                        "body_area_id": "5e5e2316-0fcc-4a3d-a2b4-51b856f6bf26",
                        "finding_type": "lesion",
                        "intensity": 4,
                    }
                ]
            }
        )


def test_invalid_enum_is_rejected():
    with pytest.raises(ValidationError):
        BodyMapUpdateRequest.model_validate(
            {
                "entries": [
                    {
                        "body_area_id": "5e5e2316-0fcc-4a3d-a2b4-51b856f6bf26",
                        "finding_type": "invalid",
                        "intensity": 2,
                    }
                ]
            }
        )


def test_valid_payload_is_accepted():
    payload = BodyMapUpdateRequest.model_validate(
        {
            "entries": [
                {
                    "body_area_id": "5e5e2316-0fcc-4a3d-a2b4-51b856f6bf26",
                    "finding_type": "lesion",
                    "intensity": 3,
                    "notes": "Lesão com borda ativa",
                }
            ]
        }
    )

    assert payload.entries[0].intensity == 3
    assert payload.entries[0].finding_type.value == "lesion"
