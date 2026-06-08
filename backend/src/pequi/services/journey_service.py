"""Montagem da jornada de tratamento do paciente."""

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

if TYPE_CHECKING:
    from pequi.models.dose_log import AdherenceSnapshot, DoseLog
    from pequi.models.health_appointment import PatientHealthAppointment
    from pequi.models.journey_event import JourneyEvent
    from pequi.models.patient import PatientProfile
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
        patient: PatientProfile | None = None,
        journey_events: list[JourneyEvent] | None = None,
        today: date | None = None,
    ) -> JourneyResponse:
        today = today or datetime.now(UTC).date()
        regimen = (
            treatment.regimen.value
            if hasattr(treatment.regimen, "value")
            else str(treatment.regimen)
        )
        total_months = _REGIMEN_MONTHS.get(TreatmentRegimen(regimen), 6)
        current_month = cls.calculate_current_month(treatment.start_date, today, total_months)
        progress_pct = cls.calculate_progress_pct(
            treatment.start_date,
            treatment.expected_end,
            today,
        )
        months = cls.build_months(
            start_date=treatment.start_date,
            total_months=total_months,
            current_month=current_month,
            doses=doses,
            appointments=appointments,
            journey_events=journey_events or [],
        )
        summary = cls.build_summary(
            doses,
            appointments,
            adherence_snapshot,
            total_months=total_months,
            current_month=current_month,
            progress_pct=progress_pct,
        )
        status = (
            treatment.status.value if hasattr(treatment.status, "value") else str(treatment.status)
        )

        return JourneyResponse(
            patient={
                "id": patient_id,
                "classification": getattr(patient, "classification", None),
            },
            treatment={
                "id": treatment.id,
                "regimen": regimen,
                "start_date": treatment.start_date,
                "expected_end": treatment.expected_end,
                "status": status,
            },
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
    def calculate_progress_pct(start_date: date, expected_end: date, today: date) -> Decimal:
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
        current_month: int,
        doses: list[DoseLog],
        appointments: list[PatientHealthAppointment],
        journey_events: list[JourneyEvent],
    ) -> list[JourneyMonthResponse]:
        persisted_dose_ids = {
            event.source_id for event in journey_events if event.source_type == "dose_log"
        }
        months: list[JourneyMonthResponse] = []
        for month_index in range(1, total_months + 1):
            month_start = _add_months(start_date, month_index - 1)
            month_end = _add_months(start_date, month_index) - timedelta(days=1)
            month_doses = [
                dose
                for dose in doses
                if dose.id not in persisted_dose_ids
                and month_start <= dose.expected_at.date() <= month_end
            ]
            month_appointments = [
                item
                for item in appointments
                if item.performed and month_start <= item.appointment_date <= month_end
            ]
            persisted = [
                event
                for event in journey_events
                if month_start <= event.occurred_at.date() <= month_end
            ]
            events = cls._build_dose_events(month_doses)
            events.extend(cls._build_consultation_events(month_appointments))
            events.extend(cls._build_persisted_events(persisted))
            events.sort(key=_event_sort_key)
            months.append(
                JourneyMonthResponse(
                    month=month_index,
                    month_number=month_index,
                    is_current=month_index == current_month,
                    events=events,
                )
            )
        return list(reversed(months))

    @staticmethod
    def build_summary(
        doses: list[DoseLog],
        appointments: list[PatientHealthAppointment],
        adherence_snapshot: AdherenceSnapshot | None,
        *,
        total_months: int,
        current_month: int,
        progress_pct: Decimal,
    ) -> JourneySummaryBlock:
        completed = sum(1 for dose in doses if dose.taken_at is not None and not dose.skipped)
        pending = sum(1 for dose in doses if dose.taken_at is None and not dose.skipped)
        skipped = sum(1 for dose in doses if dose.skipped)
        adherence_pct = (
            Decimal(str(adherence_snapshot.adherence_pct))
            if adherence_snapshot is not None
            else None
        )
        return JourneySummaryBlock(
            completed_doses=completed,
            pending_doses=pending,
            skipped_doses=skipped,
            adherence_pct=adherence_pct,
            total_months=total_months,
            current_month=current_month,
            progress_pct=progress_pct,
            total_consultations=sum(1 for item in appointments if item.performed),
            total_doses_registered=len(doses),
        )

    @staticmethod
    def _build_dose_events(doses: list[DoseLog]) -> list[JourneyEventResponse]:
        events: list[JourneyEventResponse] = []
        for dose in doses:
            occurred_at = dose.taken_at or dose.expected_at
            display_type = "dose_skipped" if dose.skipped else "dose_taken"
            events.append(
                JourneyEventResponse(
                    type=display_type,
                    event_type="dose_registered",
                    date=occurred_at,
                    occurred_at=occurred_at,
                    title="Dose pulada" if dose.skipped else "Dose tomada",
                    description=f"{dose.drug_name} registrada na jornada.",
                    metadata={"drug_name": dose.drug_name, "skipped": dose.skipped},
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
                    event_type="consultation",
                    date=appointment.appointment_date,
                    occurred_at=appointment.appointment_date,
                    title="Consulta registrada",
                    description=description,
                )
            )
        return events

    @staticmethod
    def _build_persisted_events(events: list[JourneyEvent]) -> list[JourneyEventResponse]:
        return [
            JourneyEventResponse(
                type=event.event_metadata.get("display_type", event.event_type),
                event_type=event.event_type,
                date=event.occurred_at,
                occurred_at=event.occurred_at,
                title=event.title,
                description=event.description,
                metadata=event.event_metadata,
            )
            for event in events
        ]


def _event_sort_key(event: JourneyEventResponse) -> datetime:
    value = event.occurred_at
    if isinstance(value, datetime):
        return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
    return datetime.combine(value, datetime.min.time(), tzinfo=UTC)


def _add_months(start_date: date, months: int) -> date:
    total_months = start_date.month - 1 + months
    year = start_date.year + total_months // 12
    month = total_months % 12 + 1
    day = min(start_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)
