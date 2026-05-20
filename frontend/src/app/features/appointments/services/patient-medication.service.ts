import { Injectable, signal } from '@angular/core';
import type { PatientMedication } from '../models/patient-medication.models';

const STORAGE_KEY = 'pequi.patient_medications';

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
}
