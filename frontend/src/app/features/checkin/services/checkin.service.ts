import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import type { CheckinCreate, CheckinResponse, SymptomResponse } from '../models/checkin.models';

const NO_SYMPTOM_VALUE = 'nenhum sintoma';

@Injectable({
  providedIn: 'root',
})
export class CheckinService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listSymptoms(): Observable<SymptomResponse[]> {
    return this.http.get<SymptomResponse[]>(`${this.apiUrl}/v1/symptoms`);
  }

  submit(payload: CheckinCreate): Observable<CheckinResponse> {
    return this.http.post<CheckinResponse>(`${this.apiUrl}/v1/checkins`, payload);
  }

  resolveSymptomIds(selectedSlugs: string[], catalog: SymptomResponse[]): string[] {
    if (selectedSlugs.includes(NO_SYMPTOM_VALUE)) {
      const noneSymptom = catalog.find(symptom =>
        this.normalize(symptom.name).includes('nenhum'),
      );
      return noneSymptom ? [noneSymptom.id] : [];
    }

    const ids: string[] = [];

    for (const slug of selectedSlugs) {
      const normalizedSlug = this.normalize(slug);
      const match = catalog.find(symptom => this.normalize(symptom.name) === normalizedSlug);

      if (match) {
        ids.push(match.id);
      }
    }

    return ids;
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }
}
