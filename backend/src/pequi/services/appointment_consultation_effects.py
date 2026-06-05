"""Efeitos colaterais ao concluir uma consulta (tratamento + doses supervisionadas)."""

from datetime import UTC, date, datetime, time
from uuid import UUID

from pequi.models.treatment import TreatmentStatus
from pequi.repositories.dose_repo import DoseRepository
from pequi.repositories.health_professional_repo import HealthProfessionalRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.treatment_repo import TreatmentRepository
from pequi.schemas.dose_log import DoseLogCreate
from pequi.schemas.health_appointment import AppointmentFollowUpDraftIn
from pequi.schemas.patient_treatment import (
    PatientTreatmentRecordSave,
    storage_to_treatment_record,
)
from pequi.services.appointment_follow_up import extract_supervised_drug_names
from pequi.use_cases.patient_treatment_record import SavePatientTreatmentRecordUseCase
from pequi.use_cases.register_dose import RegisterDoseUseCase


class AppointmentConsultationEffects:
    def __init__(
        self,
        patient_repo: PatientRepository,
        treatment_repo: TreatmentRepository,
        professional_repo: HealthProfessionalRepository,
        dose_repo: DoseRepository,
    ) -> None:
        self._patient_repo = patient_repo
        self._treatment_repo = treatment_repo
        self._save_treatment = SavePatientTreatmentRecordUseCase(
            patient_repo,
            treatment_repo,
            professional_repo,
        )
        self._register_dose = RegisterDoseUseCase(
            treatment_repo,
            dose_repo,
            patient_repo,
            professional_repo,
        )

    async def apply_on_first_completion(
        self,
        user_id: UUID,
        *,
        appointment_date: date,
        follow_up: AppointmentFollowUpDraftIn,
    ) -> None:
        await self._merge_treatment_from_consultation(user_id, follow_up)
        if follow_up.register_supervised_dose:
            await self._register_supervised_doses(
                user_id=user_id,
                appointment_date=appointment_date,
                follow_up=follow_up,
            )

    async def _merge_treatment_from_consultation(
        self,
        user_id: UUID,
        follow_up: AppointmentFollowUpDraftIn,
    ) -> None:
        update_dose = follow_up.register_supervised_dose and follow_up.update_dose_from_consultation
        update_instituted = follow_up.update_instituted_meds_from_consultation
        if not update_dose and not update_instituted:
            return

        patient = await self._patient_repo.get_or_create_by_user_id(user_id)
        stored = patient.treatment_record if isinstance(patient.treatment_record, dict) else None
        current = storage_to_treatment_record(
            stored,
            diagnosis_date=patient.diagnosis_date,
            classification=patient.classification,
        )
        payload = current.model_dump()

        if update_dose:
            payload["scheme_clofazimina"] = follow_up.dose_scheme_clofazimina
            payload["scheme_ofloxacino"] = follow_up.dose_scheme_ofloxacino
            payload["scheme_rifampicina"] = follow_up.dose_scheme_rifampicina
            payload["scheme_minociclina"] = follow_up.dose_scheme_minociclina
            payload["scheme_dapsone"] = follow_up.dose_scheme_dapsone
            payload["current_dose_medication"] = follow_up.other_medication_name.strip()

        if update_instituted:
            payload["prednisone_mg_kg"] = follow_up.instituted_prednisone_mg_kg
            payload["aine_mg_day"] = follow_up.instituted_aine_mg_day
            payload["thalidomide_mg_day"] = follow_up.instituted_thalidomide_mg_day
            payload["pentoxifylline_mg_day"] = follow_up.instituted_pentoxifylline_mg_day
            payload["other_medication"] = follow_up.instituted_other_medication
            payload["instituted_medications"] = [
                item.model_dump() for item in follow_up.instituted_medications
            ]

        save_data = PatientTreatmentRecordSave.model_validate(payload)
        await self._save_treatment.execute(user_id, save_data)

    async def _register_supervised_doses(
        self,
        *,
        user_id: UUID,
        appointment_date: date,
        follow_up: AppointmentFollowUpDraftIn,
    ) -> None:
        drug_names = extract_supervised_drug_names(follow_up)
        if not drug_names:
            return

        patient = await self._patient_repo.get_or_create_by_user_id(user_id)
        treatment = await self._treatment_repo.get_active_by_patient_id(patient.id)
        if treatment is None or treatment.status != TreatmentStatus.active:
            return

        expected_at = datetime.combine(
            appointment_date,
            time(8, 0),
            tzinfo=UTC,
        )
        taken_at = datetime.now(UTC)

        for drug_name in drug_names:
            try:
                await self._register_dose.execute(
                    actor_user_id=user_id,
                    actor_role="patient",
                    treatment_id=treatment.id,
                    data=DoseLogCreate(
                        drug_name=drug_name,
                        expected_at=expected_at,
                        taken_at=taken_at,
                        skipped=False,
                        supervised=True,
                        via_consultation=True,
                    ),
                )
            except Exception:
                continue
