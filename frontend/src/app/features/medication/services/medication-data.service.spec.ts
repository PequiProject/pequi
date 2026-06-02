import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import {
  MedicationDataService,
  type MedicationChecklistResponse,
} from './medication-data.service';

describe('MedicationDataService', () => {
  let service: MedicationDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MedicationDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return medication checklist mock data', async () => {
    const response: MedicationChecklistResponse =
      await firstValueFrom(service.getMedicationChecklist());

    expect(response).toBeTruthy();
    expect(response.currentDoseMedication).toBe(
      'Rifampicina + Clofazimina'
    );

    expect(response.institutedMedications.length).toBe(2);

    expect(response.institutedMedications[0]).toEqual({
      name: 'Suplemento Noturno',
      dose: '500',
      unit: 'mg',
      frequency: '08:00 PM',
    });

    expect(response.institutedMedications[1]).toEqual({
      name: 'Vitamina Matinal',
      dose: '1',
      unit: 'Unidade',
      frequency: '08:00 AM',
    });
  });
});