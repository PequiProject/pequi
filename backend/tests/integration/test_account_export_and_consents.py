from datetime import UTC, date, datetime
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.alert import Alert, AlertSeverity, AlertType
from pequi.models.audit_log import AuditLog
from pequi.models.checkin import Checkin, CheckinMood
from pequi.models.community import CommunityAnonymousMap, CommunityPost
from pequi.models.consent import Consent
from pequi.models.health_unit import HealthUnit
from pequi.models.patient import PatientProfile
from pequi.models.user import User
from pequi.schemas.account import ConsentCreate
from pequi.use_cases.export_account_data import ExportAccountDataUseCase
from pequi.use_cases.record_consent import ListConsentsUseCase, RecordConsentUseCase

pytestmark = pytest.mark.asyncio


async def _create_patient(db_session: AsyncSession) -> tuple[User, PatientProfile]:
    unit = HealthUnit(name="UBS", city="Cidade", state="SP", cnes=str(uuid4())[:12])
    user = User(
        email=f"{uuid4()}@example.com",
        username=f"patient{uuid4().hex[:8]}",
        hashed_password="hash",
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
    )
    db_session.add(patient)
    await db_session.flush()
    return user, patient


async def test_export_account_data_includes_profile_clinical_community_and_consents(
    create_tables, db_session: AsyncSession
):
    user, patient = await _create_patient(db_session)
    checkin = Checkin(
        patient_id=patient.id,
        mood=CheckinMood.ok,
        symptom_intensity=5,
        general_notes="Dor leve",
    )
    alert = Alert(
        patient_id=patient.id,
        checkin_id=None,
        type=AlertType.symptom_spike,
        severity=AlertSeverity.high,
    )
    mapping = CommunityAnonymousMap(user_id=user.id)
    consent = Consent(
        user_id=user.id,
        term_version="v1.2",
        ip_address="127.0.0.1",
        user_agent="pytest",
    )
    db_session.add_all([checkin, alert, mapping, consent])
    await db_session.flush()
    post = CommunityPost(
        author_anonymous_id=mapping.anonymous_id,
        title="Minha jornada",
        content="Conteudo publico",
        category="experience",
    )
    db_session.add(post)
    await db_session.flush()

    exported = await ExportAccountDataUseCase(db_session).execute(
        user.id,
        ip_address="127.0.0.1",
    )

    assert exported["profile"]["user"]["email"] == user.email
    assert exported["profile"]["patient"]["id"] == str(patient.id)
    assert exported["checkins"][0]["general_notes"] == "Dor leve"
    assert exported["alerts"][0]["type"] == "symptom_spike"
    assert exported["body_map_entries"] == []
    assert exported["adherence_snapshots"] == []
    assert exported["weekly_symptom_summaries"] == []
    assert exported["community_posts"][0]["title"] == "Minha jornada"
    assert "author_anonymous_id" not in exported["community_posts"][0]
    assert exported["consents"][0]["term_version"] == "v1.2"
    assert datetime.fromisoformat(exported["exported_at"]).tzinfo is not None

    audit = (
        await db_session.execute(
            select(AuditLog).where(
                AuditLog.actor_user_id == user.id,
                AuditLog.action == "ACCOUNT_EXPORT",
            )
        )
    ).scalar_one()
    assert audit.entity_type == "account"
    assert audit.ip_address == "127.0.0.1"


async def test_record_and_list_consents_capture_ip_and_user_agent(
    create_tables, db_session: AsyncSession
):
    user, _patient = await _create_patient(db_session)

    recorded = await RecordConsentUseCase(db_session).execute(
        user_id=user.id,
        data=ConsentCreate(term_version="v1.2", accepted=True),
        ip_address="203.0.113.10",
        user_agent="PequiApp/1.0",
    )
    listed = await ListConsentsUseCase(db_session).execute(user.id)

    assert recorded.term_version == "v1.2"
    assert str(recorded.ip_address) == "203.0.113.10"
    assert recorded.user_agent == "PequiApp/1.0"
    assert listed[0].accepted_at.replace(tzinfo=UTC).isoformat()
