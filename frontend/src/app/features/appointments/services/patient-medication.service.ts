import { Injectable, signal } from '@angular/core';
import type { PatientMedication } from '../models/patient-medication.models';

const STORAGE_KEY = 'pequi.patient_medications';
export const CURRENT_DOSE_MEDICATION_ID = 'current-dose';

/**
 * Medicamentos do perfil do paciente. Hoje lê do localStorage;
 * quando o perfil tiver CRUD, este serviço passa a ser a única fonte.
 */
@Injectable({ providedIn: 'root' })
export class PatientMedicationService {
  private readonly medicationsSignal = signal<PatientMedication[]>(this.loadFromStorage());

  readonly medications = this.medicationsSignal.asReadonly();
  readonly hasMedications = () => this.medicationsSignal().length > 0;

  findById(id: string): PatientMedication | undefined {
    return this.medicationsSignal().find((m) => m.id === id);
  }

  getCurrentDoseMedication(): PatientMedication | undefined {
    return this.findById(CURRENT_DOSE_MEDICATION_ID);
  }

  setCurrentDoseMedication(name: string): void {
    const trimmed = name.trim();
    const others = this.medicationsSignal().filter((m) => m.id !== CURRENT_DOSE_MEDICATION_ID);

    if (!trimmed) {
      this.medicationsSignal.set(others);
      this.persist(others);
      return;
    }

    const current: PatientMedication = {
      id: CURRENT_DOSE_MEDICATION_ID,
      name: trimmed,
    };
    const next = [current, ...others];
    this.medicationsSignal.set(next);
    this.persist(next);
  }

  private loadFromStorage(): PatientMedication[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PatientMedication[];
      return Array.isArray(parsed) ? parsed.filter((m) => m?.id && m?.name) : [];
    } catch {
      return [];
    }
  }

  private persist(items: PatientMedication[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}
