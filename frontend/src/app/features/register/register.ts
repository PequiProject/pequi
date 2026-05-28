import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './../../services/auth/auth-service';

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

  errorMessage = '';
  successMessage = '';
  isSubmitting = false;

  form = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

submit(): void {
  this.errorMessage = '';
  this.successMessage = '';
  this.form.markAllAsTouched();

  if (this.form.invalid) {
    return;
  }

  if ((this.form.value.password ?? '') !== (this.form.value.confirmPassword ?? '')) {
    this.errorMessage = 'As senhas não coincidem.';
    return;
  }
  this.isSubmitting = true;

  this.authService.register({
    full_name: this.form.value.full_name ?? '',
    email: this.form.value.email ?? '',
    password: this.form.value.password ?? '',
  }).subscribe({
    next: () => {
      this.successMessage = 'Cadastro realizado com sucesso.';
      void this.router.navigate(['/login']);
    },
    error: (error) => {
      console.error('erro no cadastro:', error);
      this.errorMessage =
        error?.error?.detail ||
        error?.error?.message ||
        'Não foi possível cadastrar.';
      this.isSubmitting = false;
    },
    complete: () => {
      this.isSubmitting = false;
    },
  });
}
}