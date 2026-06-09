from datetime import UTC, datetime
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.auth import create_access_token
from pequi.models.body_map import BodyArea, BodySide, BodySystemPart, BodyView
from pequi.models.symptom import Symptom, SymptomCategory
from tests.integration.test_dose_flow import (
    _create_health_unit,
    _create_patient,
    _create_professional,
    _create_user,
)

pytestmark = pytest.mark.asyncio


def _auth_headers(user_id, role: str) -> dict[str, str]:
    token = create_access_token(subject=user_id, role=role)
    return {"Authorization": f"Bearer {token}"}


async def _create_body_area(
    session: AsyncSession,
    *,
    code: str,
    label: str,
    side: BodySide,
    system_part: BodySystemPart,
    x: int = 50,
    y: int = 50,
    view: BodyView = BodyView.front,
) -> BodyArea:
    area = BodyArea(
        id=uuid4(),
        code=code,
        label=label,
        side=side,
        system_part=system_part,
        x=x,
        y=y,
        view=view,
    )
    session.add(area)
    await session.flush()
    return area


async def _create_symptom(session: AsyncSession, *, name: str = "Dormência") -> Symptom:
    symptom = Symptom(
        id=uuid4(),
        name=name,
        category=SymptomCategory.neurological,
        description="Test symptom",
    )
    session.add(symptom)
    await session.flush()
    return symptom


@pytest.mark.usefixtures("create_tables")
async def test_body_areas_and_body_map_flow(async_client: AsyncClient, db_session: AsyncSession):
    unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="bm-patient@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=unit)

    area_1 = await _create_body_area(
        db_session,
        code="left_forearm",
        label="Antebraço esquerdo",
        side=BodySide.left,
        system_part=BodySystemPart.upper_limb,
    )
    area_2 = await _create_body_area(
        db_session,
        code="right_cheek",
        label="Bochecha direita",
        side=BodySide.right,
        system_part=BodySystemPart.head,
    )
    headers = _auth_headers(patient_user.id, "patient")

    list_areas = await async_client.get("/v1/body-areas", headers=headers)
    assert list_areas.status_code == 200
    assert len(list_areas.json()) >= 2
    assert list_areas.json()[0]["view"] in {"front", "back"}
    assert 0 <= list_areas.json()[0]["x"] <= 100
    assert 0 <= list_areas.json()[0]["y"] <= 100

    update = await async_client.put(
        "/v1/body-map",
        headers=headers,
        json={
            "entries": [
                {
                    "body_area_id": str(area_1.id),
                    "finding_type": "lesion",
                    "intensity": 2,
                    "notes": "placa hipocrômica",
                },
                {
                    "body_area_id": str(area_2.id),
                    "finding_type": "hypoesthesia",
                    "intensity": 1,
                },
            ]
        },
    )
    assert update.status_code == 200
    assert len(update.json()) == 2

    current = await async_client.get("/v1/body-map", headers=headers)
    assert current.status_code == 200
    payload = current.json()
    assert len(payload) == 2
    assert payload[0]["body_area"]["id"] in {str(area_1.id), str(area_2.id)}

    soft_delete = await async_client.put(
        "/v1/body-map",
        headers=headers,
        json={
            "entries": [
                {
                    "body_area_id": str(area_2.id),
                    "finding_type": "hypoesthesia",
                    "remove": True,
                }
            ]
        },
    )
    assert soft_delete.status_code == 200
    assert len(soft_delete.json()) == 1
    assert soft_delete.json()[0]["body_area_id"] == str(area_1.id)

    invalid = await async_client.put(
        "/v1/body-map",
        headers=headers,
        json={
            "entries": [
                {
                    "body_area_id": str(uuid4()),
                    "finding_type": "lesion",
                }
            ]
        },
    )
    assert invalid.status_code == 404


