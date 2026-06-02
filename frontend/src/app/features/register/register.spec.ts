import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, beforeEach, it, expect, afterEach } from 'vitest';
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
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  };

  beforeEach(async () => {
    authServiceMock.register.mockReset();

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
      username: '',
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
      username: 'sarah',
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
      username: 'sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '87654321',
    });

    component.submit();

    expect(toastServiceMock.warning).toHaveBeenCalledWith(
      'Senhas diferentes',
      'As senhas informadas não coincidem.'
    );
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
      username: 'sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    });

    component.submit();

    expect(authServiceMock.register).toHaveBeenCalledWith({
      full_name: 'Sarah',
      username: 'sarah',
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
      username: 'sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    });

    component.submit();

    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { registered: 'true' },
    });
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
      username: 'sarah',
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
      username: 'sarah',
      email: 'sarah@test.com',
      password: '12345678',
      confirmPassword: '12345678',
    });
    component.submit();

    expect(toastServiceMock.error).toHaveBeenCalledWith('Erro no cadastro', 'Falha no cadastro.');
    expect(component.isSubmitting).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();

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
      username: 'sarah',
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

    consoleErrorSpy.mockRestore();
  });
});
