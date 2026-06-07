from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.exceptions import ConflictError
from pequi.models.dose_log import AdherenceSnapshot
from pequi.models.symptom import Symptom
from pequi.models.treatment import Treatment, TreatmentStatus

_ACTIVE_TREATMENT_CONSTRAINT = "uq_treatments_one_active_per_patient"


class TreatmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, treatment: Treatment) -> Treatment:
        try:
            self._session.add(treatment)
            await self._session.flush()
            await self._session.refresh(treatment)
            return treatment
        except IntegrityError as exc:
            await self._session.rollback()
            if _constraint_violated(exc, _ACTIVE_TREATMENT_CONSTRAINT):
                raise ConflictError("Paciente já possui um tratamento ativo.") from exc
            raise

    async def get_by_id(self, treatment_id: UUID) -> Treatment | None:
        """Retorna tratamento ativo (não soft-deleted)."""
        stmt = select(Treatment).where(
            Treatment.id == treatment_id,
            Treatment.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active_by_patient_id(self, patient_id: UUID) -> Treatment | None:
        treatments = await self.list_by_patient_id(
            patient_id,
            status=TreatmentStatus.active,
        )
        if not treatments:
            return None
        return treatments[0]

    async def list_by_patient_id(
        self,
        patient_id: UUID,
        *,
        status: TreatmentStatus | None = None,
    ) -> list[Treatment]:
        stmt = (
            select(Treatment)
            .where(
                Treatment.patient_id == patient_id,
                Treatment.deleted_at.is_(None),
            )
            .order_by(desc(Treatment.created_at))
        )
        if status is not None:
            stmt = stmt.where(Treatment.status == status)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_latest_adherence_snapshot(self, treatment_id: UUID) -> AdherenceSnapshot | None:
        """Retorna o snapshot de adesão mais recente para o tratamento."""
        stmt = (
            select(AdherenceSnapshot)
            .where(AdherenceSnapshot.treatment_id == treatment_id)
            .order_by(desc(AdherenceSnapshot.calculated_at))
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


class SymptomRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_all(self) -> list[Symptom]:
        stmt = select(Symptom).order_by(Symptom.category, Symptom.name)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_ids(self, symptom_ids: list[UUID]) -> list[Symptom]:
        if not symptom_ids:
            return []
        stmt = select(Symptom).where(Symptom.id.in_(symptom_ids))
        result = await self._session.execute(stmt)
        return list(result.scalars().all())


def _constraint_violated(exc: IntegrityError, constraint_name: str) -> bool:
    orig = getattr(exc, "orig", None)
    if orig is None:
        return constraint_name in str(exc)
    diag = getattr(orig, "__cause__", None) or orig
    pg_constraint = getattr(diag, "constraint_name", None)
    if pg_constraint == constraint_name:
        return True
    return constraint_name in str(exc)
