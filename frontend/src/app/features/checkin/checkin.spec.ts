import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { vi } from 'vitest';

import { CheckinComponent } from './checkin';
import { CheckinStepFeelingComponent } from '../../components/checkin-step-feeling-component/checkin-step-feeling-component';
import { CheckinStepSymptomsComponent } from '../../components/checkin-step-symptoms-component/checkin-step-symptoms-component';
import { CheckinStepIntensityComponent } from '../../components/checkin-step-intensity-component/checkin-step-intensity-component';
import { CheckinStepDetailsComponent } from '../../components/checkin-step-details-component/checkin-step-details-component';

@Component({
  selector: 'app-checkin-step-feeling-component',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<div data-testid="feeling-step">Feeling step</div>`,
})
class CheckinStepFeelingStubComponent {
  @Input({ required: true }) form!: FormGroup;
}

@Component({
  selector: 'app-checkin-step-symptoms-component',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<div data-testid="symptoms-step">Symptoms step</div>`,
})
class CheckinStepSymptomsStubComponent {
  @Input({ required: true }) form!: FormGroup;
}

@Component({
  selector: 'app-checkin-step-intensity-component',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<div data-testid="intensity-step">Intensity step</div>`,
})
class CheckinStepIntensityStubComponent {
  @Input({ required: true }) form!: FormGroup;
}

@Component({
  selector: 'app-checkin-step-details-component',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<div data-testid="details-step">Details step</div>`,
})
class CheckinStepDetailsStubComponent {
  @Input({ required: true }) form!: FormGroup;
}

describe(CheckinComponent.name, () => {
  let fixture: ComponentFixture<CheckinComponent>;
  let component: CheckinComponent;
  let router: { navigate: ReturnType<typeof vi.fn> };

  const getByTestId = (testId: string) =>
    fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));

  const getButtons = () =>
    fixture.debugElement.queryAll(By.css('button')).map(btn => btn.nativeElement as HTMLButtonElement);

