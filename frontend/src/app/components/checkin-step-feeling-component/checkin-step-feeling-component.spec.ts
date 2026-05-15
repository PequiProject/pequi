import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckinStepFeelingComponent } from './checkin-step-feeling-component';

describe('CheckinStepFeelingComponent', () => {
  let component: CheckinStepFeelingComponent;
  let fixture: ComponentFixture<CheckinStepFeelingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinStepFeelingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckinStepFeelingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
