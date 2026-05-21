import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CheckinStepSymptomsComponent } from './checkin-step-symptoms-component';

describe(CheckinStepSymptomsComponent.name, () => {
  let fixture: ComponentFixture<CheckinStepSymptomsComponent>;
  let component: CheckinStepSymptomsComponent;
  let form: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinStepSymptomsComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    form = new FormGroup({
      selectedSymptoms: new FormControl<string[]>([], Validators.required),
      customSymptom: new FormControl(''),
    });

    fixture = TestBed.createComponent(CheckinStepSymptomsComponent);
    component = fixture.componentInstance;
    component.form = form;
    fixture.detectChanges();
  });

  const getByTestId = (testId: string) =>
    fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render title and description', () => {
    expect(getByTestId('symptoms-title')).toBeTruthy();
    expect(getByTestId('symptoms-description')).toBeTruthy();
  });

  it('should render all default symptom options', () => {
    expect(component.symptoms.length).toBeGreaterThan(0);

    component.symptoms.forEach(symptom => {
      expect(getByTestId(`symptom-option-${symptom.value}`)).toBeTruthy();
    });
  });

  it('should start without no-symptoms selected', () => {
    expect(component.hasNoSymptomsSelected).toBeFalsy();
    expect(getByTestId('no-symptoms-message')).toBeNull();
    expect(getByTestId('custom-symptom-block')).toBeTruthy();
  });

  it('should select a default symptom', () => {
    component.toggleSymptom('dormencia');
    fixture.detectChanges();

    expect(form.get('selectedSymptoms')?.value).toEqual(['dormencia']);
    expect(component.isSelected('dormencia')).toBeTruthy();
    expect(getByTestId('selected-symptoms-section')).toBeTruthy();
    expect(getByTestId('selected-symptom-dormencia')).toBeTruthy();
  });

  it('should unselect a symptom when clicked twice', () => {
    component.toggleSymptom('dormencia');
    component.toggleSymptom('dormencia');
    fixture.detectChanges();

    expect(form.get('selectedSymptoms')?.value).toEqual([]);
    expect(component.isSelected('dormencia')).toBeFalsy();
  });

  it('should allow multiple regular symptoms', () => {
    component.toggleSymptom('dormencia');
    component.toggleSymptom('pele seca');
    fixture.detectChanges();

    expect(form.get('selectedSymptoms')?.value).toEqual(['dormencia', 'pele seca']);
    expect(getByTestId('selected-symptom-dormencia')).toBeTruthy();
    expect(getByTestId('selected-symptom-pele seca')).toBeTruthy();
  });

  it('should select only "nenhum sintoma" when exclusive option is chosen', () => {
    component.toggleSymptom('dormencia');
    component.toggleSymptom('pele seca');
    component.toggleSymptom(component.noSymptomsValue);
    fixture.detectChanges();

    expect(form.get('selectedSymptoms')?.value).toEqual(['nenhum sintoma']);
    expect(component.hasNoSymptomsSelected).toBeTruthy();
    expect(getByTestId('no-symptoms-message')).toBeTruthy();
    expect(getByTestId('custom-symptom-block')).toBeNull();
  });

  it('should remove exclusive option when selecting another symptom', () => {
    component.toggleSymptom(component.noSymptomsValue);
    component.toggleSymptom('formigamento');
    fixture.detectChanges();

    expect(form.get('selectedSymptoms')?.value).toEqual(['formigamento']);
    expect(component.hasNoSymptomsSelected).toBeFalsy();
    expect(getByTestId('no-symptoms-message')).toBeNull();
    expect(getByTestId('custom-symptom-block')).toBeTruthy();
  });

  it('should deselect "nenhum sintoma" when clicked twice', () => {
    component.toggleSymptom(component.noSymptomsValue);
    component.toggleSymptom(component.noSymptomsValue);
    fixture.detectChanges();

    expect(form.get('selectedSymptoms')?.value).toEqual([]);
    expect(component.hasNoSymptomsSelected).toBeFalsy();
  });

  it('should normalize and add custom symptom', () => {
    form.get('customSymptom')?.setValue('Coceira Íntensa');
    component.addCustomSymptom();
    fixture.detectChanges();

    expect(form.get('selectedSymptoms')?.value).toEqual(['coceira intensa']);
    expect(form.get('customSymptom')?.value).toBe('');
    expect(getByTestId('selected-symptom-coceira intensa')).toBeTruthy();
  });

  it('should not add empty custom symptom', () => {
    form.get('customSymptom')?.setValue('   ');
    component.addCustomSymptom();
    fixture.detectChanges();

    expect(form.get('selectedSymptoms')?.value).toEqual([]);
    expect(getByTestId('selected-symptoms-section')).toBeNull();
  });

  it('should not duplicate custom symptom already selected', () => {
    component.toggleSymptom('dormencia');
    form.get('customSymptom')?.setValue('Dormência');
    component.addCustomSymptom();
    fixture.detectChanges();

    expect(form.get('selectedSymptoms')?.value).toEqual(['dormencia']);
  });

  it('should remove "nenhum sintoma" before adding custom symptom', () => {
    component.toggleSymptom(component.noSymptomsValue);
    form.get('customSymptom')?.setValue('Ardor');
    component.addCustomSymptom();
    fixture.detectChanges();

    expect(form.get('selectedSymptoms')?.value).toEqual(['ardor']);
    expect(component.hasNoSymptomsSelected).toBeFalsy();
    expect(getByTestId('no-symptoms-message')).toBeNull();
    expect(getByTestId('custom-symptom-block')).toBeTruthy();
  });

  it('should remove a selected symptom', () => {
    component.toggleSymptom('dormencia');
    component.toggleSymptom('pele seca');
    component.removeSymptom('dormencia');

    fixture.detectChanges();

    expect(form.get('selectedSymptoms')?.value).toEqual(['pele seca']);
    expect(getByTestId('selected-symptom-dormencia')).toBeNull();
    expect(getByTestId('selected-symptom-pele seca')).toBeTruthy();
  });

  it('should show validation error when field is invalid and touched', () => {
    form.get('selectedSymptoms')?.markAsTouched();
    fixture.detectChanges();

    expect(component.showError).toBeTruthy();
    expect(getByTestId('symptoms-error')).toBeTruthy();
  });

  it('should hide validation error when field becomes valid', () => {
    form.get('selectedSymptoms')?.markAsTouched();
    component.toggleSymptom('nodulos');
    fixture.detectChanges();

    expect(component.showError).toBeFalsy();
    expect(getByTestId('symptoms-error')).toBeNull();
  });

  it('should render custom input and add button when no-symptoms is not selected', () => {
    expect(getByTestId('custom-symptom-block')).toBeTruthy();
    expect(getByTestId('custom-symptom-input')).toBeTruthy();
    expect(getByTestId('custom-symptom-add-button')).toBeTruthy();
  });

  it('should mark selectedSymptoms as dirty and touched when toggling symptom', () => {
    const control = form.get('selectedSymptoms');

    expect(control?.dirty).toBeFalsy();
    expect(control?.touched).toBeFalsy();

    component.toggleSymptom('nodulos');

    expect(control?.dirty).toBeTruthy();
    expect(control?.touched).toBeTruthy();
  });
});