import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, beforeEach, it, expect } from 'vitest';

import { Login } from './login';
import { AuthService } from '../auth/services/auth-service';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  const authServiceMock = {
    login: vi.fn(),
  };

  const routerMock = {
    navigateByUrl: vi.fn(),
  };

  const activatedRouteMock = {
    snapshot: {
      queryParamMap: convertToParamMap({}),
    },
  };

  beforeEach(async () => {
    authServiceMock.login.mockReset();
    routerMock.navigateByUrl.mockReset();
    routerMock.navigateByUrl.mockResolvedValue(true);
    activatedRouteMock.snapshot.queryParamMap = convertToParamMap({});

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit when form is invalid', () => {
    component.form.setValue({
      email: '',
      password: '',
    });

    component.submit();

    expect(authServiceMock.login).not.toHaveBeenCalled();
    expect(component.form.touched).toBe(true);
    expect(component.isSubmitting).toBe(false);
  });

  it('should validate invalid email format', () => {
    component.form.setValue({
      email: 'email-invalido',
      password: '123456',
    });

    expect(component.form.invalid).toBe(true);
    expect(component.form.get('email')?.invalid).toBe(true);
  });

  it('should call authService.login with the correct payload', () => {
    authServiceMock.login.mockReturnValue(
      of({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 1800,
        token_type: 'bearer',
        user: {
          id: '1',
          email: 'sarah@test.com',
          full_name: 'Sarah',
          role: 'patient',
          is_active: true,
          is_verified: true,
          created_at: '2026-05-28T00:00:00Z',
          updated_at: '2026-05-28T00:00:00Z',
        },
      })
    );

    component.form.setValue({
      email: 'sarah@test.com',
      password: '123456',
    });

    component.submit();

    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'sarah@test.com',
      password: '123456',
    });
  });

  it('should navigate to returnUrl on successful login', () => {
    activatedRouteMock.snapshot.queryParamMap = convertToParamMap({
      returnUrl: '/checkin',
    });

    authServiceMock.login.mockReturnValue(
      of({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 1800,
        token_type: 'bearer',
        user: {
          id: '1',
          email: 'sarah@test.com',
          full_name: 'Sarah',
          role: 'patient',
          is_active: true,
          is_verified: true,
          created_at: '2026-05-28T00:00:00Z',
          updated_at: '2026-05-28T00:00:00Z',
        },
      })
    );

    component.form.setValue({
      email: 'sarah@test.com',
      password: '123456',
    });

    component.submit();

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/checkin');
    expect(component.errorMessage).toBe('');
    expect(component.isSubmitting).toBe(false);
  });

  it('should navigate to /home when returnUrl is not provided', () => {
    authServiceMock.login.mockReturnValue(
      of({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 1800,
        token_type: 'bearer',
        user: {
          id: '1',
          email: 'sarah@test.com',
          full_name: 'Sarah',
          role: 'patient',
          is_active: true,
          is_verified: true,
          created_at: '2026-05-28T00:00:00Z',
          updated_at: '2026-05-28T00:00:00Z',
        },
      })
    );

    component.form.setValue({
      email: 'sarah@test.com',
      password: '123456',
    });

    component.submit();

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/home');
  });

  it('should set isSubmitting to true while submitting', () => {
    authServiceMock.login.mockReturnValue(
      of({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 1800,
        token_type: 'bearer',
        user: {
          id: '1',
          email: 'sarah@test.com',
          full_name: 'Sarah',
          role: 'patient',
          is_active: true,
          is_verified: true,
          created_at: '2026-05-28T00:00:00Z',
          updated_at: '2026-05-28T00:00:00Z',
        },
      })
    );

    component.form.setValue({
      email: 'sarah@test.com',
      password: '123456',
    });

    component.submit();

    expect(component.isSubmitting).toBe(false);
  });

  it('should show API error message on login error', () => {
    authServiceMock.login.mockReturnValue(
      throwError(() => ({
        error: {
          message: 'Credenciais inválidas.',
        },
      }))
    );

    component.form.setValue({
      email: 'sarah@test.com',
      password: 'senha-errada',
    });

    component.submit();

    expect(component.errorMessage).toBe('Credenciais inválidas.');
    expect(component.isSubmitting).toBe(false);
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should show default error message when API does not return message', () => {
    authServiceMock.login.mockReturnValue(
      throwError(() => ({ error: {} }))
    );

    component.form.setValue({
      email: 'sarah@test.com',
      password: 'senha-errada',
    });

    component.submit();

    expect(component.errorMessage).toBe('E-mail ou senha inválidos.');
    expect(component.isSubmitting).toBe(false);
  });
});