import { CommonModule } from '@angular/common';
import {
  Component,
  WritableSignal,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  Injector,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { CheckinStepDetailsComponent } from '../../components/checkin-step-details-component/checkin-step-details-component';
import { CheckinStepFeelingComponent } from '../../components/checkin-step-feeling-component/checkin-step-feeling-component';
import { CheckinStepIntensityComponent } from '../../components/checkin-step-intensity-component/checkin-step-intensity-component';
import { CheckinStepSymptomsComponent } from '../../components/checkin-step-symptoms-component/checkin-step-symptoms-component';
import { ToastService } from '../../components/toast/toast.service';
import type { SymptomOption, SymptomResponse } from './models/checkin.models';
import { CheckinService } from './services/checkin.service';
import { MedicationDataService } from '../medication/services/medication-data.service';

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
    RouterLink,
  ],
  templateUrl: './checkin.html',
  styleUrl: './checkin.css',
})
export class CheckinComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly checkinService = inject(CheckinService);
  private readonly medicationData = inject(MedicationDataService);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);

  private readonly NO_SYMPTOM_VALUE = 'nenhum sintoma';

  readonly symptomCatalog = signal<SymptomResponse[]>([]);
  readonly symptomOptions = signal<SymptomOption[]>([]);
  readonly submitting = signal(false);
  readonly symptomsLoading = signal(true);
  readonly medicationReminder = signal<string | null>(null);

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
      images: [[] as File[]],
    }),
  });

  progressPercentage = computed(() => {
    const step = this.currentStep();
    return (step / this.steps.length) * 100;
  });

  private stepStatusSubscription?: Subscription;
  private symptomsSelectionSubscription?: Subscription;

  ngOnInit(): void {
    this.setupIntensityConditionalValidation();

    this.checkinService.listSymptoms().subscribe({
      next: symptoms => {
        this.symptomCatalog.set(symptoms);
        this.symptomOptions.set(this.checkinService.buildSymptomOptions(symptoms));
        this.symptomsLoading.set(false);
      },
      error: () => {
        this.symptomsLoading.set(false);
        this.toast.error(
          'Erro ao carregar sintomas',
          'Verifique sua conexão e tente novamente.',
        );
      },
    });

    this.medicationData.getMedicationChecklist().subscribe({
      next: checklist => {
        const total =
          checklist.institutedMedications.length +
          (checklist.currentDoseMedication ? 1 : 0);

        if (total === 0) {
          this.medicationReminder.set(
            'Cadastre medicamentos e frequência em Meu tratamento para ver os lembretes em Remédios.',
          );
          return;
        }

        this.medicationReminder.set(
          `Você tem ${total} medicamento(s) no plano. Em Remédios, os avisos seguem a frequência de cada um.`,
        );
      },
      error: () => undefined,
    });
  }

  ngOnDestroy(): void {
    this.stepStatusSubscription?.unsubscribe();
    this.symptomsSelectionSubscription?.unsubscribe();
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
        if (this.hasNoSymptomsSelected()) {
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
        if (this.hasNoSymptomsSelected()) {
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
    if (this.symptomsLoading() || this.symptomCatalog().length === 0) {
      this.toast.error(
        'Os sintomas ainda estão carregando',
        'Aguarde alguns instantes e tente novamente.',
      );
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const selectedSymptoms = rawValue.symptoms.selectedSymptoms ?? [];
    const noSymptomsSelected = selectedSymptoms.includes(this.NO_SYMPTOM_VALUE);

    const symptomIds = this.checkinService.resolveSymptomIds(
      selectedSymptoms,
      this.symptomCatalog(),
    );

    if (symptomIds.length === 0) {
      this.toast.error(
        'Não foi possível identificar os sintomas',
        'Confira se o catálogo foi carregado corretamente e tente novamente.',
      );
      return;
    }

    if (!rawValue.feeling.mood) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      mood: rawValue.feeling.mood,
      symptom_intensity: noSymptomsSelected ? 0 : (rawValue.intensity.scale ?? 0),
      symptom_ids: symptomIds,
      general_notes: rawValue.details.notes?.trim() || null,
    };

    console.log('ISSO QUE O FRONT MANDA: ',payload);

    this.submitting.set(true);
    this.checkinService.submit(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.toast.success(
          'Check-in registrado com sucesso!',
          'Não esqueça de registrar seus remédios do dia.',
        );
        void this.router.navigate(['/medication']);
      },
      error: (errorResponse) => {
        this.submitting.set(false);

        if (errorResponse.status === 409) {
          this.toast.error(
            'Você já registrou seu check-in hoje',
            errorResponse.error?.detail ?? 'Você já registrou seu check-in diário.',
          );
          return;
        }

        this.toast.error(
          'Erro ao enviar check-in',
          'Tente novamente em instantes.',
        );
      }
    });
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

  private hasNoSymptomsSelected(): boolean {
    const selectedSymptoms =
      this.symptomsForm.get('selectedSymptoms')?.value ?? [];

    return selectedSymptoms.includes(this.NO_SYMPTOM_VALUE);
  }

  private readonly currentStepValidationEffect = effect(() => {
    const step = this.currentStep();
    const currentGroup = this.getStepForm(step);

    this.stepStatusSubscription?.unsubscribe();
    this.isCurrentStepInvalid.set(currentGroup.invalid);

    this.stepStatusSubscription = currentGroup.statusChanges.subscribe(() => {
      this.isCurrentStepInvalid.set(currentGroup.invalid);
    });
  }, { injector: this.injector });

  private setupIntensityConditionalValidation(): void {
    const selectedSymptomsControl = this.symptomsForm.get('selectedSymptoms');

    this.applyIntensityValidation();

    this.symptomsSelectionSubscription =
      selectedSymptomsControl?.valueChanges.subscribe(() => {
        this.applyIntensityValidation();
      });
  }

  private applyIntensityValidation(): void {
    const intensityScaleControl = this.intensityForm.get('scale');

    if (!intensityScaleControl) {
      return;
    }

    if (this.hasNoSymptomsSelected()) {
      intensityScaleControl.clearValidators();
      intensityScaleControl.setValue(null, { emitEvent: false });
    } else {
      intensityScaleControl.setValidators([Validators.required]);
    }

    intensityScaleControl.updateValueAndValidity({ emitEvent: true });
  }
}