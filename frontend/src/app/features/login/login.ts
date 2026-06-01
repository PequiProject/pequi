import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/services/auth-service';
import { ToastService } from '../../components/toast/toast.service';

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
  private readonly toastService = inject(ToastService);

  isSubmitting = false;

  ngOnInit(): void {
    const registered = this.route.snapshot.queryParamMap.get('registered');

    if (registered === 'true') {
      this.toastService.success(
        'Cadastro realizado com sucesso.',
        'Agora faça login para continuar.'
      );
    }
  }

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.toastService.warning(
        'Formulário inválido',
        'Preencha e-mail e senha corretamente.'
      );
      return;
    }

    this.isSubmitting = true;

    this.authService
      .login({
        email: this.form.value.email ?? '',
        password: this.form.value.password ?? '',
      })
      .subscribe({
        next: () => {
          this.toastService.success('Login realizado com sucesso.');
          const returnUrl =
            this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home';
          void this.router.navigateByUrl(returnUrl);
        },
        error: (error) => {
          const message =
            error?.error?.message ?? 'E-mail ou senha inválidos.';

          this.toastService.error('Falha no login', message);
          this.isSubmitting = false;
        },
        complete: () => {
          this.isSubmitting = false;
        },
      });
  }
}