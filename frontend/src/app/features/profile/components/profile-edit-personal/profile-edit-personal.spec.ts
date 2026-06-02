import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY_PERSONAL_DATA } from '../../models/patient-profile.models';
import { ProfileEditPersonal } from './profile-edit-personal';

describe('ProfileEditPersonal', () => {
  let fixture: ComponentFixture<ProfileEditPersonal>;
  let component: ProfileEditPersonal;
  let saved: typeof EMPTY_PERSONAL_DATA | null;

  beforeEach(async () => {
    saved = null;
    await TestBed.configureTestingModule({
      imports: [ProfileEditPersonal],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEditPersonal);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initialData', { ...EMPTY_PERSONAL_DATA });
    fixture.detectChanges();
    component.saved.subscribe((data) => {
      saved = data;
    });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show display name hints on name fields', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="full-name-hint"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="social-name-hint"]')).toBeTruthy();
  });

  it('should show read-only full name field', () => {
    fixture.componentRef.setInput('readonlyFullName', 'Carlos Lima');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('[data-testid="full-name"]') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    expect(input.value).toBe('Carlos Lima');
  });

  it('should emit saved data with locked full name', () => {
    fixture.componentRef.setInput('readonlyFullName', 'Carlos Lima');
    component.form.patchValue({
      cpf: '111.222.333-44',
    });
    component.submit();
    expect(saved?.fullName).toBe('Carlos Lima');
    expect(saved?.cpf).toBe('111.222.333-44');
  });

  it('should show indigenous ethnicity when race is indigena', () => {
    component.form.controls.raceColor.setValue('indigena');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="indigenous-ethnicity"]')).toBeTruthy();
  });

  it('should show gender identity fields when user wants to inform', () => {
    component.form.controls.wantsGenderIdentity.setValue('sim');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="gender-identity"]')).toBeTruthy();
  });

  it('should not save gender identity when user does not want to inform', () => {
    fixture.componentRef.setInput('readonlyFullName', 'Teste');
    component.form.patchValue({
      wantsGenderIdentity: 'nao',
      genderIdentity: 'travesti',
    });
    component.submit();
    expect(saved?.genderIdentity).toBe('');
    expect(saved?.wantsGenderIdentity).toBe('nao');
  });

  it('should emit closed on cancel', () => {
    const closed = vi.fn();
    component.closed.subscribe(closed);
    component.onClose();
    expect(closed).toHaveBeenCalled();
  });
});
