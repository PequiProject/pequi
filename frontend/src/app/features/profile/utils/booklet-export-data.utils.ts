import { APPOINTMENT_TYPES, type HealthAppointment } from '../../appointments/models/health-appointment.models';
import { formatAppointmentDatePt } from '../../appointments/utils/next-appointment.utils';
import type {
  BookletAppointmentRow,
  BookletNeurologicalAssessmentRow,
  BookletSupervisedDoseRow,
  PatientBookletData,
} from '../models/patient-booklet.models';
import type { PatientPersonalData, PatientProfile, PatientTreatmentData } from '../models/patient-profile.models';
import {
  CLASSIFICATION_OPTIONS,
  CLINICAL_FORM_OPTIONS,
  EDUCATION_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  GIF_GRADE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  NATIONALITY_OPTIONS,
  RACE_COLOR_OPTIONS,
  REACTION_EPISODE_TYPE_OPTIONS,
  SEX_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  YES_NO_OPTIONS,
  type GifGrade,
  type YesNoChoice,
} from '../models/patient-profile.models';

export interface AccountExportDoseLog {
  drug_name: string;
  expected_at: string;
  taken_at: string | null;
  supervised: boolean;
  skipped: boolean;
}

export function buildBookletData(
  profile: PatientProfile,
  appointments: readonly HealthAppointment[],
  doseLogs: AccountExportDoseLog[] = []
): PatientBookletData {
  return {
    generatedAt: new Date().toISOString(),
    personal: profile.personal,
    treatment: profile.treatment,
    supervisedDoses: buildSupervisedDoseRows(appointments, doseLogs),
    neurologicalAssessments: buildNeurologicalRows(appointments),
    appointments: buildAppointmentRows(appointments),
  };
}

export function buildSupervisedDoseRows(
  appointments: readonly HealthAppointment[],
  doseLogs: AccountExportDoseLog[] = []
): BookletSupervisedDoseRow[] {
  const rows: BookletSupervisedDoseRow[] = [];
  const seen = new Set<string>();

  for (const log of doseLogs) {
    if (!log.supervised || log.skipped) continue;
    const dateIso = isoDateFromTimestamp(log.taken_at ?? log.expected_at);
    if (!dateIso) continue;
    const key = `${dateIso}|${log.drug_name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      doseNumber: rows.length + 1,
      medicationName: log.drug_name,
      dateIso,
    });
  }

  const sortedAppointments = [...appointments].sort((a, b) =>
    b.appointmentDate.localeCompare(a.appointmentDate)
  );

  for (const apt of sortedAppointments) {
    if (!apt.performed) continue;
    const supervised = apt.followUp?.supervisedDose;
    if (!supervised?.medicationName) continue;

    const meds = supervised.medicationName
      .split('+')
      .map((part) => part.trim())
      .filter(Boolean);

    for (const med of meds.length > 0 ? meds : [supervised.medicationName]) {
      const key = `${apt.appointmentDate}|${med}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        doseNumber: rows.length + 1,
        medicationName: med,
        dateIso: apt.appointmentDate,
        schedulingDateIso: apt.followUp?.nextAppointmentDate,
      });
    }
  }

  rows.sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  return rows.map((row, index) => ({ ...row, doseNumber: index + 1 }));
}

export function buildNeurologicalRows(
  appointments: readonly HealthAppointment[]
): BookletNeurologicalAssessmentRow[] {
  const rows: BookletNeurologicalAssessmentRow[] = [];

  for (const apt of appointments) {
    const ans = apt.followUp?.neurologicalAssessment;
    if (!ans) continue;

    const hasData =
      ans.assessmentDate ||
      ans.gifEye ||
      ans.gifHand ||
      ans.gifFoot ||
      ans.highestGif ||
      ans.ompSum ||
      ans.conduct ||
      ans.ubs ||
      ans.reference;

    if (!hasData) continue;

    rows.push({
      contextLabel: `${appointmentTypeLabel(apt.type)} — ${formatAppointmentDatePt(apt.appointmentDate)}`,
      assessmentDate: ans.assessmentDate || apt.appointmentDate,
      gifEye: ans.gifEye || '—',
      gifHand: ans.gifHand || '—',
      gifFoot: ans.gifFoot || '—',
      highestGif: ans.highestGif || '—',
      ompSum: ans.ompSum || '—',
      conduct: ans.conduct || '—',
      ubs: ans.ubs || '—',
      reference: ans.reference || '—',
    });
  }

  return rows.sort((a, b) => b.assessmentDate.localeCompare(a.assessmentDate));
}

export function buildAppointmentRows(
  appointments: readonly HealthAppointment[]
): BookletAppointmentRow[] {
  return [...appointments]
    .sort((a, b) => {
      const byDate = b.appointmentDate.localeCompare(a.appointmentDate);
      if (byDate !== 0) return byDate;
      return (b.appointmentTime ?? '').localeCompare(a.appointmentTime ?? '');
    })
    .map((apt) => ({
      dateIso: apt.appointmentDate,
      time: apt.appointmentTime || '—',
      location: apt.location || '—',
      typeLabel: appointmentTypeLabel(apt.type),
      professional: apt.professional?.trim() || '—',
      statusLabel: apt.performed ? 'Realizada' : 'Agendada',
    }));
}

export function appointmentTypeLabel(type: string): string {
  return APPOINTMENT_TYPES.find((item) => item.value === type)?.label ?? (type || '—');
}

export function optionLabel<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string
): string {
  return options.find((o) => o.value === value)?.label ?? (value.trim() || '—');
}

export function yesNoLabel(value: YesNoChoice): string {
  return optionLabel(YES_NO_OPTIONS, value);
}

export function gifGradeLabel(value: GifGrade | string): string {
  if (value === '0' || value === '1' || value === '2') {
    return `Grau ${value}`;
  }
  return optionLabel(GIF_GRADE_OPTIONS, value as GifGrade);
}

export function formatBookletDate(iso: string): string {
  if (!iso?.trim()) return '—';
  const formatted = formatAppointmentDatePt(iso.slice(0, 10));
  return formatted || iso;
}

function isoDateFromTimestamp(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10) || null;
  }
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const BOOKLET_OPTION_HELPERS = {
  nationality: (v: string) => optionLabel(NATIONALITY_OPTIONS, v),
  raceColor: (v: string) => optionLabel(RACE_COLOR_OPTIONS, v),
  sex: (v: string) => optionLabel(SEX_OPTIONS, v),
  maritalStatus: (v: string) => optionLabel(MARITAL_STATUS_OPTIONS, v),
  education: (v: string) => optionLabel(EDUCATION_OPTIONS, v),
  genderIdentity: (v: string) => optionLabel(GENDER_IDENTITY_OPTIONS, v),
  sexualOrientation: (v: string) => optionLabel(SEXUAL_ORIENTATION_OPTIONS, v),
  classification: (v: string) => optionLabel(CLASSIFICATION_OPTIONS, v),
  clinicalForm: (v: string) => optionLabel(CLINICAL_FORM_OPTIONS, v),
  reactionType: (v: string) => optionLabel(REACTION_EPISODE_TYPE_OPTIONS, v),
};
