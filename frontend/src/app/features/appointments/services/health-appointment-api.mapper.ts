import type {
  AnsGifGrade,
  AppointmentFollowUp,
  AppointmentFollowUpDraft,
  AppointmentType,
  HealthAppointment,
  HealthAppointmentDraft,
  NeurologicalAssessmentDraft,
} from '../models/health-appointment.models';
import type {
  AppointmentFollowUpDraftApi,
  HealthAppointmentApi,
  HealthAppointmentCreateApi,
  NeurologicalAssessmentDraftApi,
} from '../models/health-appointment-api.models';

export function draftToCreateApi(draft: HealthAppointmentDraft): HealthAppointmentCreateApi {
  const performed = draft.performed === true;
  const body: HealthAppointmentCreateApi = {
    appointment_date: draft.appointmentDate,
    appointment_time: draft.appointmentTime,
    location: draft.location.trim(),
    appointment_type: draft.type as string,
    professional: draft.professional.trim(),
    notes: draft.notes.trim(),
    performed,
    follow_up: followUpDraftToApi(draft.followUp),
  };

  if (draft.followUp.registerNeurologicalAssessment) {
    body.neurological_assessment = neurologicalDraftToApi(draft.neurologicalAssessment);
  }

  return body;
}

function followUpDraftToApi(raw: AppointmentFollowUpDraft): AppointmentFollowUpDraftApi {
  return {
    conduct: raw.conduct,
    guidance_received: raw.guidanceReceived,
    next_appointment_date: raw.nextAppointmentDate,
    dose_medication_changed: raw.doseMedicationChanged,
    update_dose_from_consultation: raw.updateDoseFromConsultation,
    dose_scheme_clofazimina: raw.doseSchemeClofazimina,
    dose_scheme_ofloxacino: raw.doseSchemeOfloxacino,
    dose_scheme_rifampicina: raw.doseSchemeRifampicina,
    dose_scheme_minociclina: raw.doseSchemeMinociclina,
    dose_scheme_dapsone: raw.doseSchemeDapsone,
    update_instituted_meds_from_consultation: raw.updateInstitutedMedsFromConsultation,
    had_medication_change: raw.hadMedicationChange,
    register_supervised_dose: raw.registerSupervisedDose,
    register_neurological_assessment: raw.registerNeurologicalAssessment,
    selected_medication_id: raw.selectedMedicationId,
    other_medication_name: raw.otherMedicationName,
    medication_change_description: raw.medicationChangeDescription,
    instituted_prednisone_mg_kg: raw.institutedPrednisoneMgKg,
    instituted_aine_mg_day: raw.institutedAineMgDay,
    instituted_thalidomide_mg_day: raw.institutedThalidomideMgDay,
    instituted_pentoxifylline_mg_day: raw.institutedPentoxifyllineMgDay,
    instituted_other_medication: raw.institutedOtherMedication,
    instituted_medications: raw.institutedMedications.map((item) => ({
      name: item.name,
      dose: item.dose,
      unit: item.unit,
      frequency: item.frequency,
    })),
    supervised_dose_notes: raw.supervisedDoseNotes,
  };
}

function neurologicalDraftToApi(
  raw: NeurologicalAssessmentDraft
): NeurologicalAssessmentDraftApi {
  return {
    assessment_date: raw.assessmentDate,
    gif_eye: raw.gifEye,
    gif_hand: raw.gifHand,
    gif_foot: raw.gifFoot,
    highest_gif: raw.highestGif,
    omp_sum: raw.ompSum,
    conduct: raw.conduct,
    ubs: raw.ubs,
    reference: raw.reference,
  };
}

export function apiToHealthAppointment(api: HealthAppointmentApi): HealthAppointment {
  return {
    id: api.id,
    appointmentDate: api.appointment_date,
    appointmentTime: api.appointment_time,
    location: api.location,
    type: api.appointment_type as AppointmentType,
    professional: api.professional ?? undefined,
    notes: api.notes ?? undefined,
    performed: api.performed,
    status: api.status === 'completed' ? 'completed' : 'scheduled',
    wantsFollowUpDetails: api.wants_follow_up_details,
    followUp: api.follow_up ? mapFollowUpFromApi(api.follow_up) : undefined,
    createdAt: api.created_at,
  };
}

function mapFollowUpFromApi(raw: Record<string, unknown>): AppointmentFollowUp {
  const result: AppointmentFollowUp = {};

  if (typeof raw['conduct'] === 'string') {
    result.conduct = raw['conduct'];
  }
  if (typeof raw['guidance_received'] === 'string') {
    result.guidanceReceived = raw['guidance_received'];
  }
  if (typeof raw['next_appointment_date'] === 'string') {
    result.nextAppointmentDate = raw['next_appointment_date'];
  }
  if (typeof raw['had_medication_change'] === 'boolean') {
    result.hadMedicationChange = raw['had_medication_change'];
  }

  const medicationChange = raw['medication_change'];
  if (medicationChange && typeof medicationChange === 'object') {
    const mc = medicationChange as Record<string, unknown>;
    result.medicationChange = {
      description:
        typeof mc['description'] === 'string' ? mc['description'] : undefined,
      newMedicationName:
        typeof mc['new_medication_name'] === 'string' ? mc['new_medication_name'] : '',
      newDoseDescription:
        typeof mc['new_dose_description'] === 'string' ? mc['new_dose_description'] : '',
    };
  }

  const supervisedDose = raw['supervised_dose'];
  if (supervisedDose && typeof supervisedDose === 'object') {
    const sd = supervisedDose as Record<string, unknown>;
    result.supervisedDose = {
      medicationId:
        typeof sd['medication_id'] === 'string' ? sd['medication_id'] : undefined,
      medicationName:
        typeof sd['medication_name'] === 'string' ? sd['medication_name'] : '',
      notes: typeof sd['notes'] === 'string' ? sd['notes'] : undefined,
    };
  }

  const neurological = raw['neurological_assessment'];
  if (neurological && typeof neurological === 'object') {
    const na = neurological as Record<string, unknown>;
    result.neurologicalAssessment = {
      assessmentDate:
        typeof na['assessment_date'] === 'string' ? na['assessment_date'] : '',
      gifEye: (typeof na['gif_eye'] === 'string' ? na['gif_eye'] : '') as AnsGifGrade,
      gifHand: (typeof na['gif_hand'] === 'string' ? na['gif_hand'] : '') as AnsGifGrade,
      gifFoot: (typeof na['gif_foot'] === 'string' ? na['gif_foot'] : '') as AnsGifGrade,
      highestGif: (typeof na['highest_gif'] === 'string' ? na['highest_gif'] : '') as AnsGifGrade,
      ompSum: typeof na['omp_sum'] === 'string' ? na['omp_sum'] : '',
      conduct: typeof na['conduct'] === 'string' ? na['conduct'] : undefined,
      ubs: typeof na['ubs'] === 'string' ? na['ubs'] : undefined,
      reference: typeof na['reference'] === 'string' ? na['reference'] : undefined,
    };
  }

  return result;
}
