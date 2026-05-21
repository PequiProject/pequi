import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RegisterAppointmentComponent } from './register-appointment';

describe('RegisterAppointmentComponent', () => {
  let fixture: ComponentFixture<RegisterAppointmentComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RegisterAppointmentComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterAppointmentComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('starts on basics step', () => {
    expect(fixture.componentInstance.currentStepId()).toBe('basics');
  });

  it('always has three wizard steps', () => {
    expect(fixture.componentInstance.wizardStepCount).toBe(3);
  });

  it('goes to summary from step 2 when appointment not performed', () => {
    const component = fixture.componentInstance;
    component.basicsForm.patchValue({
      appointmentDate: '2026-05-20',
      appointmentTime: '10:00',
      location: 'UBS',
      type: 'exame',
      professional: 'Dr. A',
    });
    component.nextStep();
    component.onPerformedChange(false);
    component.nextStep();
    expect(component.currentStepId()).toBe('summary');
    expect(component.currentStepIndex()).toBe(2);
  });
});
