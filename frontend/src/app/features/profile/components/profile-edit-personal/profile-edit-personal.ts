import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, LucideX } from 'lucide-angular';
import {
  BLOOD_TYPE_OPTIONS,
  EDUCATION_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  NATIONALITY_OPTIONS,
  RACE_COLOR_OPTIONS,
  SEX_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  YES_NO_OPTIONS,
  type PatientPersonalData,
  type YesNoChoice,
} from '../../models/patient-profile.models';

@Component({
  selector: 'app-profile-edit-personal',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './profile-edit-personal.html',
})
export class ProfileEditPersonal {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly initialData = input.required<PatientPersonalData>();
  readonly readonlyFullName = input('');
  readonly saved = output<PatientPersonalData>();
  readonly closed = output<void>();

  readonly LucideX = LucideX;
  readonly educationOptions = EDUCATION_OPTIONS;
  readonly bloodTypeOptions = BLOOD_TYPE_OPTIONS;
  readonly maritalStatusOptions = MARITAL_STATUS_OPTIONS;
  readonly nationalityOptions = NATIONALITY_OPTIONS;
  readonly raceColorOptions = RACE_COLOR_OPTIONS;
  readonly sexOptions = SEX_OPTIONS;
  readonly yesNoOptions = YES_NO_OPTIONS;
  readonly genderIdentityOptions = GENDER_IDENTITY_OPTIONS;
  readonly sexualOrientationOptions = SEXUAL_ORIENTATION_OPTIONS;
  readonly showValidation = signal(false);

  readonly raceColor = signal('');
  readonly wantsGenderIdentity = signal<YesNoChoice>('');
  readonly wantsSexualOrientation = signal<YesNoChoice>('');
  readonly genderIdentity = signal('');
  readonly sexualOrientation = signal('');

  readonly form = this.fb.group({
    socialName: [''],
    cpf: [''],
    susCard: [''],
    birthDate: [''],
    maritalStatus: [''],
    nationality: [''],
    raceColor: [''],
    indigenousEthnicity: [''],
    sex: [''],
    wantsGenderIdentity: ['' as YesNoChoice],
    genderIdentity: [''],
    genderIdentityOther: [''],
    wantsSexualOrientation: ['' as YesNoChoice],
    sexualOrientation: [''],
    sexualOrientationOther: [''],
    address: [''],
    phone: [''],
    email: [''],
    education: [''],
    occupation: [''],
    healthUnit: [''],
    acsName: [''],
    nurseName: [''],
    doctorName: [''],
    emergencyContact: [''],
    bloodType: [''],
    medicationAllergies: [''],
  });

  constructor() {
    effect(() => {
      const data = this.initialData();
      this.form.patchValue(data, { emitEvent: false });
      this.syncConditionalSignals();
    });

    this.form.controls.raceColor.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.raceColor.set(v ?? '');
        if (v !== 'indigena') {
          this.form.controls.indigenousEthnicity.setValue('', { emitEvent: false });
        }
      });

    this.form.controls.wantsGenderIdentity.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.wantsGenderIdentity.set((v ?? '') as YesNoChoice);
        if (v !== 'sim') {
          this.form.patchValue(
            { genderIdentity: '', genderIdentityOther: '' },
            { emitEvent: false }
          );
          this.genderIdentity.set('');
        }
      });

    this.form.controls.genderIdentity.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.genderIdentity.set(v ?? '');
        if (v !== 'outra') {
          this.form.controls.genderIdentityOther.setValue('', { emitEvent: false });
        }
      });

    this.form.controls.wantsSexualOrientation.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.wantsSexualOrientation.set((v ?? '') as YesNoChoice);
        if (v !== 'sim') {
          this.form.patchValue(
            { sexualOrientation: '', sexualOrientationOther: '' },
            { emitEvent: false }
          );
          this.sexualOrientation.set('');
        }
      });

    this.form.controls.sexualOrientation.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => {
        this.sexualOrientation.set(v ?? '');
        if (v !== 'outra') {
          this.form.controls.sexualOrientationOther.setValue('', { emitEvent: false });
        }
      });
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.showValidation.set(true);
      return;
    }
    this.saved.emit(this.buildPersonalData());
  }

  private buildPersonalData(): PatientPersonalData {
    const raw = this.form.getRawValue() as PatientPersonalData;
    raw.fullName = this.readonlyFullName().trim() || this.initialData().fullName;
    if (raw.raceColor !== 'indigena') {
      raw.indigenousEthnicity = '';
    }
    if (raw.wantsGenderIdentity !== 'sim') {
      raw.genderIdentity = '';
      raw.genderIdentityOther = '';
    } else if (raw.genderIdentity !== 'outra') {
      raw.genderIdentityOther = '';
    }
    if (raw.wantsSexualOrientation !== 'sim') {
      raw.sexualOrientation = '';
      raw.sexualOrientationOther = '';
    } else if (raw.sexualOrientation !== 'outra') {
      raw.sexualOrientationOther = '';
    }
    return raw;
  }

  private syncConditionalSignals(): void {
    this.raceColor.set(this.form.controls.raceColor.value ?? '');
    this.wantsGenderIdentity.set(
      (this.form.controls.wantsGenderIdentity.value ?? '') as YesNoChoice
    );
    this.wantsSexualOrientation.set(
      (this.form.controls.wantsSexualOrientation.value ?? '') as YesNoChoice
    );
    this.genderIdentity.set(this.form.controls.genderIdentity.value ?? '');
    this.sexualOrientation.set(this.form.controls.sexualOrientation.value ?? '');
  }
}
