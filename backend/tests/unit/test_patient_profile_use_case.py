from datetime import date
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pequi.schemas.patient import PatientProfileUpdate
from pequi.use_cases.update_patient_profile import UpdatePatientProfileUseCase

pytestmark = pytest.mark.asyncio
_DEFAULT_REFRESHED = object()


def _patient(**overrides):
    base = {
        "id": uuid4(),
        "user_id": uuid4(),
        "health_unit_id": uuid4(),
        "date_of_birth": date(1990, 1, 1),
        "sex": None,
        "neighborhood": None,
        "city": None,
        "state": None,
        "disability_grade": 0,
        "diagnosis_date": None,
        "classification": None,
    }
    base.update(overrides)
    return SimpleNamespace(**base)


class FakePatientRepository:
    def __init__(self, *, patient=None, refreshed=_DEFAULT_REFRESHED):
        self.patient = patient
        self.refreshed = patient if refreshed is _DEFAULT_REFRESHED else refreshed
        self.use_default_refreshed = refreshed is _DEFAULT_REFRESHED
        self.updated_id = None
        self.updated_fields = None

    async def get_by_user_id(self, user_id):
        if self.patient is None or self.patient.user_id != user_id:
            return None
        return self.patient

    async def get_or_create_by_user_id(self, user_id):
        patient = await self.get_by_user_id(user_id)
        if patient is not None:
            return patient

        self.patient = _patient(user_id=user_id, health_unit_id=None, date_of_birth=None)
        if self.use_default_refreshed:
            self.refreshed = self.patient
        return self.patient

    async def update(self, patient_id, **fields):
        self.updated_id = patient_id
        self.updated_fields = fields
        if self.use_default_refreshed and self.patient is not None:
            for key, value in fields.items():
                setattr(self.patient, key, value)
            self.refreshed = self.patient
        return self.refreshed

    async def get_by_id(self, patient_id):
        if self.refreshed is None or self.refreshed.id != patient_id:
            return None
        return self.refreshed


async def test_update_patient_profile_creates_minimal_profile_when_missing():
    repo = FakePatientRepository(patient=None)
    use_case = UpdatePatientProfileUseCase(repo)
    user_id = uuid4()

    result = await use_case.execute(user_id, PatientProfileUpdate(city="Recife"))

    assert result is not None
    assert result.user_id == user_id
    assert result.city == "Recife"
    assert result.health_unit_id is None
    assert result.date_of_birth is None
    assert repo.updated_fields == {"city": "Recife"}


async def test_update_patient_profile_empty_patch_returns_current_profile_without_writing():
    patient = _patient(city="Olinda", state="PE")
    repo = FakePatientRepository(patient=patient)
    use_case = UpdatePatientProfileUseCase(repo)

    result = await use_case.execute(patient.user_id, PatientProfileUpdate())

    assert result is not None
    assert result.city == "Olinda"
    assert result.state == "PE"
    assert repo.updated_fields is None


async def test_update_patient_profile_writes_only_non_null_fields_and_returns_refreshed_profile():
    patient = _patient(city="Olinda", state="PE")
    refreshed = _patient(
        id=patient.id,
        user_id=patient.user_id,
        health_unit_id=patient.health_unit_id,
        city="Recife",
        state="PE",
        neighborhood="Centro",
    )
    repo = FakePatientRepository(patient=patient, refreshed=refreshed)
    use_case = UpdatePatientProfileUseCase(repo)

    result = await use_case.execute(
        patient.user_id,
        PatientProfileUpdate(city="Recife", neighborhood="Centro", classification=None),
    )

    assert result is not None
    assert result.city == "Recife"
    assert result.neighborhood == "Centro"
    assert repo.updated_id == patient.id
    assert repo.updated_fields == {"neighborhood": "Centro", "city": "Recife"}


async def test_update_patient_profile_returns_none_when_refreshed_profile_is_missing():
    patient = _patient()
    repo = FakePatientRepository(patient=patient, refreshed=None)
    use_case = UpdatePatientProfileUseCase(repo)

    result = await use_case.execute(patient.user_id, PatientProfileUpdate(city="Recife"))

    assert result is None
    assert repo.updated_fields == {"city": "Recife"}
