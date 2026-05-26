from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.logging import get_logger
from pequi.models.dose_log import DoseLog

logger = get_logger(__name__)


class DoseRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, dose_log: DoseLog) -> DoseLog:
        self._session.add(dose_log)
        await self._session.flush()
        await self._session.refresh(dose_log)
        return dose_log

    async def exists_duplicate(
        self,
        treatment_id: UUID,
        drug_name: str,
        expected_at: datetime,
    ) -> bool:
        """Verifica duplicata por treatment_id, drug_name e expected_at."""
        stmt = select(DoseLog.id).where(
            DoseLog.treatment_id == treatment_id,
            DoseLog.drug_name == drug_name,
            DoseLog.expected_at == expected_at,
        )
        result = await self._session.execute(stmt)
        duplicate = result.scalar_one_or_none() is not None
        if duplicate:
            logger.warning(
                "duplicate_dose_attempt",
                treatment_id=str(treatment_id),
                drug_name=drug_name,
                expected_at=expected_at.isoformat(),
            )
        return duplicate

    async def list_by_treatment(self, treatment_id: UUID) -> list[DoseLog]:
        stmt = (
            select(DoseLog)
            .where(DoseLog.treatment_id == treatment_id)
            .order_by(DoseLog.expected_at)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count_missed_doses_in_week(self, patient_id: UUID) -> int:
        """Doses esperadas na última semana sem taken_at e não puladas."""
        from pequi.models.treatment import Treatment

        week_ago = datetime.now(UTC) - timedelta(days=7)
        now = datetime.now(UTC)
        stmt = (
            select(func.count())
            .select_from(DoseLog)
            .join(Treatment, DoseLog.treatment_id == Treatment.id)
            .where(
                Treatment.patient_id == patient_id,
                Treatment.deleted_at.is_(None),
                DoseLog.expected_at >= week_ago,
                DoseLog.expected_at <= now,
                DoseLog.taken_at.is_(None),
                DoseLog.skipped.is_(False),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one()
