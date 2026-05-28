from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.dose_log import AdherenceSnapshot, DoseLog
from pequi.models.treatment import Treatment, TreatmentStatus


class AdherenceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def upsert_snapshot(
        self,
        patient_id: UUID,
        treatment_id: UUID,
        period_start: date,
        period_end: date,
        total_doses: int,
        taken_doses: int,
        adherence_pct: Decimal,
    ) -> AdherenceSnapshot:
        """Upsert adherence snapshot (idempotent)."""
        stmt = (
            insert(AdherenceSnapshot)
            .values(
                patient_id=patient_id,
                treatment_id=treatment_id,
                period_start=period_start,
                period_end=period_end,
                total_doses=total_doses,
                taken_doses=taken_doses,
                adherence_pct=adherence_pct,
                calculated_at=datetime.now(UTC),
            )
            .on_conflict_do_update(
                constraint="uq_adherence_snapshots_period",
                set_={
                    "total_doses": insert(AdherenceSnapshot).excluded.total_doses,
                    "taken_doses": insert(AdherenceSnapshot).excluded.taken_doses,
                    "adherence_pct": insert(AdherenceSnapshot).excluded.adherence_pct,
                    "calculated_at": insert(AdherenceSnapshot).excluded.calculated_at,
                },
            )
            .returning(AdherenceSnapshot)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.scalar_one()

    async def get_dose_counts_in_period(
        self,
        treatment_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> tuple[int, int]:
        """Returns (total_doses, taken_doses) for a treatment in a period."""
        stmt = select(
            func.count(DoseLog.id).label("total"),
            func.count(DoseLog.taken_at).label("taken"),
        ).where(
            and_(
                DoseLog.treatment_id == treatment_id,
                DoseLog.expected_at >= period_start,
                DoseLog.expected_at <= period_end,
            )
        )
        result = await self._session.execute(stmt)
        row = result.one()
        return (int(row.total), int(row.taken))

    async def list_active_treatments(self) -> list[Treatment]:
        """Returns all active treatments."""
        stmt = select(Treatment).where(Treatment.status == TreatmentStatus.active)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
