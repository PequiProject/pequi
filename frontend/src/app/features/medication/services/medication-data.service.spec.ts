import { TestBed } from '@angular/core/testing';

import { MedicationDataService } from './medication-data.service';

describe('MedicationData', () => {
  let service: MedicationDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MedicationDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
