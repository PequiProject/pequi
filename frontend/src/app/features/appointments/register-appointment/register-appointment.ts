import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, LucideCalendar, LucideCheck, LucidePill } from 'lucide-angular';
import {
  APPOINTMENT_TYPES,
  EMPTY_APPOINTMENT_DRAFT,
  type HealthAppointmentDraft,
} from '../models/health-appointment.models';
import { HealthAppointmentService } from '../services/health-appointment.service';
import { PatientMedicationService } from '../services/patient-medication.service';

type WizardStepId = 'basics' | 'performed' | 'details-prompt' | 'follow-up' | 'summary';

@Component({
  selector: 'app-register-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './register-appointment.html',
})
export class RegisterAppointmentComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly appointmentService = inject(HealthAppointmentService);
  private readonly medicationService = inject(PatientMedicationService);

  readonly appointmentTypes = APPOINTMENT_TYPES;
  readonly patientMedications = this.medicationService.medications;
  readonly LucideCalendar = LucideCalendar;
  readonly LucideCheck = LucideCheck;
  readonly LucidePill = LucidePill;

  readonly currentStepIndex = signal(0);
  readonly showValidation = signal(false);
  readonly saved = signal(false);
  readonly savedStatusLabel = signal('');

  readonly draft = signal<HealthAppointmentDraft>(structuredClone(EMPTY_APPOINTMENT_DRAFT));

  readonly isSupervisedDoseType = computed(() => this.draft().type === 'dose_supervisionada');

  readonly basicsForm = this.fb.group({
    appointmentDate: ['', Validators.required],
    appointmentTime: ['', Validators.required],
    location: ['', Validators.required],
    type: ['', Validators.required],
    professional: [''],
    notes: [''],
  });

  readonly followUpForm = this.fb.group({
    conduct: [''],
    medicationChangeDescription: [''],
    newMedicationName: [''],
    newDoseDescription: [''],
    otherMedicationName: [''],
    supervisedDoseNotes: [''],
    nextAppointmentDate: [''],
    guidanceReceived: [''],
  });

  readonly visibleSteps = computed<WizardStepId[]>(() => {
    const performed = this.draft().performed;
    const wantsDetails = this.draft().wantsFollowUpDetails;
    const steps: WizardStepId[] = ['basics', 'performed'];
    if (performed === true) {
      steps.push('details-prompt');
      if (wantsDetails === true) {
        steps.push('follow-up');
      }
    }
    steps.push('summary');
    return steps;
  });

  readonly currentStepId = computed(
    () => this.visibleSteps()[this.currentStepIndex()] ?? 'basics'
  );

  readonly progressPercentage = computed(() => {
    const total = this.visibleSteps().length;
    if (total <= 1) return 100;
    return ((this.currentStepIndex() + 1) / total) * 100;
  });

  readonly stepLabel = computed(() => {
    switch (this.currentStepId()) {
      case 'basics':
        return 'Dados do compromisso';
      case 'performed':
        return 'Status do atendimento';
      case 'details-prompt':
        return 'Informações da consulta';
      case 'follow-up':
        return this.isSupervisedDoseType()
          ? 'Dose e medicamentos'
          : 'Detalhes do atendimento';
      case 'summary':
        return 'Revisão';
      default:
        return '';
    }
  });

  readonly typeLabel = computed(() => {
    const type = this.draft().type;
    return APPOINTMENT_TYPES.find((t) => t.value === type)?.label ?? '';
  });

  readonly selectedMedicationLabel = computed(() => {
    const fu = this.draft().followUp;
    if (fu.selectedMedicationId && fu.selectedMedicationId !== 'other') {
      return this.medicationService.findById(fu.selectedMedicationId)?.name ?? '';
    }
    return fu.otherMedicationName;
  });

  onPerformedChange(value: boolean): void {
    this.draft.update((d) => ({
      ...d,
      performed: value,
      wantsFollowUpDetails: value ? d.wantsFollowUpDetails : null,
    }));
    this.showValidation.set(false);
  }

  onWantsDetailsChange(value: boolean): void {
    this.draft.update((d) => {
      const next = { ...d, wantsFollowUpDetails: value };
      if (value && d.type === 'dose_supervisionada') {
        next.followUp = {
          ...d.followUp,
          registerSupervisedDose: true,
        };
      }
      return next;
    });
    this.showValidation.set(false);
  }

  onRegisterDoseChange(checked: boolean): void {
    this.draft.update((d) => ({
      ...d,
      followUp: { ...d.followUp, registerSupervisedDose: checked },
    }));
    this.showValidation.set(false);
  }

  onHadMedicationChange(value: boolean): void {
    this.draft.update((d) => ({
      ...d,
      followUp: {
        ...d.followUp,
        hadMedicationChange: value,
        selectedMedicationId: value ? '' : d.followUp.selectedMedicationId,
        otherMedicationName: value ? '' : d.followUp.otherMedicationName,
        medicationChangeDescription: value ? d.followUp.medicationChangeDescription : '',
        newMedicationName: value ? d.followUp.newMedicationName : '',
        newDoseDescription: value ? d.followUp.newDoseDescription : '',
      },
    }));
    this.followUpForm.patchValue({
      medicationChangeDescription: value ? this.draft().followUp.medicationChangeDescription : '',
      newMedicationName: value ? this.draft().followUp.newMedicationName : '',
      newDoseDescription: value ? this.draft().followUp.newDoseDescription : '',
      otherMedicationName: value ? '' : this.draft().followUp.otherMedicationName,
    });
    this.showValidation.set(false);
  }

  onMedicationSelect(medicationId: string): void {
    const med = this.medicationService.findById(medicationId);
    this.draft.update((d) => ({
      ...d,
      followUp: {
        ...d.followUp,
        selectedMedicationId: medicationId,
        otherMedicationName: med?.name ?? '',
      },
    }));
    this.followUpForm.patchValue({ otherMedicationName: med?.name ?? '' });
    this.showValidation.set(false);
  }

  onMedicationOtherSelect(): void {
    this.draft.update((d) => ({
      ...d,
      followUp: {
        ...d.followUp,
        selectedMedicationId: 'other',
        otherMedicationName: '',
      },
    }));
    this.followUpForm.patchValue({ otherMedicationName: '' });
    this.showValidation.set(false);
  }

  onOtherMedicationInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((d) => ({
      ...d,
      followUp: { ...d.followUp, otherMedicationName: value },
    }));
  }

  private syncFollowUpFromForm(): void {
    const raw = this.followUpForm.getRawValue();
    this.draft.update((d) => ({
      ...d,
      followUp: {
        ...d.followUp,
        conduct: raw.conduct ?? '',
        medicationChangeDescription: raw.medicationChangeDescription ?? '',
        newMedicationName: raw.newMedicationName ?? '',
        newDoseDescription: raw.newDoseDescription ?? '',
        otherMedicationName: raw.otherMedicationName ?? d.followUp.otherMedicationName,
        supervisedDoseNotes: raw.supervisedDoseNotes ?? '',
        nextAppointmentDate: raw.nextAppointmentDate ?? '',
        guidanceReceived: raw.guidanceReceived ?? '',
      },
    }));
  }

  private validateFollowUpStep(): boolean {
    this.syncFollowUpFromForm();
    const fu = this.draft().followUp;

    if (fu.hadMedicationChange === null) {
      this.showValidation.set(true);
      return false;
    }

    if (fu.hadMedicationChange === true) {
      const name = fu.newMedicationName.trim();
      const dose = fu.newDoseDescription.trim();
      if (!name || !dose) {
        this.showValidation.set(true);
        return false;
      }
      return true;
    }

    if (fu.registerSupervisedDose) {
      const medName = fu.otherMedicationName.trim();
      const hasSelection =
        (fu.selectedMedicationId && fu.selectedMedicationId !== 'other') || medName.length > 0;
      if (!hasSelection) {
        this.showValidation.set(true);
        return false;
      }
    }

    return true;
  }

  nextStep(): void {
    const stepId = this.currentStepId();

    if (stepId === 'basics' && this.basicsForm.invalid) {
      this.basicsForm.markAllAsTouched();
      this.showValidation.set(true);
      return;
    }

    if (stepId === 'basics') {
      const raw = this.basicsForm.getRawValue();
      this.draft.update((d) => {
        const type = (raw.type ?? '') as HealthAppointmentDraft['type'];
        const next: HealthAppointmentDraft = {
          ...d,
          appointmentDate: raw.appointmentDate ?? '',
          appointmentTime: raw.appointmentTime ?? '',
          location: raw.location ?? '',
          type,
          professional: raw.professional ?? '',
          notes: raw.notes ?? '',
        };
        if (type === 'dose_supervisionada' && d.wantsFollowUpDetails === true) {
          next.followUp = { ...d.followUp, registerSupervisedDose: true };
        }
        return next;
      });
    }

    if (stepId === 'performed' && this.draft().performed === null) {
      this.showValidation.set(true);
      return;
    }

    if (stepId === 'details-prompt' && this.draft().wantsFollowUpDetails === null) {
      this.showValidation.set(true);
      return;
    }

    if (stepId === 'follow-up' && !this.validateFollowUpStep()) {
      return;
    }

    this.showValidation.set(false);
    const maxIndex = this.visibleSteps().length - 1;
    if (this.currentStepIndex() < maxIndex) {
      this.currentStepIndex.update((i) => i + 1);
    }
  }

  prevStep(): void {
    if (this.currentStepIndex() > 0) {
      this.showValidation.set(false);
      this.currentStepIndex.update((i) => i - 1);
    }
  }

  submit(): void {
    this.syncFollowUpFromForm();
    const record = this.appointmentService.saveFromDraft(this.draft());
    this.savedStatusLabel.set(record.status === 'scheduled' ? 'Agendado' : 'Realizado');
    this.saved.set(true);
  }

  goHome(): void {
    void this.router.navigate(['/home']);
  }

  formatDate(isoDate: string): string {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return isoDate;
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }
}
