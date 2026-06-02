from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.exceptions import ConflictError
from pequi.core.token_blacklist import is_token_revoked
from pequi.models.audit_log import AuditLog
from pequi.models.body_map import BodyArea, BodyMapEntry
from pequi.models.community import CommunityAnonymousMap, CommunityPost
from pequi.models.health_professional import HealthProfessional
from pequi.models.health_unit import HealthUnit
from pequi.models.patient import PatientProfile
from pequi.models.treatment import Treatment, TreatmentRegimen, TreatmentStatus
from pequi.models.user import User
from pequi.use_cases.delete_account import DeleteAccountUseCase

pytestmark = pytest.mark.asyncio


class RecordingStorage:
    def __init__(self) -> None:
        self.deleted_keys: list[str] = []

    async def delete(self, key: str) -> None:
        self.deleted_keys.append(key)


async def _create_patient(db_session: AsyncSession) -> tuple[User, PatientProfile]:
    unit = HealthUnit(name="UBS", city="Cidade", state="SP", cnes=str(uuid4())[:12])
    user = User(
        email=f"{uuid4()}@example.com",
        username=f"patient{uuid4().hex[:8]}",
        hashed_password="$2b$12$YyAjsZqFgKMm.yK7hyRre.eD0mgoTb1foL3.zIg0SBsDzz8qyPZ7G",
        full_name="Paciente Teste",
        role="patient",
    )
    db_session.add_all([unit, user])
    await db_session.flush()

    patient = PatientProfile(
        user_id=user.id,
        health_unit_id=unit.id,
        date_of_birth=date(1990, 1, 1),
        neighborhood="Centro",
        city="Cidade",
        state="SP",
        sex="F",
        diagnosis_date=date(2024, 1, 1),
        classification="PB",
    )
    db_session.add(patient)
    await db_session.flush()
    return user, patient


async def _create_professional(db_session: AsyncSession, unit_id) -> HealthProfessional:
    user = User(
        email=f"prof-{uuid4()}@example.com",
        username=f"prof{uuid4().hex[:8]}",
        hashed_password="hash",
        full_name="Profissional",
        role="health_professional",
    )
    db_session.add(user)
    await db_session.flush()
    professional = HealthProfessional(user_id=user.id, health_unit_id=unit_id)
    db_session.add(professional)
    await db_session.flush()
    return professional


async def test_delete_account_blocks_active_treatment(create_tables, db_session: AsyncSession):
    user, patient = await _create_patient(db_session)
    professional = await _create_professional(db_session, patient.health_unit_id)
    treatment = Treatment(
        patient_id=patient.id,
        prescribed_by=professional.id,
        regimen=TreatmentRegimen.PB,
        start_date=date.today(),
        expected_end=date.today() + timedelta(days=180),
        status=TreatmentStatus.active,
    )
    db_session.add(treatment)
    await db_session.flush()

    use_case = DeleteAccountUseCase(db_session, storage=RecordingStorage())

    with pytest.raises(ConflictError, match="tratamento ativo"):
        await use_case.execute(user_id=user.id, token_jti="token-jti", ip_address="127.0.0.1")


async def test_delete_account_anonymizes_pii_deletes_media_and_audits(
    create_tables, db_session: AsyncSession
):
    user, patient = await _create_patient(db_session)
    original_password_hash = user.hashed_password
    area = BodyArea(code="hand_left", label="Mao esquerda", side="left", system_part="upper_limb")
    db_session.add(area)
    await db_session.flush()
    entry = BodyMapEntry(
        patient_id=patient.id,
        body_area_id=area.id,
        finding_type="lesion",
        intensity=2,
        image_url="https://storage.test/body-map/a.jpg",
        image_key="body-map/a.jpg",
    )
    db_session.add(entry)
    await db_session.flush()

    storage = RecordingStorage()
    use_case = DeleteAccountUseCase(db_session, storage=storage)

    await use_case.execute(user_id=user.id, token_jti="token-jti", ip_address="127.0.0.1")

    assert user.email.startswith("deleted:")
    assert user.full_name == "Usuario Removido"
    assert user.hashed_password != original_password_hash
    assert user.is_active is False
    assert user.deleted_at is not None
    assert patient.date_of_birth is None
    assert patient.neighborhood is None
    assert patient.city is None
    assert patient.state is None
    assert patient.sex is None
    assert patient.diagnosis_date is None
    assert patient.classification is None
    assert patient.deleted_at is not None
    assert entry.image_key is None
    assert entry.image_url is None
    assert "body-map/a.jpg" in storage.deleted_keys

    audit = (
        await db_session.execute(
            select(AuditLog).where(
                AuditLog.actor_user_id == user.id,
                AuditLog.action == "ACCOUNT_DELETION",
            )
        )
    ).scalar_one()
    assert audit.entity_type == "account"


async def test_delete_account_revokes_token_and_unlinks_anonymous_mapping(
    create_tables, db_session: AsyncSession
):
    user, _patient = await _create_patient(db_session)
    mapping = CommunityAnonymousMap(user_id=user.id)
    db_session.add(mapping)
    await db_session.flush()
    post = CommunityPost(
        author_anonymous_id=mapping.anonymous_id,
        title="Relato",
        content="Conteudo publico",
        category="experience",
    )
    db_session.add(post)
    await db_session.flush()

    token_iat = int((datetime.now(UTC) - timedelta(minutes=1)).timestamp())
    token_exp = int((datetime.now(UTC) + timedelta(minutes=30)).timestamp())

    await DeleteAccountUseCase(db_session, storage=RecordingStorage()).execute(
        user_id=user.id,
        token_jti="token-jti-to-revoke",
        token_exp=token_exp,
        ip_address="127.0.0.1",
    )

    assert await is_token_revoked(
        {
            "sub": str(user.id),
            "jti": "token-jti-to-revoke",
            "iat": token_iat,
            "exp": token_exp,
        }
    )
    assert mapping.user_id is None
    assert post.author_anonymous_id == mapping.anonymous_id
