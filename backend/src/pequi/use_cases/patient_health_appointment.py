import uuid
from uuid import UUID

from pequi.core.exceptions import NotFoundError
from pequi.models.health_appointment import PatientHealthAppointment
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_appointment_repo import HealthAppointmentRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.health_appointment import (
    HealthAppointmentCreate,
    HealthAppointmentResponse,
    HealthAppointmentUpdate,
)
from pequi.services.appointment_consultation_effects import AppointmentConsultationEffects
from pequi.services.appointment_follow_up import build_follow_up_payload


class ListPatientHealthAppointmentsUseCase:
    def __init__(
        self,
        patient_repo: PatientRepository,
        appointment_repo: HealthAppointmentRepository,
    ) -> None:
        self._patient_repo = patient_repo
        self._appointment_repo = appointment_repo

    async def execute(self, user_id: UUID) -> list[HealthAppointmentResponse]:
        patient = await self._patient_repo.get_or_create_by_user_id(user_id)
        rows = await self._appointment_repo.list_by_patient_id(patient.id)
        return [HealthAppointmentResponse.model_validate(row) for row in rows]


def _consultation_effects(
    patient_repo: PatientRepository,
    treatment_repo: TreatmentRepository,
    professional_repo: HealthProfessionalRepository,
    dose_repo: DoseRepository,
) -> AppointmentConsultationEffects:
    return AppointmentConsultationEffects(
        patient_repo,
        treatment_repo,
        professional_repo,
        dose_repo,
    )


def _apply_payload_to_appointment(
    appointment: PatientHealthAppointment,
    data: HealthAppointmentCreate | HealthAppointmentUpdate,
) -> None:
    follow_up = build_follow_up_payload(
        data.follow_up,
        neurological=data.neurological_assessment,
    )
    performed = data.performed
    appointment.appointment_date = data.appointment_date
    appointment.appointment_time = data.appointment_time
    appointment.location = data.location.strip()
    appointment.appointment_type = data.appointment_type
    appointment.professional = data.professional.strip() or None
    appointment.notes = data.notes.strip() or None
    appointment.performed = performed
    appointment.status = "completed" if performed else "scheduled"
    appointment.wants_follow_up_details = follow_up is not None
    appointment.follow_up = follow_up


class CreatePatientHealthAppointmentUseCase:
    def __init__(
        self,
        patient_repo: PatientRepository,
        appointment_repo: HealthAppointmentRepository,
        treatment_repo: TreatmentRepository,
        professional_repo: HealthProfessionalRepository,
        dose_repo: DoseRepository,
    ) -> None:
        self._patient_repo = patient_repo
        self._appointment_repo = appointment_repo
        self._effects = _consultation_effects(
            patient_repo,
            treatment_repo,
            professional_repo,
            dose_repo,
        )

    async def execute(
        self,
        user_id: UUID,
        data: HealthAppointmentCreate,
    ) -> HealthAppointmentResponse:
        patient = await self._patient_repo.get_or_create_by_user_id(user_id)

        appointment = PatientHealthAppointment(
            id=uuid.uuid4(),
            patient_id=patient.id,
        )
        _apply_payload_to_appointment(appointment, data)
        appointment = await self._appointment_repo.create(appointment)

        if data.performed:
            await self._effects.apply_on_first_completion(
                user_id,
                appointment_date=data.appointment_date,
                follow_up=data.follow_up,
            )

        return HealthAppointmentResponse.model_validate(appointment)


class UpdatePatientHealthAppointmentUseCase:
    def __init__(
        self,
        patient_repo: PatientRepository,
        appointment_repo: HealthAppointmentRepository,
        treatment_repo: TreatmentRepository,
        professional_repo: HealthProfessionalRepository,
        dose_repo: DoseRepository,
    ) -> None:
        self._patient_repo = patient_repo
        self._appointment_repo = appointment_repo
        self._effects = _consultation_effects(
            patient_repo,
            treatment_repo,
            professional_repo,
            dose_repo,
        )

    async def execute(
        self,
        user_id: UUID,
        appointment_id: UUID,
        data: HealthAppointmentUpdate,
    ) -> HealthAppointmentResponse:
        patient = await self._patient_repo.get_or_create_by_user_id(user_id)
        appointment = await self._appointment_repo.get_by_id_for_patient(
            appointment_id,
            patient.id,
        )
        if appointment is None:
            raise NotFoundError("HealthAppointment", str(appointment_id))

        was_performed = appointment.performed
        _apply_payload_to_appointment(appointment, data)
        appointment = await self._appointment_repo.save(appointment)

        if data.performed and not was_performed:
            await self._effects.apply_on_first_completion(
                user_id,
                appointment_date=data.appointment_date,
                follow_up=data.follow_up,
            )

        return HealthAppointmentResponse.model_validate(appointment)
