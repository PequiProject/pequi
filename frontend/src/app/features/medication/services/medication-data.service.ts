import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import type { PatientTreatmentData } from '../../profile/models/patient-profile.models';

export type WeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface MedicationAlarmConfig {
  days: WeekdayKey[];
  time: string;
}

export interface MedicationAlarmPayload {
  medicationName: string;
  dosage: string;
  message: string;
  schedule: MedicationAlarmConfig;
}

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

  saveMedicationAlarm(payload: MedicationAlarmPayload): Observable<MedicationAlarmPayload> {
    console.log('Payload de alarme da medicação:', payload);
    return of(payload);
  }
}