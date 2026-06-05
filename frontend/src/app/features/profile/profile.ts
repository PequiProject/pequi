import { Component, inject, OnInit, signal, type WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  LucideDownload,
  LucideKeyRound,
  LucidePencil,
  LucideUser,
} from 'lucide-angular';
import { ProfileEditAccount } from './components/profile-edit-account/profile-edit-account';
import { ProfileEditPersonal } from './components/profile-edit-personal/profile-edit-personal';
import { ProfileEditUsername } from './components/profile-edit-username/profile-edit-username';
import {
  CLASSIFICATION_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  CLINICAL_FORM_OPTIONS,
  GIF_GRADE_OPTIONS,
  INTOLERANCE_OPTIONS,
  REACTION_EPISODE_TYPE_OPTIONS,
  INSTITUTED_MEDICATION_FREQUENCY_OPTIONS,
  INSTITUTED_MEDICATION_NAME_OPTIONS,
  INSTITUTED_MEDICATION_OTHER_KEY,
  INSTITUTED_MEDICATION_UNIT_OPTIONS,
  SUBSTITUTE_SCHEME_MEDICATION_OPTIONS,
  YES_NO_OPTIONS,
  isInstitutedMedicationOtherKey,
  institutedMedicationSelectValue,
  parseInstitutedMedicationRows,
  type PatientPersonalData,
  type PatientTreatmentData,
  type YesNoChoice,
} from './models/patient-profile.models';
import {
  PatientProfileService,
  type ChangePasswordError,
} from './services/patient-profile.service';
import { PatientMedicationService } from '../appointments/services/patient-medication.service';
import { AuthService } from '../auth/services/auth-service';
import { getApiErrorMessage } from '../../core/api-error.utils';
import { ToastService } from '../../components/toast/toast.service';
import { PatientBookletExportService } from './services/patient-booklet-export.service';

