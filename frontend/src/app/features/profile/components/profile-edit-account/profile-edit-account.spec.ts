import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ToastService } from '../../../../components/toast/toast.service';
import { PatientProfileService } from '../../services/patient-profile.service';
import { ProfileEditAccount } from './profile-edit-account';

describe('ProfileEditAccount', () => {
  let fixture: ComponentFixture<ProfileEditAccount>;
  let component: ProfileEditAccount;
  let profileServiceSpy: { changePassword: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    profileServiceSpy = {
      changePassword: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileEditAccount],
      providers: [
        { provide: PatientProfileService, useValue: profileServiceSpy },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEditAccount);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initialEmail', 'a@b.com');
    fixture.componentRef.setInput('hasPassword', true);
    fixture.detectChanges();
  });

  it('should not emit success when only current password is filled', () => {
    const changed = vi.fn();
    component.passwordChanged.subscribe(changed);

    component.form.patchValue({
      currentPassword: 'errada',
      newPassword: '',
      confirmPassword: '',
    });
    component.submit();

    expect(changed).not.toHaveBeenCalled();
    expect(component.localPasswordError()).toBe('incomplete');
  });

  it('should show wrong current password error from API', () => {
    profileServiceSpy.changePassword.mockReturnValue(
      of({ ok: false, error: 'wrong_current' as const })
    );

    component.form.patchValue({
      currentPassword: 'errada',
      newPassword: 'novasenha1',
      confirmPassword: 'novasenha1',
    });
    component.submit();

    expect(component.localPasswordError()).toBe('wrong_current');
    expect(component.passwordErrorMessage()).toBe('Senha atual incorreta.');
  });
});
