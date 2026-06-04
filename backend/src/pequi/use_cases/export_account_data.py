from datetime import UTC, date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.exceptions import NotFoundError
from pequi.repositories.account_repo import AccountRepository
from pequi.repositories.audit_repo import AuditRepository


class ExportAccountDataUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = AccountRepository(session)
        self._audit_repo = AuditRepository(session)

    async def execute(self, user_id: UUID, *, ip_address: str | None = None) -> dict:
        user = await self._repo.get_active_user(user_id)
        if user is None:
            raise NotFoundError("User", str(user_id))
        patient = await self._repo.get_patient_by_user_id(user_id)
        if patient is None:
            raise NotFoundError("PatientProfile", str(user_id))

        mapping = await self._repo.get_anonymous_mapping(user_id)
        posts = await self._repo.list_community_posts(mapping.anonymous_id) if mapping else []
        comments = await self._repo.list_community_comments(mapping.anonymous_id) if mapping else []

        await self._audit_repo.log_action(
            actor_user_id=user_id,
            actor_role=user.role,
            entity_type="account",
            entity_id=str(user_id),
            action="ACCOUNT_EXPORT",
            ip_address=ip_address,
        )

        return {
            "profile": {
                "user": self._dump(
                    user,
                    include=[
                        "id",
                        "email",
                        "username",
                        "full_name",
                        "role",
                        "is_active",
                        "is_verified",
                        "created_at",
                        "updated_at",
                    ],
                ),
                "patient": self._dump(
                    patient,
                    include=[
                        "id",
                        "user_id",
                        "health_unit_id",
                        "date_of_birth",
                        "sex",
                        "neighborhood",
                        "city",
                        "state",
                        "disability_grade",
                        "diagnosis_date",
                        "classification",
                        "notifications_enabled",
                        "created_at",
                        "updated_at",
                    ],
                ),
            },
            "checkins": [
                self._dump(
                    row,
                    include=[
                        "id",
                        "patient_id",
                        "mood",
                        "symptom_intensity",
                        "general_notes",
                        "ai_feedback",
                        "ai_feedback_at",
                        "checked_in_at",
                        "created_at",
                    ],
                    extra={"symptom_ids": [str(symptom.id) for symptom in row.symptoms]},
                )
                for row in await self._repo.list_checkins(patient.id)
            ],
            "treatments": [
                self._dump(
                    row,
                    include=[
                        "id",
                        "patient_id",
                        "prescribed_by",
                        "regimen",
                        "start_date",
                        "expected_end",
                        "status",
                        "notes",
                        "created_at",
                        "updated_at",
                    ],
                )
                for row in await self._repo.list_treatments(patient.id)
            ],
            "dose_logs": [
                self._dump(
                    row,
                    include=[
                        "id",
                        "treatment_id",
                        "drug_name",
                        "expected_at",
                        "taken_at",
                        "skipped",
                        "skip_reason",
                        "supervised",
                        "registered_by",
                        "created_at",
                    ],
                )
                for row in await self._repo.list_dose_logs(patient.id)
            ],
            "adherence_snapshots": [
                self._dump(
                    row,
                    include=[
                        "id",
                        "patient_id",
                        "treatment_id",
                        "period_start",
                        "period_end",
                        "total_doses",
                        "taken_doses",
                        "adherence_pct",
                        "calculated_at",
                    ],
                )
                for row in await self._repo.list_adherence_snapshots(patient.id)
            ],
            "alerts": [
                self._dump(
                    row,
                    include=[
                        "id",
                        "patient_id",
                        "checkin_id",
                        "type",
                        "severity",
                        "resolved",
                        "resolved_at",
                        "resolved_by",
                        "notes",
                        "created_at",
                        "updated_at",
                    ],
                )
                for row in await self._repo.list_alerts(patient.id)
            ],
            "body_map_entries": [
                self._dump(
                    row,
                    include=[
                        "id",
                        "patient_id",
                        "body_area_id",
                        "finding_type",
                        "intensity",
                        "image_url",
                        "image_key",
                        "notes",
                        "recorded_at",
                        "created_at",
                        "deleted_at",
                    ],
                )
                for row in await self._repo.list_body_map_entries(patient.id)
            ],
            "body_area_history": [
                self._dump(
                    row,
                    include=[
                        "id",
                        "patient_id",
                        "checkin_id",
                        "body_area_id",
                        "finding_type",
                        "intensity",
                        "image_url",
                        "image_key",
                        "snapshot_at",
                    ],
                )
                for row in await self._repo.list_body_area_history(patient.id)
            ],
            "weekly_symptom_summaries": [
                self._dump(
                    row,
                    include=[
                        "id",
                        "patient_id",
                        "week_start",
                        "week_end",
                        "avg_intensity",
                        "dominant_mood",
                        "checkin_count",
                        "alert_count",
                        "calculated_at",
                    ],
                )
                for row in await self._repo.list_weekly_symptom_summaries(patient.id)
            ],
            "community_posts": [
                self._dump(
                    row,
                    include=[
                        "id",
                        "title",
                        "content",
                        "categories",
                        "is_pinned",
                        "is_moderated",
                        "like_count",
                        "comment_count",
                        "created_at",
                        "updated_at",
                        "deleted_at",
                    ],
                )
                for row in posts
            ],
            "community_comments": [
                self._dump(
                    row,
                    include=["id", "post_id", "content", "created_at", "updated_at", "deleted_at"],
                )
                for row in comments
            ],
            "consents": [
                self._dump(
                    row,
                    include=[
                        "id",
                        "user_id",
                        "term_version",
                        "accepted_at",
                        "ip_address",
                        "user_agent",
                    ],
                )
                for row in await self._repo.list_consents(user_id)
            ],
            "exported_at": datetime.now(UTC).isoformat(),
        }

    def _dump(self, obj, *, include: list[str], extra: dict | None = None) -> dict:
        data = {key: self._json_value(getattr(obj, key)) for key in include}
        if extra:
            data.update(extra)
        return data

    def _json_value(self, value):
        if isinstance(value, UUID):
            return str(value)
        if isinstance(value, datetime | date):
            return value.isoformat()
        if isinstance(value, Decimal):
            return str(value)
        if isinstance(value, Enum):
            return value.value
        return value