export type ProfileTab = 'overview' | 'treatment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, ProfileEditPersonal, ProfileEditAccount, ProfileEditUsername],
  templateUrl: './profile.html',
})
export class Profile implements OnInit {
  readonly institutedMedicationNameOptions = INSTITUTED_MEDICATION_NAME_OPTIONS;
  readonly institutedMedicationUnitOptions = INSTITUTED_MEDICATION_UNIT_OPTIONS;
  readonly institutedMedicationFrequencyOptions = INSTITUTED_MEDICATION_FREQUENCY_OPTIONS;

  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(PatientProfileService);
  private readonly medicationService = inject(PatientMedicationService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly bookletExport = inject(PatientBookletExportService);

  readonly savingTreatment = signal(false);
  readonly exportingBooklet = signal(false);

  readonly LucideDownload = LucideDownload;
  readonly LucideKeyRound = LucideKeyRound;
  readonly LucidePencil = LucidePencil;
  readonly LucideUser = LucideUser;

  readonly classificationOptions = CLASSIFICATION_OPTIONS;
  readonly clinicalFormOptions = CLINICAL_FORM_OPTIONS;
  readonly gifGradeOptions = GIF_GRADE_OPTIONS;
  readonly yesNoOptions = YES_NO_OPTIONS;
  readonly reactionEpisodeTypeOptions = REACTION_EPISODE_TYPE_OPTIONS;
  readonly intoleranceOptions = INTOLERANCE_OPTIONS;
  readonly substituteSchemeMedicationOptions = SUBSTITUTE_SCHEME_MEDICATION_OPTIONS;
  readonly bloodTypeOptions = BLOOD_TYPE_OPTIONS;

  readonly profile = this.profileService.profile;
  readonly displayName = this.profileService.displayName;
  readonly legalFullName = this.profileService.legalFullName;
  readonly initials = this.profileService.initials;
  readonly hasAvatar = this.profileService.hasAvatar;
  readonly hasPersonalData = this.profileService.hasPersonalData;

  readonly activeTab = signal<ProfileTab>('overview');
  readonly showEditPersonal = signal(false);
  readonly showEditUsername = signal(false);
  readonly showEditAccount = signal(false);
  readonly showAvatarMenu = signal(false);
  readonly accountPasswordError = signal<ChangePasswordError | null>(null);

  readonly personalSavedToast = signal(false);
  readonly usernameSavedToast = signal(false);
  readonly treatmentSavedToast = signal(false);
  readonly accountSavedToast = signal(false);
  readonly avatarRemovedToast = signal(false);
  readonly hasReactionEpisodeAtDiagnosis = signal<YesNoChoice>('');
  readonly hasReactionEpisodeAtDischarge = signal<YesNoChoice>('');

  readonly treatmentForm = this.fb.group({
    currentDoseMedication: [''],
    diagnosisDate: [''],
    cnsNumber: [''],
    sinanNumber: [''],
    classification: [''],
    treatmentStartDate: [''],
    clinicalForm: [''],
    baciloscopyDate: [''],
    baciloscopyIB: [''],
    diagnosticSupportExam: [''],
    gifAssessment: [''],
    reactionEpisodeAtDiagnosis: ['' as YesNoChoice],
    reactionEpisodeType: [''],
    reactionEpisodeDate: [''],
    prednisoneMgKg: [''],
    aineMgDay: [''],
    thalidomideMgDay: [''],
    pentoxifyllineMgDay: [''],
    otherMedication: [''],
    institutedMedications: this.fb.array([]),
    otherConducts: [''],
    substituteSchemeChangeDate: [''],
    intoleranceDapsone: [false],
    intoleranceRifampicin: [false],
    intoleranceClofazimine: [false],
    schemeClofazimina: [false],
    schemeOfloxacino: [false],
    schemeRifampicina: [false],
    schemeMinociclina: [false],
    schemeDapsone: [false],
    pqtDischargeDate: [''],
    gifAssessmentAtDischarge: [''],
    reactionEpisodeAtDischarge: ['' as YesNoChoice],
    reactionEpisodeTypeAtDischarge: [''],
    reactionEpisodeDateAtDischarge: [''],
    dischargePrednisoneMgKg: [''],
    dischargeAineMgDay: [''],
    dischargeThalidomideMgDay: [''],
    dischargePentoxifyllineMgDay: [''],
    dischargeOtherMedication: [''],
    dischargeOtherConducts: [''],
  });

  get institutedMedicationsArray(): FormArray {
    return this.treatmentForm.controls.institutedMedications as FormArray;
  }

  addInstitutedMedication(name = '', dose = '', unit = 'mg', frequency = 'dia'): void {
    const medicationKey = institutedMedicationSelectValue(name);
    this.institutedMedicationsArray.push(
      this.fb.group({
        medicationKey: [medicationKey],
        customName: [medicationKey === INSTITUTED_MEDICATION_OTHER_KEY ? name : ''],
        dose: [dose],
        unit: [unit],
        frequency: [frequency],
      })
    );
  }

  removeInstitutedMedication(index: number): void {
    this.institutedMedicationsArray.removeAt(index);
  }

  isInstitutedMedicationOther(index: number): boolean {
    const key = this.institutedMedicationsArray.at(index)?.get('medicationKey')?.value;
    return isInstitutedMedicationOtherKey(String(key ?? ''));
  }

  constructor() {
    this.treatmentForm.controls.reactionEpisodeAtDiagnosis.valueChanges.subscribe((value) => {
      this.hasReactionEpisodeAtDiagnosis.set((value ?? '') as YesNoChoice);
      if (value !== 'sim') {
        this.treatmentForm.patchValue(
          { reactionEpisodeType: '', reactionEpisodeDate: '' },
          { emitEvent: false }
        );
      }
    });
    this.treatmentForm.controls.reactionEpisodeAtDischarge.valueChanges.subscribe((value) => {
      this.hasReactionEpisodeAtDischarge.set((value ?? '') as YesNoChoice);
      if (value !== 'sim') {
        this.treatmentForm.patchValue(
          {
            reactionEpisodeTypeAtDischarge: '',
            reactionEpisodeDateAtDischarge: '',
            dischargePrednisoneMgKg: '',
            dischargeAineMgDay: '',
            dischargeThalidomideMgDay: '',
            dischargePentoxifyllineMgDay: '',
            dischargeOtherMedication: '',
            dischargeOtherConducts: '',
          },
          { emitEvent: false }
        );
      }
    });
    this.treatmentForm.controls.intoleranceDapsone.valueChanges.subscribe((value) => {
      if (value) {
        this.treatmentForm.patchValue({ schemeDapsone: false }, { emitEvent: false });
        this.updateCurrentDoseFromScheme();
      }
    });
    this.treatmentForm.controls.intoleranceRifampicin.valueChanges.subscribe((value) => {
      if (value) {
        this.treatmentForm.patchValue({ schemeRifampicina: false }, { emitEvent: false });
        this.updateCurrentDoseFromScheme();
      }
    });
    this.treatmentForm.controls.intoleranceClofazimine.valueChanges.subscribe((value) => {
      if (value) {
        this.treatmentForm.patchValue({ schemeClofazimina: false }, { emitEvent: false });
        this.updateCurrentDoseFromScheme();
      }
    });
    this.treatmentForm.controls.schemeClofazimina.valueChanges.subscribe(() =>
      this.updateCurrentDoseFromScheme()
    );
    this.treatmentForm.controls.schemeOfloxacino.valueChanges.subscribe(() =>
      this.updateCurrentDoseFromScheme()
    );
    this.treatmentForm.controls.schemeRifampicina.valueChanges.subscribe(() =>
      this.updateCurrentDoseFromScheme()
    );
    this.treatmentForm.controls.schemeMinociclina.valueChanges.subscribe(() =>
      this.updateCurrentDoseFromScheme()
    );
    this.treatmentForm.controls.schemeDapsone.valueChanges.subscribe(() =>
      this.updateCurrentDoseFromScheme()
    );
    this.syncTreatmentForm(this.profileService.profile().treatment);
  }

  ngOnInit(): void {
    this.profileService.syncLoginEmailFromAuth();

    this.profileService.syncPersonalFromApi().subscribe({
      error: () => undefined,
    });

    this.profileService.syncTreatmentFromApi().subscribe({
      next: (treatment) => {
        if (treatment) {
          this.syncTreatmentForm(treatment);
        }
      },
      error: () => undefined,
    });

    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'treatment') {
      this.setTab('treatment');
    }
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
    if (tab === 'treatment') {
      this.syncTreatmentForm(this.profile().treatment);
    }
  }

