import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { JourneyEvent, JourneyEventStatus, JourneyEventType, LeprosyType } from '../journey';
import { environment } from '../../../../environments/environment';

export interface JourneyPatient {
  id: string;
  name: string;
  leprosyType: LeprosyType;
  treatmentStartDate: string;
}

export interface JourneyData {
  patient: JourneyPatient;
  events: JourneyEvent[];
  months: JourneyApiMonth[];
  summary: JourneyApiSummary | null;
}

export interface JourneyApiSummary {
  patient_id: string;
  user_id: string;
  display_name: string | null;
  classification: LeprosyType | null;
  diagnosis_date: string | null;
  treatment_start_date: string | null;
  estimated_end_date: string | null;
  treatment_status: string | null;
  treatment_duration_months: number;
  total_days: number;
  elapsed_days: number;
  remaining_days: number;
  progress_percent: number;
  current_month: number;
}

export interface JourneyApiMedicationSummary {
  doses_taken: number;
  doses_expected: number;
  adherence_percent: number;
}

export interface JourneyApiEvent {
  id: string;
  type: JourneyEventType;
  title: string;
  description: string;
  date: string;
  status: JourneyEventStatus;
  metadata?: {
    dosesTaken?: number;
    dosesExpected?: number;
    adherencePercent?: number;
    symptomTrend?: 'improved' | 'stable' | 'worsened';
    consultationLocation?: string;
    location?: string;
    professional?: string | null;
    appointment_type?: string;
    performed?: boolean;
    follow_up?: Record<string, unknown> | null;
  };
}

export interface JourneyApiMonth {
  month_index: number;
  label: string;
  start_date: string;
  end_date: string;
  status: 'completed' | 'current' | 'upcoming';
  medication_summary: JourneyApiMedicationSummary;
  events: JourneyApiEvent[];
}

export interface JourneyApiResponse {
  summary: JourneyApiSummary;
  months: JourneyApiMonth[];
}

@Injectable({
  providedIn: 'root',
})
export class JourneyService {
    private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly journeyDataState = signal<JourneyData>(this.buildEmptyJourneyData());
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly journeyData = computed(() => this.journeyDataState());
  readonly patient = computed(() => this.journeyDataState().patient);
  readonly events = computed(() => this.journeyDataState().events);
  readonly months = computed(() => this.journeyDataState().months);
  readonly summary = computed(() => this.journeyDataState().summary);
  readonly isLoading = computed(() => this.loadingState());
  readonly error = computed(() => this.errorState());

  loadJourney(): void {
    console.log('loadJourney chamado');
    this.loadingState.set(true);
    this.errorState.set(null);

    this.http.get<JourneyApiResponse>(`${this.apiUrl}/v1/patients/me/journey`).subscribe({
      next: (response) => {
        console.log('Resposta da API:', response);
        this.journeyDataState.set(this.mapApiResponse(response));
        this.loadingState.set(false);
      },
      error: (err) => {
        console.error('Erro na API:', err);
        this.loadingState.set(false);
        this.errorState.set('Não foi possível carregar a jornada neste momento.');
      },
    });
  }

  updateJourneyData(data: JourneyData): void {
    this.journeyDataState.set(data);
  }

  resetState(): void {
    this.journeyDataState.set(this.buildEmptyJourneyData());
    this.errorState.set(null);
  }

  private mapApiResponse(response: JourneyApiResponse): JourneyData {
    console.log('Entrou no mapApiResponse');
    console.log('Response:', response);
    const patient: JourneyPatient = {
      id: response.summary.patient_id,
      name: response.summary.display_name?.trim() || 'Paciente',
      leprosyType: response.summary.classification ?? 'PB',
      treatmentStartDate: response.summary.treatment_start_date ?? '',
    };

    const events = response.months
      .flatMap((month) =>
        month.events.map((event) => this.mapEvent(event, month.month_index))
      )
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));

    console.log("PATIENT AND EVENTS: ", patient, events);

    return {
      patient,
      events,
      months: response.months,
      summary: response.summary,
    };
  }

  private mapEvent(event: JourneyApiEvent, monthIndex: number): JourneyEvent {
    return {
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      date: event.date,
      monthIndex,
      status: event.status,
      metadata: {
        dosesTaken: event.metadata?.dosesTaken,
        dosesExpected: event.metadata?.dosesExpected,
        symptomTrend: event.metadata?.symptomTrend,
        consultationLocation:
          event.metadata?.consultationLocation ?? event.metadata?.location,
      },
    };
  }

  private buildEmptyJourneyData(): JourneyData {
    return {
      patient: {
        id: '',
        name: '',
        leprosyType: '',
        treatmentStartDate: '',
      },
      events: [],
      months: [],
      summary: null,
    };
  }
}