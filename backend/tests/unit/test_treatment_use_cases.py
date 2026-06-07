from datetime import UTC, date, datetime
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pequi.core.exceptions import ForbiddenError, NotFoundError, ValidationFailedError
from pequi.schemas.treatment import TreatmentCreate
from pequi.use_cases.create_treatment import CreateTreatmentUseCase
from pequi.use_cases.get_treatment import GetTreatmentUseCase

pytestmark = pytest.mark.asyncio


def _treatment_attrs(**overrides):
    base = {
        "id": uuid4(),
        "patient_id": uuid4(),
        "regimen": "PB",
        "start_date": date(2026, 1, 1),
        "expected_end": date(2026, 7, 1),
        "status": "active",
        "notes": None,
        "created_at": datetime(2026, 1, 1, tzinfo=UTC),
        "updated_at": datetime(2026, 1, 1, tzinfo=UTC),
    }
    base.update(overrides)
    return base


class FakeTreatmentRepository:
    def __init__(self, treatment=None, active=None):
        self.treatment = treatment
        self.active = active
        self.created = None

    async def create(self, treatment):
        self.created = treatment
        treatment.created_at = datetime(2026, 1, 1, tzinfo=UTC)
        treatment.updated_at = datetime(2026, 1, 1, tzinfo=UTC)
        return treatment

    async def get_by_id(self, treatment_id):
        if self.treatment is None or self.treatment.id != treatment_id:
            return None
        return self.treatment

    async def get_active_by_patient_id(self, patient_id):
        if self.active is None or self.active.patient_id != patient_id:
            return None
        return self.active


class FakePatientRepository:
    def __init__(self, *, by_id=None, by_user_id=None):
        self.by_id = by_id
        self.by_user_id = by_user_id

    async def get_by_id(self, patient_id):
        if self.by_id is None or self.by_id.id != patient_id:
            return None
        return self.by_id

    async def get_by_user_id(self, user_id):
        if self.by_user_id is None or self.by_user_id.user_id != user_id:
            return None
        return self.by_user_id


async def test_create_treatment_calculates_expected_end_and_preserves_notes():
    patient = SimpleNamespace(id=uuid4(), user_id=uuid4())
    treatment_repo = FakeTreatmentRepository()
    use_case = CreateTreatmentUseCase(
        treatment_repo,
        FakePatientRepository(by_user_id=patient),
    )

    result = await use_case.execute(
        patient.user_id,
        TreatmentCreate(
            regimen="PB",
            start_date=date(2026, 1, 31),
            notes="Tratamento inicial",
        ),
    )

    assert result.patient_id == patient.id
    assert result.expected_end == date(2026, 7, 31)
    assert result.status == "active"
    assert result.notes == "Tratamento inicial"
    assert treatment_repo.created is not None


async def test_create_treatment_handles_month_end_for_mb_regimen():
    patient = SimpleNamespace(id=uuid4(), user_id=uuid4())
    use_case = CreateTreatmentUseCase(
        FakeTreatmentRepository(),
        FakePatientRepository(by_user_id=patient),
    )

    result = await use_case.execute(
        patient.user_id,
        TreatmentCreate(regimen="MB", start_date=date(2024, 2, 29)),
    )

    assert result.expected_end == date(2025, 2, 28)
    assert result.regimen == "MB"


async def test_create_treatment_requires_existing_patient_profile():
    use_case = CreateTreatmentUseCase(
        FakeTreatmentRepository(),
        FakePatientRepository(by_user_id=None),
    )

    with pytest.raises(NotFoundError):
        await use_case.execute(
            uuid4(),
            TreatmentCreate(regimen="PB", start_date=date(2026, 1, 1)),
        )


async def test_create_treatment_rejects_when_active_treatment_exists():
    patient = SimpleNamespace(id=uuid4(), user_id=uuid4())
    active = SimpleNamespace(id=uuid4(), patient_id=patient.id, status="active")
    use_case = CreateTreatmentUseCase(
        FakeTreatmentRepository(active=active),
        FakePatientRepository(by_user_id=patient),
    )

    with pytest.raises(ValidationFailedError):
        await use_case.execute(
            patient.user_id,
            TreatmentCreate(regimen="PB", start_date=date(2026, 1, 1)),
        )


async def test_get_treatment_allows_patient_owner():
    patient = SimpleNamespace(id=uuid4(), user_id=uuid4())
    treatment = SimpleNamespace(**_treatment_attrs(patient_id=patient.id))
    use_case = GetTreatmentUseCase(
        FakeTreatmentRepository(treatment),
        FakePatientRepository(by_user_id=patient),
    )

    result = await use_case.execute(patient.user_id, treatment.id)

    assert result.id == treatment.id
    assert result.patient_id == patient.id


async def test_get_treatment_rejects_patient_that_is_not_owner():
    owner = SimpleNamespace(id=uuid4(), user_id=uuid4())
    actor = SimpleNamespace(id=uuid4(), user_id=uuid4())
    treatment = SimpleNamespace(**_treatment_attrs(patient_id=owner.id))
    use_case = GetTreatmentUseCase(
        FakeTreatmentRepository(treatment),
        FakePatientRepository(by_user_id=actor),
    )

    with pytest.raises(ForbiddenError):
        await use_case.execute(actor.user_id, treatment.id)


async def test_get_treatment_raises_not_found_for_missing_treatment():
    use_case = GetTreatmentUseCase(
        FakeTreatmentRepository(None),
        FakePatientRepository(),
    )

    with pytest.raises(NotFoundError):
        await use_case.execute(uuid4(), uuid4())
