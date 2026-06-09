import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

export interface DailyMedicationProgressUpsertPayload {
  progress_date: string;
  expected_count: number;
  taken_count: number;
}

export interface DailyMedicationProgressResponse {
  id: string;
  patient_id: string;
  progress_date: string;
  expected_count: number;
  taken_count: number;
  created_at: string;
  updated_at: string;
}

export interface DailyMedicationSummaryResponse {
  progress_date: string;
  expected_count: number;
  taken_count: number;
  remaining_count: number;
  completed: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DailyMedicationProgressService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  upsert(
    payload: DailyMedicationProgressUpsertPayload
  ): Observable<DailyMedicationProgressResponse> {
    return this.http.put<DailyMedicationProgressResponse>(
      `${this.apiUrl}/v1/patients/me/daily-medication-progress`,
      payload
    );
  }

  getSummary(progressDate: string): Observable<DailyMedicationSummaryResponse> {
    const params = new HttpParams().set('progress_date', progressDate);

    return this.http.get<DailyMedicationSummaryResponse>(
      `${this.apiUrl}/v1/patients/me/daily-medication-progress`,
      { params }
    );
  }
}