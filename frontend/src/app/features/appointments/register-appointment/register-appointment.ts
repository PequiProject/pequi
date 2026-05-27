import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, LucideCalendar, LucideCheck, LucidePill } from 'lucide-angular';
import {
  ANS_GIF_GRADE_OPTIONS,
  APPOINTMENT_TYPES,
  EMPTY_APPOINTMENT_DRAFT,
  type AnsGifGrade,
  type HealthAppointmentDraft,
  type NeurologicalAssessmentDraft,
} from '../models/health-appointment.models';
import { HealthAppointmentService } from '../services/health-appointment.service';
import { PatientMedicationService } from '../services/patient-medication.service';
import { SUBSTITUTE_SCHEME_MEDICATION_OPTIONS } from '../../profile/models/patient-profile.models';
import { PatientProfileService } from '../../profile/services/patient-profile.service';

type WizardStepId = 'basics' | 'performed' | 'summary';

const WIZARD_STEPS: WizardStepId[] = ['basics', 'performed', 'summary'];
const WIZARD_STEP_COUNT = WIZARD_STEPS.length;

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
  private readonly profileService = inject(PatientProfileService);

  readonly appointmentTypes = APPOINTMENT_TYPES;
  readonly ansGifGradeOptions = ANS_GIF_GRADE_OPTIONS;
  readonly substituteSchemeMedicationOptions = SUBSTITUTE_SCHEME_MEDICATION_OPTIONS;
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
  readonly isNeurologicalAssessmentType = computed(
    () => this.draft().type === 'avaliacao_neurologica'
  );
  readonly hasProfileDoseMedication = computed(() => {
    const t = this.profileService.profile().treatment;
    return (
      t.currentDoseMedication.trim().length > 0 ||
      t.schemeRifampicina ||
      t.schemeClofazimina ||
      t.schemeMinociclina ||
      t.schemeOfloxacino ||
      t.schemeDapsone
    );
  });

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
    doseMedicationChanged: [null as boolean | null],
    updateDoseFromConsultation: [false],
    doseSchemeClofazimina: [false],
    doseSchemeOfloxacino: [false],
    doseSchemeRifampicina: [false],
    doseSchemeMinociclina: [false],
    doseSchemeDapsone: [false],
    updateInstitutedMedsFromConsultation: [false],
    medicationChangeDescription: [''],
    institutedPrednisoneMgKg: [''],
    institutedAineMgDay: [''],
    institutedThalidomideMgDay: [''],
    institutedPentoxifyllineMgDay: [''],
    institutedOtherMedication: [''],
    otherMedicationName: [''],
    supervisedDoseNotes: [''],
    nextAppointmentDate: [''],
    guidanceReceived: [''],
  });

  readonly ansForm = this.fb.group({
    assessmentDate: [''],
    gifEye: ['' as AnsGifGrade],
    gifHand: ['' as AnsGifGrade],
    gifFoot: ['' as AnsGifGrade],
    highestGif: [{ value: '' as AnsGifGrade, disabled: true }],
    ompSum: [{ value: '', disabled: true }],
    conduct: [''],
    ubs: [''],
    reference: [''],
  });

  constructor() {
    this.ansForm.valueChanges.subscribe(() => this.updateAnsComputedGrades());
    const treatment = this.profileService.profile().treatment;
    this.followUpForm.patchValue({
      doseSchemeClofazimina: treatment.schemeClofazimina,
      doseSchemeOfloxacino: treatment.schemeOfloxacino,
      doseSchemeRifampicina: treatment.schemeRifampicina,
      doseSchemeMinociclina: treatment.schemeMinociclina,
      doseSchemeDapsone: treatment.schemeDapsone,
      institutedPrednisoneMgKg: treatment.prednisoneMgKg,
      institutedAineMgDay: treatment.aineMgDay,
      institutedThalidomideMgDay: treatment.thalidomideMgDay,
      institutedPentoxifyllineMgDay: treatment.pentoxifyllineMgDay,
      institutedOtherMedication: treatment.otherMedication,
    });
  }

  readonly wizardStepCount = WIZARD_STEP_COUNT;
  readonly currentStepId = computed(() => WIZARD_STEPS[this.currentStepIndex()] ?? 'basics');
  readonly progressPercentage = computed(
    () => ((this.currentStepIndex() + 1) / WIZARD_STEP_COUNT) * 100
  );
  readonly stepLabel = computed(() => {
    switch (this.currentStepId()) {
      case 'basics':
        return 'Dados do compromisso';
      case 'performed':
        return 'Status do atendimento';
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
  readonly selectedMedicationLabel = computed(() => this.draft().followUp.otherMedicationName);
  readonly currentProfileDoseMedication = computed(
    () => this.profileService.profile().treatment.currentDoseMedication.trim() || 'Não informado'
  );

  onPerformedChange(value: boolean): void {
    this.draft.update((d) => {
      const next = { ...d, performed: value };
      if (value && d.type === 'dose_supervisionada') {
        next.followUp = { ...d.followUp, registerSupervisedDose: true };
      }
      if (value && d.type === 'avaliacao_neurologica') {
        next.followUp = { ...d.followUp, registerNeurologicalAssessment: true };
        if (!d.neurologicalAssessment.assessmentDate) {
          next.neurologicalAssessment = { ...d.neurologicalAssessment, assessmentDate: d.appointmentDate };
        }
      }
      return next;
    });
    if (value && this.draft().followUp.registerSupervisedDose) {
      this.preselectCurrentDoseMedication();
    }
    if (value && this.draft().followUp.registerNeurologicalAssessment) {
      this.syncAnsFormFromDraft(this.draft().neurologicalAssessment);
    }
    this.showValidation.set(false);
  }

  onRegisterDoseChange(checked: boolean): void {
    this.draft.update((d) => ({
      ...d,
      followUp: { ...d.followUp, registerSupervisedDose: checked },
    }));
    if (checked) {
      this.preselectCurrentDoseMedication();
    } else {
      this.followUpForm.patchValue({ doseMedicationChanged: null, updateDoseFromConsultation: false });
    }
    this.showValidation.set(false);
  }

  onDoseMedicationChanged(value: boolean): void {
    const requiresRegistration = !this.hasProfileDoseMedication();
    this.followUpForm.patchValue({
      doseMedicationChanged: value,
      updateDoseFromConsultation: value || requiresRegistration,
    });
    if (value) {
      this.preselectCurrentDoseMedication();
    }
    this.showValidation.set(false);
  }

  onRegisterNeurologicalAssessmentChange(checked: boolean): void {
    this.draft.update((d) => ({
      ...d,
      followUp: { ...d.followUp, registerNeurologicalAssessment: checked },
    }));
    if (checked) {
      this.syncAnsFormFromDraft(this.draft().neurologicalAssessment);
    }
    this.showValidation.set(false);
  }

  goToProfile(): void {
    void this.router.navigate(['/profile']);
  }

  private syncFollowUpFromForm(): void {
    const raw = this.followUpForm.getRawValue();
    const doseSelected = [
      raw.doseSchemeRifampicina ? 'Rifampicina' : '',
      raw.doseSchemeClofazimina ? 'Clofazimina' : '',
      raw.doseSchemeMinociclina ? 'Minociclina' : '',
      raw.doseSchemeOfloxacino ? 'Ofloxacino' : '',
      raw.doseSchemeDapsone ? 'Dapsona' : '',
    ]
      .filter(Boolean)
      .join(' + ');
    const doseChanged = raw.doseMedicationChanged === true;
    const shouldUpdateDose = raw.updateDoseFromConsultation ?? false;
    const profileDose = this.profileService.profile().treatment.currentDoseMedication.trim();
    const doseName = shouldUpdateDose ? doseSelected : profileDose;

    this.draft.update((d) => ({
      ...d,
      followUp: {
        ...d.followUp,
        conduct: raw.conduct ?? '',
        doseMedicationChanged: raw.doseMedicationChanged ?? null,
        updateDoseFromConsultation: shouldUpdateDose,
        doseSchemeClofazimina: raw.doseSchemeClofazimina ?? false,
        doseSchemeOfloxacino: raw.doseSchemeOfloxacino ?? false,
        doseSchemeRifampicina: raw.doseSchemeRifampicina ?? false,
        doseSchemeMinociclina: raw.doseSchemeMinociclina ?? false,
        doseSchemeDapsone: raw.doseSchemeDapsone ?? false,
        updateInstitutedMedsFromConsultation: raw.updateInstitutedMedsFromConsultation ?? false,
        hadMedicationChange: raw.updateInstitutedMedsFromConsultation ?? false,
        medicationChangeDescription: raw.medicationChangeDescription ?? '',
        institutedPrednisoneMgKg: raw.institutedPrednisoneMgKg ?? '',
        institutedAineMgDay: raw.institutedAineMgDay ?? '',
        institutedThalidomideMgDay: raw.institutedThalidomideMgDay ?? '',
        institutedPentoxifyllineMgDay: raw.institutedPentoxifyllineMgDay ?? '',
        institutedOtherMedication: raw.institutedOtherMedication ?? '',
        otherMedicationName: doseName || '',
        supervisedDoseNotes: raw.supervisedDoseNotes ?? '',
        nextAppointmentDate: raw.nextAppointmentDate ?? '',
        guidanceReceived: raw.guidanceReceived ?? '',
      },
    }));
  }

  private syncAnsFromForm(): void {
    const raw = this.ansForm.getRawValue();
    this.updateAnsComputedGrades();
    const computed = this.ansForm.getRawValue();
    const assessment: NeurologicalAssessmentDraft = {
      assessmentDate: raw.assessmentDate ?? '',
      gifEye: (raw.gifEye ?? '') as AnsGifGrade,
      gifHand: (raw.gifHand ?? '') as AnsGifGrade,
      gifFoot: (raw.gifFoot ?? '') as AnsGifGrade,
      highestGif: (computed.highestGif ?? '') as AnsGifGrade,
      ompSum: computed.ompSum ?? '',
      conduct: raw.conduct ?? '',
      ubs: raw.ubs ?? '',
      reference: raw.reference ?? '',
    };
    this.draft.update((d) => ({ ...d, neurologicalAssessment: assessment }));
  }

  private updateAnsComputedGrades(): void {
    const raw = this.ansForm.getRawValue();
    const grades = [raw.gifEye, raw.gifHand, raw.gifFoot]
      .filter((grade): grade is Exclude<AnsGifGrade, ''> => grade === '0' || grade === '1' || grade === '2')
      .map((grade) => Number(grade));
    if (grades.length === 0) {
      this.ansForm.patchValue({ highestGif: '', ompSum: '' }, { emitEvent: false });
      return;
    }
    this.ansForm.patchValue(
      {
        highestGif: String(Math.max(...grades)) as AnsGifGrade,
        ompSum: String(grades.reduce((sum, grade) => sum + grade, 0)),
      },
      { emitEvent: false }
    );
  }

  private syncAnsFormFromDraft(assessment: NeurologicalAssessmentDraft): void {
    this.ansForm.patchValue(
      {
        assessmentDate: assessment.assessmentDate,
        gifEye: assessment.gifEye,
        gifHand: assessment.gifHand,
        gifFoot: assessment.gifFoot,
        conduct: assessment.conduct,
        ubs: assessment.ubs,
        reference: assessment.reference,
      },
      { emitEvent: false }
    );
    this.updateAnsComputedGrades();
  }

  ansGifGradeLabel(value: AnsGifGrade): string {
    return ANS_GIF_GRADE_OPTIONS.find((option) => option.value === value)?.label ?? '—';
  }

  private preselectCurrentDoseMedication(): void {
    const treatment = this.profileService.profile().treatment;
    this.followUpForm.patchValue({
      doseSchemeClofazimina: treatment.schemeClofazimina,
      doseSchemeOfloxacino: treatment.schemeOfloxacino,
      doseSchemeRifampicina: treatment.schemeRifampicina,
      doseSchemeMinociclina: treatment.schemeMinociclina,
      doseSchemeDapsone: treatment.schemeDapsone,
      otherMedicationName: treatment.currentDoseMedication,
    });
    if (!treatment.currentDoseMedication.trim()) {
      this.followUpForm.patchValue({ doseMedicationChanged: true, updateDoseFromConsultation: true });
    }
  }

  private validateFollowUpStep(): boolean {
    this.syncFollowUpFromForm();
    const fu = this.draft().followUp;
    if (fu.registerSupervisedDose && fu.doseMedicationChanged === null) {
      this.showValidation.set(true);
      return false;
    }
    if (fu.registerSupervisedDose && fu.updateDoseFromConsultation) {
      const hasDoseSelection =
        fu.doseSchemeRifampicina ||
        fu.doseSchemeClofazimina ||
        fu.doseSchemeMinociclina ||
        fu.doseSchemeOfloxacino ||
        fu.doseSchemeDapsone;
      if (!hasDoseSelection) {
        this.showValidation.set(true);
        return false;
      }
    }
    return true;
  }

  shouldShowDoseRegistrationBlock(): boolean {
    return (
      this.followUpForm.controls.updateDoseFromConsultation.value === true ||
      (this.followUpForm.controls.doseMedicationChanged.value === false && !this.hasProfileDoseMedication())
    );
  }

  onInstitutedMedicationChanged(value: boolean): void {
    this.followUpForm.patchValue({ updateInstitutedMedsFromConsultation: value });
    this.showValidation.set(false);
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
      this.draft.update((d) => ({
        ...d,
        appointmentDate: raw.appointmentDate ?? '',
        appointmentTime: raw.appointmentTime ?? '',
        location: raw.location ?? '',
        type: (raw.type ?? '') as HealthAppointmentDraft['type'],
        professional: raw.professional ?? '',
        notes: raw.notes ?? '',
      }));
    }
    if (stepId === 'performed') {
      if (this.draft().performed === null) {
        this.showValidation.set(true);
        return;
      }
      if (this.draft().performed === true && !this.validateFollowUpStep()) return;
      if (this.draft().performed === true && this.draft().followUp.registerNeurologicalAssessment) {
        this.syncAnsFromForm();
      }
    }
    this.showValidation.set(false);
    if (this.currentStepIndex() < WIZARD_STEP_COUNT - 1) this.currentStepIndex.update((i) => i + 1);
  }

  prevStep(): void {
    if (this.currentStepIndex() > 0) {
      this.showValidation.set(false);
      this.currentStepIndex.update((i) => i - 1);
    }
  }

  submit(): void {
    this.syncFollowUpFromForm();
    if (this.draft().followUp.registerNeurologicalAssessment) this.syncAnsFromForm();
    this.syncProfileFromConsultation();
    const record = this.appointmentService.saveFromDraft(this.draft());
    this.savedStatusLabel.set(record.status === 'scheduled' ? 'Agendado' : 'Realizado');
    this.saved.set(true);
  }

  private syncProfileFromConsultation(): void {
    if (this.draft().performed !== true) return;
    const fu = this.draft().followUp;
    const current = this.profileService.profile().treatment;
    const next = { ...current };
    if (fu.registerSupervisedDose && fu.updateDoseFromConsultation) {
      next.schemeClofazimina = fu.doseSchemeClofazimina;
      next.schemeOfloxacino = fu.doseSchemeOfloxacino;
      next.schemeRifampicina = fu.doseSchemeRifampicina;
      next.schemeMinociclina = fu.doseSchemeMinociclina;
      next.schemeDapsone = fu.doseSchemeDapsone;
      next.currentDoseMedication = fu.otherMedicationName;
    }
    if (fu.updateInstitutedMedsFromConsultation) {
      next.prednisoneMgKg = fu.institutedPrednisoneMgKg;
      next.aineMgDay = fu.institutedAineMgDay;
      next.thalidomideMgDay = fu.institutedThalidomideMgDay;
      next.pentoxifyllineMgDay = fu.institutedPentoxifyllineMgDay;
      next.otherMedication = fu.institutedOtherMedication;
    }
    this.profileService.updateTreatment(next);
    this.medicationService.setCurrentDoseMedication(next.currentDoseMedication);
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
