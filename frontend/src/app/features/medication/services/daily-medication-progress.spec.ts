import { TestBed } from '@angular/core/testing';

import { DailyMedicationProgress } from './daily-medication-progress.service';

describe('DailyMedicationProgress', () => {
  let service: DailyMedicationProgress;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DailyMedicationProgress);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
