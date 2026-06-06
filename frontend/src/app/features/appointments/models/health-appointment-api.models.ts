export interface NeurologicalAssessmentDraftApi {
  assessment_date: string;
  gif_eye: string;
  gif_hand: string;
  gif_foot: string;
  highest_gif: string;
  omp_sum: string;
  conduct: string;
  ubs: string;
  reference: string;
}

export interface AppointmentFollowUpDraftApi {
  conduct: string;
  guidance_received: string;
  next_appointment_date: string;
  dose_medication_changed: boolean | null;
  update_dose_from_consultation: boolean;
  dose_scheme_clofazimina: boolean;
  dose_scheme_ofloxacino: boolean;
  dose_scheme_rifampicina: boolean;
  dose_scheme_minociclina: boolean;
  dose_scheme_dapsone: boolean;
  update_instituted_meds_from_consultation: boolean;
  had_medication_change: boolean | null;
  register_supervised_dose: boolean;
  register_neurological_assessment: boolean;
  selected_medication_id: string;
  other_medication_name: string;
  medication_change_description: string;
  instituted_prednisone_mg_kg: string;
  instituted_aine_mg_day: string;
  instituted_thalidomide_mg_day: string;
  instituted_pentoxifylline_mg_day: string;
  instituted_other_medication: string;
  instituted_medications: {
    name: string;
    dose: string;
    unit: string;
    frequency: string;
  }[];
  supervised_dose_notes: string;
}

export interface HealthAppointmentCreateApi {
  appointment_date: string;
  appointment_time: string;
  location: string;
  appointment_type: string;
  professional: string;
  notes: string;
  performed: boolean;
  follow_up: AppointmentFollowUpDraftApi;
  neurological_assessment?: NeurologicalAssessmentDraftApi;
}

export interface HealthAppointmentApi {
  id: string;
  appointment_date: string;
  appointment_time: string;
  location: string;
  appointment_type: string;
  professional?: string | null;
  notes?: string | null;
  performed: boolean;
  status: string;
  wants_follow_up_details: boolean;
  follow_up?: Record<string, unknown> | null;
  created_at: string;
}
