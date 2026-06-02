import { Injectable, signal } from '@angular/core';
import type {
  AppointmentFollowUp,
  AppointmentFollowUpDraft,
  HealthAppointment,
  HealthAppointmentDraft,
  NeurologicalAssessmentDraft,
} from '../models/health-appointment.models';

const STORAGE_KEY = 'pequi.health_appointments';

@Injectable({ providedIn: 'root' })
export class HealthAppointmentService {
  private readonly appointmentsSignal = signal<HealthAppointment[]>(this.loadFromStorage());

  readonly appointments = this.appointmentsSignal.asReadonly();

  saveFromDraft(draft: HealthAppointmentDraft): HealthAppointment {
    const performed = draft.performed === true;
    const followUp = performed ? this.buildFollowUpFromDraft(draft) : undefined;
    const record: HealthAppointment = {
      id: crypto.randomUUID(),
      appointmentDate: draft.appointmentDate,
      appointmentTime: draft.appointmentTime,
      location: draft.location.trim(),
      type: draft.type as HealthAppointment['type'],
      professional: draft.professional.trim() || undefined,
      notes: draft.notes.trim() || undefined,
      performed,
      status: performed ? 'completed' : 'scheduled',
      wantsFollowUpDetails: !!followUp,
      followUp,
      createdAt: new Date().toISOString(),
    };

    const next = [record, ...this.appointmentsSignal()];
    this.appointmentsSignal.set(next);
    this.persist(next);
    return record;
  }

  private buildFollowUp(raw: AppointmentFollowUpDraft): AppointmentFollowUp | undefined {
    const result: AppointmentFollowUp = {
      conduct: raw.conduct?.trim() || undefined,
      guidanceReceived: raw.guidanceReceived?.trim() || undefined,
      nextAppointmentDate: raw.nextAppointmentDate || undefined,
    };

    if (raw.updateInstitutedMedsFromConsultation) {
      result.hadMedicationChange = true;
      const doseSummary = [
        `Prednisona ${raw.institutedPrednisoneMgKg || '—'} mg/kg`,
        `AINE ${raw.institutedAineMgDay || '—'} mg/dia`,
        `Talidomida ${raw.institutedThalidomideMgDay || '—'} mg/dia`,
        `Pentoxifilina ${raw.institutedPentoxifyllineMgDay || '—'} mg/dia`,
        raw.institutedOtherMedication
          ? `Outro: ${raw.institutedOtherMedication}`
          : undefined,
      ]
        .filter(Boolean)
        .join(' | ');
      result.medicationChange = {
        description: raw.medicationChangeDescription?.trim() || undefined,
        newMedicationName: 'Medicamentos instituídos atualizados',
        newDoseDescription: doseSummary,
      };
    } else if (raw.registerSupervisedDose) {
      result.hadMedicationChange = false;
      const selectedDose = [
        raw.doseSchemeRifampicina ? 'Rifampicina' : '',
        raw.doseSchemeClofazimina ? 'Clofazimina' : '',
        raw.doseSchemeMinociclina ? 'Minociclina' : '',
        raw.doseSchemeOfloxacino ? 'Ofloxacino' : '',
        raw.doseSchemeDapsone ? 'Dapsona' : '',
      ]
        .filter(Boolean)
        .join(' + ');
      const medName = selectedDose || raw.otherMedicationName?.trim();
      if (medName) {
        result.supervisedDose = {
          medicationId:
            raw.selectedMedicationId && raw.selectedMedicationId !== 'other'
              ? raw.selectedMedicationId
              : undefined,
          medicationName: medName,
          notes: raw.supervisedDoseNotes?.trim() || undefined,
        };
      }
    } else if (raw.hadMedicationChange === false || raw.updateInstitutedMedsFromConsultation === false) {
      result.hadMedicationChange = false;
    }

    const hasValue =
      result.conduct !== undefined ||
      result.guidanceReceived !== undefined ||
      result.nextAppointmentDate !== undefined ||
      result.hadMedicationChange !== undefined ||
      result.medicationChange !== undefined ||
      result.supervisedDose !== undefined;

    return hasValue ? result : undefined;
  }

  private buildFollowUpFromDraft(draft: HealthAppointmentDraft): AppointmentFollowUp | undefined {
    const result = this.buildFollowUp(draft.followUp) ?? {};

    if (draft.followUp.registerNeurologicalAssessment) {
      const neurological = this.buildNeurologicalAssessmentRecord(draft.neurologicalAssessment);
      if (neurological) {
        result.neurologicalAssessment = neurological;
      }
    }

    const hasValue =
      result.conduct !== undefined ||
      result.guidanceReceived !== undefined ||
      result.nextAppointmentDate !== undefined ||
      result.hadMedicationChange !== undefined ||
      result.medicationChange !== undefined ||
      result.supervisedDose !== undefined ||
      result.neurologicalAssessment !== undefined;

    return hasValue ? result : undefined;
  }

  private buildNeurologicalAssessmentRecord(
    raw: NeurologicalAssessmentDraft
  ): AppointmentFollowUp['neurologicalAssessment'] | undefined {
    const hasGif =
      raw.gifEye !== '' || raw.gifHand !== '' || raw.gifFoot !== '' || raw.highestGif !== '';
    const hasDetails =
      raw.assessmentDate !== '' ||
      hasGif ||
      raw.ompSum.trim() !== '' ||
      raw.conduct.trim() !== '' ||
      raw.ubs.trim() !== '' ||
      raw.reference.trim() !== '';

    if (!hasDetails) return undefined;

    return {
      assessmentDate: raw.assessmentDate,
      gifEye: raw.gifEye,
      gifHand: raw.gifHand,
      gifFoot: raw.gifFoot,
      highestGif: raw.highestGif,
      ompSum: raw.ompSum,
      conduct: raw.conduct.trim() || undefined,
      ubs: raw.ubs.trim() || undefined,
      reference: raw.reference.trim() || undefined,
    };
  }

  private loadFromStorage(): HealthAppointment[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as HealthAppointment[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persist(items: HealthAppointment[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}
