import { TestBed } from '@angular/core/testing';
import { EMPTY_PERSONAL_DATA, EMPTY_TREATMENT_DATA } from '../models/patient-profile.models';
import { PatientProfileService } from './patient-profile.service';

describe('PatientProfileService', () => {
  let service: PatientProfileService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PatientProfileService);
  });

  it('should default display name to Paciente', () => {
    expect(service.displayName()).toBe('Paciente');
    expect(service.initials()).toBe('PA');
  });

  it('should prefer social name over full name', () => {
    service.updatePersonal({
      ...EMPTY_PERSONAL_DATA,
      fullName: 'Maria Silva',
      socialName: 'Mari',
    });
    expect(service.displayName()).toBe('Mari');
    expect(service.initials()).toBe('MA');
  });

  it('should use full name when social name is empty', () => {
    service.updatePersonal({
      ...EMPTY_PERSONAL_DATA,
      fullName: 'João Souza',
    });
    expect(service.displayName()).toBe('João Souza');
  });

  it('should persist personal data to localStorage', () => {
    service.updatePersonal({
      ...EMPTY_PERSONAL_DATA,
      fullName: 'João Souza',
      cpf: '123.456.789-00',
    });

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

  it('should update login email', () => {
    service.updateLoginEmail('paciente@email.com');
    expect(service.profile().account.loginEmail).toBe('paciente@email.com');
  });

  it('should change password when none set', () => {
    const result = service.changePassword('', 'senha123', 'senha123');
    expect(result.ok).toBe(true);
    expect(service.profile().account.password).toBe('senha123');
  });

  it('should reject wrong current password', () => {
    service.changePassword('', 'senha123', 'senha123');
    const result = service.changePassword('errada', 'nova123', 'nova123');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('wrong_current');
  });
});
