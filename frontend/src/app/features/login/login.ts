import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/services/auth-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})

export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  errorMessage = '';
  isSubmitting = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

submit(): void {
  this.errorMessage = '';
  this.form.markAllAsTouched();
  if (this.form.invalid) {
    return;
  }

  this.isSubmitting = true;
  this.authService
    .login({
      email: this.form.value.email ?? '',
      password: this.form.value.password ?? '',
    })
    .subscribe({
      next: (response) => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home';
        void this.router.navigateByUrl(returnUrl);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'E-mail ou senha inválidos.';
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
}
}