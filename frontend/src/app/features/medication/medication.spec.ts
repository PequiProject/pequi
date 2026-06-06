import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi, type Mocked } from 'vitest';

import { PatientTreatmentService } from '../profile/services/patient-treatment.service';
import { Medication } from './medication';
import {
  MedicationDataService,
  type MedicationChecklistResponse,
} from './services/medication-data.service';
import { MedicationIntakeService } from './services/medication-intake.service';

describe('Medication', () => {
  let component: Medication;
  let fixture: ComponentFixture<Medication>;
  let medicationDataServiceSpy: Mocked<MedicationDataService>;
  let intakeService: MedicationIntakeService;

  const mockResponse: MedicationChecklistResponse = {
    institutedMedications: [
      {
        name: 'Dapsona',
        dose: '100',
        unit: 'mg',
        frequency: '8/8h',
      },
    ],
    currentDoseMedication: 'Rifampicina + Clofazimina',
    treatmentStartDate: '2026-06-04',
    canRegisterDoses: false,
  };

  beforeEach(async () => {
    localStorage.clear();

    medicationDataServiceSpy = {
      getMedicationChecklist: vi.fn().mockReturnValue(of(mockResponse)),
      saveMedicationAlarm: vi.fn().mockReturnValue(of(void 0)),
    } as Mocked<MedicationDataService>;

    await TestBed.configureTestingModule({
      imports: [Medication],
      providers: [
        provideRouter([]),
        { provide: MedicationDataService, useValue: medicationDataServiceSpy },
        {
          provide: PatientTreatmentService,
          useValue: {
            registerTakenDose: vi.fn().mockReturnValue(of(null)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Medication);
    component = fixture.componentInstance;
    intakeService = TestBed.inject(MedicationIntakeService);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load medication checklist on init', () => {
    fixture.detectChanges();

    expect(medicationDataServiceSpy.getMedicationChecklist).toHaveBeenCalled();
    expect(component.unsupervisedItems.length).toBe(3);
    expect(component.unsupervisedItems[0].dosesPerDay).toBe(3);
    expect(component.unsupervisedItems[0].doseTime).toBe('00:00');
    expect(component.unsupervisedItems[1].doseTime).toBe('08:00');
    expect(component.supervisedItems[0].nextSupervisedDoseLabel).toContain('dose');
  });

  it('persists intake when marking after scheduled time', () => {
    const now = new Date(2026, 5, 4, 14, 0, 0);
    vi.setSystemTime(now);

    fixture.detectChanges();
    const item = component.unsupervisedItems[0];
    expect(item.canToggle).toBe(true);

    component.toggleUnsupervised(item.id);
    expect(component.unsupervisedItems[0].checked).toBe(true);
    expect(intakeService.isSlotTaken(item.storageKey, '2026-06-04_08:00')).toBe(true);

    component.toggleUnsupervised(item.id);
    expect(component.unsupervisedItems[0].checked).toBe(false);
    expect(intakeService.isSlotTaken(item.storageKey, '2026-06-04_08:00')).toBe(false);

    vi.useRealTimers();
  });
});
