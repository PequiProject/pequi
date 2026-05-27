import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY_PERSONAL_DATA } from './models/patient-profile.models';
import { Profile } from './profile';
import { PatientProfileService } from './services/patient-profile.service';

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;
  let component: Profile;
  let profileService: PatientProfileService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideRouter([])],
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

  it('should show display name from personal data after save', () => {
    component.onPersonalSaved({
      ...EMPTY_PERSONAL_DATA,
      fullName: 'Ana Costa',
      socialName: 'Ana',
    });
    fixture.detectChanges();
    expect(component.displayName()).toBe('Ana');
  });

  it('should not show edit display name button', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="edit-display-name-button"]')).toBeFalsy();
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
