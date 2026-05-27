"""Testes unitários dos use cases de body map (regras de segurança e validação)."""

from types import SimpleNamespace
from uuid import uuid4

import pytest

from pequi.core.exceptions import ForbiddenError, ValidationFailedError
from pequi.use_cases.get_body_map_history import GetBodyMapHistoryUseCase
from pequi.use_cases.update_body_map import GenerateBodyMapUploadUrlUseCase


class _PatientRepoStub:
    def __init__(self, patient: SimpleNamespace | None) -> None:
        self._patient = patient

    async def get_by_user_id(self, user_id):  # noqa: ARG002
        return self._patient

    async def get_by_id(self, patient_id):  # noqa: ARG002
        return self._patient


class _ProfessionalRepoStub:
    def __init__(self, professional: SimpleNamespace | None) -> None:
        self._professional = professional

    async def get_by_user_id(self, user_id):  # noqa: ARG002
        return self._professional


class _BodyMapRepoStub:
    async def list_history_by_patient(self, *args, **kwargs):  # noqa: ARG002
        return []


class _StorageStub:
    async def generate_body_map_upload_url(self, **kwargs):  # noqa: ARG002
        raise AssertionError("storage should not be called when validation fails")


@pytest.mark.asyncio
async def test_professional_history_requires_patient_id() -> None:
    use_case = GetBodyMapHistoryUseCase(
        _BodyMapRepoStub(),
        _PatientRepoStub(None),
        _ProfessionalRepoStub(SimpleNamespace(id=uuid4(), health_unit_id=uuid4())),
    )
    with pytest.raises(ValidationFailedError, match="patient_id"):
        await use_case.execute(uuid4(), "health_professional", patient_id=None)


@pytest.mark.asyncio
async def test_professional_history_denies_when_health_unit_missing() -> None:
    patient_id = uuid4()
    patient = SimpleNamespace(id=patient_id, health_unit_id=None)
    professional = SimpleNamespace(id=uuid4(), health_unit_id=None)
    use_case = GetBodyMapHistoryUseCase(
        _BodyMapRepoStub(),
        _PatientRepoStub(patient),
        _ProfessionalRepoStub(professional),
    )
    with pytest.raises(ForbiddenError, match="unidade"):
        await use_case.execute(uuid4(), "health_professional", patient_id=patient_id)


@pytest.mark.asyncio
async def test_upload_rejects_disallowed_extension() -> None:
    patient = SimpleNamespace(id=uuid4())
    use_case = GenerateBodyMapUploadUrlUseCase(
        _PatientRepoStub(patient),
        _StorageStub(),
    )
    with pytest.raises(ValidationFailedError, match="Extensão"):
        await use_case.execute(
            uuid4(),
            filename="malicious.exe",
            content_type="image/png",
        )
