import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { Profile } from './profile';
import { PatientProfileService } from './services/patient-profile.service';
import { AuthService } from '../auth/services/auth-service';
import { ToastService } from '../../components/toast/toast.service';

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
  let component: Profile;
  let profileService: PatientProfileService;

  const authServiceMock = {
    displayName: signal('Paciente'),
    currentUser: signal<{ full_name: string; username: string } | null>(null),
    updateUsername: vi.fn(),
  };

  const toastServiceMock = {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  };

  beforeEach(async () => {
    localStorage.clear();
    authServiceMock.displayName.set('Paciente');
    authServiceMock.currentUser.set(null);

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    profileService = TestBed.inject(PatientProfileService);
    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show default display name', () => {
    const nameEl = fixture.nativeElement.querySelector('[data-testid="profile-display-name"]');
    expect(nameEl?.textContent?.trim()).toBe('Paciente');
  });

  it('should show display name from auth username', () => {
    authServiceMock.displayName.set('ana_costa');
    fixture.detectChanges();
    expect(component.displayName()).toBe('ana_costa');
  });

  it('should show edit username button', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="edit-username-button"]')).toBeTruthy();
  });

  it('should open edit personal dialog', () => {
    fixture.nativeElement.querySelector('[data-testid="edit-personal-button"]')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="edit-personal-dialog"]')).toBeTruthy();
  });

  it('should open edit account dialog', () => {
    fixture.nativeElement.querySelector('[data-testid="edit-account-button"]')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="edit-account-dialog"]')).toBeTruthy();
  });

  it('should remove avatar from avatar menu', () => {
    profileService.updateAvatar('data:image/png;base64,x');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="avatar-menu-toggle"]')?.click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[data-testid="remove-avatar-option"]')?.click();
    fixture.detectChanges();

    expect(profileService.hasAvatar()).toBe(false);
  });

  it('should show export pdf disclaimer', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="export-pdf-disclaimer"]')).toBeTruthy();
  });
});
