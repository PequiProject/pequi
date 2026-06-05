import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Register } from './register';
import { AuthService } from '../auth/services/auth-service';
import { ToastService } from '../../components/toast/toast.service';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  const authServiceMock = {
    register: vi.fn(),
  };

  const toastServiceMock = {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(async () => {
    authServiceMock.register.mockReset();

    toastServiceMock.success.mockReset();
    toastServiceMock.warning.mockReset();
    toastServiceMock.error.mockReset();

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;

    router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit when form is invalid', () => {
    component.form.setValue({
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
    });

    component.submit();

    expect(authServiceMock.register).not.toHaveBeenCalled();

    expect(toastServiceMock.warning).toHaveBeenCalledWith(
      'Formulário inválido',
      'Informe seu nome completo.'
    );

    expect(component.isSubmitting).toBe(false);
  });

  it('should validate minimum password length', () => {
    component.form.setValue({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '1234567',
      confirmPassword: '1234567',
    });

    expect(component.form.invalid).toBe(true);
    expect(component.form.get('password')?.invalid).toBe(true);
  });

  it('should show warning when passwords do not match', () => {
    component.form.setValue({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '87654321',
    });

    component.submit();

    expect(toastServiceMock.warning).toHaveBeenCalledWith(
      'Senhas diferentes',
      'As senhas informadas não coincidem.'
    );

    expect(authServiceMock.register).not.toHaveBeenCalled();
    expect(component.isSubmitting).toBe(false);
  });

  it('should call authService.register with correct payload', () => {
    authServiceMock.register.mockReturnValue(of({}));

    component.form.setValue({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    });

    component.submit();

    expect(authServiceMock.register).toHaveBeenCalledWith({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '12345678',
    });
  });

  it('should navigate to login with registered=true on successful register', () => {
    authServiceMock.register.mockReturnValue(of({}));

    component.form.setValue({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    });

    component.submit();

    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: {
        registered: 'true',
      },
    });

    expect(component.isSubmitting).toBe(false);
  });

  it('should reset isSubmitting after successful register', () => {
    authServiceMock.register.mockReturnValue(of({}));

    component.form.setValue({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    });

    component.submit();

    expect(component.isSubmitting).toBe(false);
  });

  it('should show API detail message when register fails', () => {
    authServiceMock.register.mockReturnValue(
      throwError(() => ({
        error: {
          detail: 'E-mail já cadastrado.',
        },
      }))
    );

    component.form.setValue({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    });

    component.submit();

    expect(toastServiceMock.error).toHaveBeenCalledWith(
      'Erro no cadastro',
      'E-mail já cadastrado.'
    );

    expect(component.isSubmitting).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should show API message when detail is not available', () => {
    authServiceMock.register.mockReturnValue(
      throwError(() => ({
        error: {
          message: 'Falha no cadastro.',
        },
      }))
    );

    component.form.setValue({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    });

    component.submit();

    expect(toastServiceMock.error).toHaveBeenCalledWith(
      'Erro no cadastro',
      'Falha no cadastro.'
    );

    expect(component.isSubmitting).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should show default error message when API returns no detail or message', () => {
    authServiceMock.register.mockReturnValue(
      throwError(() => ({
        error: {},
      }))
    );

    component.form.setValue({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    });

    component.submit();

    expect(toastServiceMock.error).toHaveBeenCalledWith(
      'Erro no cadastro',
      'Não foi possível cadastrar.'
    );

    expect(component.isSubmitting).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should show correct message when full_name is too short', () => {
    component.form.setValue({
      full_name: 'A',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    });

    component.submit();

    expect(toastServiceMock.warning).toHaveBeenCalledWith(
      'Formulário inválido',
      'O nome completo deve ter pelo menos 2 caracteres.'
    );
  });

  it('should show correct message when email is invalid', () => {
    component.form.setValue({
      full_name: 'Sarah',
      email: 'email-invalido',
      password: '12345678',
      confirmPassword: '12345678',
    });

    component.submit();

    expect(toastServiceMock.warning).toHaveBeenCalledWith(
      'Formulário inválido',
      'Informe um e-mail válido.'
    );
  });

  it('should show correct message when password is too short', () => {
    component.form.setValue({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '123',
      confirmPassword: '123',
    });

    component.submit();

    expect(toastServiceMock.warning).toHaveBeenCalledWith(
      'Formulário inválido',
      'A senha deve ter pelo menos 8 caracteres.'
    );
  });
});