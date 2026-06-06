import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule, LucideX } from 'lucide-angular';
import { ToastService } from '../../../../components/toast/toast.service';
import {
  PatientProfileService,
  type ChangePasswordError,
} from '../../services/patient-profile.service';

@Component({
  selector: 'app-profile-edit-account',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './profile-edit-account.html',
})
export class ProfileEditAccount {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(PatientProfileService);
  private readonly toastService = inject(ToastService);

  readonly initialEmail = input.required<string>();
  readonly hasPassword = input(false);

  readonly passwordChanged = output<void>();
  readonly closed = output<void>();

  readonly LucideX = LucideX;
  readonly showValidation = signal(false);
  readonly isSaving = signal(false);
  readonly localPasswordError = signal<ChangePasswordError | null>(null);

  readonly form = this.fb.group({
    loginEmail: ['', [Validators.required, Validators.email]],
    currentPassword: [''],
    newPassword: ['', Validators.minLength(8)],
    confirmPassword: [''],
  });

  readonly passwordSectionTitle = computed(() =>
    this.hasPassword() ? 'Alterar senha' : 'Definir senha'
  );

  readonly passwordErrorMessage = computed(() => {
    const err = this.localPasswordError();
    if (!err) return null;
    switch (err) {
      case 'wrong_current':
        return 'Senha atual incorreta.';
      case 'current_required':
        return 'Informe a senha atual.';
      case 'incomplete':
        return 'Preencha a nova senha e a confirmação para alterar.';
      case 'mismatch':
        return 'A nova senha e a confirmação não coincidem.';
      case 'too_short':
        return 'A senha deve ter pelo menos 8 caracteres.';
      default:
        return null;
    }
  });

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
    this.localPasswordError.set(null);

    const validationError = this.validatePasswordForm();
    if (validationError) {
      this.localPasswordError.set(validationError);
      this.showValidation.set(true);
      return;
    }

    const current = this.form.controls.currentPassword.value ?? '';
    const newPwd = this.form.controls.newPassword.value ?? '';
    const confirmPwd = this.form.controls.confirmPassword.value ?? '';

    this.isSaving.set(true);
    this.profileService.changePassword(current, newPwd, confirmPwd).subscribe({
      next: (result) => {
        this.isSaving.set(false);
        if (!result.ok) {
          this.localPasswordError.set(result.error);
          if (result.error === 'wrong_current') {
            this.toastService.error(
              'Senha atual incorreta',
              'Verifique a senha e tente novamente.'
            );
          }
          return;
        }
        this.passwordChanged.emit();
      },
      error: () => {
        this.isSaving.set(false);
        this.localPasswordError.set('wrong_current');
        this.toastService.error(
          'Erro ao alterar senha',
          'Não foi possível alterar a senha. Tente novamente.'
        );
      },
    });
  }

  private validatePasswordForm(): ChangePasswordError | null {
    const current = this.form.controls.currentPassword.value?.trim() ?? '';
    const newPwd = this.form.controls.newPassword.value ?? '';
    const confirmPwd = this.form.controls.confirmPassword.value ?? '';

    const anyField = current.length > 0 || newPwd.length > 0 || confirmPwd.length > 0;
    if (!anyField) {
      return 'incomplete';
    }

    const changingPassword = newPwd.length > 0 || confirmPwd.length > 0;
    if (!changingPassword) {
      return 'incomplete';
    }

    if (this.hasPassword() && current.length === 0) {
      return 'current_required';
    }

    if (newPwd.length < 8) {
      return 'too_short';
    }

    if (newPwd !== confirmPwd) {
      return 'mismatch';
    }

    return null;
  }
}
