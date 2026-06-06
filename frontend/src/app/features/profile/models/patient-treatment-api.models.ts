export interface InstitutedMedicationApi {
  name: string;
  dose: string;
  unit: string;
  frequency: string;
}

export interface PatientTreatmentRecordApi {
  diagnosis_date: string | null;
  classification: string | null;
  current_dose_medication: string;
  treatment_start_date: string | null;
  cns_number: string;
  sinan_number: string;
  clinical_form: string;
  baciloscopy_date: string | null;
  baciloscopy_ib: string;
  diagnostic_support_exam: string;
  gif_assessment: string;
  reaction_episode_at_diagnosis: string;
  reaction_episode_type: string;
  reaction_episode_date: string | null;
  prednisone_mg_kg: string;
  aine_mg_day: string;
  thalidomide_mg_day: string;
  pentoxifylline_mg_day: string;
  other_medication: string;
  instituted_medications: InstitutedMedicationApi[];
  other_conducts: string;
  substitute_scheme_change_date: string | null;
  intolerance_dapsone: boolean;
  intolerance_rifampicin: boolean;
  intolerance_clofazimine: boolean;
  scheme_clofazimina: boolean;
  scheme_ofloxacino: boolean;
  scheme_rifampicina: boolean;
  scheme_minociclina: boolean;
  scheme_dapsone: boolean;
  pqt_discharge_date: string | null;
  gif_assessment_at_discharge: string;
  reaction_episode_at_discharge: string;
  reaction_episode_type_at_discharge: string;
  reaction_episode_date_at_discharge: string | null;
  discharge_prednisone_mg_kg: string;
  discharge_aine_mg_day: string;
  discharge_thalidomide_mg_day: string;
  discharge_pentoxifylline_mg_day: string;
  discharge_other_medication: string;
  discharge_other_conducts: string;
}

export interface MedicationChecklistApi {
  active_treatment_id: string | null;
  instituted_medications: InstitutedMedicationApi[];
  current_dose_medication: string;
  treatment_start_date: string | null;
  can_register_doses: boolean;
}

export interface ActiveTreatmentApi {
  id: string;
  patient_id: string;
  prescribed_by: string;
  regimen: string;
  start_date: string;
  expected_end: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoseLogCreateApi {
  drug_name: string;
  expected_at: string;
  taken_at: string | null;
  skipped: boolean;
  skip_reason: string | null;
  supervised: boolean;
  via_consultation?: boolean;
}

export interface DoseLogResponseApi {
  id: string;
  treatment_id: string;
  drug_name: string;
  expected_at: string;
  taken_at: string | null;
  skipped: boolean;
  skip_reason: string | null;
  supervised: boolean;
  registered_by: string | null;
  created_at: string;
}
