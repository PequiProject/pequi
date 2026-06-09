import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import type { PatientTreatmentData } from '../../profile/models/patient-profile.models';
import { AuthService } from '../../auth/services/auth-service';
import { PatientProfileService } from '../../profile/services/patient-profile.service';
import { PatientTreatmentService } from '../../profile/services/patient-treatment.service';

export type WeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface MedicationChecklistResponse {
  institutedMedications: PatientTreatmentData['institutedMedications'];
  currentDoseMedication: PatientTreatmentData['currentDoseMedication'];
  treatmentStartDate: PatientTreatmentData['treatmentStartDate'];
  canRegisterDoses: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MedicationDataService {
  private readonly authService = inject(AuthService);
  private readonly treatmentApi = inject(PatientTreatmentService);
  private readonly profileService = inject(PatientProfileService);

  getMedicationChecklist(): Observable<MedicationChecklistResponse> {
    const local = this.profileService.profile().treatment;

    if (!this.authService.isAuthenticated()) {
      return of(this.fromLocalTreatment(local));
    }

    return this.treatmentApi.getMedicationChecklist().pipe(
      map((api) => ({
        institutedMedications: api.instituted_medications.map((item) => ({
          name: item.name,
          dose: item.dose ?? '',
          unit: item.unit ?? 'mg',
          frequency: item.frequency ?? 'dia',
        })),
        currentDoseMedication: api.current_dose_medication ?? '',
        treatmentStartDate: api.treatment_start_date ?? local.treatmentStartDate ?? '',
        canRegisterDoses: api.can_register_doses,
      })),
      catchError(() => of(this.fromLocalTreatment(this.profileService.profile().treatment))),
    );
  }

  private fromLocalTreatment(treatment: PatientTreatmentData): MedicationChecklistResponse {
    return {
      institutedMedications: treatment.institutedMedications ?? [],
      currentDoseMedication: treatment.currentDoseMedication ?? '',
      treatmentStartDate: treatment.treatmentStartDate ?? '',
      canRegisterDoses: !!this.treatmentApi.activeTreatmentId(),
    };
  }
}