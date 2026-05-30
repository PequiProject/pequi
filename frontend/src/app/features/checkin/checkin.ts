import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CheckinStepFeelingComponent } from '../../components/checkin-step-feeling-component/checkin-step-feeling-component';
import { CheckinStepSymptomsComponent } from '../../components/checkin-step-symptoms-component/checkin-step-symptoms-component';
import { CheckinStepIntensityComponent } from '../../components/checkin-step-intensity-component/checkin-step-intensity-component';
import { CheckinStepDetailsComponent } from '../../components/checkin-step-details-component/checkin-step-details-component';

type StepItem = {
  id: number;
  label: string;
};

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CheckinStepFeelingComponent,
    CheckinStepSymptomsComponent,
    CheckinStepIntensityComponent,
    CheckinStepDetailsComponent,
  ],
  templateUrl: './checkin.html',
  styleUrl: './checkin.css',
})
export class CheckinComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  private stepStatusSubscription?: Subscription;
  private symptomsSelectionSubscription?: Subscription;

  private readonly NO_SYMPTOM_VALUE = 'nenhum sintoma';

  steps: StepItem[] = [
    { id: 1, label: 'Ranking de Sentimentos' },
    { id: 2, label: 'Seleção de Sintomas' },
    { id: 3, label: 'Intensidade dos Sintomas' },
    { id: 4, label: 'Detalhes Adicionais' },
  ];

  currentStep = signal(1);
  isCurrentStepInvalid = signal(true);

  form = this.fb.group({
    feeling: this.fb.group({
      mood: ['', Validators.required],
    }),
    symptoms: this.fb.group({
      selectedSymptoms: this.fb.control<string[]>([], Validators.required),
      customSymptom: this.fb.control(''),
    }),
    intensity: this.fb.group({
      scale: [null as number | null, Validators.required],
    }),
    details: this.fb.group({
      notes: [''],
    }),
  });

  progressPercentage = computed(() => {
    const step = this.currentStep();
    return (step / this.steps.length) * 100;
  });

  constructor() {
      // this.setupCurrentStepValidationWatcher();
      // this.setupIntensityConditionalValidation();
  }

  get currentStepNumber(): WritableSignal<number> {
    return this.currentStep;
  }

  get feelingForm(): FormGroup {
    return this.form.get('feeling') as FormGroup;
  }

  get symptomsForm(): FormGroup {
    return this.form.get('symptoms') as FormGroup;
  }

  get intensityForm(): FormGroup {
    return this.form.get('intensity') as FormGroup;
  }

  get detailsForm(): FormGroup {
    return this.form.get('details') as FormGroup;
  }

  isStepActive(stepId: number): boolean {
    return this.currentStep() === stepId;
  }

  isStepCompleted(stepId: number): boolean {
    return this.currentStep() > stepId;
  }

  goToStep(stepId: number): void {
    if (stepId < this.currentStep()) {
      this.currentStep.set(stepId);
    }
  }

  nextStep(): void {
    const currentGroup = this.getCurrentStepForm();

    if (currentGroup.invalid) {
      currentGroup.markAllAsTouched();
      this.isCurrentStepInvalid.set(true);
      return;
    }

    switch (this.currentStep()) {
      case 1:
        this.currentStep.set(2);
        return;

      case 2:
        // if (this.hasNoSymptomsSelected()) {
        //   this.currentStep.set(4);
        //   return;
        // }

        this.currentStep.set(3);
        return;

      case 3:
        this.currentStep.set(4);
        return;

      default:
        return;
    }
  }

  prevStep(): void {
    switch (this.currentStep()) {
      case 4:
        // if (this.hasNoSymptomsSelected()) {
        //   this.currentStep.set(2);
        //   return;
        // }

        this.currentStep.set(3);
        return;

      case 3:
        this.currentStep.set(2);
        return;

      case 2:
        this.currentStep.set(1);
        return;

      default:
        return;
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const payload = {
      ...rawValue,
      symptoms: {
        selectedSymptoms: rawValue.symptoms.selectedSymptoms,
      },
    };
    this.router.navigate(['home']);
  }

  private getCurrentStepForm(): FormGroup {
    return this.getStepForm(this.currentStep());
  }

  private getStepForm(step: number): FormGroup {
    switch (step) {
      case 1:
        return this.feelingForm;
      case 2:
        return this.symptomsForm;
      case 3:
        return this.intensityForm;
      case 4:
        return this.detailsForm;
      default:
        return this.feelingForm;
    }
  }
}
