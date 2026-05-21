import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormControl, FormGroup } from '@angular/forms';
import { CheckinStepDetailsComponent } from './checkin-step-details-component';

describe(CheckinStepDetailsComponent.name, () => {
  let fixture: ComponentFixture<CheckinStepDetailsComponent>;
  let component: CheckinStepDetailsComponent;
  let form: FormGroup;

  const getByTestId = (testId: string) =>
    fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinStepDetailsComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    form = new FormGroup({
      notes: new FormControl(''),
    });

    fixture = TestBed.createComponent(CheckinStepDetailsComponent);
    component = fixture.componentInstance;
    component.form = form;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the details step container', () => {
    expect(getByTestId('details-step')).toBeTruthy();
  });

  it('should render title and description', () => {
    expect(getByTestId('details-title')).toBeTruthy();
    expect(getByTestId('details-description')).toBeTruthy();

    const titleText = getByTestId('details-title').nativeElement.textContent;
    const descriptionText = getByTestId('details-description').nativeElement.textContent;

    expect(titleText).toContain('Quer adicionar mais detalhes?');
    expect(descriptionText).toContain('Descreva onde você está notando mudanças hoje. Cada detalhe ajuda.');
  });

  it('should render textarea block, label and textarea', () => {
    expect(getByTestId('details-textarea-block')).toBeTruthy();
    expect(getByTestId('details-textarea-label')).toBeTruthy();
    expect(getByTestId('details-textarea')).toBeTruthy();
  });

  it('should bind textarea to notes form control', () => {
    const textarea: HTMLTextAreaElement = getByTestId('details-textarea').nativeElement;

    textarea.value = 'Senti mais desconforto no período da manhã.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(form.get('notes')?.value).toBe('Senti mais desconforto no período da manhã.');
  });

  it('should display existing notes value from form control', () => {
    form.get('notes')?.setValue('Observei melhora ao longo do dia.');
    fixture.detectChanges();

    const textarea: HTMLTextAreaElement = getByTestId('details-textarea').nativeElement;
    expect(textarea.value).toBe('Observei melhora ao longo do dia.');
  });

  it('should allow empty notes because field is optional', () => {
    form.get('notes')?.setValue('');
    fixture.detectChanges();

    expect(form.valid).toBeTruthy();
    expect(form.get('notes')?.value).toBe('');
  });

  it('should keep rendering when notes field has multiline text', () => {
    const multilineText = `Senti mais desconforto pela manhã.
Após caminhar, a sensação aumentou.
No fim do dia, percebi melhora.`;

    form.get('notes')?.setValue(multilineText);
    fixture.detectChanges();

    const textarea: HTMLTextAreaElement = getByTestId('details-textarea').nativeElement;
    expect(textarea.value).toBe(multilineText);
  });

  it('should not render form content when form input is not defined', () => {
    const newFixture = TestBed.createComponent(CheckinStepDetailsComponent);
    const newComponent = newFixture.componentInstance;

    expect(newComponent).toBeTruthy();

    newFixture.detectChanges();

    const step = newFixture.debugElement.query(By.css('[data-testid="details-step"]'));
    expect(step).toBeNull();
  });
});