@pytest.mark.usefixtures("create_tables")
async def test_body_map_history_snapshot_and_upload(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    unit = await _create_health_unit(db_session, name="UBS Centro")
    patient_user = await _create_user(db_session, email="bm-hist@test.com", role="patient")
    patient = await _create_patient(db_session, user=patient_user, health_unit=unit)
    area = await _create_body_area(
        db_session,
        code="left_hand",
        label="Mão esquerda",
        side=BodySide.left,
        system_part=BodySystemPart.upper_limb,
    )
    symptom = await _create_symptom(db_session)
    headers = _auth_headers(patient_user.id, "patient")

    await async_client.put(
        "/v1/body-map",
        headers=headers,
        json={
            "entries": [
                {
                    "body_area_id": str(area.id),
                    "finding_type": "anesthesia",
                    "intensity": 3,
                    "image_key": "body-map/x/key.png",
                    "image_url": "https://cdn.example/body-map/x/key.png",
                }
            ]
        },
    )

    checkin_1 = await async_client.post(
        "/v1/checkins",
        headers=headers,
        json={
            "mood": "ok",
            "symptom_intensity": 3,
            "symptom_ids": [str(symptom.id)],
            "general_notes": "primeiro check-in",
        },
    )
    assert checkin_1.status_code == 201

    await async_client.put(
        "/v1/body-map",
        headers=headers,
        json={
            "entries": [
                {
                    "body_area_id": str(area.id),
                    "finding_type": "lesion",
                    "intensity": 1,
                }
            ]
        },
    )

    checkin_2 = await async_client.post(
        "/v1/checkins",
        headers=headers,
        json={
            "mood": "good",
            "symptom_intensity": 4,
            "symptom_ids": [str(symptom.id)],
            "general_notes": "segundo check-in",
        },
    )
    assert checkin_2.status_code == 409  # regra de um check-in por dia

    history = await async_client.get("/v1/body-map/history", headers=headers)
    assert history.status_code == 200
    data = history.json()
    assert len(data) == 1
    assert data[0]["finding_type"] == "anesthesia"
    assert data[0]["image_key"] == "body-map/x/key.png"

    history_filter = await async_client.get(
        f"/v1/body-map/history?body_area_id={area.id}&finding_type=anesthesia",
        headers=headers,
    )
    assert history_filter.status_code == 200
    assert len(history_filter.json()) == 1

    upload = await async_client.post(
        "/v1/body-map/upload",
        headers=headers,
        json={"filename": "lesao.png", "content_type": "image/png"},
    )
    assert upload.status_code == 200
    upload_data = upload.json()
    assert "upload_url" in upload_data
    assert upload_data["file_key"].startswith(f"body-map/{patient.id}/")
    assert "signature=fake-signature" in upload_data["upload_url"]

    bad_upload = await async_client.post(
        "/v1/body-map/upload",
        headers=headers,
        json={"filename": "lesao.txt", "content_type": "text/plain"},
    )
    assert bad_upload.status_code == 422

    bad_extension = await async_client.post(
        "/v1/body-map/upload",
        headers=headers,
        json={"filename": "malicious.exe", "content_type": "image/png"},
    )
    assert bad_extension.status_code == 422


@pytest.mark.usefixtures("create_tables")
async def test_professional_history_access_is_tenant_scoped(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    unit_a = await _create_health_unit(db_session, name="UBS A")
    unit_b = await _create_health_unit(db_session, name="UBS B")

    patient_user = await _create_user(db_session, email="tenant-patient@test.com", role="patient")
    patient = await _create_patient(db_session, user=patient_user, health_unit=unit_a)
    prof_a_user = await _create_user(
        db_session,
        email="prof-a@test.com",
        role="health_professional",
    )
    prof_b_user = await _create_user(
        db_session,
        email="prof-b@test.com",
        role="health_professional",
    )
    await _create_professional(db_session, user=prof_a_user, health_unit=unit_a)
    await _create_professional(db_session, user=prof_b_user, health_unit=unit_b)

    area = await _create_body_area(
        db_session,
        code="right_knee",
        label="Joelho direito",
        side=BodySide.right,
        system_part=BodySystemPart.lower_limb,
    )
    symptom = await _create_symptom(db_session, name="Dor neural")

    patient_headers = _auth_headers(patient_user.id, "patient")
    await async_client.put(
        "/v1/body-map",
        headers=patient_headers,
        json={
            "entries": [
                {
                    "body_area_id": str(area.id),
                    "finding_type": "nodule",
                    "intensity": 2,
                }
            ]
        },
    )
    await async_client.post(
        "/v1/checkins",
        headers=patient_headers,
        json={
            "mood": "ok",
            "symptom_intensity": 2,
            "symptom_ids": [str(symptom.id)],
            "general_notes": "check-in com nódulo",
        },
    )

    same_tenant = await async_client.get(
        f"/v1/body-map/history?patient_id={patient.id}",
        headers=_auth_headers(prof_a_user.id, "health_professional"),
    )
    assert same_tenant.status_code == 200
    assert len(same_tenant.json()) == 1

    other_tenant = await async_client.get(
        f"/v1/body-map/history?patient_id={patient.id}",
        headers=_auth_headers(prof_b_user.id, "health_professional"),
    )
    assert other_tenant.status_code == 403

    missing_patient_id = await async_client.get(
        "/v1/body-map/history",
        headers=_auth_headers(prof_a_user.id, "health_professional"),
    )
    assert missing_patient_id.status_code == 422


@pytest.mark.usefixtures("create_tables")
async def test_history_date_range_filter(async_client: AsyncClient, db_session: AsyncSession):
    unit = await _create_health_unit(db_session, name="UBS Date")
    patient_user = await _create_user(db_session, email="date-patient@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=unit)
    area = await _create_body_area(
        db_session,
        code="abdomen",
        label="Abdômen",
        side=BodySide.center,
        system_part=BodySystemPart.trunk,
    )
    symptom = await _create_symptom(db_session, name="Fadiga")
    headers = _auth_headers(patient_user.id, "patient")

    await async_client.put(
        "/v1/body-map",
        headers=headers,
        json={"entries": [{"body_area_id": str(area.id), "finding_type": "other", "intensity": 1}]},
    )
    await async_client.post(
        "/v1/checkins",
        headers=headers,
        json={
            "mood": "good",
            "symptom_intensity": 1,
            "symptom_ids": [str(symptom.id)],
            "general_notes": "snapshot",
        },
    )

    today = datetime.now(UTC).date()
    filtered = await async_client.get(
        "/v1/body-map/history",
        headers=headers,
        params={"from_date": today.isoformat(), "to_date": today.isoformat()},
    )
    assert filtered.status_code == 200
    assert len(filtered.json()) == 1
