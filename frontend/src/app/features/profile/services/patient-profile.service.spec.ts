import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { EMPTY_PERSONAL_DATA, EMPTY_TREATMENT_DATA } from '../models/patient-profile.models';
import { AuthService } from '../../auth/services/auth-service';
import { PatientProfileService } from './patient-profile.service';

describe('PatientProfileService', () => {
  let service: PatientProfileService;

  const authServiceMock = {
    displayName: signal('Paciente'),
    currentUser: signal<{ full_name: string; email?: string } | null>(null),
    isAuthenticated: () => false,
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    });
    service = TestBed.inject(PatientProfileService);
    authServiceMock.displayName.set('Paciente');
    authServiceMock.currentUser.set(null);
  });

  it('should default display name to Paciente', () => {
    expect(service.displayName()).toBe('Paciente');
    expect(service.initials()).toBe('PA');
  });

  it('should use username from auth session as display name', () => {
    authServiceMock.displayName.set('mari_silva');
    expect(service.displayName()).toBe('mari_silva');
    expect(service.initials()).toBe('MA');
  });

  it('should expose legal full name from auth user', () => {
    authServiceMock.currentUser.set({ full_name: 'Maria Silva' });
    expect(service.legalFullName()).toBe('Maria Silva');
  });

  it('should lock full name when saving personal data', async () => {
    authServiceMock.currentUser.set({ full_name: 'João Souza' });
    await firstValueFrom(
      service.savePersonal({
        ...EMPTY_PERSONAL_DATA,
        fullName: 'Outro Nome',
      })
    );
    expect(service.profile().personal.fullName).toBe('João Souza');
  });

  it('should persist personal data to localStorage', async () => {
    await firstValueFrom(
      service.savePersonal({
        ...EMPTY_PERSONAL_DATA,
        fullName: 'João Souza',
        cpf: '123.456.789-00',
      })
    );

    const raw = localStorage.getItem('pequi.patient_profile');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { personal: { fullName: string; cpf: string } };
    expect(parsed.personal.fullName).toBe('João Souza');
    expect(parsed.personal.cpf).toBe('123.456.789-00');
  });

  it('should persist treatment data', () => {
    service.updateTreatment({
      ...EMPTY_TREATMENT_DATA,
      classification: 'MB',
      sinanNumber: '2026001234',
    });
    expect(service.profile().treatment.classification).toBe('MB');
    expect(service.profile().treatment.sinanNumber).toBe('2026001234');
  });

  it('should update and remove avatar', () => {
    service.updateAvatar('data:image/png;base64,abc');
    expect(service.hasAvatar()).toBe(true);
    service.removeAvatar();
    expect(service.hasAvatar()).toBe(false);
    expect(service.profile().avatarDataUrl).toBe('');
  });

  it('should sync login email from auth user', () => {
    authServiceMock.currentUser.set({
      full_name: 'Maria',
      email: 'paciente@email.com',
    });
    service.syncLoginEmailFromAuth();
    expect(service.profile().account.loginEmail).toBe('paciente@email.com');
  });

  it('should reject password change without local stored password', async () => {
    const result = await firstValueFrom(
      service.changePassword('qualquer', 'senha12345', 'senha12345')
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('wrong_current');
  });

  it('should change password when local stored password matches', async () => {
    await firstValueFrom(service.changePassword('', 'senha12345', 'senha12345'));
    const result = await firstValueFrom(
      service.changePassword('senha12345', 'outrasenha1', 'outrasenha1')
    );
    expect(result.ok).toBe(true);
    expect(service.profile().account.password).toBe('outrasenha1');
  });
});
