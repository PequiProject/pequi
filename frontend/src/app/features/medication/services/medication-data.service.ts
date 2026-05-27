import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import type { PatientTreatmentData } from '../../profile/models/patient-profile.models';

export interface MedicationChecklistResponse {
  institutedMedications: PatientTreatmentData['institutedMedications'];
  currentDoseMedication: PatientTreatmentData['currentDoseMedication'];
}

@Injectable({
  providedIn: 'root',
})
export class MedicationDataService {
  getMedicationChecklist(): Observable<MedicationChecklistResponse> {
    const mockResponse: MedicationChecklistResponse = {
      institutedMedications: [
        {
          name: 'Suplemento Noturno',
          dose: '500',
          unit: 'mg',
          frequency: '08:00 PM',
        },
        {
          name: 'Vitamina Matinal',
          dose: '1',
          unit: 'Unidade',
          frequency: '08:00 AM',
        },
      ],
      currentDoseMedication: 'Rifampicina + Clofazimina',
    };

    return of(mockResponse);
  }
}