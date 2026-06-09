from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from pequi.repositories.checkin_repo import CheckinRepository
from pequi.repositories.daily_medication_progress_repo import DailyMedicationProgressRepository
from pequi.repositories.health_appointment_repo import HealthAppointmentRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.checkin import CheckinResponse
from pequi.schemas.patient_journey import (
    JourneyEvent,
    JourneyMedicationSummary,
    JourneyMonth,
    JourneySummary,
    PatientJourneyResponse,
)


class GetPatientJourneyUseCase:
    def __init__(
        self,
        patient_repo: PatientRepository,
        treatment_repo: TreatmentRepository,
        appointment_repo: HealthAppointmentRepository,
        checkin_repo: CheckinRepository,
        daily_progress_repo: DailyMedicationProgressRepository,
    ) -> None:
        self._patient_repo = patient_repo
        self._treatment_repo = treatment_repo
        self._appointment_repo = appointment_repo
        self._checkin_repo = checkin_repo
        self._daily_progress_repo = daily_progress_repo

    async def execute(self, user_id: UUID) -> PatientJourneyResponse:
        patient = await self._patient_repo.get_or_create_by_user_id(user_id)
        treatment = await self._treatment_repo.get_active_by_patient_id(patient.id)
        appointments = await self._appointment_repo.list_by_patient_id(patient.id)
        checkins = await self._checkin_repo.list_history_by_patient_id(
            patient.id,
            limit=500,
            offset=0,
        )

        treatment_start = self._resolve_treatment_start(patient, treatment)
        classification = patient.classification
        total_months = self._resolve_total_months(classification)
        total_days = total_months * 30
        today = datetime.now(UTC).date()

        elapsed_days = 0
        remaining_days = total_days
        progress_percent = 0
        current_month = 1
        estimated_end_date = None
        treatment_status = None

        if treatment is not None:
            treatment_status = (
                treatment.status.value
                if hasattr(treatment.status, "value")
                else str(treatment.status)
            )

        if treatment_start and total_days > 0:
            elapsed_days = max(0, (today - treatment_start).days)
            remaining_days = max(0, total_days - elapsed_days)
            progress_percent = min(100, int((elapsed_days / total_days) * 100))
            current_month = min(total_months, max(1, (elapsed_days // 30) + 1))
            estimated_end_date = (
                treatment.expected_end
                if treatment and treatment.expected_end is not None
                else treatment_start + timedelta(days=total_days)
            )

        summary = JourneySummary(
            patient_id=patient.id,
            user_id=patient.user_id,
            display_name=self._resolve_display_name(patient),
            classification=classification,
            diagnosis_date=patient.diagnosis_date,
            treatment_start_date=treatment_start,
            estimated_end_date=estimated_end_date,
            treatment_status=treatment_status,
            treatment_duration_months=total_months,
            total_days=total_days,
            elapsed_days=elapsed_days,
            remaining_days=remaining_days,
            progress_percent=progress_percent,
            current_month=current_month,
        )

        if not treatment_start or total_months == 0:
            return PatientJourneyResponse(summary=summary, months=[])

        daily_progress_logs = await self._daily_progress_repo.list_by_patient_id(patient.id)

        months: list[JourneyMonth] = []
        for month_index in range(1, total_months + 1):
            month_start = treatment_start + timedelta(days=(month_index - 1) * 30)
            month_end = month_start + timedelta(days=29)

            month_appointments = [
                item
                for item in appointments
                if month_start <= item.appointment_date <= month_end
            ]

            month_checkins = [
                item
                for item in checkins
                if month_start <= item.checked_in_at.date() <= month_end
            ]

            month_progress_logs = [
                item
                for item in daily_progress_logs
                if month_start <= item.progress_date <= month_end
            ]

            if month_index < current_month:
                month_status = "completed"
            elif month_index == current_month:
                month_status = "current"
            else:
                month_status = "upcoming"

            medication_summary = self._build_medication_summary(month_progress_logs)

            events = self._build_month_events(
                month_index=month_index,
                treatment_start=treatment_start,
                month_end=month_end,
                month_appointments=month_appointments,
                month_checkins=month_checkins,
                medication_summary=medication_summary,
            )

            months.append(
                JourneyMonth(
                    month_index=month_index,
                    label=f"Mês {month_index}",
                    start_date=month_start,
                    end_date=month_end,
                    status=month_status,
                    medication_summary=medication_summary,
                    events=events,
                )
            )

        return PatientJourneyResponse(summary=summary, months=months)

    def _resolve_total_months(self, classification: str | None) -> int:
        if classification == "PB":
            return 6
        if classification == "MB":
            return 12
        return 0

    def _resolve_treatment_start(self, patient, treatment) -> date | None:
        if treatment is not None and treatment.start_date is not None:
            return treatment.start_date

        record = patient.treatment_record if isinstance(patient.treatment_record, dict) else {}
        start = record.get("treatment_start_date")
        if start:
            return date.fromisoformat(start)

        return None

    def _resolve_display_name(self, patient) -> str | None:
        personal = patient.personal_record if isinstance(patient.personal_record, dict) else {}
        return personal.get("social_name") or None

    def _build_medication_summary(self, month_progress_logs) -> JourneyMedicationSummary:
        total_days_in_month_window = 30
        completed_days = 0

        for progress in month_progress_logs:
            if progress.expected_count > 0 and progress.taken_count == progress.expected_count:
                completed_days += 1

        adherence_percent = int((completed_days / total_days_in_month_window) * 100)

        return JourneyMedicationSummary(
            doses_taken=completed_days,
            doses_expected=total_days_in_month_window,
            adherence_percent=adherence_percent,
        )

    def _build_month_events(
        self,
        month_index: int,
        treatment_start: date,
        month_end: date,
        month_appointments: list,
        month_checkins: list[CheckinResponse],
        medication_summary: JourneyMedicationSummary,
    ) -> list[JourneyEvent]:
        events: list[JourneyEvent] = []

        if month_index == 1:
            events.append(
                JourneyEvent(
                    id=f"treatment-start-{month_index}",
                    type="treatment-start",
                    date=treatment_start,
                    title="Início do tratamento",
                    description="Seu tratamento foi iniciado e sua jornada começou.",
                    status="positive",
                )
            )

        for appointment in month_appointments:
            title = "Consulta realizada" if appointment.performed else "Consulta agendada"
            description = f"{appointment.appointment_type} em {appointment.location}"

            if appointment.professional:
                description += f" com {appointment.professional}"

            events.append(
                JourneyEvent(
                    id=str(appointment.id),
                    type="appointment",
                    date=appointment.appointment_date,
                    title=title,
                    description=description,
                    status="neutral",
                    metadata={
                        "appointment_type": appointment.appointment_type,
                        "location": appointment.location,
                        "professional": appointment.professional,
                        "performed": appointment.performed,
                        "status": appointment.status,
                        "follow_up": appointment.follow_up,
                    },
                )
            )

        events.append(
            JourneyEvent(
                id=f"medication-summary-{month_index}",
                type="medication-summary",
                date=month_end,
                title=f"Resumo de medicação do mês {month_index}",
                description=(
                    f"Você completou {medication_summary.doses_taken} de 30 dias do mês "
                    f"tomando todas as medicações esperadas."
                ),
                status="positive" if medication_summary.adherence_percent >= 80 else "neutral",
                metadata={
                    "dosesTaken": medication_summary.doses_taken,
                    "dosesExpected": medication_summary.doses_expected,
                    "adherencePercent": medication_summary.adherence_percent,
                },
            )
        )

        trend = self._infer_checkin_trend(month_checkins)

        if trend == "improved":
            events.append(
                JourneyEvent(
                    id=f"clinical-improved-{month_index}",
                    type="clinical-update",
                    date=month_end,
                    title="Melhora percebida neste mês",
                    description="Os registros indicam melhora da intensidade dos sintomas neste período.",
                    status="positive",
                )
            )
            events.append(
                JourneyEvent(
                    id=f"support-message-{month_index}",
                    type="motivational-message",
                    date=month_end,
                    title="Continue seguindo seu tratamento",
                    description="Manter a regularidade ajuda a sustentar sua melhora.",
                    status="positive",
                )
            )

        elif trend == "worsened":
            events.append(
                JourneyEvent(
                    id=f"clinical-worsened-{month_index}",
                    type="clinical-update",
                    date=month_end,
                    title="Atenção aos sintomas",
                    description="Os registros indicam piora da intensidade dos sintomas neste período.",
                    status="attention",
                )
            )
            events.append(
                JourneyEvent(
                    id=f"alert-message-{month_index}",
                    type="motivational-message",
                    date=month_end,
                    title="Siga monitorando sua evolução",
                    description="Continue registrando seus sintomas e compartilhe essas informações na próxima consulta.",
                    status="attention",
                )
            )

        events.sort(
            key=lambda item: (
                item.date
                if isinstance(item.date, datetime)
                else datetime.combine(item.date, datetime.min.time())
            )
        )
        return events

    def _infer_checkin_trend(self, month_checkins: list[CheckinResponse]) -> str | None:
        if len(month_checkins) < 2:
            return None

        ordered = sorted(month_checkins, key=lambda item: item.checked_in_at)
        first = ordered[0].symptom_intensity
        last = ordered[-1].symptom_intensity

        if last <= first - 2:
            return "improved"
        if last >= first + 2:
            return "worsened"
        return None