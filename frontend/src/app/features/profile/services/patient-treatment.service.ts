import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import type {
  ActiveTreatmentApi,
  DoseLogCreateApi,
  DoseLogResponseApi,
  MedicationChecklistApi,
  PatientTreatmentRecordApi,
} from '../models/patient-treatment-api.models';
import type { PatientTreatmentData } from '../models/patient-profile.models';
import {
  apiRecordToTreatmentData,
  treatmentDataToApiRecord,
} from './patient-treatment-api.mapper';

@Injectable({ providedIn: 'root' })
export class PatientTreatmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/patients/me`;

  private readonly activeTreatmentIdSignal = signal<string | null>(null);
  private readonly canRegisterDosesSignal = signal(false);

  readonly activeTreatmentId = this.activeTreatmentIdSignal.asReadonly();
  readonly canRegisterDoses = this.canRegisterDosesSignal.asReadonly();

  loadTreatmentRecord(): Observable<PatientTreatmentData> {
    return this.http.get<PatientTreatmentRecordApi>(`${this.baseUrl}/treatment-record`).pipe(
      map((record) => apiRecordToTreatmentData(record)),
      tap(() => this.refreshActiveTreatment()),
    );
  }

  saveTreatmentRecord(data: PatientTreatmentData): Observable<PatientTreatmentData> {
    const body = treatmentDataToApiRecord(data);
    return this.http.put<PatientTreatmentRecordApi>(`${this.baseUrl}/treatment-record`, body).pipe(
      switchMap((record) =>
        this.getMedicationChecklist().pipe(map(() => apiRecordToTreatmentData(record)))
      ),
    );
  }

  getMedicationChecklist(): Observable<MedicationChecklistApi> {
    return this.http
      .get<MedicationChecklistApi>(`${this.baseUrl}/medication-checklist`)
      .pipe(tap((response) => this.applyChecklistMeta(response)));
  }

  getActiveTreatment(): Observable<ActiveTreatmentApi | null> {
    return this.http
      .get<ActiveTreatmentApi | null>(`${this.baseUrl}/active-treatment`)
      .pipe(
        tap((treatment) => {
          this.activeTreatmentIdSignal.set(treatment?.id ?? null);
          this.canRegisterDosesSignal.set(treatment?.status === 'active');
        }),
      );
  }

  registerDose(
    treatmentId: string,
    payload: DoseLogCreateApi
  ): Observable<DoseLogResponseApi> {
    return this.http.post<DoseLogResponseApi>(
      `${environment.apiUrl}/v1/treatments/${treatmentId}/doses`,
      payload
    );
  }

  /** Dose diária em casa — tela Remédios. */
  registerTakenDose(drugName: string): Observable<DoseLogResponseApi | null> {
    return this.registerDoseForTreatment(drugName, { supervised: false, via_consultation: false });
  }

  /** Dose supervisionada — somente ao registrar consulta realizada. */
  registerSupervisedDosesFromConsultation(
    drugNames: string[]
  ): Observable<DoseLogResponseApi[]> {
    const names = drugNames.map((name) => name.trim()).filter(Boolean);
    if (names.length === 0) {
      return of([]);
    }

    const requests = names.map((drugName) =>
      this.registerDoseForTreatment(drugName, {
        supervised: true,
        via_consultation: true,
      })
    );

    return forkJoin(requests).pipe(
      map((results) => results.filter((result): result is DoseLogResponseApi => result !== null))
    );
  }

  private registerDoseForTreatment(
    drugName: string,
    options: { supervised: boolean; via_consultation: boolean }
  ): Observable<DoseLogResponseApi | null> {
    const treatmentId = this.activeTreatmentIdSignal();
    if (!treatmentId || !this.canRegisterDosesSignal()) {
      return of(null);
    }

    const now = new Date();
    const expectedAt = startOfLocalDayIso(now);

    return this.registerDose(treatmentId, {
      drug_name: drugName,
      expected_at: expectedAt,
      taken_at: now.toISOString(),
      skipped: false,
      skip_reason: null,
      supervised: options.supervised,
      via_consultation: options.via_consultation,
    });
  }

  refreshActiveTreatment(): void {
    this.getActiveTreatment().subscribe({ error: () => undefined });
  }

  private applyChecklistMeta(response: MedicationChecklistApi): void {
    this.activeTreatmentIdSignal.set(response.active_treatment_id);
    this.canRegisterDosesSignal.set(response.can_register_doses);
  }
}

function startOfLocalDayIso(date: Date): string {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0, 0);
  return local.toISOString();
}
