import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi, type Mocked } from 'vitest';

import { Medication } from './medication';
import {
  MedicationDataService,
  type MedicationChecklistResponse,
} from './services/medication-data.service';

describe('Medication', () => {
  let component: Medication;
  let fixture: ComponentFixture<Medication>;
  let medicationDataServiceSpy: Mocked<MedicationDataService>;

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

  beforeEach(async () => {
    medicationDataServiceSpy = {
      getMedicationChecklist: vi.fn().mockReturnValue(of(mockResponse)),
    } as Mocked<MedicationDataService>;

    await TestBed.configureTestingModule({
      imports: [Medication],
      providers: [
        { provide: MedicationDataService, useValue: medicationDataServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Medication);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load medication checklist on init', () => {
    fixture.detectChanges();

    expect(medicationDataServiceSpy.getMedicationChecklist).toHaveBeenCalled();
    expect(component.unsupervisedItems.length).toBe(2);
    expect(component.supervisedItems.length).toBe(1);
  });

  it('should map unsupervised medications correctly', () => {
    fixture.detectChanges();

    expect(component.unsupervisedItems[0].title).toBe('Suplemento Noturno');
    expect(component.unsupervisedItems[0].subtitle).toBe('500 • mg • 08:00 PM');

    expect(component.unsupervisedItems[1].title).toBe('Vitamina Matinal');
    expect(component.unsupervisedItems[1].subtitle).toBe('1 • Unidade • 08:00 AM');
  });

  it('should map supervised medication correctly', () => {
    fixture.detectChanges();

    expect(component.supervisedItems[0].title).toBe('Rifampicina + Clofazimina');
    expect(component.supervisedItems[0].subtitle).toBe('');
    expect(component.supervisedItems[0].checked).toBeFalsy();
  });

  it('should toggle unsupervised item', () => {
    fixture.detectChanges();

    const itemId = component.unsupervisedItems[0].id;

    component.toggleUnsupervised(itemId);
    expect(component.unsupervisedItems[0].checked).toBeTruthy();

    component.toggleUnsupervised(itemId);
    expect(component.unsupervisedItems[0].checked).toBeFalsy();
  });

  it('should toggle supervised item', () => {
    fixture.detectChanges();

    const itemId = component.supervisedItems[0].id;

    component.toggleSupervised(itemId);
    expect(component.supervisedItems[0].checked).toBeTruthy();

    component.toggleSupervised(itemId);
    expect(component.supervisedItems[0].checked).toBeFalsy();
  });

  it('should emit checklist payload after loading data', () => {
    const emitSpy = vi.spyOn(component.checklistChange, 'emit');

    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith({
      checkedCount: 0,
      totalCount: 3,
      unsupervisedCheckedCount: 0,
      unsupervisedTotalCount: 2,
      supervisedCheckedCount: 0,
      supervisedTotalCount: 1,
    });
  });

  it('should emit updated payload when toggling unsupervised item', () => {
    fixture.detectChanges();
    const emitSpy = vi.spyOn(component.checklistChange, 'emit');

    const itemId = component.unsupervisedItems[0].id;
    component.toggleUnsupervised(itemId);

    expect(emitSpy).toHaveBeenCalledWith({
      checkedCount: 1,
      totalCount: 3,
      unsupervisedCheckedCount: 1,
      unsupervisedTotalCount: 2,
      supervisedCheckedCount: 0,
      supervisedTotalCount: 1,
    });
  });

  it('should emit updated payload when toggling supervised item', () => {
    fixture.detectChanges();
    const emitSpy = vi.spyOn(component.checklistChange, 'emit');

    const itemId = component.supervisedItems[0].id;
    component.toggleSupervised(itemId);

    expect(emitSpy).toHaveBeenCalledWith({
      checkedCount: 1,
      totalCount: 3,
      unsupervisedCheckedCount: 0,
      unsupervisedTotalCount: 2,
      supervisedCheckedCount: 1,
      supervisedTotalCount: 1,
    });
  });

  it('should clear lists when service returns error', async () => {
    medicationDataServiceSpy.getMedicationChecklist.mockReturnValue(
      throwError(() => new Error('erro'))
    );

    fixture = TestBed.createComponent(Medication);
    component = fixture.componentInstance;

    fixture.detectChanges();

    expect(component.unsupervisedItems.length).toBe(0);
    expect(component.supervisedItems.length).toBe(0);
    expect(component.isLoading).toBeFalsy();
  });

  it('should return item id in trackById', () => {
    const item = {
      id: 'abc123',
      title: 'Teste',
      subtitle: 'Sub',
      checked: false,
      section: 'unsupervised' as const,
    };

    expect(component.trackById(0, item)).toBe('abc123');
  });
});