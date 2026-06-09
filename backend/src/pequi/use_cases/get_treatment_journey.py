from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_appointment_repo import HealthAppointmentRepository
from pequi.repositories.journey_event_repo import JourneyEventRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.journey import JourneyResponse
from pequi.services.journey_service import JourneyService


class GetTreatmentJourneyUseCase:
    """Monta a jornada clínica com doses, consultas e eventos persistidos."""

    def __init__(
        self,
        patient_repo: PatientRepository,
        treatment_repo: TreatmentRepository,
        dose_repo: DoseRepository,
        appointment_repo: HealthAppointmentRepository,
        journey_event_repo: JourneyEventRepository,
    ) -> None:
        self._patient_repo = patient_repo
        self._treatment_repo = treatment_repo
        self._dose_repo = dose_repo
        self._appointment_repo = appointment_repo
        self._journey_event_repo = journey_event_repo

    async def execute(self, user_id: UUID) -> JourneyResponse:
        patient = await self._patient_repo.get_by_user_id(user_id)
        if patient is None:
            raise NotFoundError("PatientProfile")

        treatment = await self._treatment_repo.get_active_by_patient_id(patient.id)
        if treatment is None:
            raise NotFoundError("Treatment")

        doses = await self._dose_repo.list_by_treatment(treatment.id)
        appointments = await self._appointment_repo.list_by_patient_id(patient.id)
        adherence = await self._treatment_repo.get_latest_adherence_snapshot(treatment.id)
        journey_events = await self._journey_event_repo.list_for_treatment(
            patient.id,
            treatment.id,
        )

        return JourneyService.build_journey(
            patient_id=patient.id,
            treatment=treatment,
            doses=doses,
            appointments=appointments,
            adherence_snapshot=adherence,
            patient=patient,
            journey_events=journey_events,
        )
