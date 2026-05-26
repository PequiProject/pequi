import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicationFormModal } from './medication-form-modal';

describe('MedicationFormModal', () => {
  let component: MedicationFormModal;
  let fixture: ComponentFixture<MedicationFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicationFormModal],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicationFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