beforeEach(async () => {
  router = {
    navigate: vi.fn(),
  };

  await TestBed.configureTestingModule({
    imports: [CheckinComponent],
    providers: [{ provide: Router, useValue: router }],
  })
    .overrideComponent(CheckinComponent, {
      remove: {
        imports: [
          CheckinStepFeelingComponent,
          CheckinStepSymptomsComponent,
          CheckinStepIntensityComponent,
          CheckinStepDetailsComponent,
        ],
      },
      add: {
        imports: [
          CheckinStepFeelingStubComponent,
          CheckinStepSymptomsStubComponent,
          CheckinStepIntensityStubComponent,
          CheckinStepDetailsStubComponent,
        ],
      },
    })
    .compileComponents();

  fixture = TestBed.createComponent(CheckinComponent);
  component = fixture.componentInstance;
  fixture.detectChanges();
});

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start on step 1', () => {
    expect(component.currentStep()).toBe(1);
    expect(component.currentStepNumber()).toBe(1);
  });

  it('should render title and progress text', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Check-in');
    expect(text).toContain('Etapa 1 de 4');
    expect(text).toContain('Progresso Diário');
  });

  it('should calculate initial progress as 25', () => {
    expect(component.progressPercentage()).toBe(25);
  });

  it('should render feeling step initially', () => {
    expect(getByTestId('feeling-step')).toBeTruthy();
    expect(getByTestId('symptoms-step')).toBeNull();
    expect(getByTestId('intensity-step')).toBeNull();
    expect(getByTestId('details-step')).toBeNull();
  });

  it('should disable previous button on step 1', () => {
    const [prevButton] = getButtons();
    expect(prevButton.disabled).toBeTruthy();
  });

  it('should disable next button when current step is invalid', () => {
    const [, nextButton] = getButtons();
    expect(component.isCurrentStepInvalid()).toBeTruthy();
    expect(nextButton.disabled).toBeTruthy();
  });

  it('should expose subforms correctly', () => {
    expect(component.feelingForm).toBeTruthy();
    expect(component.symptomsForm).toBeTruthy();
    expect(component.intensityForm).toBeTruthy();
    expect(component.detailsForm).toBeTruthy();
  });

  it('should identify active and completed steps correctly', () => {
    expect(component.isStepActive(1)).toBeTruthy();
    expect(component.isStepCompleted(1)).toBeFalsy();
    expect(component.isStepCompleted(2)).toBeFalsy();

    component.currentStep.set(3);

    expect(component.isStepActive(3)).toBeTruthy();
    expect(component.isStepCompleted(1)).toBeTruthy();
    expect(component.isStepCompleted(2)).toBeTruthy();
    expect(component.isStepCompleted(3)).toBeFalsy();
  });

  it('should allow going back to a previous step', () => {
    component.currentStep.set(3);

    component.goToStep(2);

    expect(component.currentStep()).toBe(2);
  });

  it('should not allow going to a future step with goToStep', () => {
    component.currentStep.set(2);

    component.goToStep(4);

    expect(component.currentStep()).toBe(2);
  });

  it('should not advance from step 1 when feeling form is invalid', () => {
    component.nextStep();

    expect(component.currentStep()).toBe(1);
    expect(component.feelingForm.touched).toBeTruthy();
  });

  it('should advance from step 1 to step 2 when feeling form is valid', () => {
    component.feelingForm.get('mood')?.setValue('happy');

    component.nextStep();

    expect(component.currentStep()).toBe(2);
  });

  it('should render symptoms step on step 2', () => {
    component.feelingForm.get('mood')?.setValue('happy');
    component.nextStep();
    fixture.detectChanges();

    expect(getByTestId('feeling-step')).toBeNull();
    expect(getByTestId('symptoms-step')).toBeTruthy();
    expect(getByTestId('intensity-step')).toBeNull();
    expect(getByTestId('details-step')).toBeNull();
  });

  it('should not advance from step 2 when symptoms form is invalid', () => {
    component.currentStep.set(2);
    fixture.detectChanges();

    component.nextStep();

    expect(component.currentStep()).toBe(2);
    expect(component.symptomsForm.touched).toBeTruthy();
  });

  it('should advance from step 2 to step 3 when symptoms form is valid', () => {
    component.currentStep.set(2);
    component.symptomsForm.get('selectedSymptoms')?.setValue(['cough']);
    fixture.detectChanges();

    component.nextStep();

    expect(component.currentStep()).toBe(3);
  });

  it('should render intensity step on step 3', () => {
    component.currentStep.set(3);
    fixture.detectChanges();

    expect(getByTestId('feeling-step')).toBeNull();
    expect(getByTestId('symptoms-step')).toBeNull();
    expect(getByTestId('intensity-step')).toBeTruthy();
    expect(getByTestId('details-step')).toBeNull();
  });

  it('should not advance from step 3 when intensity form is invalid', () => {
    component.currentStep.set(3);
    fixture.detectChanges();

    component.nextStep();

    expect(component.currentStep()).toBe(3);
    expect(component.intensityForm.touched).toBeTruthy();
  });

  it('should advance from step 3 to step 4 when intensity form is valid', () => {
    component.currentStep.set(3);
    component.intensityForm.get('scale')?.setValue(4);
    fixture.detectChanges();

    component.nextStep();

    expect(component.currentStep()).toBe(4);
  });

  it('should render details step on step 4', () => {
    component.currentStep.set(4);
    fixture.detectChanges();

    expect(getByTestId('feeling-step')).toBeNull();
    expect(getByTestId('symptoms-step')).toBeNull();
    expect(getByTestId('intensity-step')).toBeNull();
    expect(getByTestId('details-step')).toBeTruthy();
  });

  it('should allow advancing to step 4 even with empty details because details is optional', () => {
    component.currentStep.set(4);
    fixture.detectChanges();

    expect(component.detailsForm.valid).toBeTruthy();
    expect(component.isCurrentStepInvalid()).toBeFalsy();
  });

  it('should go back from step 4 to step 3', () => {
    component.currentStep.set(4);

    component.prevStep();

    expect(component.currentStep()).toBe(3);
  });

  it('should go back from step 3 to step 2', () => {
    component.currentStep.set(3);

    component.prevStep();

    expect(component.currentStep()).toBe(2);
  });

  it('should go back from step 2 to step 1', () => {
    component.currentStep.set(2);

    component.prevStep();

    expect(component.currentStep()).toBe(1);
  });

  it('should not go back when already on step 1', () => {
    component.currentStep.set(1);

    component.prevStep();

    expect(component.currentStep()).toBe(1);
  });

  it('should update progress percentage for each step', () => {
    component.currentStep.set(1);
    expect(component.progressPercentage()).toBe(25);

    component.currentStep.set(2);
    expect(component.progressPercentage()).toBe(50);

    component.currentStep.set(3);
    expect(component.progressPercentage()).toBe(75);

    component.currentStep.set(4);
    expect(component.progressPercentage()).toBe(100);
  });

  it('should show "Próximo" button before last step', () => {
    component.currentStep.set(3);
    fixture.detectChanges();

    const [, nextButton] = getButtons();
    expect(nextButton.textContent?.trim()).toBe('Próximo');
  });

  it('should show "Enviar registro" button on last step', () => {
    component.currentStep.set(4);
    fixture.detectChanges();

    const [, submitButton] = getButtons();
    expect(submitButton.textContent?.trim()).toBe('Enviar registro');
  });

  it('should keep next button disabled on invalid required steps', () => {
    component.currentStep.set(1);
    fixture.detectChanges();
    let [, nextButton] = getButtons();
    expect(nextButton.disabled).toBeTruthy();

    component.currentStep.set(2);
    fixture.detectChanges();
    [, nextButton] = getButtons();
    expect(nextButton.disabled).toBeTruthy();

    component.currentStep.set(3);
    fixture.detectChanges();
    [, nextButton] = getButtons();
    expect(nextButton.disabled).toBeTruthy();
  });

