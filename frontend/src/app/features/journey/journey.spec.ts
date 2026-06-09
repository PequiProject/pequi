import { TestBed, ComponentFixture } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Journey, JourneyEvent } from './journey';

describe('Journey', () => {
  let fixture: ComponentFixture<Journey>;
  let component: Journey;

  const mockEvents: JourneyEvent[] = [
    {
      id: 'appointment-m1-001',
      type: 'appointment',
      title: 'Primeira consulta após início do tratamento',
      description: 'Consulta inicial registrada.',
      date: '2026-04-10',
      status: 'neutral',
      metadata: {
        consultationLocation: 'UBS Benedito Bentes',
      },
    },
    {
      id: 'clinical-update-m1-001',
      type: 'clinical-update',
      title: 'Piora registrada em lesão cutânea',
      description: 'Paciente relatou piora.',
      date: '2026-04-14',
      status: 'attention',
      metadata: {
        symptomTrend: 'worsened',
      },
    },
    {
      id: 'medication-summary-m1-001',
      type: 'medication-summary',
      title: 'Resumo de medicação do mês 1',
      description: 'Resumo do primeiro mês.',
      date: '2026-05-04',
      status: 'positive',
      metadata: {
        dosesTaken: 28,
        dosesExpected: 30,
      },
    },
    {
      id: 'appointment-m2-001',
      type: 'appointment',
      title: 'Consulta de acompanhamento do segundo mês',
      description: 'Consulta do mês 2.',
      date: '2026-05-12',
      status: 'neutral',
      metadata: {
        consultationLocation: 'Ambulatório de Dermatologia Municipal',
      },
    },
    {
      id: 'clinical-update-m2-001',
      type: 'clinical-update',
      title: 'Melhora percebida pelo paciente',
      description: 'Paciente relatou melhora.',
      date: '2026-05-18',
      status: 'positive',
      metadata: {
        symptomTrend: 'improved',
      },
    },
  ];

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00'));

    await TestBed.configureTestingModule({
      imports: [Journey],
    }).compileComponents();

    fixture = TestBed.createComponent(Journey);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('patientName', 'José da Silva');
    fixture.componentRef.setInput('leprosyType', 'PB');
    fixture.componentRef.setInput('appStartDate', '2026-04-03');
    fixture.componentRef.setInput('treatmentStartDate', '2026-04-05');
    fixture.componentRef.setInput('events', mockEvents);

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate PB treatment with 6 months and 180 days', () => {
    expect(component.totalMonths()).toBe(6);
    expect(component.totalDays()).toBe(180);
  });

  it('should calculate progress based on elapsed days', () => {
    expect(component.elapsedDays()).toBe(45);
    expect(component.currentMonth()).toBe(2);
    expect(component.progressPercent()).toBe(25);
  });

  it('should show PB label and 6 month estimate', () => {
    expect(component.leprosyTypeLabel()).toContain('paucibacilar');
    expect(component.treatmentEstimateText()).toContain('6 meses');
  });

  it('should build 6 months for PB journey', () => {
    expect(component.months()).toHaveLength(6);
    expect(component.months()[0].label).toBe('Mês 1');
    expect(component.months()[5].label).toBe('Mês 6');
  });

  it('should mark month 2 as current', () => {
    const month2 = component.months().find((month) => month.monthIndex === 2);
    const month1 = component.months().find((month) => month.monthIndex === 1);
    const month3 = component.months().find((month) => month.monthIndex === 3);

    expect(month1?.completed).toBe(true);
    expect(month2?.current).toBe(true);
    expect(month3?.locked).toBe(true);
  });

  it('should include generated app start and treatment start events in month 1', () => {
    const month1 = component.months().find((month) => month.monthIndex === 1);

    expect(month1).toBeTruthy();
    expect(
      month1?.events.some((event) => event.type === 'app-start')
    ).toBe(true);
    expect(
      month1?.events.some((event) => event.type === 'treatment-start')
    ).toBe(true);
  });

  it('should generate motivational messages for worsened and improved symptom months', () => {
    const month1 = component.months().find((month) => month.monthIndex === 1);
    const month2 = component.months().find((month) => month.monthIndex === 2);

    expect(
      month1?.events.some((event) => event.id === 'auto-attention-1')
    ).toBe(true);

    expect(
      month2?.events.some((event) => event.id === 'auto-improved-2')
    ).toBe(true);
  });

  it('should summarize medication adherence for month 1', () => {
    const month1 = component.months().find((month) => month.monthIndex === 1);

    expect(month1?.medicationTaken).toBe(28);
    expect(month1?.medicationExpected).toBe(30);
    expect(component.getMedicationAdherenceText(month1!)).toContain('93%');
  });

  it('should toggle an unlocked month', () => {
    const month1Before = component.months().find((month) => month.monthIndex === 1);

    expect(month1Before?.expanded).toBe(false);

    component.toggleMonth(month1Before!);
    fixture.detectChanges();

    const month1After = component.months().find((month) => month.monthIndex === 1);

    expect(month1After?.expanded).toBe(true);
  });

  it('should not toggle a locked month', () => {
    const month3Before = component.months().find((month) => month.monthIndex === 3);

    expect(month3Before?.locked).toBe(true);
    expect(month3Before?.expanded).toBe(false);

    component.toggleMonth(month3Before!);
    fixture.detectChanges();

    const month3After = component.months().find((month) => month.monthIndex === 3);

    expect(month3After?.expanded).toBe(false);
  });

  it('should render month items in template', () => {
    const monthItems = fixture.nativeElement.querySelectorAll(
      '[data-testid^="journey-month-"]'
    );

    expect(monthItems.length).toBeGreaterThanOrEqual(6);
  });

  it('should render progress information in template', () => {
    const title = fixture.nativeElement.querySelector(
      '[data-testid="journey-title"]'
    ) as HTMLElement;

    const estimateBadge = fixture.nativeElement.querySelector(
      '[data-testid="treatment-estimate-badge"]'
    ) as HTMLElement;

    const progressCircle = fixture.nativeElement.querySelector(
      '[data-testid="progress-circle"]'
    ) as HTMLElement;

    expect(title.textContent).toContain('Sua jornada');
    expect(estimateBadge.textContent).toContain('6 meses');
    expect(progressCircle.textContent).toContain('25%');
  });

  it('should render month 2 panel expanded by default', () => {
    const panel = fixture.nativeElement.querySelector(
      '[data-testid="journey-month-panel-2"]'
    ) as HTMLElement | null;

    expect(panel).not.toBeNull();
  });
});