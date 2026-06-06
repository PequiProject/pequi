import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { AuthService } from '../../auth/services/auth-service';
import { PatientPersonalService } from './patient-personal.service';
import { PatientTreatmentService } from './patient-treatment.service';
import {
  EMPTY_PATIENT_PROFILE,
  type PatientAccountData,
  type PatientPersonalData,
  type PatientProfile,
  type PatientTreatmentData,
} from '../models/patient-profile.models';

const STORAGE_KEY = 'pequi.patient_profile';

export type ChangePasswordError =
  | 'wrong_current'
  | 'mismatch'
  | 'too_short'
  | 'incomplete'
  | 'current_required';

export function extractHttpErrorDetail(error: HttpErrorResponse): string {
  if (typeof error.error === 'string') {
    return error.error;
  }
  if (
    error.error &&
    typeof error.error === 'object' &&
    'detail' in error.error &&
    typeof (error.error as { detail?: unknown }).detail === 'string'
  ) {
    return (error.error as { detail: string }).detail;
  }
  return '';
}

export function mapChangePasswordHttpError(error: unknown): ChangePasswordError {
  const httpError = error as HttpErrorResponse;
  const detail = extractHttpErrorDetail(httpError).toLowerCase();

  if (httpError.status === 401 || detail.includes('atual')) {
    return 'wrong_current';
  }
  if (detail.includes('coincidem')) {
    return 'mismatch';
  }
  return 'too_short';
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: ChangePasswordError };

@Injectable({ providedIn: 'root' })
export class PatientProfileService {
  private readonly authService = inject(AuthService);
  private readonly personalApi = inject(PatientPersonalService);
  private readonly treatmentApi = inject(PatientTreatmentService);
  private readonly profileSignal = signal<PatientProfile>(this.loadFromStorage());
  private readonly treatmentSyncedSignal = signal(false);
  private readonly personalSyncedSignal = signal(false);

  readonly profile = this.profileSignal.asReadonly();
  readonly displayName = this.authService.displayName;

  readonly legalFullName = computed(() => {
    const fromAuth = this.authService.currentUser()?.full_name?.trim() ?? '';
    if (fromAuth) return fromAuth;
    return this.profileSignal().personal.fullName.trim();
  });

  readonly initials = computed(() => {
    const name = this.displayName();
    const cleaned = name.replace(/^@/, '').trim();
    if (!cleaned) return 'P';
    if (cleaned.length <= 2) return cleaned.slice(0, 2).toUpperCase();
    return cleaned.slice(0, 2).toUpperCase();
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

  syncLoginEmailFromAuth(): void {
    const email = this.authService.currentUser()?.email?.trim() ?? '';
    if (!email) return;
    const account = this.profileSignal().account;
    if (account.loginEmail === email) return;
    this.updateAccount({ ...account, loginEmail: email });
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Observable<ChangePasswordResult> {
    if (newPassword.length < 8) {
      return of({ ok: false, error: 'too_short' });
    }
    if (newPassword !== confirmPassword) {
      return of({ ok: false, error: 'mismatch' });
    }

    if (!this.authService.isAuthenticated()) {
      return of(this.changePasswordLocal(currentPassword, newPassword, confirmPassword));
    }

    if (!currentPassword.trim()) {
      return of({ ok: false as const, error: 'current_required' as const });
    }

    return this.personalApi.changePassword(currentPassword, newPassword, confirmPassword).pipe(
      map(() => ({ ok: true as const })),
      catchError((error: unknown) => of({ ok: false as const, error: mapChangePasswordHttpError(error) }))
    );
  }

  private changePasswordLocal(
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
    if (!stored || stored !== currentPassword) {
      return { ok: false, error: 'wrong_current' };
    }
    const account = this.profileSignal().account;
    this.updateAccount({ ...account, password: newPassword });
    return { ok: true };
  }

  savePersonal(personal: PatientPersonalData): Observable<PatientPersonalData> {
    const lockedFullName = this.legalFullName();
    const normalized: PatientPersonalData = {
      ...personal,
      fullName: lockedFullName || personal.fullName,
    };
    this.patch({ personal: normalized });

    if (!this.authService.isAuthenticated()) {
      return of(normalized);
    }

    return this.personalApi.savePersonalRecord(normalized, lockedFullName).pipe(
      tap((saved) => {
        this.patch({ personal: saved });
        this.personalSyncedSignal.set(true);
        this.persist(this.profileSignal());
      })
    );
  }

  syncPersonalFromApi(): Observable<PatientPersonalData | null> {
    if (!this.authService.isAuthenticated()) {
      return of(null);
    }

    const fullName = this.legalFullName();
    return this.personalApi.loadPersonalRecord(fullName).pipe(
      tap((personal) => {
        this.syncLoginEmailFromAuth();
        this.patch({ personal });
        this.personalSyncedSignal.set(true);
        this.persist(this.profileSignal());
      })
    );
  }

  readonly treatmentSynced = this.treatmentSyncedSignal.asReadonly();
  readonly personalSynced = this.personalSyncedSignal.asReadonly();

  updateTreatment(treatment: PatientTreatmentData): void {
    this.patch({ treatment: { ...treatment } });
  }

  saveTreatment(treatment: PatientTreatmentData): Observable<PatientTreatmentData> {
    this.patch({ treatment: { ...treatment } });

    if (!this.authService.isAuthenticated()) {
      return of(treatment);
    }

    return this.treatmentApi.saveTreatmentRecord(treatment).pipe(
      tap((saved) => {
        this.patch({ treatment: saved });
        this.treatmentSyncedSignal.set(true);
        this.persist(this.profileSignal());
      }),
    );
  }

  syncTreatmentFromApi(): Observable<PatientTreatmentData | null> {
    if (!this.authService.isAuthenticated()) {
      return of(null);
    }

    return this.treatmentApi.loadTreatmentRecord().pipe(
      tap((treatment) => {
        this.patch({ treatment });
        this.treatmentSyncedSignal.set(true);
        this.persist(this.profileSignal());
      }),
    );
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