  openEditPersonal(): void {
    this.showEditPersonal.set(true);
  }

  closeEditPersonal(): void {
    this.showEditPersonal.set(false);
  }

  openEditUsername(): void {
    this.showEditUsername.set(true);
  }

  closeEditUsername(): void {
    this.showEditUsername.set(false);
  }

  onUsernameSaved(username: string): void {
    this.authService.updateUsername(username).subscribe({
      next: () => {
        this.showEditUsername.set(false);
        this.showToast(this.usernameSavedToast);
      },
      error: (error) => {
        const message = getApiErrorMessage(
          error,
          'Não foi possível atualizar o nome de usuário.'
        );
        this.toastService.error('Erro ao salvar', message);
      },
    });
  }

  openEditAccount(): void {
    this.accountPasswordError.set(null);
    this.showEditAccount.set(true);
  }

  closeEditAccount(): void {
    this.showEditAccount.set(false);
    this.accountPasswordError.set(null);
  }

  onPersonalSaved(data: PatientPersonalData): void {
    this.profileService.savePersonal(data).subscribe({
      next: () => {
        this.showEditPersonal.set(false);
        this.showToast(this.personalSavedToast);
      },
      error: (error) => {
        this.toastService.error(
          'Erro ao salvar',
          getApiErrorMessage(error, 'Não foi possível salvar os dados pessoais.')
        );
      },
    });
  }

  onPasswordChanged(): void {
    this.accountPasswordError.set(null);
    this.showEditAccount.set(false);
    this.showToast(this.accountSavedToast);
  }

  toggleAvatarMenu(): void {
    this.showAvatarMenu.update((open) => !open);
  }

  closeAvatarMenu(): void {
    this.showAvatarMenu.set(false);
  }

  pickAvatar(fileInput: HTMLInputElement): void {
    this.closeAvatarMenu();
    fileInput.click();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        this.profileService.updateAvatar(result);
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
    this.closeAvatarMenu();
  }

  removeAvatar(): void {
    if (!this.hasAvatar()) return;
    this.profileService.removeAvatar();
    this.closeAvatarMenu();
    this.showToast(this.avatarRemovedToast);
  }

