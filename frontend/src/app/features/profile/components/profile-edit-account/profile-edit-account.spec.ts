import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileEditAccount } from './profile-edit-account';

describe('ProfileEditAccount', () => {
  let fixture: ComponentFixture<ProfileEditAccount>;
  let component: ProfileEditAccount;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileEditAccount],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEditAccount);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initialEmail', 'a@b.com');
    fixture.componentRef.setInput('hasPassword', false);
    fixture.detectChanges();
  });

  it('should reject invalid email', () => {
    component.form.patchValue({ loginEmail: 'invalid' });
    component.submit();
    expect(component.showValidation()).toBe(true);
  });

  it('should show password error message', () => {
    fixture.componentRef.setInput('passwordError', 'wrong_current');
    fixture.detectChanges();
    expect(component.passwordErrorMessage()).toBe('Senha atual incorreta.');
  });
});
