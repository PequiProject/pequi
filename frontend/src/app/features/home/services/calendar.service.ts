import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/v1/calendar';

  getMonthSummary(year: number, month: number): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(`${this.apiUrl}/summary?year=${year}&month=${month}`);
  }

  getDayDetails(date: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/day-details?target_date=${date}`);
  }
}