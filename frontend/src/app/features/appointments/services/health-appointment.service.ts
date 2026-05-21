import { Injectable, signal } from '@angular/core';
import type {
  AppointmentFollowUp,
  AppointmentFollowUpDraft,
  HealthAppointment,
  HealthAppointmentDraft,
} from '../models/health-appointment.models';

const STORAGE_KEY = 'pequi.health_appointments';

@Injectable({ providedIn: 'root' })
export class HealthAppointmentService {
  private readonly appointmentsSignal = signal<HealthAppointment[]>(this.loadFromStorage());

  readonly appointments = this.appointmentsSignal.asReadonly();

  saveFromDraft(draft: HealthAppointmentDraft): HealthAppointment {
    const performed = draft.performed === true;
    const followUp = performed ? this.buildFollowUp(draft.followUp) : undefined;
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

    if (raw.hadMedicationChange === true) {
      result.hadMedicationChange = true;
      const newName = raw.newMedicationName?.trim();
      const newDose = raw.newDoseDescription?.trim();
      if (newName && newDose) {
        result.medicationChange = {
          description: raw.medicationChangeDescription?.trim() || undefined,
          newMedicationName: newName,
          newDoseDescription: newDose,
        };
      }
    } else if (raw.hadMedicationChange === false && raw.registerSupervisedDose) {
      result.hadMedicationChange = false;
      const medName = raw.otherMedicationName?.trim();
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
    } else if (raw.hadMedicationChange === false) {
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
