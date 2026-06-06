import type { PatientPersonalData, PatientTreatmentData } from './patient-profile.models';

export interface BookletSupervisedDoseRow {
  doseNumber: number;
  medicationName: string;
  dateIso: string;
  schedulingDateIso?: string;
}

export interface BookletNeurologicalAssessmentRow {
  contextLabel: string;
  assessmentDate: string;
  gifEye: string;
  gifHand: string;
  gifFoot: string;
  highestGif: string;
  ompSum: string;
  conduct: string;
  ubs: string;
  reference: string;
}

export interface BookletAppointmentRow {
  dateIso: string;
  time: string;
  location: string;
  typeLabel: string;
  professional: string;
  statusLabel: string;
}

export interface PatientBookletData {
  generatedAt: string;
  personal: PatientPersonalData;
  treatment: PatientTreatmentData;
  supervisedDoses: BookletSupervisedDoseRow[];
  neurologicalAssessments: BookletNeurologicalAssessmentRow[];
  appointments: BookletAppointmentRow[];
}
