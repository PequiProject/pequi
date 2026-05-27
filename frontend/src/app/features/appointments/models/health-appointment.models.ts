export const APPOINTMENT_TYPES = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'exame', label: 'Exame' },
  { value: 'retorno', label: 'Retorno' },
  { value: 'dose_supervisionada', label: 'Dose supervisionada' },
  { value: 'avaliacao_neurologica', label: 'Avaliação neurológica' },
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number]['value'];

export type AppointmentStatus = 'scheduled' | 'completed';

export type AnsGifGrade = '' | '0' | '1' | '2';

/** Avaliação Neurológica Simplificada (ANS) registrada na consulta. */
export interface NeurologicalAssessmentRecord {
  assessmentDate: string;
  gifEye: AnsGifGrade;
  gifHand: AnsGifGrade;
  gifFoot: AnsGifGrade;
  highestGif: AnsGifGrade;
  ompSum: string;
  conduct?: string;
  ubs?: string;
  reference?: string;
}

export interface NeurologicalAssessmentDraft {
  assessmentDate: string;
  gifEye: AnsGifGrade;
  gifHand: AnsGifGrade;
  gifFoot: AnsGifGrade;
  highestGif: AnsGifGrade;
  ompSum: string;
  conduct: string;
  ubs: string;
  reference: string;
}

export const ANS_GIF_GRADE_OPTIONS: readonly { value: AnsGifGrade; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: '0', label: 'Grau 0' },
  { value: '1', label: 'Grau 1' },
  { value: '2', label: 'Grau 2' },
] as const;

/** Dose mensal tomada no atendimento (sem troca de medicamento). */
export interface SupervisedDoseRecord {
  medicationId?: string;
  medicationName: string;
  notes?: string;
}

/** Troca de esquema — exige registrar o novo medicamento e a dose. */
export interface MedicationChangeRecord {
  description?: string;
  newMedicationName: string;
  newDoseDescription: string;
}

export interface AppointmentFollowUp {
  conduct?: string;
  hadMedicationChange?: boolean;
  medicationChange?: MedicationChangeRecord;
  supervisedDose?: SupervisedDoseRecord;
  nextAppointmentDate?: string;
  guidanceReceived?: string;
  neurologicalAssessment?: NeurologicalAssessmentRecord;
}

export interface HealthAppointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  location: string;
  type: AppointmentType;
  professional?: string;
  notes?: string;
  performed: boolean;
  status: AppointmentStatus;
  wantsFollowUpDetails: boolean;
  followUp?: AppointmentFollowUp;
  createdAt: string;
}

/** Campos em edição no wizard (antes de normalizar no save). */
export interface AppointmentFollowUpDraft {
  conduct: string;
  guidanceReceived: string;
  nextAppointmentDate: string;
  doseMedicationChanged: boolean | null;
  updateDoseFromConsultation: boolean;
  doseSchemeClofazimina: boolean;
  doseSchemeOfloxacino: boolean;
  doseSchemeRifampicina: boolean;
  doseSchemeMinociclina: boolean;
  doseSchemeDapsone: boolean;
  updateInstitutedMedsFromConsultation: boolean;
  hadMedicationChange: boolean | null;
  registerSupervisedDose: boolean;
  registerNeurologicalAssessment: boolean;
  selectedMedicationId: string;
  otherMedicationName: string;
  medicationChangeDescription: string;
  institutedPrednisoneMgKg: string;
  institutedAineMgDay: string;
  institutedThalidomideMgDay: string;
  institutedPentoxifyllineMgDay: string;
  institutedOtherMedication: string;
  supervisedDoseNotes: string;
}

export interface HealthAppointmentDraft {
  appointmentDate: string;
  appointmentTime: string;
  location: string;
  type: AppointmentType | '';
  professional: string;
  notes: string;
  performed: boolean | null;
  followUp: AppointmentFollowUpDraft;
  neurologicalAssessment: NeurologicalAssessmentDraft;
}

export const EMPTY_NEUROLOGICAL_ASSESSMENT_DRAFT: NeurologicalAssessmentDraft = {
  assessmentDate: '',
  gifEye: '',
  gifHand: '',
  gifFoot: '',
  highestGif: '',
  ompSum: '',
  conduct: '',
  ubs: '',
  reference: '',
};

export const EMPTY_FOLLOW_UP_DRAFT: AppointmentFollowUpDraft = {
  conduct: '',
  guidanceReceived: '',
  nextAppointmentDate: '',
  doseMedicationChanged: null,
  updateDoseFromConsultation: false,
  doseSchemeClofazimina: false,
  doseSchemeOfloxacino: false,
  doseSchemeRifampicina: false,
  doseSchemeMinociclina: false,
  doseSchemeDapsone: false,
  updateInstitutedMedsFromConsultation: false,
  hadMedicationChange: null,
  registerSupervisedDose: false,
  registerNeurologicalAssessment: false,
  selectedMedicationId: '',
  otherMedicationName: '',
  medicationChangeDescription: '',
  institutedPrednisoneMgKg: '',
  institutedAineMgDay: '',
  institutedThalidomideMgDay: '',
  institutedPentoxifyllineMgDay: '',
  institutedOtherMedication: '',
  supervisedDoseNotes: '',
};

export const EMPTY_APPOINTMENT_DRAFT: HealthAppointmentDraft = {
  appointmentDate: '',
  appointmentTime: '',
  location: '',
  type: '',
  professional: '',
  notes: '',
  performed: null,
  followUp: { ...EMPTY_FOLLOW_UP_DRAFT },
  neurologicalAssessment: { ...EMPTY_NEUROLOGICAL_ASSESSMENT_DRAFT },
};