it('should enable next button when step 1 becomes valid', () => {
  component.currentStep.set(1);
  component.feelingForm.get('mood')?.setValue('ok');
  fixture.detectChanges();

  const [, nextButton] = getButtons();
  expect(nextButton.disabled).toBeFalsy();
});

it('should enable next button when step 2 becomes valid', () => {
  component.currentStep.set(2);
  component.symptomsForm.get('selectedSymptoms')?.setValue(['headache']);
  fixture.detectChanges();

  const [, nextButton] = getButtons();
  expect(nextButton.disabled).toBeFalsy();
});

it('should enable next button when step 3 becomes valid', () => {
  component.currentStep.set(3);
  component.intensityForm.get('scale')?.setValue(2);
  fixture.detectChanges();

  const [, nextButton] = getButtons();
  expect(nextButton.disabled).toBeFalsy();
});

  it('should enable submit button on step 4 because details is optional', () => {
    component.currentStep.set(4);
    fixture.detectChanges();

    const [, submitButton] = getButtons();
    expect(component.isCurrentStepInvalid()).toBeFalsy();
    expect(submitButton.disabled).toBeFalsy();
  });

  it('should not submit when the full form is invalid', () => {
    component.submit();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should mark full form as touched when submit is called with invalid form', () => {
    component.submit();

    expect(component.form.touched).toBeTruthy();
  });

  it('should submit and navigate to home when form is valid', () => {
    vi.spyOn(console, 'log');


    component.feelingForm.get('mood')?.setValue('happy');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['cough']);
    component.symptomsForm.get('customSymptom')?.setValue('optional ignored');
    component.intensityForm.get('scale')?.setValue(1);
    component.detailsForm.get('notes')?.setValue('feeling well');

    component.submit();

    expect(console.log).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['home']);
  });

  it('should submit payload with only selectedSymptoms inside symptoms object', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    component.feelingForm.get('mood')?.setValue('sad');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['nausea']);
    component.symptomsForm.get('customSymptom')?.setValue('other symptom');
    component.intensityForm.get('scale')?.setValue(5);
    component.detailsForm.get('notes')?.setValue('extra notes');

    component.submit();

    expect(consoleSpy).toHaveBeenCalledWith('Payload final do check-in:', {
      feeling: { mood: 'sad' },
      symptoms: { selectedSymptoms: ['nausea'] },
      intensity: { scale: 5 },
      details: { notes: 'extra notes' },
    });
  });

  it('should follow the new flow without skipping from step 2 to step 4', () => {
    component.feelingForm.get('mood')?.setValue('good');
    component.nextStep();
    expect(component.currentStep()).toBe(2);

    component.symptomsForm.get('selectedSymptoms')?.setValue(['cough']);
    component.nextStep();
    expect(component.currentStep()).toBe(3);

    component.intensityForm.get('scale')?.setValue(6);
    component.nextStep();
    expect(component.currentStep()).toBe(4);
  });
});