"""Testes unitários para JourneyService — sem banco, sem HTTP."""

from datetime import UTC, date, datetime
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from pequi.models.treatment import TreatmentRegimen, TreatmentStatus
from pequi.services.journey_service import JourneyService


def _treatment(*, regimen=TreatmentRegimen.PB, start=date(2025, 1, 10), end=date(2025, 7, 10)):
    return SimpleNamespace(
        id=uuid4(),
        regimen=regimen,
        start_date=start,
        expected_end=end,
        status=TreatmentStatus.active,
    )


def _dose(*, drug="Dapsona", expected=None, taken=None, skipped=False):
    return SimpleNamespace(
        id=uuid4(),
        drug_name=drug,
        expected_at=expected or datetime(2025, 2, 1, 8, 0, tzinfo=UTC),
        taken_at=taken,
        skipped=skipped,
        skip_reason=None,
    )


class TestJourneyServiceProgress:
    def test_current_month_on_start_date(self) -> None:
        result = JourneyService.calculate_current_month(
            date(2025, 1, 10),
            date(2025, 1, 10),
            6,
        )
        assert result == 1

    def test_current_month_third_month(self) -> None:
        result = JourneyService.calculate_current_month(
            date(2025, 1, 10),
            date(2025, 3, 15),
            6,
        )
        assert result == 3

    def test_current_month_capped_at_total(self) -> None:
        result = JourneyService.calculate_current_month(
            date(2025, 1, 10),
            date(2026, 1, 1),
            6,
        )
        assert result == 6

    def test_progress_pct_mid_treatment(self) -> None:
        result = JourneyService.calculate_progress_pct(
            date(2025, 1, 10),
            date(2025, 7, 10),
            date(2025, 3, 15),
        )
        # 64 dias decorridos de 181 totais (10/jan a 10/jul)
        assert result == Decimal("35.4")

    def test_progress_pct_at_start(self) -> None:
        result = JourneyService.calculate_progress_pct(
            date(2025, 1, 10),
            date(2025, 7, 10),
            date(2025, 1, 10),
        )
        assert result == Decimal("0.0")

    def test_progress_pct_at_end(self) -> None:
        result = JourneyService.calculate_progress_pct(
            date(2025, 1, 10),
            date(2025, 7, 10),
            date(2025, 7, 10),
        )
        assert result == Decimal("100.0")


