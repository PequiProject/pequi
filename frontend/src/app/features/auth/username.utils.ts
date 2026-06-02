import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const USERNAME_VALIDATION_MESSAGE =
  'Use de 3 a 30 caracteres, sem espaços.';

export const USERNAME_SPACE_MESSAGE =
  'O nome de usuário não pode conter espaços.';

const USERNAME_PATTERN = /^(?=.*[a-z0-9])[a-z0-9._-]{3,30}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  const normalized = normalizeUsername(value);
  return USERNAME_PATTERN.test(normalized);
}

export function usernameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    if (!value.trim()) {
      return { required: true };
    }
    if (/\s/.test(value)) {
      return { usernameSpace: true };
    }
    if (!isValidUsername(value)) {
      return { username: true };
    }
    return null;
  };
}
