import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckinStepSymptomsComponent } from './checkin-step-symptoms-component';

describe('CheckinStepSymptomsComponent', () => {
  let component: CheckinStepSymptomsComponent;
  let fixture: ComponentFixture<CheckinStepSymptomsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinStepSymptomsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckinStepSymptomsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
