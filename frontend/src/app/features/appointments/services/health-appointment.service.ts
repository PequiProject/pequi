import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth-service';
import type {
  AppointmentFollowUp,
  AppointmentFollowUpDraft,
  HealthAppointment,
  HealthAppointmentDraft,
  NeurologicalAssessmentDraft,
} from '../models/health-appointment.models';
import type { HealthAppointmentApi } from '../models/health-appointment-api.models';
import {
  apiToHealthAppointment,
  draftToCreateApi,
} from './health-appointment-api.mapper';

const STORAGE_KEY = 'pequi.health_appointments';

@Injectable({ providedIn: 'root' })
export class HealthAppointmentService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/v1/patients/me/appointments`;

  private readonly appointmentsSignal = signal<HealthAppointment[]>(this.loadFromStorage());

  readonly appointments = this.appointmentsSignal.asReadonly();

  findById(id: string): HealthAppointment | undefined {
    return this.appointmentsSignal().find((appointment) => appointment.id === id);
  }

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.syncFromApi().subscribe({ error: () => undefined });
    }
  }

  /** Data da última consulta realizada com dose supervisionada registrada. */
  getLastSupervisedDoseDate(): string | null {
    let latest: string | null = null;

    for (const appointment of this.appointmentsSignal()) {
      if (!appointment.performed || !appointment.followUp?.supervisedDose) {
        continue;
      }

      const date = appointment.appointmentDate?.trim();
      if (!date) continue;
      if (!latest || date > latest) {
        latest = date;
      }
    }

    return latest;
  }

  syncFromApi(): Observable<HealthAppointment[]> {
    if (!this.authService.isAuthenticated()) {
      return of(this.appointmentsSignal());
    }

    return this.http.get<HealthAppointmentApi[]>(this.baseUrl).pipe(
      map((rows) => rows.map(apiToHealthAppointment)),
      tap((items) => {
        this.appointmentsSignal.set(items);
        this.persist(items);
      }),
    );
  }

  /** Persistência local (fallback ou usuário sem login). */
  saveFromDraftLocal(draft: HealthAppointmentDraft, existingId?: string): HealthAppointment {
    return this.saveLocalFromDraft(draft, existingId);
  }

  saveFromDraft(
    draft: HealthAppointmentDraft,
    existingId?: string
  ): Observable<HealthAppointment> {
    if (!this.authService.isAuthenticated()) {
      return of(this.saveLocalFromDraft(draft, existingId));
    }

    const body = draftToCreateApi(draft);
    const request$ = existingId
      ? this.http.patch<HealthAppointmentApi>(`${this.baseUrl}/${existingId}`, body)
      : this.http.post<HealthAppointmentApi>(this.baseUrl, body);

    return request$.pipe(
      map(apiToHealthAppointment),
      tap((record) => this.upsertAppointment(record)),
    );
  }

  private upsertAppointment(record: HealthAppointment): void {
    const withoutDuplicate = this.appointmentsSignal().filter((a) => a.id !== record.id);
    const next = [record, ...withoutDuplicate];
    this.appointmentsSignal.set(next);
    this.persist(next);
  }

  private saveLocalFromDraft(draft: HealthAppointmentDraft, existingId?: string): HealthAppointment {
    const performed = draft.performed === true;
    const followUp = performed ? this.buildFollowUpFromDraft(draft) : undefined;
    const previous = existingId ? this.findById(existingId) : undefined;
    const record: HealthAppointment = {
      id: existingId ?? crypto.randomUUID(),
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
      createdAt: previous?.createdAt ?? new Date().toISOString(),
    };

    this.upsertAppointment(record);
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
