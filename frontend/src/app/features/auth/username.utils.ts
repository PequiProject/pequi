import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]*[a-z0-9]$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  const normalized = normalizeUsername(value);
  return normalized.length >= 3 && normalized.length <= 30 && USERNAME_PATTERN.test(normalized);
}

export function usernameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    if (!value.trim()) {
      return { required: true };
    }
    if (!isValidUsername(value)) {
      return { username: true };
    }
    return null;
  };
}
