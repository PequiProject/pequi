import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/services/auth-service';
import { usernameValidator } from '../auth/username.utils';
import { getApiErrorMessage } from '../../core/api-error.utils';
import { ToastService } from '../../components/toast/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  isSubmitting = false;

  form = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [usernameValidator()]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.toastService.warning(
        'Formulário inválido',
        this.getFormErrorMessage()
      );
      return;
    }

    if ((this.form.value.password ?? '') !== (this.form.value.confirmPassword ?? '')) {
      this.toastService.warning(
        'Senhas diferentes',
        'As senhas informadas não coincidem.'
      );
      return;
    }

    this.isSubmitting = true;

    this.authService
      .register({
        full_name: this.form.value.full_name ?? '',
        username: (this.form.value.username ?? '').trim().toLowerCase(),
        email: this.form.value.email ?? '',
        password: this.form.value.password ?? '',
      })
      .subscribe({
        next: () => {
          void this.router.navigate(['/login'], {
            queryParams: { registered: 'true' },
          });
        },
        error: (error) => {
          const message = getApiErrorMessage(error, 'Não foi possível cadastrar.');
          this.toastService.error('Erro no cadastro', message);
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        },
      });
  }

  private getFormErrorMessage(): string {
    const fullNameControl = this.form.get('full_name');
    const usernameControl = this.form.get('username');
    const emailControl = this.form.get('email');
    const passwordControl = this.form.get('password');
    const confirmPasswordControl = this.form.get('confirmPassword');

    if (this.hasError(fullNameControl, 'required')) {
      return 'Informe seu nome completo.';
    }

    if (this.hasError(fullNameControl, 'minlength')) {
      const requiredLength = fullNameControl?.errors?.['minlength']?.requiredLength;
      return `O nome completo deve ter pelo menos ${requiredLength} caracteres.`;
    }

    if (this.hasError(usernameControl, 'required')) {
      return 'Informe um nome de usuário.';
    }

    if (this.hasError(usernameControl, 'username')) {
      return 'O nome de usuário deve ter de 3 a 30 caracteres, começando e terminando com letra ou número.';
    }

    if (this.hasError(emailControl, 'required')) {
      return 'Informe seu e-mail.';
    }

    if (this.hasError(emailControl, 'email')) {
      return 'Informe um e-mail válido.';
    }

    if (this.hasError(passwordControl, 'required')) {
      return 'Informe sua senha.';
    }

    if (this.hasError(passwordControl, 'minlength')) {
      const requiredLength = passwordControl?.errors?.['minlength']?.requiredLength;
      return `A senha deve ter pelo menos ${requiredLength} caracteres.`;
    }

    if (this.hasError(confirmPasswordControl, 'required')) {
      return 'Confirme sua senha.';
    }

    return 'Revise os campos obrigatórios antes de continuar.';
  }

  private hasError(control: AbstractControl | null, errorKey: string): boolean {
    return !!control?.touched && !!control?.errors?.[errorKey];
  }
}