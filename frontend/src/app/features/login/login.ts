import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from './../../services/auth/auth-service';

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
  console.log('clique1');

  if (this.form.invalid) {
    console.log('clique2');
    return;
  }

  this.isSubmitting = true;
  console.log('antes do login');

  this.authService
    .login({
      email: this.form.value.email ?? '',
      password: this.form.value.password ?? '',
    })
    .subscribe({
      next: (response) => {
        console.log('login response:', response);
        console.log('auth_session:', localStorage.getItem('auth_session'));

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home';
        console.log('returnUrl:', returnUrl);

        void this.router.navigateByUrl(returnUrl).then(result => {
          console.log('navigate result:', result);
        });

        console.log('clique3');
      },
      error: (error) => {
        console.error('erro login:', error);
        this.errorMessage = error?.error?.message ?? 'E-mail ou senha inválidos.';
        this.isSubmitting = false;
      },
      complete: () => {
        console.log('complete login');
        this.isSubmitting = false;
      },
    });

  console.log('AQUIII: ', this.isSubmitting);
}
}