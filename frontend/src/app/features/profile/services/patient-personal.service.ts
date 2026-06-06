import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import type { PatientPersonalData } from '../models/patient-profile.models';
import type {
  ChangePasswordApi,
  PatientPersonalRecordApi,
} from '../models/patient-personal-api.models';
import {
  apiRecordToPersonalData,
  personalDataToApiRecord,
} from './patient-personal-api.mapper';

@Injectable({ providedIn: 'root' })
export class PatientPersonalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/patients/me`;
  private readonly accountUrl = `${environment.apiUrl}/v1/account`;

  loadPersonalRecord(fullName: string): Observable<PatientPersonalData> {
    return this.http.get<PatientPersonalRecordApi>(`${this.baseUrl}/personal-record`).pipe(
      map((record) => apiRecordToPersonalData(record, fullName))
    );
  }

  savePersonalRecord(
    data: PatientPersonalData,
    fullName: string
  ): Observable<PatientPersonalData> {
    const body = personalDataToApiRecord(data, fullName);
    return this.http
      .put<PatientPersonalRecordApi>(`${this.baseUrl}/personal-record`, body)
      .pipe(map((record) => apiRecordToPersonalData(record, fullName)));
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<void> {
    const body: ChangePasswordApi = {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    };
    return this.http.post<void>(`${this.accountUrl}/password`, body);
  }
}
