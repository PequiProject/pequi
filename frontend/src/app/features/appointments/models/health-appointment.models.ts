export const APPOINTMENT_TYPES = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'exame', label: 'Exame' },
  { value: 'retorno', label: 'Retorno' },
  { value: 'dose_supervisionada', label: 'Dose supervisionada' },
  { value: 'avaliacao_neurologica', label: 'Avaliação neurológica' },
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number]['value'];

export type AppointmentStatus = 'scheduled' | 'completed';

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
  hadMedicationChange: boolean | null;
  registerSupervisedDose: boolean;
  selectedMedicationId: string;
  otherMedicationName: string;
  medicationChangeDescription: string;
  newMedicationName: string;
  newDoseDescription: string;
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
  wantsFollowUpDetails: boolean | null;
  followUp: AppointmentFollowUpDraft;
}

export const EMPTY_FOLLOW_UP_DRAFT: AppointmentFollowUpDraft = {
  conduct: '',
  guidanceReceived: '',
  nextAppointmentDate: '',
  hadMedicationChange: null,
  registerSupervisedDose: false,
  selectedMedicationId: '',
  otherMedicationName: '',
  medicationChangeDescription: '',
  newMedicationName: '',
  newDoseDescription: '',
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
  wantsFollowUpDetails: null,
  followUp: { ...EMPTY_FOLLOW_UP_DRAFT },
};
