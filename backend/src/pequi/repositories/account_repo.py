from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from pequi.models.alert import Alert
from pequi.models.body_map import BodyAreaHistory, BodyMapEntry
from pequi.models.checkin import Checkin
from pequi.models.community import CommunityAnonymousMap, CommunityComment, CommunityPost
from pequi.models.consent import Consent
from pequi.models.data_deletion import DataDeletionRequest, DataDeletionStatus
from pequi.models.dose_log import AdherenceSnapshot, DoseLog
from pequi.models.patient import PatientProfile
from pequi.models.treatment import Treatment, TreatmentStatus
from pequi.models.user import User
from pequi.models.weekly_summary import WeeklySymptomSummary


class AccountRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_active_user(self, user_id: UUID) -> User | None:
        stmt = select(User).where(User.id == user_id, User.deleted_at.is_(None))
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_patient_by_user_id(self, user_id: UUID) -> PatientProfile | None:
        stmt = select(PatientProfile).where(
            PatientProfile.user_id == user_id,
            PatientProfile.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def has_active_treatment(self, patient_id: UUID) -> bool:
        stmt = select(Treatment.id).where(
            Treatment.patient_id == patient_id,
            Treatment.status == TreatmentStatus.active,
            Treatment.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none() is not None

    async def create_deletion_request(self, user_id: UUID) -> DataDeletionRequest:
        request = DataDeletionRequest(
            user_id=user_id,
            status=DataDeletionStatus.processing,
        )
        self._session.add(request)
        await self._session.flush()
        return request

    async def complete_deletion_request(self, request: DataDeletionRequest) -> None:
        request.status = DataDeletionStatus.completed
        request.completed_at = datetime.now(UTC)
        await self._session.flush()

    async def fail_deletion_request(self, request: DataDeletionRequest, notes: str) -> None:
        request.status = DataDeletionStatus.failed
        request.completed_at = datetime.now(UTC)
        request.notes = notes[:1000]
        await self._session.flush()

    async def list_body_map_entries(self, patient_id: UUID) -> list[BodyMapEntry]:
        stmt = select(BodyMapEntry).where(BodyMapEntry.patient_id == patient_id)
        return list((await self._session.execute(stmt)).scalars().all())

    async def list_body_area_history(self, patient_id: UUID) -> list[BodyAreaHistory]:
        stmt = select(BodyAreaHistory).where(BodyAreaHistory.patient_id == patient_id)
        return list((await self._session.execute(stmt)).scalars().all())

    async def list_checkins(self, patient_id: UUID) -> list[Checkin]:
        stmt = (
            select(Checkin)
            .where(Checkin.patient_id == patient_id)
            .options(selectinload(Checkin.symptoms))
            .order_by(Checkin.checked_in_at.desc())
        )
        return list((await self._session.execute(stmt)).scalars().all())

    async def list_treatments(self, patient_id: UUID) -> list[Treatment]:
        stmt = select(Treatment).where(Treatment.patient_id == patient_id)
        return list((await self._session.execute(stmt)).scalars().all())

    async def list_dose_logs(self, patient_id: UUID) -> list[DoseLog]:
        stmt = (
            select(DoseLog)
            .join(Treatment, DoseLog.treatment_id == Treatment.id)
            .where(Treatment.patient_id == patient_id)
            .order_by(DoseLog.expected_at)
        )
        return list((await self._session.execute(stmt)).scalars().all())

    async def list_adherence_snapshots(self, patient_id: UUID) -> list[AdherenceSnapshot]:
        stmt = (
            select(AdherenceSnapshot)
            .where(AdherenceSnapshot.patient_id == patient_id)
            .order_by(AdherenceSnapshot.calculated_at.desc())
        )
        return list((await self._session.execute(stmt)).scalars().all())

    async def list_weekly_symptom_summaries(self, patient_id: UUID) -> list[WeeklySymptomSummary]:
        stmt = (
            select(WeeklySymptomSummary)
            .where(WeeklySymptomSummary.patient_id == patient_id)
            .order_by(WeeklySymptomSummary.week_start.desc())
        )
        return list((await self._session.execute(stmt)).scalars().all())

    async def list_alerts(self, patient_id: UUID) -> list[Alert]:
        stmt = select(Alert).where(Alert.patient_id == patient_id).order_by(Alert.created_at.desc())
        return list((await self._session.execute(stmt)).scalars().all())

    async def get_anonymous_mapping(self, user_id: UUID) -> CommunityAnonymousMap | None:
        stmt = select(CommunityAnonymousMap).where(CommunityAnonymousMap.user_id == user_id)
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def unlink_anonymous_mapping(self, user_id: UUID) -> None:
        mapping = await self.get_anonymous_mapping(user_id)
        if mapping is None:
            return
        mapping.user_id = None
        await self._session.flush()

    async def list_community_posts(self, anonymous_id: UUID) -> list[CommunityPost]:
        stmt = (
            select(CommunityPost)
            .where(CommunityPost.author_anonymous_id == anonymous_id)
            .order_by(CommunityPost.created_at.desc())
        )
        return list((await self._session.execute(stmt)).scalars().all())

    async def list_community_comments(self, anonymous_id: UUID) -> list[CommunityComment]:
        stmt = (
            select(CommunityComment)
            .where(CommunityComment.author_anonymous_id == anonymous_id)
            .order_by(CommunityComment.created_at.desc())
        )
        return list((await self._session.execute(stmt)).scalars().all())

    async def add_consent(
        self,
        *,
        user_id: UUID,
        term_version: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> Consent:
        consent = Consent(
            user_id=user_id,
            term_version=term_version,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self._session.add(consent)
        await self._session.flush()
        await self._session.refresh(consent)
        return consent

    async def list_consents(self, user_id: UUID) -> list[Consent]:
        stmt = (
            select(Consent).where(Consent.user_id == user_id).order_by(Consent.accepted_at.desc())
        )
        return list((await self._session.execute(stmt)).scalars().all())
