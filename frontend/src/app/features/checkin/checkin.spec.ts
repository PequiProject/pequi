import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CheckinComponent } from './checkin';
import { CheckinStepFeelingComponent } from '../../components/checkin-step-feeling-component/checkin-step-feeling-component';
import { CheckinStepSymptomsComponent } from '../../components/checkin-step-symptoms-component/checkin-step-symptoms-component';
import { CheckinStepIntensityComponent } from '../../components/checkin-step-intensity-component/checkin-step-intensity-component';
import { CheckinStepDetailsComponent } from '../../components/checkin-step-details-component/checkin-step-details-component';
import { ToastService } from '../../components/toast/toast.service';
import { CheckinService } from './services/checkin.service';

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
  let checkinService: {
    listSymptoms: ReturnType<typeof vi.fn>;
    submit: ReturnType<typeof vi.fn>;
    resolveSymptomIds: ReturnType<typeof vi.fn>;
  };
  let toastService: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const mockSymptoms = [
    { id: 'symptom-1', name: 'Nenhum sintoma hoje', category: 'systemic' },
    { id: 'symptom-2', name: 'Dormência', category: 'neurological' },
  ];

  const getByTestId = (testId: string) =>
    fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));

  const getButtons = () =>
    fixture.debugElement.queryAll(By.css('button')).map(btn => btn.nativeElement as HTMLButtonElement);

  beforeEach(async () => {
    router = {
      navigate: vi.fn(),
    };

    checkinService = {
      listSymptoms: vi.fn(() => of(mockSymptoms)),
      submit: vi.fn(() => of({ id: 'checkin-1' })),
      resolveSymptomIds: vi.fn((selected: string[]) => {
        if (selected.includes('nenhum sintoma')) {
          return ['symptom-1'];
        }
        return ['symptom-2'];
      }),
    };

    toastService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CheckinComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: CheckinService, useValue: checkinService },
        { provide: ToastService, useValue: toastService },
      ],
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
    expect(prevButton.disabled).toBe(true);
  });

  it('should disable next button when current step is invalid', () => {
    const [, nextButton] = getButtons();
    expect(component.isCurrentStepInvalid()).toBe(true);
    expect(nextButton.disabled).toBe(true);
  });

  it('should expose subforms correctly', () => {
    expect(component.feelingForm).toBeTruthy();
    expect(component.symptomsForm).toBeTruthy();
    expect(component.intensityForm).toBeTruthy();
    expect(component.detailsForm).toBeTruthy();
  });

  it('should identify active and completed steps correctly', () => {
    expect(component.isStepActive(1)).toBe(true);
    expect(component.isStepCompleted(1)).toBe(false);
    expect(component.isStepCompleted(2)).toBe(false);

    component.currentStep.set(3);

    expect(component.isStepActive(3)).toBe(true);
    expect(component.isStepCompleted(1)).toBe(true);
    expect(component.isStepCompleted(2)).toBe(true);
    expect(component.isStepCompleted(3)).toBe(false);
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
    expect(component.feelingForm.touched).toBe(true);
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
    expect(component.symptomsForm.touched).toBe(true);
  });

  it('should advance from step 2 to step 3 when symptoms form has regular symptoms', () => {
    component.currentStep.set(2);
    component.symptomsForm.get('selectedSymptoms')?.setValue(['cough']);

    component.nextStep();

    expect(component.currentStep()).toBe(3);
  });

  it('should skip from step 2 to step 4 when "nenhum sintoma" is selected', () => {
    component.currentStep.set(2);
    component.symptomsForm.get('selectedSymptoms')?.setValue(['nenhum sintoma']);

    component.nextStep();

    expect(component.currentStep()).toBe(4);
  });

  it('should render intensity step on step 3', () => {
    component.currentStep.set(3);
    fixture.detectChanges();

    expect(getByTestId('feeling-step')).toBeNull();
    expect(getByTestId('symptoms-step')).toBeNull();
    expect(getByTestId('intensity-step')).toBeTruthy();
    expect(getByTestId('details-step')).toBeNull();
  });

  it('should render details step on step 4', () => {
    component.currentStep.set(4);
    fixture.detectChanges();

    expect(getByTestId('feeling-step')).toBeNull();
    expect(getByTestId('symptoms-step')).toBeNull();
    expect(getByTestId('intensity-step')).toBeNull();
    expect(getByTestId('details-step')).toBeTruthy();
  });

  it('should keep intensity required when there are symptoms', () => {
    component.symptomsForm.get('selectedSymptoms')?.setValue(['headache']);

    const scaleControl = component.intensityForm.get('scale');

    expect(scaleControl?.hasValidator(Validators.required)).toBe(true);
    expect(component.intensityForm.invalid).toBe(true);
  });

  it('should remove required validator from intensity when "nenhum sintoma" is selected', () => {
    component.symptomsForm.get('selectedSymptoms')?.setValue(['nenhum sintoma']);

    const scaleControl = component.intensityForm.get('scale');

    expect(scaleControl?.hasValidator(Validators.required)).toBe(false);
    expect(component.intensityForm.valid).toBe(true);
  });

  it('should clear intensity value when "nenhum sintoma" is selected', () => {
    component.intensityForm.get('scale')?.setValue(6);

    component.symptomsForm.get('selectedSymptoms')?.setValue(['nenhum sintoma']);

    expect(component.intensityForm.get('scale')?.value).toBeNull();
  });

  it('should restore required validator to intensity when symptoms change from "nenhum sintoma" to regular symptom', () => {
    const scaleControl = component.intensityForm.get('scale');

    component.symptomsForm.get('selectedSymptoms')?.setValue(['nenhum sintoma']);
    expect(scaleControl?.hasValidator(Validators.required)).toBe(false);

    component.symptomsForm.get('selectedSymptoms')?.setValue(['cough']);

    expect(scaleControl?.hasValidator(Validators.required)).toBe(true);
    expect(component.intensityForm.invalid).toBe(true);
  });

  it('should not advance from step 3 when intensity is required and invalid', () => {
    component.symptomsForm.get('selectedSymptoms')?.setValue(['cough']);
    component.currentStep.set(3);
    fixture.detectChanges();

    component.nextStep();

    expect(component.currentStep()).toBe(3);
    expect(component.intensityForm.touched).toBe(true);
  });

  it('should advance from step 3 to step 4 when intensity is valid', () => {
    component.symptomsForm.get('selectedSymptoms')?.setValue(['cough']);
    component.currentStep.set(3);
    component.intensityForm.get('scale')?.setValue(4);

    component.nextStep();

    expect(component.currentStep()).toBe(4);
  });

  it('should go back from step 4 to step 3 in regular flow', () => {
    component.symptomsForm.get('selectedSymptoms')?.setValue(['cough']);
    component.currentStep.set(4);

    component.prevStep();

    expect(component.currentStep()).toBe(3);
  });

  it('should go back from step 4 to step 2 when "nenhum sintoma" was selected', () => {
    component.symptomsForm.get('selectedSymptoms')?.setValue(['nenhum sintoma']);
    component.currentStep.set(4);

    component.prevStep();

    expect(component.currentStep()).toBe(2);
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
    expect(component.feelingForm.invalid).toBe(true);

    component.currentStep.set(2);
    expect(component.symptomsForm.invalid).toBe(true);

    component.symptomsForm.get('selectedSymptoms')?.setValue(['cough']);
    component.currentStep.set(3);
    expect(component.intensityForm.invalid).toBe(true);
  });

  it('should enable submit button on step 4 because details is optional', () => {
    component.currentStep.set(4);
    fixture.detectChanges();

    const [, submitButton] = getButtons();
    expect(component.isCurrentStepInvalid()).toBe(false);
    expect(submitButton.disabled).toBe(false);
  });

  it('should not submit when the full form is invalid', () => {
    component.submit();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should mark full form as touched when submit is called with invalid form', () => {
    component.submit();

    expect(component.form.touched).toBe(true);
  });

  it('should submit and navigate to home when form is valid in regular flow', () => {
    component.feelingForm.get('mood')?.setValue('good');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['cough']);
    component.intensityForm.get('scale')?.setValue(1);
    component.detailsForm.get('notes')?.setValue('feeling well');

    component.submit();

    expect(checkinService.submit).toHaveBeenCalled();
    expect(toastService.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('should submit and navigate to home when "nenhum sintoma" skips intensity', () => {
    component.feelingForm.get('mood')?.setValue('good');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['nenhum sintoma']);
    component.detailsForm.get('notes')?.setValue('sem sintomas hoje');

    component.submit();

    expect(checkinService.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        mood: 'good',
        symptom_intensity: 0,
        symptom_ids: ['symptom-1'],
      }),
    );
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('should submit payload with only selectedSymptoms inside symptoms object', () => {
    component.feelingForm.get('mood')?.setValue('sad');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['nausea']);
    component.symptomsForm.get('customSymptom')?.setValue('other symptom');
    component.intensityForm.get('scale')?.setValue(5);
    component.detailsForm.get('notes')?.setValue('extra notes');

    component.submit();
  });

  it('should submit payload with null intensity when "nenhum sintoma" is selected', () => {
    component.feelingForm.get('mood')?.setValue('good');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['nenhum sintoma']);
    component.detailsForm.get('notes')?.setValue('sem observações');

    component.submit();
  });

  it('should follow the regular flow without skipping when there are symptoms', () => {
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

  it('should follow the skip flow when "nenhum sintoma" is selected', () => {
    component.feelingForm.get('mood')?.setValue('good');
    component.nextStep();
    expect(component.currentStep()).toBe(2);

    component.symptomsForm.get('selectedSymptoms')?.setValue(['nenhum sintoma']);
    component.nextStep();
    expect(component.currentStep()).toBe(4);
  });
});