  saveTreatment(): void {
    const raw = this.treatmentForm.getRawValue();
    const institutedMedications = parseInstitutedMedicationRows(
      this.institutedMedicationsArray.controls
    );
    const byName = (name: string) =>
      institutedMedications.find((item) => item.name.toLowerCase() === name.toLowerCase())?.dose ?? '';
    const customMeds = institutedMedications
      .filter(
        (item) =>
          !['prednisona', 'aine', 'talidomida', 'pentoxifilina'].includes(item.name.toLowerCase())
      )
      .map((item) => `${item.name} ${item.dose} ${item.unit}/${item.frequency}`.trim())
      .join(' | ');

    const treatment: PatientTreatmentData = {
      currentDoseMedication: raw.currentDoseMedication ?? '',
      diagnosisDate: raw.diagnosisDate ?? '',
      cnsNumber: raw.cnsNumber ?? '',
      sinanNumber: raw.sinanNumber ?? '',
      classification: (raw.classification as PatientTreatmentData['classification']) ?? '',
      treatmentStartDate: raw.treatmentStartDate ?? '',
      clinicalForm: (raw.clinicalForm as PatientTreatmentData['clinicalForm']) ?? '',
      baciloscopyDate: raw.baciloscopyDate ?? '',
      baciloscopyIB: raw.baciloscopyIB ?? '',
      diagnosticSupportExam: raw.diagnosticSupportExam ?? '',
      gifAssessment: (raw.gifAssessment as PatientTreatmentData['gifAssessment']) ?? '',
      reactionEpisodeAtDiagnosis:
        (raw.reactionEpisodeAtDiagnosis as PatientTreatmentData['reactionEpisodeAtDiagnosis']) ??
        '',
      reactionEpisodeType:
        raw.reactionEpisodeAtDiagnosis === 'sim'
          ? ((raw.reactionEpisodeType as PatientTreatmentData['reactionEpisodeType']) ?? '')
          : '',
      reactionEpisodeDate:
        raw.reactionEpisodeAtDiagnosis === 'sim' ? (raw.reactionEpisodeDate ?? '') : '',
      prednisoneMgKg: byName('Prednisona'),
      aineMgDay: byName('AINE'),
      thalidomideMgDay: byName('Talidomida'),
      pentoxifyllineMgDay: byName('Pentoxifilina'),
      otherMedication: customMeds,
      institutedMedications,
      otherConducts: raw.otherConducts ?? '',
      substituteSchemeChangeDate: raw.substituteSchemeChangeDate ?? '',
      intoleranceDapsone: raw.intoleranceDapsone ?? false,
      intoleranceRifampicin: raw.intoleranceRifampicin ?? false,
      intoleranceClofazimine: raw.intoleranceClofazimine ?? false,
      schemeClofazimina: raw.schemeClofazimina ?? false,
      schemeOfloxacino: raw.schemeOfloxacino ?? false,
      schemeRifampicina: raw.schemeRifampicina ?? false,
      schemeMinociclina: raw.schemeMinociclina ?? false,
      schemeDapsone: raw.schemeDapsone ?? false,
      pqtDischargeDate: raw.pqtDischargeDate ?? '',
      gifAssessmentAtDischarge:
        (raw.gifAssessmentAtDischarge as PatientTreatmentData['gifAssessmentAtDischarge']) ?? '',
      reactionEpisodeAtDischarge:
        (raw.reactionEpisodeAtDischarge as PatientTreatmentData['reactionEpisodeAtDischarge']) ??
        '',
      reactionEpisodeTypeAtDischarge:
        raw.reactionEpisodeAtDischarge === 'sim'
          ? ((raw.reactionEpisodeTypeAtDischarge as PatientTreatmentData['reactionEpisodeTypeAtDischarge']) ??
            '')
          : '',
      reactionEpisodeDateAtDischarge:
        raw.reactionEpisodeAtDischarge === 'sim'
          ? (raw.reactionEpisodeDateAtDischarge ?? '')
          : '',
      dischargePrednisoneMgKg:
        raw.reactionEpisodeAtDischarge === 'sim' ? (raw.dischargePrednisoneMgKg ?? '') : '',
      dischargeAineMgDay:
        raw.reactionEpisodeAtDischarge === 'sim' ? (raw.dischargeAineMgDay ?? '') : '',
      dischargeThalidomideMgDay:
        raw.reactionEpisodeAtDischarge === 'sim' ? (raw.dischargeThalidomideMgDay ?? '') : '',
      dischargePentoxifyllineMgDay:
        raw.reactionEpisodeAtDischarge === 'sim' ? (raw.dischargePentoxifyllineMgDay ?? '') : '',
      dischargeOtherMedication:
        raw.reactionEpisodeAtDischarge === 'sim' ? (raw.dischargeOtherMedication ?? '') : '',
      dischargeOtherConducts:
        raw.reactionEpisodeAtDischarge === 'sim' ? (raw.dischargeOtherConducts ?? '') : '',
    };
    this.medicationService.setCurrentDoseMedication(treatment.currentDoseMedication);

    if (!this.authService.isAuthenticated()) {
      this.profileService.updateTreatment(treatment);
      this.showToast(this.treatmentSavedToast);
      return;
    }

    this.savingTreatment.set(true);
    this.profileService.saveTreatment(treatment).subscribe({
      next: (saved) => {
        this.savingTreatment.set(false);
        this.syncTreatmentForm(saved);
        this.showToast(this.treatmentSavedToast);
      },
      error: () => {
        this.savingTreatment.set(false);
        this.profileService.updateTreatment(treatment);
        this.toastService.error(
          'Erro ao salvar tratamento',
          'Dados guardados localmente. Tente novamente quando estiver online.',
        );
      },
    });
  }

