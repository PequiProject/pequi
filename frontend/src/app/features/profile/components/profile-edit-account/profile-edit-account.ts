import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, LucideX } from 'lucide-angular';
import type { ChangePasswordError } from '../../services/patient-profile.service';

export type AccountSavePayload = {
  loginEmail: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

@Component({
  selector: 'app-profile-edit-account',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './profile-edit-account.html',
})
export class ProfileEditAccount {
  private readonly fb = inject(FormBuilder);

  readonly initialEmail = input.required<string>();
  readonly hasPassword = input(false);
  readonly passwordError = input<ChangePasswordError | null>(null);

  readonly saved = output<AccountSavePayload>();
  readonly closed = output<void>();

  readonly LucideX = LucideX;
  readonly showValidation = signal(false);

  readonly form = this.fb.group({
    loginEmail: ['', [Validators.required, Validators.email]],
    currentPassword: [''],
    newPassword: ['', Validators.minLength(6)],
    confirmPassword: [''],
  });

  readonly passwordSectionTitle = computed(() =>
    this.hasPassword() ? 'Alterar senha' : 'Definir senha'
  );

  constructor() {
    effect(() => {
      this.form.patchValue({ loginEmail: this.initialEmail() }, { emitEvent: false });
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
    const emailCtrl = this.form.controls.loginEmail;
    const newPwd = this.form.controls.newPassword.value ?? '';
    const confirmPwd = this.form.controls.confirmPassword.value ?? '';

    if (emailCtrl.invalid) {
      this.showValidation.set(true);
      return;
    }

    const changingPassword = newPwd.length > 0 || confirmPwd.length > 0;
    if (changingPassword && (this.form.controls.newPassword.invalid || newPwd !== confirmPwd)) {
      this.showValidation.set(true);
      return;
    }

    this.saved.emit(this.form.getRawValue() as AccountSavePayload);
  }

  passwordErrorMessage(): string | null {
    const err = this.passwordError();
    if (!err) return null;
    switch (err) {
      case 'wrong_current':
        return 'Senha atual incorreta.';
      case 'mismatch':
        return 'A nova senha e a confirmação não coincidem.';
      case 'too_short':
        return 'A senha deve ter pelo menos 6 caracteres.';
      default:
        return null;
    }
  }
}
