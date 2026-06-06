import type { PatientTreatmentData } from '../models/patient-profile.models';
import type { PatientTreatmentRecordApi } from '../models/patient-treatment-api.models';

function toApiDate(value: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function fromApiDate(value: string | null | undefined): string {
  return value ?? '';
}

export function treatmentDataToApiRecord(
  data: PatientTreatmentData
): PatientTreatmentRecordApi {
  return {
    diagnosis_date: toApiDate(data.diagnosisDate),
    classification: data.classification || null,
    current_dose_medication: data.currentDoseMedication,
    treatment_start_date: toApiDate(data.treatmentStartDate),
    cns_number: data.cnsNumber,
    sinan_number: data.sinanNumber,
    clinical_form: data.clinicalForm,
    baciloscopy_date: toApiDate(data.baciloscopyDate),
    baciloscopy_ib: data.baciloscopyIB,
    diagnostic_support_exam: data.diagnosticSupportExam,
    gif_assessment: data.gifAssessment,
    reaction_episode_at_diagnosis: data.reactionEpisodeAtDiagnosis,
    reaction_episode_type: data.reactionEpisodeType,
    reaction_episode_date: toApiDate(data.reactionEpisodeDate),
    prednisone_mg_kg: data.prednisoneMgKg,
    aine_mg_day: data.aineMgDay,
    thalidomide_mg_day: data.thalidomideMgDay,
    pentoxifylline_mg_day: data.pentoxifyllineMgDay,
    other_medication: data.otherMedication,
    instituted_medications: data.institutedMedications.map((item) => ({
      name: item.name,
      dose: item.dose,
      unit: item.unit,
      frequency: item.frequency,
    })),
    other_conducts: data.otherConducts,
    substitute_scheme_change_date: toApiDate(data.substituteSchemeChangeDate),
    intolerance_dapsone: data.intoleranceDapsone,
    intolerance_rifampicin: data.intoleranceRifampicin,
    intolerance_clofazimine: data.intoleranceClofazimine,
    scheme_clofazimina: data.schemeClofazimina,
    scheme_ofloxacino: data.schemeOfloxacino,
    scheme_rifampicina: data.schemeRifampicina,
    scheme_minociclina: data.schemeMinociclina,
    scheme_dapsone: data.schemeDapsone,
    pqt_discharge_date: toApiDate(data.pqtDischargeDate),
    gif_assessment_at_discharge: data.gifAssessmentAtDischarge,
    reaction_episode_at_discharge: data.reactionEpisodeAtDischarge,
    reaction_episode_type_at_discharge: data.reactionEpisodeTypeAtDischarge,
    reaction_episode_date_at_discharge: toApiDate(data.reactionEpisodeDateAtDischarge),
    discharge_prednisone_mg_kg: data.dischargePrednisoneMgKg,
    discharge_aine_mg_day: data.dischargeAineMgDay,
    discharge_thalidomide_mg_day: data.dischargeThalidomideMgDay,
    discharge_pentoxifylline_mg_day: data.dischargePentoxifyllineMgDay,
    discharge_other_medication: data.dischargeOtherMedication,
    discharge_other_conducts: data.dischargeOtherConducts,
  };
}

export function apiRecordToTreatmentData(
  api: PatientTreatmentRecordApi
): PatientTreatmentData {
  return {
    currentDoseMedication: api.current_dose_medication ?? '',
    diagnosisDate: fromApiDate(api.diagnosis_date),
    cnsNumber: api.cns_number ?? '',
    sinanNumber: api.sinan_number ?? '',
    classification: (api.classification as PatientTreatmentData['classification']) ?? '',
    treatmentStartDate: fromApiDate(api.treatment_start_date),
    clinicalForm: (api.clinical_form as PatientTreatmentData['clinicalForm']) ?? '',
    baciloscopyDate: fromApiDate(api.baciloscopy_date),
    baciloscopyIB: api.baciloscopy_ib ?? '',
    diagnosticSupportExam: api.diagnostic_support_exam ?? '',
    gifAssessment: (api.gif_assessment as PatientTreatmentData['gifAssessment']) ?? '',
    reactionEpisodeAtDiagnosis:
      (api.reaction_episode_at_diagnosis as PatientTreatmentData['reactionEpisodeAtDiagnosis']) ??
      '',
    reactionEpisodeType:
      (api.reaction_episode_type as PatientTreatmentData['reactionEpisodeType']) ?? '',
    reactionEpisodeDate: fromApiDate(api.reaction_episode_date),
    prednisoneMgKg: api.prednisone_mg_kg ?? '',
    aineMgDay: api.aine_mg_day ?? '',
    thalidomideMgDay: api.thalidomide_mg_day ?? '',
    pentoxifyllineMgDay: api.pentoxifylline_mg_day ?? '',
    otherMedication: api.other_medication ?? '',
    institutedMedications: (api.instituted_medications ?? []).map((item) => ({
      name: item.name,
      dose: item.dose ?? '',
      unit: item.unit ?? 'mg',
      frequency: item.frequency ?? 'dia',
    })),
    otherConducts: api.other_conducts ?? '',
    substituteSchemeChangeDate: fromApiDate(api.substitute_scheme_change_date),
    intoleranceDapsone: api.intolerance_dapsone ?? false,
    intoleranceRifampicin: api.intolerance_rifampicin ?? false,
    intoleranceClofazimine: api.intolerance_clofazimine ?? false,
    schemeClofazimina: api.scheme_clofazimina ?? false,
    schemeOfloxacino: api.scheme_ofloxacino ?? false,
    schemeRifampicina: api.scheme_rifampicina ?? false,
    schemeMinociclina: api.scheme_minociclina ?? false,
    schemeDapsone: api.scheme_dapsone ?? false,
    pqtDischargeDate: fromApiDate(api.pqt_discharge_date),
    gifAssessmentAtDischarge:
      (api.gif_assessment_at_discharge as PatientTreatmentData['gifAssessmentAtDischarge']) ??
      '',
    reactionEpisodeAtDischarge:
      (api.reaction_episode_at_discharge as PatientTreatmentData['reactionEpisodeAtDischarge']) ??
      '',
    reactionEpisodeTypeAtDischarge:
      (api.reaction_episode_type_at_discharge as PatientTreatmentData['reactionEpisodeTypeAtDischarge']) ??
      '',
    reactionEpisodeDateAtDischarge: fromApiDate(api.reaction_episode_date_at_discharge),
    dischargePrednisoneMgKg: api.discharge_prednisone_mg_kg ?? '',
    dischargeAineMgDay: api.discharge_aine_mg_day ?? '',
    dischargeThalidomideMgDay: api.discharge_thalidomide_mg_day ?? '',
    dischargePentoxifyllineMgDay: api.discharge_pentoxifylline_mg_day ?? '',
    dischargeOtherMedication: api.discharge_other_medication ?? '',
    dischargeOtherConducts: api.discharge_other_conducts ?? '',
  };
}