  onExportBooklet(): void {
    if (this.exportingBooklet()) return;

    this.exportingBooklet.set(true);
    this.bookletExport.exportAndDownload().subscribe({
      next: () => {
        this.exportingBooklet.set(false);
        this.toastService.success(
          'Cartilha exportada',
          'Arquivo baixado. Leia o aviso no documento: cópia do Pequi, não é documento médico oficial.'
        );
      },
      error: () => {
        this.exportingBooklet.set(false);
        this.toastService.error(
          'Exportação',
          'Não foi possível gerar a cartilha. Verifique sua conexão e tente novamente.'
        );
      },
    });
  }

  hasAccountPassword(): boolean {
    return this.authService.isAuthenticated() || this.profile().account.password.length > 0;
  }

  maskedLoginEmail(): string {
    const email = this.profile().account.loginEmail.trim();
    return email || 'Não definido';
  }

  bloodTypeLabel(value: string): string {
    return BLOOD_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? '—';
  }

  private syncTreatmentForm(treatment: PatientTreatmentData): void {
    const currentDose =
      treatment.currentDoseMedication.trim() ||
      this.medicationService.getCurrentDoseMedication()?.name ||
      '';
    this.treatmentForm.patchValue(
      { ...treatment, currentDoseMedication: currentDose },
      { emitEvent: false }
    );
    this.institutedMedicationsArray.clear();
    const stored = treatment.institutedMedications ?? [];
    if (stored.length > 0) {
      for (const item of stored) {
        this.addInstitutedMedication(item.name, item.dose, item.unit || 'mg', item.frequency || 'dia');
      }
      return;
    }
    if (treatment.prednisoneMgKg.trim()) {
      this.addInstitutedMedication('Prednisona', treatment.prednisoneMgKg, 'mg/kg', 'dia');
    }
    if (treatment.aineMgDay.trim()) {
      this.addInstitutedMedication('AINE', treatment.aineMgDay, 'mg', 'dia');
    }
    if (treatment.thalidomideMgDay.trim()) {
      this.addInstitutedMedication('Talidomida', treatment.thalidomideMgDay, 'mg', 'dia');
    }
    if (treatment.pentoxifyllineMgDay.trim()) {
      this.addInstitutedMedication('Pentoxifilina', treatment.pentoxifyllineMgDay, 'mg', 'dia');
    }
    if (treatment.otherMedication.trim()) {
      this.addInstitutedMedication(treatment.otherMedication, '', 'mg', 'dia');
    }
    this.hasReactionEpisodeAtDiagnosis.set(treatment.reactionEpisodeAtDiagnosis);
    this.hasReactionEpisodeAtDischarge.set(treatment.reactionEpisodeAtDischarge);
  }

  private showToast(toast: WritableSignal<boolean>): void {
    toast.set(true);
    setTimeout(() => toast.set(false), 3000);
  }

  private updateCurrentDoseFromScheme(): void {
    const controls = this.treatmentForm.controls;
    const parts: string[] = [];
    if (controls.schemeRifampicina.value) {
      parts.push('Rifampicina');
    }
    if (controls.schemeClofazimina.value) {
      parts.push('Clofazimina');
    }
    if (controls.schemeMinociclina.value) {
      parts.push('Minociclina');
    }
    if (controls.schemeOfloxacino.value) {
      parts.push('Ofloxacino');
    }
    if (controls.schemeDapsone.value) {
      parts.push('Dapsona');
    }
    const value = parts.join(' + ');
    if (!value) {
      return;
    }
    controls.currentDoseMedication.patchValue(value, { emitEvent: false });
  }
}
