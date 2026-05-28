import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, beforeEach, it, expect } from 'vitest';

import { Register } from './register';
import { AuthService } from '../auth/services/auth-service';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;

  const authServiceMock = {
    register: vi.fn(),
  };

  const routerMock = {
    navigate: vi.fn(),
  };

  beforeEach(async () => {
    authServiceMock.register.mockReset();
    routerMock.navigate.mockReset();
    routerMock.navigate.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
    expect(component.form.touched).toBe(true);
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

  it('should show error when passwords do not match', () => {
    component.form.setValue({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '87654321',
    });

    component.submit();

    expect(component.errorMessage).toBe('As senhas não coincidem.');
    expect(component.successMessage).toBe('');
    expect(component.isSubmitting).toBe(false);
    expect(authServiceMock.register).not.toHaveBeenCalled();
  });

  it('should call authService.register with the correct payload', () => {
    authServiceMock.register.mockReturnValue(
      of({
        id: '1',
        email: 'sarah@test.com',
        full_name: 'Sarah',
        role: 'patient',
        is_active: true,
        is_verified: false,
        created_at: '2026-05-28T00:00:00Z',
        updated_at: '2026-05-28T00:00:00Z',
      })
    );

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

  it('should navigate to /login and set success message on successful register', () => {
    authServiceMock.register.mockReturnValue(
      of({
        id: '1',
        email: 'sarah@test.com',
        full_name: 'Sarah',
        role: 'patient',
        is_active: true,
        is_verified: false,
        created_at: '2026-05-28T00:00:00Z',
        updated_at: '2026-05-28T00:00:00Z',
      })
    );

    component.form.setValue({
      full_name: 'Sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    });

    component.submit();

    expect(component.successMessage).toBe('Cadastro realizado com sucesso.');
    expect(component.errorMessage).toBe('');
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.isSubmitting).toBe(false);
  });

  it('should show error detail from API when register fails', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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

    expect(component.errorMessage).toBe('E-mail já cadastrado.');
    expect(component.successMessage).toBe('');
    expect(component.isSubmitting).toBe(false);
    expect(routerMock.navigate).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should show error message from API when detail is not available', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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

    expect(component.errorMessage).toBe('Falha no cadastro.');
    expect(component.isSubmitting).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('should show default error message when API returns no detail or message', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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

    expect(component.errorMessage).toBe('Não foi possível cadastrar.');
    expect(component.isSubmitting).toBe(false);

    consoleErrorSpy.mockRestore();
  });
});