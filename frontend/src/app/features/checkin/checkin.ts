import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CheckinStepFeelingComponent } from '../../components/checkin-step-feeling-component/checkin-step-feeling-component';
import { CheckinStepSymptomsComponent } from '../../components/checkin-step-symptoms-component/checkin-step-symptoms-component';
import { CheckinStepDetailsComponent } from '../../components/checkin-step-details-component/checkin-step-details-component';
import { CheckinStepIntensityComponent } from '../../components/checkin-step-intensity-component/checkin-step-intensity-component';


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
    CheckinStepDetailsComponent,
    CheckinStepIntensityComponent,
  ],
  templateUrl: './checkin.html',
  styleUrl: './checkin.css',
})
export class CheckinComponent {
  private readonly fb = inject(FormBuilder);
  readonly noSymptomsValue = 'nenhum sintoma';
  steps: StepItem[] = [
    { id: 1, label: 'Ranking de Sentimentos' },
    { id: 2, label: 'Seleção de Sintomas' },
    { id: 3, label: 'Detalhes Adicionais' },
    { id: 4, label: 'Intensidade dos Sintomas' },
  ];
  currentStep = signal(1);
  form = this.fb.group({
    feeling: this.fb.group({
      mood: ['', Validators.required],
    }),
    symptoms: this.fb.group({
      selectedSymptoms: this.fb.control<string[]>([], Validators.required),
      customSymptom: this.fb.control(''),
    }),
    details: this.fb.group({
      notes: [''],
    }),
    intensity: this.fb.group({
      scale: [null as number | null, Validators.required],
    }),
  });

  progressPercentage = computed(() => {
    const step = this.currentStep();

    if (this.shouldSkipDetailsStep()) {
      const visibleSteps = [1, 2, 4];
      const currentIndex = visibleSteps.indexOf(step);
      return ((currentIndex + 1) / visibleSteps.length) * 100;
    }

    return (step / this.steps.length) * 100;
  });

  get currentStepNumber(): WritableSignal<number> {
    return this.currentStep;
  }

  get feelingForm(): FormGroup {
    return this.form.get('feeling') as FormGroup;
  }

  get symptomsForm(): FormGroup {
    return this.form.get('symptoms') as FormGroup;
  }

  get detailsForm(): FormGroup {
    return this.form.get('details') as FormGroup;
  }

  get intensityForm(): FormGroup {
    return this.form.get('intensity') as FormGroup;
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

  private getSelectedSymptoms(): string[] {
    return this.symptomsForm.get('selectedSymptoms')?.value ?? [];
  }

  private shouldSkipDetailsStep(): boolean {
    return this.getSelectedSymptoms().includes(this.noSymptomsValue);
  }

  nextStep(): void {
    const currentGroup = this.getCurrentStepForm();

    if (currentGroup.invalid) {
      currentGroup.markAllAsTouched();
      return;
    }

    switch (this.currentStep()) {
      case 1:
        this.currentStep.set(2);
        return;

      case 2:
        if (this.shouldSkipDetailsStep()) {
          this.currentStep.set(4);
          return;
        }

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
        if (this.shouldSkipDetailsStep()) {
          this.currentStep.set(2);
          return;
        }

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
    console.log('Payload final do check-in:', payload);
  }

  private getCurrentStepForm(): FormGroup {
    switch (this.currentStep()) {
      case 1:
        return this.feelingForm;
      case 2:
        return this.symptomsForm;
      case 3:
        return this.detailsForm;
      case 4:
        return this.intensityForm;
      default:
        return this.feelingForm;
    }
  }
}