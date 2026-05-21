import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CheckinStepFeelingComponent } from './checkin-step-feeling-component';

describe(CheckinStepFeelingComponent.name, () => {
  let fixture: ComponentFixture<CheckinStepFeelingComponent>;
  let component: CheckinStepFeelingComponent;
  let form: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinStepFeelingComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    form = new FormGroup({
      mood: new FormControl('', Validators.required),
    });

    fixture = TestBed.createComponent(CheckinStepFeelingComponent);
    component = fixture.componentInstance;
    component.form = form;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render mood title', () => {
    const title = fixture.debugElement.query(By.css('[data-testid="mood-title"]'));
    expect(title).toBeTruthy();
    expect((title.nativeElement as HTMLElement).textContent).toContain(
      'Como você está se sentindo hoje?'
    );
  });

  it('should render all mood options', () => {
    expect(component.moodOptions.length).toBe(5);

    const buttons = fixture.debugElement.queryAll(By.css('[data-testid="mood-option"]'));
    expect(buttons.length).toBe(5);
  });

  it('should expose five bar slots', () => {
    expect(component.barSlots.length).toBe(5);
  });

  it('should return false in showError when control is untouched', () => {
    expect(component.showError).toBeFalsy();
  });

  it('should return true in showError when mood is invalid and touched', () => {
    const control = form.get('mood');
    control?.markAsTouched();
    fixture.detectChanges();

    expect(component.showError).toBeTruthy();
  });

  it('should identify selected mood correctly', () => {
    form.get('mood')?.setValue('bem');
    fixture.detectChanges();

    expect(component.isSelected('bem')).toBeTruthy();
    expect(component.isSelected('mal')).toBeFalsy();
  });

  it('should set mood value when selectMood is called', () => {
    component.selectMood('otimo');

    expect(form.get('mood')?.value).toBe('otimo');
  });

  it('should mark mood control as dirty and touched when selectMood is called', () => {
    const control = form.get('mood');

    expect(control?.dirty).toBeFalsy();
    expect(control?.touched).toBeFalsy();

    component.selectMood('muito-bem');

    expect(control?.dirty).toBeTruthy();
    expect(control?.touched).toBeTruthy();
  });

  it('should update selected state after clicking a mood option', () => {
    const buttons = fixture.debugElement.queryAll(By.css('[data-testid="mood-option"]'));
    buttons[3].triggerEventHandler('click');

    fixture.detectChanges();

    expect(form.get('mood')?.value).toBe('muito-bem');
    expect(component.isSelected('muito-bem')).toBeTruthy();
  });

  it('should display validation message when mood is invalid and touched', () => {
    form.get('mood')?.markAsTouched();
    fixture.detectChanges();

    const errorMessage = fixture.debugElement.query(By.css('[data-testid="mood-error"]'));
    expect(errorMessage).toBeTruthy();
  });

  it('should not display validation message when mood becomes valid', () => {
    component.selectMood('terrivel');
    fixture.detectChanges();

    const errorMessage = fixture.debugElement.query(By.css('[data-testid="mood-error"]'));
    expect(errorMessage).toBeNull();
  });

  it('should render the mood labels in the template', () => {
    const textContent = fixture.nativeElement.textContent as string;

    expect(textContent).toContain('Terrível');
    expect(textContent).toContain('Mal');
    expect(textContent).toContain('Bem');
    expect(textContent).toContain('Muito Bem');
    expect(textContent).toContain('Ótimo');
  });
});