import pytest
from pydantic import ValidationError

from pequi.schemas.checkin import CheckinCreate


def test_symptom_intensity_must_be_0_to_10():
    with pytest.raises(ValidationError):
        CheckinCreate(mood="ok", symptom_intensity=11, symptom_ids=[])

    with pytest.raises(ValidationError):
        CheckinCreate(mood="ok", symptom_intensity=-1, symptom_ids=[])


def test_symptom_ids_requires_at_least_one():
    with pytest.raises(ValidationError):
        CheckinCreate(mood="ok", symptom_intensity=5, symptom_ids=[])