class TestJourneyServiceTimeline:
    def test_dose_taken_appears_as_event(self) -> None:
        treatment = _treatment()
        taken_at = datetime(2025, 2, 5, 9, 0, tzinfo=UTC)
        doses = [_dose(expected=taken_at, taken=taken_at)]

        journey = JourneyService.build_journey(
            patient_id=uuid4(),
            treatment=treatment,
            doses=doses,
            appointments=[],
            adherence_snapshot=None,
            today=date(2025, 3, 1),
        )

        dose_events = [
            event
            for month in journey.months
            for event in month.events
            if event.type == "dose_taken"
        ]
        assert len(dose_events) == 1
        assert dose_events[0].title == "Dose tomada"

    def test_dose_skipped_appears_as_event(self) -> None:
        treatment = _treatment()
        expected = datetime(2025, 2, 5, 9, 0, tzinfo=UTC)
        doses = [_dose(expected=expected, skipped=True)]

        journey = JourneyService.build_journey(
            patient_id=uuid4(),
            treatment=treatment,
            doses=doses,
            appointments=[],
            adherence_snapshot=None,
            today=date(2025, 3, 1),
        )

        skipped_events = [
            event
            for month in journey.months
            for event in month.events
            if event.type == "dose_skipped"
        ]
        assert len(skipped_events) == 1

    def test_consultation_appears_as_event(self) -> None:
        treatment = _treatment()
        appointment = SimpleNamespace(
            appointment_date=date(2025, 2, 20),
            appointment_type="consulta",
            location="UBS Central",
            professional="Dr. Silva",
            performed=True,
        )

        journey = JourneyService.build_journey(
            patient_id=uuid4(),
            treatment=treatment,
            doses=[],
            appointments=[appointment],
            adherence_snapshot=None,
            today=date(2025, 3, 1),
        )

        consultation_events = [
            event
            for month in journey.months
            for event in month.events
            if event.type == "consultation_registered"
        ]
        assert len(consultation_events) == 1
        assert consultation_events[0].title == "Consulta registrada"

    def test_summary_counts_doses(self) -> None:
        treatment = _treatment()
        taken_at = datetime(2025, 2, 1, 8, 0, tzinfo=UTC)
        doses = [
            _dose(expected=taken_at, taken=taken_at),
            _dose(
                expected=datetime(2025, 2, 2, 8, 0, tzinfo=UTC),
                taken=None,
            ),
        ]

        journey = JourneyService.build_journey(
            patient_id=uuid4(),
            treatment=treatment,
            doses=doses,
            appointments=[],
            adherence_snapshot=None,
            today=date(2025, 3, 1),
        )

        assert journey.summary.completed_doses == 1
        assert journey.summary.pending_doses == 1
        assert journey.summary.adherence_pct is None

    def test_summary_without_snapshot_does_not_calculate_adherence(self) -> None:
        treatment = _treatment()
        doses = [
            _dose(
                expected=datetime(2025, 2, 1, 8, 0, tzinfo=UTC),
                taken=datetime(2025, 2, 1, 8, 0, tzinfo=UTC),
            ),
            _dose(
                expected=datetime(2025, 2, 2, 8, 0, tzinfo=UTC),
                skipped=True,
            ),
        ]

        journey = JourneyService.build_journey(
            patient_id=uuid4(),
            treatment=treatment,
            doses=doses,
            appointments=[],
            adherence_snapshot=None,
            today=date(2025, 3, 1),
        )

        assert journey.summary.completed_doses == 1
        assert journey.summary.skipped_doses == 1
        assert journey.summary.adherence_pct is None

    def test_dose_and_consultation_same_month_sort_without_error(self) -> None:
        treatment = _treatment()
        taken_at = datetime(2025, 2, 15, 9, 0, tzinfo=UTC)
        doses = [_dose(expected=taken_at, taken=taken_at)]
        appointment = SimpleNamespace(
            appointment_date=date(2025, 2, 20),
            appointment_type="consulta",
            location="UBS Central",
            professional=None,
            performed=True,
        )

        journey = JourneyService.build_journey(
            patient_id=uuid4(),
            treatment=treatment,
            doses=doses,
            appointments=[appointment],
            adherence_snapshot=None,
            today=date(2025, 3, 1),
        )

        month_two = next(month for month in journey.months if month.month_number == 2)
        types = {event.type for event in month_two.events}
        assert "dose_taken" in types
        assert "consultation_registered" in types

    def test_months_grouped_by_calendar_month(self) -> None:
        treatment = _treatment(regimen=TreatmentRegimen.PB)
        journey = JourneyService.build_journey(
            patient_id=uuid4(),
            treatment=treatment,
            doses=[],
            appointments=[],
            adherence_snapshot=None,
            today=date(2025, 3, 1),
        )

        assert len(journey.months) == 6
        assert journey.months[0].month_number == 6
        assert journey.months[-1].month_number == 1
        assert next(month for month in journey.months if month.is_current).month_number == 2

    def test_summary_exposes_frontend_aggregates(self) -> None:
        treatment = _treatment()
        journey = JourneyService.build_journey(
            patient_id=uuid4(),
            treatment=treatment,
            doses=[_dose(taken=datetime(2025, 2, 1, 8, 0, tzinfo=UTC))],
            appointments=[
                SimpleNamespace(
                    appointment_date=date(2025, 2, 20),
                    appointment_type="consulta",
                    location="UBS Central",
                    professional=None,
                    performed=True,
                )
            ],
            adherence_snapshot=None,
            today=date(2025, 3, 1),
        )

        assert journey.summary.total_months == 6
        assert journey.summary.current_month == 2
        assert journey.summary.total_consultations == 1
        assert journey.summary.total_doses_registered == 1

    @pytest.mark.parametrize(
        ("regimen", "expected_months"),
        [
            (TreatmentRegimen.PB, 6),
            (TreatmentRegimen.MB, 12),
        ],
    )
    def test_total_months_by_regimen(self, regimen, expected_months) -> None:
        start = date(2025, 1, 1)
        end = date(2025, 7, 1) if regimen == TreatmentRegimen.PB else date(2026, 1, 1)
        treatment = _treatment(regimen=regimen, start=start, end=end)

        journey = JourneyService.build_journey(
            patient_id=uuid4(),
            treatment=treatment,
            doses=[],
            appointments=[],
            adherence_snapshot=None,
            today=start,
        )

        assert len(journey.months) == expected_months
