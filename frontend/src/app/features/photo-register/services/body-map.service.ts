import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { BodyArea, BodyMapFinding, BodyMapUpdatePayload } from '../../../models/body-map.models';

@Injectable({
  providedIn: 'root'
})
export class BodyMapService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listBodyAreas(): Observable<BodyArea[]> {
    return this.http.get<BodyArea[]>(`${this.apiUrl}/v1/body-areas`);
  }

  getBodyMap(): Observable<BodyMapFinding[]> {
    return this.http.get<BodyMapFinding[]>(`${this.apiUrl}/v1/body-map`);
  }

  updateBodyMap(payload: BodyMapUpdatePayload): Observable<BodyMapFinding> {
    return this.http.put<BodyMapFinding>(`${this.apiUrl}/v1/body-map`, payload);
  }

  getBodyMapHistory(): Observable<BodyMapFinding[]> {
    return this.http.get<BodyMapFinding[]>(`${this.apiUrl}/v1/body-map/history`);
  }

  createUploadUrl(payload: { filename: string, contentType: string }): Observable<{ uploadUrl: string, fileUrl: string }> {
    return this.http.post<any>(`${this.apiUrl}/v1/body-map/upload`, payload);
  }
}