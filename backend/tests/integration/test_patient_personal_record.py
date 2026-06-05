from datetime import date
from uuid import uuid4

import pytest

from pequi.core.auth import hash_password, verify_password
from pequi.core.exceptions import UnauthorizedError
from pequi.models.user import User
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.user_repo import UserRepository
from pequi.schemas.account import ChangePasswordRequest
from pequi.schemas.patient_personal import PatientPersonalRecordSave
from pequi.use_cases.change_password import ChangePasswordUseCase
from pequi.use_cases.patient_personal_record import (
    GetPatientPersonalRecordUseCase,
    SavePatientPersonalRecordUseCase,
)


@pytest.mark.asyncio
async def test_save_and_load_personal_record(db_session):
    user = User(
        id=uuid4(),
        email=f"patient-{uuid4()}@test.com",
        username=f"pat_{uuid4().hex[:8]}",
        hashed_password=hash_password("senha12345"),
        full_name="Maria Silva",
        role="patient",
    )
    db_session.add(user)
    await db_session.flush()

    patient_repo = PatientRepository(db_session)
    save_uc = SavePatientPersonalRecordUseCase(patient_repo)
    payload = PatientPersonalRecordSave(
        cpf="123.456.789-00",
        phone="62999998888",
        email="contato@email.com",
        birth_date=date(1990, 5, 20),
        sex="F",
        health_unit="UBS Centro",
        blood_type="O+",
    )
    saved = await save_uc.execute(user.id, payload)
    assert saved.cpf == "123.456.789-00"
    assert saved.phone == "62999998888"

    loaded = await GetPatientPersonalRecordUseCase(patient_repo).execute(user.id)
    assert loaded.cpf == "123.456.789-00"
    assert loaded.health_unit == "UBS Centro"

    patient = await patient_repo.get_by_user_id(user.id)
    assert patient is not None
    assert patient.date_of_birth == date(1990, 5, 20)
    assert patient.sex == "F"


@pytest.mark.asyncio
async def test_change_password(db_session):
    user = User(
        id=uuid4(),
        email=f"patient-{uuid4()}@test.com",
        username=f"pat_{uuid4().hex[:8]}",
        hashed_password=hash_password("senhaantiga"),
        full_name="Paciente Teste",
        role="patient",
    )
    db_session.add(user)
    await db_session.flush()

    user_repo = UserRepository(db_session)
    use_case = ChangePasswordUseCase(user_repo)

    await use_case.execute(
        user.id,
        ChangePasswordRequest(
            current_password="senhaantiga",
            new_password="senhanova12",
            confirm_password="senhanova12",
        ),
    )

    refreshed = await user_repo.get_by_id(user.id)
    assert refreshed is not None
    assert verify_password("senhanova12", refreshed.hashed_password)

    with pytest.raises(UnauthorizedError):
        await use_case.execute(
            user.id,
            ChangePasswordRequest(
                current_password="errada",
                new_password="outra12345",
                confirm_password="outra12345",
            ),
        )
