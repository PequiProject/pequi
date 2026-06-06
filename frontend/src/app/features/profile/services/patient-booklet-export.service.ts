import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth-service';
import { HealthAppointmentService } from '../../appointments/services/health-appointment.service';
import type { AccountExportDoseLog } from '../utils/booklet-export-data.utils';
import { buildBookletData } from '../utils/booklet-export-data.utils';
import { buildBookletHtml } from '../utils/booklet-html.builder';
import { PatientProfileService } from './patient-profile.service';

interface AccountExportResponse {
  dose_logs?: AccountExportDoseLog[];
}

@Injectable({ providedIn: 'root' })
export class PatientBookletExportService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(PatientProfileService);
  private readonly appointmentService = inject(HealthAppointmentService);

  exportAndDownload(): Observable<void> {
    return this.loadSources().pipe(
      tap(({ doseLogs }) => {
        const data = buildBookletData(
          this.profileService.profile(),
          this.appointmentService.appointments(),
          doseLogs
        );
        this.triggerDownload(buildBookletHtml(data));
      }),
      map(() => undefined)
    );
  }

  private loadSources(): Observable<{ doseLogs: AccountExportDoseLog[] }> {
    const appointments$ = this.authService.isAuthenticated()
      ? this.appointmentService.syncFromApi().pipe(
          map(() => undefined),
          catchError(() => of(undefined))
        )
      : of(undefined);

    const profile$ = this.authService.isAuthenticated()
      ? forkJoin([
          this.profileService.syncPersonalFromApi().pipe(
            map(() => undefined),
            catchError(() => of(undefined))
          ),
          this.profileService.syncTreatmentFromApi().pipe(
            map(() => undefined),
            catchError(() => of(undefined))
          ),
        ])
      : of(undefined);

    const doseLogs$ = this.authService.isAuthenticated()
      ? this.http.get<AccountExportResponse>(`${environment.apiUrl}/v1/account/export`).pipe(
          map((body) => body.dose_logs ?? []),
          catchError(() => of([] as AccountExportDoseLog[]))
        )
      : of([] as AccountExportDoseLog[]);

    return forkJoin([appointments$, profile$, doseLogs$]).pipe(
      switchMap(([, , doseLogs]) => of({ doseLogs }))
    );
  }

  private triggerDownload(html: string): void {
    const datePart = new Date().toISOString().slice(0, 10);
    const filename = `cartilha-hanseniase-${datePart}.html`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(blobUrl);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 400);
    }
  }
}
