import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';

import { Onboarding } from './onboarding';
import { AuthService } from '../auth/services/auth-service';

describe('Onboarding', () => {
  let component: Onboarding;
  let fixture: ComponentFixture<Onboarding>;
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  const authServiceMock = {
    isAuthenticated: vi.fn(),
  };

  const configureTestingModule = async () => {
    await TestBed.configureTestingModule({
      imports: [Onboarding],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compileComponents();
  };

  const createComponent = () => {
    fixture = TestBed.createComponent(Onboarding);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    authServiceMock.isAuthenticated.mockReset();
    authServiceMock.isAuthenticated.mockReturnValue(false);

    await configureTestingModule();
    createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display welcome message', () => {
    const welcome = fixture.nativeElement.querySelector('[data-testid="onboarding-welcome"]');
    expect(welcome?.textContent?.trim()).toBe('Seja bem-vindo à sua jornada');
  });

  it('should display purple logo', () => {
    const logo = fixture.nativeElement.querySelector('[data-testid="onboarding-logo"]') as HTMLImageElement;
    expect(logo.getAttribute('src')).toContain('logo-purple.svg');
  });

  it('should have register button linking to /register', () => {
    const registerButton = fixture.nativeElement.querySelector(
      '[data-testid="onboarding-register-button"]'
    ) as HTMLAnchorElement;

    expect(registerButton).toBeTruthy();
    expect(registerButton.getAttribute('href')).toBe('/register');
    expect(registerButton.textContent).toContain('Cadastro');
  });

  it('should have login button linking to /login', () => {
    const loginButton = fixture.nativeElement.querySelector(
      '[data-testid="onboarding-login-button"]'
    ) as HTMLAnchorElement;

    expect(loginButton).toBeTruthy();
    expect(loginButton.getAttribute('href')).toBe('/login');
    expect(loginButton.textContent?.trim()).toBe('Entrar');
  });

  it('should display community message', () => {
    const message = fixture.nativeElement.querySelector(
      '[data-testid="onboarding-community-message"]'
    );
    expect(message?.textContent?.trim()).toBe('Junte-se a uma comunidade acolhedora.');
  });

  it('should use landing page panels', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="onboarding-brand-panel"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="onboarding-action-panel"]')).toBeTruthy();
  });

  it('should display community card', () => {
    const card = fixture.nativeElement.querySelector('[data-testid="onboarding-community-card"]');
    expect(card?.textContent).toContain('Comunidade acolhedora');
    expect(card?.textContent).toContain('Troque experiências');
  });

  describe('when user is authenticated', () => {
    beforeEach(async () => {
      TestBed.resetTestingModule();
      authServiceMock.isAuthenticated.mockReturnValue(true);

      await configureTestingModule();
      createComponent();
    });

    it('should redirect to home', () => {
      expect(navigateSpy).toHaveBeenCalledWith(['/home']);
    });
  });
});
