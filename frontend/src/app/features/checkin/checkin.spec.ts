import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CheckinComponent } from './checkin';
import { CheckinStepFeelingComponent } from '../../components/checkin-step-feeling-component/checkin-step-feeling-component';
import { CheckinStepSymptomsComponent } from '../../components/checkin-step-symptoms-component/checkin-step-symptoms-component';
import { CheckinStepIntensityComponent } from '../../components/checkin-step-intensity-component/checkin-step-intensity-component';
import { CheckinStepDetailsComponent } from '../../components/checkin-step-details-component/checkin-step-details-component';
import { ToastService } from '../../components/toast/toast.service';
import { CheckinService } from './services/checkin.service';
import { MedicationDataService } from '../medication/services/medication-data.service';

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
  @Input() symptoms: unknown[] = [];
  @Input() loading = false;
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
    buildSymptomOptions: ReturnType<typeof vi.fn>;
  };
  let medicationDataService: {
    getMedicationChecklist: ReturnType<typeof vi.fn>;
  };
  let toastService: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const mockSymptoms = [
    {
      id: 'symptom-none',
      name: 'Nenhum sintoma',
      category: 'systemic',
      description: 'Sem sintomas',
    },
    {
      id: 'symptom-1',
      name: 'Dormência',
      category: 'neurological',
      description: 'Dormência',
    },
  ];

  const mockSymptomOptions = [
    {
      id: 'symptom-none',
      value: 'Nenhum sintoma',
      label: 'Nenhum sintoma hoje',
      category: 'systemic',
      description: 'Sem sintomas',
      selectedClass: 'selected-none',
      unselectedClass: 'unselected-none',
    },
    {
      id: 'symptom-1',
      value: 'Dormência',
      label: 'Dormência',
      category: 'neurological',
      description: 'Dormência',
      selectedClass: 'selected-default',
      unselectedClass: 'unselected-default',
    },
  ];

  const mockChecklist = {
    institutedMedications: [],
    currentDoseMedication: null,
  };

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
      buildSymptomOptions: vi.fn(() => mockSymptomOptions),
      submit: vi.fn(() => of({ id: 'checkin-1' })),
      resolveSymptomIds: vi.fn((selected: string[]) => {
        if (selected.includes('nenhum sintoma')) {
          return ['symptom-none'];
        }

        if (selected.includes('Dormência') || selected.includes('dormencia')) {
          return ['symptom-1'];
        }

        return ['symptom-1'];
      }),
    };

    medicationDataService = {
      getMedicationChecklist: vi.fn(() => of(mockChecklist)),
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
        { provide: MedicationDataService, useValue: medicationDataService },
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

  it('should load symptoms and symptom options on init', () => {
    expect(checkinService.listSymptoms).toHaveBeenCalled();
    expect(checkinService.buildSymptomOptions).toHaveBeenCalledWith(mockSymptoms);
    expect(component.symptomCatalog()).toEqual(mockSymptoms);
    expect(component.symptomOptions()).toEqual(mockSymptomOptions);
    expect(component.symptomsLoading()).toBe(false);
  });

  it('should load medication reminder when there are no medications', () => {
    expect(medicationDataService.getMedicationChecklist).toHaveBeenCalled();
    expect(component.medicationReminder()).toContain('Cadastre medicamentos e frequência');
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
    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);

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
    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);

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

    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);

    expect(scaleControl?.hasValidator(Validators.required)).toBe(true);
    expect(component.intensityForm.invalid).toBe(true);
  });

  it('should not advance from step 3 when intensity is required and invalid', () => {
    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);
    component.currentStep.set(3);
    fixture.detectChanges();

    component.nextStep();

    expect(component.currentStep()).toBe(3);
    expect(component.intensityForm.touched).toBe(true);
  });

  it('should advance from step 3 to step 4 when intensity is valid', () => {
    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);
    component.currentStep.set(3);
    component.intensityForm.get('scale')?.setValue(4);

    component.nextStep();

    expect(component.currentStep()).toBe(4);
  });

  it('should go back from step 4 to step 3 in regular flow', () => {
    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);
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

    const buttons = getButtons();
    const nextButton = buttons[1];
    expect(nextButton.textContent?.trim()).toBe('Próximo');
  });

  it('should show "Enviar formulário" button on last step', () => {
    component.currentStep.set(4);
    fixture.detectChanges();

    const buttons = getButtons();
    const submitButton = buttons[1];
    expect(submitButton.textContent?.trim()).toBe('Enviar formulário');
  });

  it('should keep next button enabled because template does not bind disabled state', () => {
    component.currentStep.set(1);
    fixture.detectChanges();

    const buttons = getButtons();
    const nextButton = buttons[1];

    expect(component.isCurrentStepInvalid()).toBe(true);
    expect(nextButton.disabled).toBe(false);
  });

  it('should enable submit button on step 4 because details is optional', () => {
    component.currentStep.set(4);
    fixture.detectChanges();

    const buttons = getButtons();
    const submitButton = buttons[1];

    expect(component.isCurrentStepInvalid()).toBe(false);
    expect(submitButton.disabled).toBe(false);
  });

  it('should not submit when symptoms are still loading', () => {
    component.symptomsLoading.set(true);

    component.submit();

    expect(checkinService.submit).not.toHaveBeenCalled();
    expect(toastService.error).toHaveBeenCalledWith(
      'Os sintomas ainda estão carregando',
      'Aguarde alguns instantes e tente novamente.',
    );
  });

  it('should not submit when symptom catalog is empty', () => {
    component.symptomsLoading.set(false);
    component.symptomCatalog.set([]);

    component.submit();

    expect(checkinService.submit).not.toHaveBeenCalled();
    expect(toastService.error).toHaveBeenCalledWith(
      'Os sintomas ainda estão carregando',
      'Aguarde alguns instantes e tente novamente.',
    );
  });

  it('should not submit when the full form is invalid', () => {
    component.symptomsLoading.set(false);

    component.submit();

    expect(checkinService.submit).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should mark full form as touched when submit is called with invalid form', () => {
    component.symptomsLoading.set(false);

    component.submit();

    expect(component.form.touched).toBe(true);
  });

  it('should not submit when resolveSymptomIds returns empty array', () => {
    checkinService.resolveSymptomIds.mockReturnValue([]);

    component.feelingForm.get('mood')?.setValue('good');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);
    component.intensityForm.get('scale')?.setValue(2);

    component.submit();

    expect(checkinService.submit).not.toHaveBeenCalled();
    expect(toastService.error).toHaveBeenCalledWith(
      'Não foi possível identificar os sintomas',
      'Confira se o catálogo foi carregado corretamente e tente novamente.',
    );
  });

  it('should submit and navigate to medication when form is valid in regular flow', () => {
    component.feelingForm.get('mood')?.setValue('good');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);
    component.intensityForm.get('scale')?.setValue(1);
    component.detailsForm.get('notes')?.setValue('feeling well');

    component.submit();

    expect(checkinService.resolveSymptomIds).toHaveBeenCalledWith(
      ['Dormência'],
      mockSymptoms,
    );
    expect(checkinService.submit).toHaveBeenCalledWith({
      mood: 'good',
      symptom_intensity: 1,
      symptom_ids: ['symptom-1'],
      general_notes: 'feeling well',
    });
    expect(toastService.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/medication']);
  });

  it('should submit and navigate to medication when "nenhum sintoma" skips intensity', () => {
    component.feelingForm.get('mood')?.setValue('good');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['nenhum sintoma']);
    component.detailsForm.get('notes')?.setValue('sem sintomas hoje');

    component.submit();

    expect(checkinService.submit).toHaveBeenCalledWith({
      mood: 'good',
      symptom_intensity: 0,
      symptom_ids: ['symptom-none'],
      general_notes: 'sem sintomas hoje',
    });
    expect(toastService.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/medication']);
  });

  it('should trim notes before submitting', () => {
    component.feelingForm.get('mood')?.setValue('good');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);
    component.intensityForm.get('scale')?.setValue(5);
    component.detailsForm.get('notes')?.setValue('  observação  ');

    component.submit();

    expect(checkinService.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        general_notes: 'observação',
      }),
    );
  });

  it('should submit null notes when details notes is empty', () => {
    component.feelingForm.get('mood')?.setValue('good');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);
    component.intensityForm.get('scale')?.setValue(5);
    component.detailsForm.get('notes')?.setValue('   ');

    component.submit();

    expect(checkinService.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        general_notes: null,
      }),
    );
  });

  it('should show conflict toast when api returns 409', () => {
    checkinService.submit.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { detail: 'Já existe um check-in registrado para hoje.' },
      })),
    );

    component.feelingForm.get('mood')?.setValue('good');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);
    component.intensityForm.get('scale')?.setValue(5);

    component.submit();

    expect(toastService.error).toHaveBeenCalledWith(
      'Você já registrou seu check-in hoje',
      'Já existe um check-in registrado para hoje.',
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should show generic error toast when api returns non-409 error', () => {
    checkinService.submit.mockReturnValue(
      throwError(() => ({
        status: 500,
      })),
    );

    component.feelingForm.get('mood')?.setValue('good');
    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);
    component.intensityForm.get('scale')?.setValue(5);

    component.submit();

    expect(toastService.error).toHaveBeenCalledWith(
      'Erro ao enviar check-in',
      'Tente novamente em instantes.',
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should follow the regular flow without skipping when there are symptoms', () => {
    component.feelingForm.get('mood')?.setValue('good');
    component.nextStep();
    expect(component.currentStep()).toBe(2);

    component.symptomsForm.get('selectedSymptoms')?.setValue(['Dormência']);
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