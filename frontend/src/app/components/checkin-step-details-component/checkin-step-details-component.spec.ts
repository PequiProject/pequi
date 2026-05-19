import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckinStepDetailsComponent } from './checkin-step-details-component';

describe('CheckinStepDetailsComponent', () => {
  let component: CheckinStepDetailsComponent;
  let fixture: ComponentFixture<CheckinStepDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinStepDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckinStepDetailsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
