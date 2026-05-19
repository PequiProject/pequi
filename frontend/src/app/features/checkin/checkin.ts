import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CheckinStepFeelingComponent } from '../../components/checkin-step-feeling-component/checkin-step-feeling-component';


type StepItem = {
  id: number;
  label: string;
};

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CheckinStepFeelingComponent],
  templateUrl: './checkin.html',
  styleUrl: './checkin.css',
})
export class CheckinComponent {
  private readonly fb = inject(FormBuilder);
  steps: StepItem[] = [
    { id: 1, label: 'Ranking de Sentimentos'},
    { id: 2, label: 'Seleção de Sintomas'},
    { id: 3, label: 'Detalhes Adicionais'},
    { id: 4, label: 'Intensidade dos Sintomas'},
  ];
  currentStep = signal(1);
  form = this.fb.group({
    feeling: this.fb.group({
      mood: ['', Validators.required],
    }),
    symptoms: this.fb.group({
      zipCode: ['', Validators.required],
      street: ['', Validators.required],
      number: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
    }),
    details: this.fb.group({
      bloodType: [''],
      allergies: [''],
      medications: [''],
      emergencyContact: ['', Validators.required],
    }),
    intensity: this.fb.group({
      acceptTerms: [false, Validators.requiredTrue],
    }),
  });

  progressPercentage = computed(() => {
    return (this.currentStep() / this.steps.length) * 100;
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

  nextStep(): void {
    const currentGroup = this.getCurrentStepForm();

    if (currentGroup.invalid) {
      currentGroup.markAllAsTouched();
      return;
    }

    if (this.currentStep() < this.steps.length) {
      this.currentStep.update(value => value + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(value => value - 1);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
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