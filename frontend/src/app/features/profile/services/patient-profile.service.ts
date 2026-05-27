import { computed, Injectable, signal } from '@angular/core';
import {
  EMPTY_PATIENT_PROFILE,
  type PatientAccountData,
  type PatientPersonalData,
  type PatientProfile,
  type PatientTreatmentData,
} from '../models/patient-profile.models';

const STORAGE_KEY = 'pequi.patient_profile';

export type ChangePasswordError = 'wrong_current' | 'mismatch' | 'too_short';

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: ChangePasswordError };

@Injectable({ providedIn: 'root' })
export class PatientProfileService {
  private readonly profileSignal = signal<PatientProfile>(this.loadFromStorage());

  readonly profile = this.profileSignal.asReadonly();

  readonly displayName = computed(() => {
    const { personal } = this.profileSignal();
    const social = personal.socialName.trim();
    const full = personal.fullName.trim();
    if (social) return social;
    if (full) return full;
    return 'Paciente';
  });

  readonly initials = computed(() => {
    const name = this.displayName();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'P';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  });

  readonly hasAvatar = computed(() => this.profileSignal().avatarDataUrl.trim() !== '');

  readonly hasPersonalData = computed(() => {
    const p = this.profileSignal().personal;
    return Object.values(p).some((v) => String(v).trim() !== '');
  });

  updateAvatar(avatarDataUrl: string): void {
    this.patch({ avatarDataUrl });
  }

  removeAvatar(): void {
    this.patch({ avatarDataUrl: '' });
  }

  updateAccount(account: PatientAccountData): void {
    this.patch({
      account: {
        loginEmail: account.loginEmail.trim(),
        password: account.password,
      },
    });
  }

  updateLoginEmail(loginEmail: string): void {
    const account = this.profileSignal().account;
    this.updateAccount({ ...account, loginEmail: loginEmail.trim() });
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): ChangePasswordResult {
    if (newPassword.length < 6) {
      return { ok: false, error: 'too_short' };
    }
    if (newPassword !== confirmPassword) {
      return { ok: false, error: 'mismatch' };
    }

    const stored = this.profileSignal().account.password;
    if (stored && stored !== currentPassword) {
      return { ok: false, error: 'wrong_current' };
    }

    const account = this.profileSignal().account;
    this.updateAccount({ ...account, password: newPassword });
    return { ok: true };
  }

  updatePersonal(personal: PatientPersonalData): void {
    this.patch({ personal: { ...personal } });
  }

  updateTreatment(treatment: PatientTreatmentData): void {
    this.patch({ treatment: { ...treatment } });
  }

  reset(): void {
    this.profileSignal.set(structuredClone(EMPTY_PATIENT_PROFILE));
    this.persist(this.profileSignal());
  }

  private patch(partial: Partial<PatientProfile>): void {
    const current = this.profileSignal();
    const next: PatientProfile = {
      ...current,
      ...partial,
      account: partial.account ?? current.account,
      personal: partial.personal ?? current.personal,
      treatment: partial.treatment ?? current.treatment,
    };
    this.profileSignal.set(next);
    this.persist(next);
  }

  private loadFromStorage(): PatientProfile {
    if (typeof localStorage === 'undefined') {
      return structuredClone(EMPTY_PATIENT_PROFILE);
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(EMPTY_PATIENT_PROFILE);
      const parsed = JSON.parse(raw) as Partial<PatientProfile>;
      return this.mergeWithDefaults(parsed);
    } catch {
      return structuredClone(EMPTY_PATIENT_PROFILE);
    }
  }

  private mergeWithDefaults(parsed: Partial<PatientProfile>): PatientProfile {
    const base = structuredClone(EMPTY_PATIENT_PROFILE);
    const legacyTreatment = parsed.treatment as
      | (Partial<PatientTreatmentData> & {
          baciloscopy?: string;
          institutedMedications?: string;
        })
      | undefined;

    const treatment: PatientTreatmentData = {
      ...base.treatment,
      ...legacyTreatment,
      baciloscopyIB:
        legacyTreatment?.baciloscopyIB ??
        (legacyTreatment?.baciloscopy && !legacyTreatment?.baciloscopyDate
          ? legacyTreatment.baciloscopy
          : base.treatment.baciloscopyIB),
      otherMedication:
        legacyTreatment?.otherMedication ??
        (legacyTreatment?.institutedMedications && !legacyTreatment?.prednisoneMgKg
          ? legacyTreatment.institutedMedications
          : base.treatment.otherMedication),
    };

    return {
      avatarDataUrl: parsed.avatarDataUrl ?? base.avatarDataUrl,
      account: { ...base.account, ...parsed.account },
      personal: { ...base.personal, ...parsed.personal },
      treatment,
    };
  }

  private persist(profile: PatientProfile): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }
}
