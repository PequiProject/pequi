"""Montagem da jornada de tratamento do paciente — progresso, timeline e resumo."""

from __future__ import annotations

import calendar
from datetime import UTC, date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import TYPE_CHECKING

from pequi.models.treatment import TreatmentRegimen
from pequi.schemas.journey import (
    JourneyEventResponse,
    JourneyMonthResponse,
    JourneyResponse,
    JourneySummaryBlock,
)
from pequi.services.adherence_service import AdherenceService

if TYPE_CHECKING:
    from pequi.models.dose_log import AdherenceSnapshot, DoseLog
    from pequi.models.health_appointment import PatientHealthAppointment
    from pequi.models.treatment import Treatment

_REGIMEN_MONTHS = {
    TreatmentRegimen.PB: 6,
    TreatmentRegimen.MB: 12,
}


class JourneyService:
    """Cálculo stateless de progresso, agrupamento mensal e timeline."""

    @classmethod
    def build_journey(
        cls,
        *,
        patient_id,
        treatment: Treatment,
        doses: list[DoseLog],
        appointments: list[PatientHealthAppointment],
        adherence_snapshot: AdherenceSnapshot | None,
        today: date | None = None,
    ) -> JourneyResponse:
        today = today or datetime.now(UTC).date()
        regimen = (
            treatment.regimen.value
            if hasattr(treatment.regimen, "value")
            else str(treatment.regimen)
        )
        total_months = _REGIMEN_MONTHS.get(TreatmentRegimen(regimen), 6)

        current_month = cls.calculate_current_month(
            treatment.start_date,
            today,
            total_months,
        )
        progress_pct = cls.calculate_progress_pct(
            treatment.start_date,
            treatment.expected_end,
            today,
        )
        months = cls.build_months(
            start_date=treatment.start_date,
            total_months=total_months,
            doses=doses,
            appointments=appointments,
        )
        summary = cls.build_summary(doses, adherence_snapshot)

        return JourneyResponse(
            patient_id=patient_id,
            regimen=regimen,
            start_date=treatment.start_date,
            expected_end=treatment.expected_end,
            current_month=current_month,
            progress_pct=progress_pct,
            months=months,
            summary=summary,
        )

    @staticmethod
    def calculate_current_month(start_date: date, today: date, total_months: int) -> int:
        if today < start_date:
            return 1

        months_elapsed = (today.year - start_date.year) * 12 + (today.month - start_date.month)
        if today.day < start_date.day:
            months_elapsed -= 1

        return min(total_months, max(1, months_elapsed + 1))

    @staticmethod
    def calculate_progress_pct(
        start_date: date,
        expected_end: date,
        today: date,
    ) -> Decimal:
        total_days = (expected_end - start_date).days
        if total_days <= 0:
            return Decimal("0.0")

        elapsed = max(0, min((today - start_date).days, total_days))
        pct = Decimal(elapsed) / Decimal(total_days) * Decimal("100")
        return pct.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)

    @classmethod
    def build_months(
        cls,
        *,
        start_date: date,
        total_months: int,
        doses: list[DoseLog],
        appointments: list[PatientHealthAppointment],
    ) -> list[JourneyMonthResponse]:
        months: list[JourneyMonthResponse] = []

        for month_index in range(1, total_months + 1):
            month_start = _add_months(start_date, month_index - 1)
            month_end = _add_months(start_date, month_index) - timedelta(days=1)

            month_doses = [
                dose for dose in doses if month_start <= dose.expected_at.date() <= month_end
            ]
            month_appointments = [
                item
                for item in appointments
                if item.performed and month_start <= item.appointment_date <= month_end
            ]

            events = cls._build_dose_events(month_doses)
            events.extend(cls._build_consultation_events(month_appointments))
            events.sort(
                key=lambda event: (
                    event.date
                    if isinstance(event.date, datetime)
                    else datetime.combine(event.date, datetime.min.time())
                )
            )

            months.append(JourneyMonthResponse(month=month_index, events=events))

        return months

    @staticmethod
    def build_summary(
        doses: list[DoseLog],
        adherence_snapshot: AdherenceSnapshot | None,
    ) -> JourneySummaryBlock:
        completed = sum(1 for dose in doses if dose.taken_at is not None and not dose.skipped)
        pending = sum(1 for dose in doses if dose.taken_at is None and not dose.skipped)

        if adherence_snapshot is not None:
            adherence_pct = Decimal(str(adherence_snapshot.adherence_pct))
        else:
            total = completed + pending
            adherence_pct = AdherenceService.calculate_pct(total, completed)

        return JourneySummaryBlock(
            completed_doses=completed,
            pending_doses=pending,
            adherence_pct=adherence_pct,
        )

    @staticmethod
    def _build_dose_events(doses: list[DoseLog]) -> list[JourneyEventResponse]:
        events: list[JourneyEventResponse] = []

        for dose in doses:
            event_date = dose.taken_at or dose.expected_at
            if dose.skipped:
                events.append(
                    JourneyEventResponse(
                        type="dose_skipped",
                        date=event_date,
                        title="Dose pulada",
                        description=(
                            f"{dose.drug_name} não foi tomada"
                            + (f": {dose.skip_reason}" if dose.skip_reason else ".")
                        ),
                    )
                )
            elif dose.taken_at is not None:
                events.append(
                    JourneyEventResponse(
                        type="dose_taken",
                        date=dose.taken_at,
                        title="Dose tomada",
                        description=f"{dose.drug_name} registrada com sucesso.",
                    )
                )

        return events

    @staticmethod
    def _build_consultation_events(
        appointments: list[PatientHealthAppointment],
    ) -> list[JourneyEventResponse]:
        events: list[JourneyEventResponse] = []

        for appointment in appointments:
            description = f"{appointment.appointment_type} em {appointment.location}"
            if appointment.professional:
                description += f" com {appointment.professional}"

            events.append(
                JourneyEventResponse(
                    type="consultation_registered",
                    date=appointment.appointment_date,
                    title="Consulta registrada",
                    description=description,
                )
            )

        return events


def _add_months(start_date: date, months: int) -> date:
    total_months = start_date.month - 1 + months
    year = start_date.year + total_months // 12
    month = total_months % 12 + 1
    day = min(start_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)
