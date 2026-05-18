import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckinStepIntensityComponent } from './checkin-step-intensity-component';

describe('CheckinStepIntensityComponent', () => {
  let component: CheckinStepIntensityComponent;
  let fixture: ComponentFixture<CheckinStepIntensityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinStepIntensityComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckinStepIntensityComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
