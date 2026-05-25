import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CheckinStepIntensityComponent } from './checkin-step-intensity-component';

describe(CheckinStepIntensityComponent.name, () => {
  let fixture: ComponentFixture<CheckinStepIntensityComponent>;
  let component: CheckinStepIntensityComponent;
  let form: FormGroup;

  const getByTestId = (testId: string) =>
    fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinStepIntensityComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    form = new FormGroup({
      scale: new FormControl<number | null>(null, Validators.required),
    });

    fixture = TestBed.createComponent(CheckinStepIntensityComponent);
    component = fixture.componentInstance;
    component.form = form;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render intensity step container', () => {
    expect(getByTestId('intensity-step')).toBeTruthy();
  });

  it('should render title and description', () => {
    const title = getByTestId('intensity-title');
    const description = getByTestId('intensity-description');

    expect(title).toBeTruthy();
    expect(description).toBeTruthy();
    expect((title.nativeElement as HTMLElement).textContent).toContain('Qual a intensidade dos sintomas hoje?');
    expect((description.nativeElement as HTMLElement).textContent).toContain('Arraste a escala para indicar o impacto geral dos sintomas no seu dia.');
  });

  it('should render slider and legend blocks', () => {
    expect(getByTestId('intensity-slider-block')).toBeTruthy();
    expect(getByTestId('intensity-slider')).toBeTruthy();
    expect(getByTestId('intensity-legend')).toBeTruthy();
    expect(getByTestId('intensity-legend-mild')).toBeTruthy();
    expect(getByTestId('intensity-legend-moderate')).toBeTruthy();
    expect(getByTestId('intensity-legend-severe')).toBeTruthy();
  });

  it('should start with neutral state when scale is null', () => {
    expect(component.scaleValue).toBeNull();
    expect(component.hasSelectedIntensity).toBeFalsy();
    expect(component.displayScaleValue).toBe('');
    expect(component.sliderValue).toBe(1);
    expect(component.intensityLabel).toBe('Selecione');
    expect(getByTestId('intensity-hint')).toBeTruthy();
    expect(getByTestId('intensity-success-message')).toBeNull();
  });

  it('should render empty displayed value when scale is null', () => {
    const valueEl = getByTestId('intensity-value').nativeElement as HTMLElement;
    expect(valueEl.textContent?.trim()).toBe('');
  });

  it('should render neutral classes when scale is null', () => {
    const indicator = getByTestId('intensity-indicator').nativeElement as HTMLElement;
    const label = getByTestId('intensity-label').nativeElement as HTMLElement;

    expect(indicator.className).toContain('border-[#D9D4CE]');
    expect(indicator.className).toContain('bg-[#F7F5F1]');
    expect(label.className).toContain('text-[#9A968F]');
  });

  it('should update form control when slider changes', () => {
    const slider = getByTestId('intensity-slider').nativeElement as HTMLInputElement;

    slider.value = '6';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(form.get('scale')?.value).toBe(6);
  });

  it('should mark scale control as dirty and touched when slider changes', () => {
    const control = form.get('scale');
    const slider = getByTestId('intensity-slider').nativeElement as HTMLInputElement;

    expect(control?.dirty).toBeFalsy();
    expect(control?.touched).toBeFalsy();

    slider.value = '5';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(control?.dirty).toBeTruthy();
    expect(control?.touched).toBeTruthy();
  });

  it('should hide hint after selecting intensity', () => {
    form.get('scale')?.setValue(4);
    fixture.detectChanges();

    expect(component.hasSelectedIntensity).toBeTruthy();
    expect(getByTestId('intensity-hint')).toBeNull();
  });

  it('should show success message when intensity is 1', () => {
    form.get('scale')?.setValue(1);
    fixture.detectChanges();

    expect(component.hasNoSymptomsIntensity).toBeTruthy();
    expect(getByTestId('intensity-success-message')).toBeTruthy();
  });

  it('should not show success message when intensity is greater than 1', () => {
    form.get('scale')?.setValue(2);
    fixture.detectChanges();

    expect(component.hasNoSymptomsIntensity).toBeFalsy();
    expect(getByTestId('intensity-success-message')).toBeNull();
  });

  it('should display selected value in the circle', () => {
    form.get('scale')?.setValue(7);
    fixture.detectChanges();

    const valueEl = getByTestId('intensity-value').nativeElement as HTMLElement;
    expect(valueEl.textContent?.trim()).toBe('7');
  });

  it('should return "Nenhuma" label for intensity 1', () => {
    form.get('scale')?.setValue(1);
    fixture.detectChanges();

    expect(component.intensityLabel).toBe('Nenhuma');

    const labelEl = getByTestId('intensity-label').nativeElement as HTMLElement;
    expect(labelEl.textContent?.trim()).toBe('Nenhuma');
  });

  it('should return "Leve" label for intensity 2 or 3', () => {
    form.get('scale')?.setValue(3);
    fixture.detectChanges();

    expect(component.intensityLabel).toBe('Leve');
  });

  it('should return "Moderada" label for intensity between 4 and 6', () => {
    form.get('scale')?.setValue(5);
    fixture.detectChanges();

    expect(component.intensityLabel).toBe('Moderada');
  });

  it('should return "Severa" label for intensity between 7 and 10', () => {
    form.get('scale')?.setValue(9);
    fixture.detectChanges();

    expect(component.intensityLabel).toBe('Severa');
  });

  it('should apply mild styles when intensity is between 1 and 3', () => {
    form.get('scale')?.setValue(2);
    fixture.detectChanges();

    const indicator = getByTestId('intensity-indicator').nativeElement as HTMLElement;
    const valueEl = getByTestId('intensity-value').nativeElement as HTMLElement;
    const labelEl = getByTestId('intensity-label').nativeElement as HTMLElement;

    expect(indicator.className).toContain('border-[#5A7B63]');
    expect(indicator.className).toContain('bg-[#F1F0EA]');
    expect(valueEl.className).toContain('text-[#5A7B63]');
    expect(labelEl.className).toContain('text-[#5A7B63]');
  });

  it('should apply moderate styles when intensity is between 4 and 6', () => {
    form.get('scale')?.setValue(5);
    fixture.detectChanges();

    const indicator = getByTestId('intensity-indicator').nativeElement as HTMLElement;
    const valueEl = getByTestId('intensity-value').nativeElement as HTMLElement;
    const labelEl = getByTestId('intensity-label').nativeElement as HTMLElement;

    expect(indicator.className).toContain('border-[#C47B33]');
    expect(indicator.className).toContain('bg-[#F7EFE4]');
    expect(valueEl.className).toContain('text-[#C47B33]');
    expect(labelEl.className).toContain('text-[#C47B33]');
  });

  it('should apply severe styles when intensity is between 7 and 10', () => {
    form.get('scale')?.setValue(9);
    fixture.detectChanges();

    const indicator = getByTestId('intensity-indicator').nativeElement as HTMLElement;
    const valueEl = getByTestId('intensity-value').nativeElement as HTMLElement;
    const labelEl = getByTestId('intensity-label').nativeElement as HTMLElement;

    expect(indicator.className).toContain('border-[#B05A5A]');
    expect(indicator.className).toContain('bg-[#F8EAEA]');
    expect(valueEl.className).toContain('text-[#B05A5A]');
    expect(labelEl.className).toContain('text-[#B05A5A]');
  });

  it('should calculate slider fill percentage as 0 when intensity is 1', () => {
    form.get('scale')?.setValue(1);
    fixture.detectChanges();

    expect(component.sliderFillPercentage).toBe(0);
  });

  it('should calculate slider fill percentage as 100 when intensity is 10', () => {
    form.get('scale')?.setValue(10);
    fixture.detectChanges();

    expect(component.sliderFillPercentage).toBe(100);
  });

  it('should apply neutral slider track style when scale is null', () => {
    expect(component.sliderTrackStyle).toContain('#D9D4CE 0%');
    expect(component.sliderTrackStyle).toContain('#D9D4CE 100%');
  });

  it('should apply mild slider track color when intensity is mild', () => {
    form.get('scale')?.setValue(2);
    fixture.detectChanges();

    expect(component.sliderTrackStyle).toContain('#5A7B63');
  });

  it('should apply moderate slider track color when intensity is moderate', () => {
    form.get('scale')?.setValue(5);
    fixture.detectChanges();

    expect(component.sliderTrackStyle).toContain('#C47B33');
  });

  it('should apply severe slider track color when intensity is severe', () => {
    form.get('scale')?.setValue(9);
    fixture.detectChanges();

    expect(component.sliderTrackStyle).toContain('#B05A5A');
  });

  it('should bind slider background style dynamically', () => {
    form.get('scale')?.setValue(5);
    fixture.detectChanges();

    const slider = getByTestId('intensity-slider').nativeElement as HTMLInputElement;
    expect(component.sliderTrackStyle).toContain('#C47B33');
  });

  it('should bind slider color style dynamically', () => {
    form.get('scale')?.setValue(9);
    fixture.detectChanges();

    const slider = getByTestId('intensity-slider').nativeElement as HTMLInputElement;
    expect(component.intensityVisual.activeColor).toBe('#B05A5A');
  });

  it('should show validation error when scale is invalid and touched', () => {
    form.get('scale')?.markAsTouched();
    fixture.detectChanges();

    expect(component.showError).toBeTruthy();
    expect(getByTestId('intensity-error')).toBeTruthy();
  });

  it('should hide validation error when scale becomes valid', () => {
    form.get('scale')?.markAsTouched();
    form.get('scale')?.setValue(4);
    fixture.detectChanges();

    expect(component.showError).toBeFalsy();
    expect(getByTestId('intensity-error')).toBeNull();
  });

  it('should render min and max labels correctly', () => {
    const minLabel = getByTestId('intensity-min-label').nativeElement as HTMLElement;
    const maxLabel = getByTestId('intensity-max-label').nativeElement as HTMLElement;

    expect(minLabel.textContent?.trim()).toBe('1 - Nenhuma');
    expect(maxLabel.textContent?.trim()).toBe('10 - Severa');
  });

  it('should not render form content when form input is not defined', () => {
    const newFixture = TestBed.createComponent(CheckinStepIntensityComponent);
    const newComponent = newFixture.componentInstance;

    expect(newComponent).toBeTruthy();

    newFixture.detectChanges();

    const step = newFixture.debugElement.query(By.css('[data-testid="intensity-step"]'));
    expect(step).toBeNull();
  });
});