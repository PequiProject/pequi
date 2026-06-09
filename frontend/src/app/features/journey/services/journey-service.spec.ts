import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { JourneyService, JourneyData } from './journey-service';

describe('JourneyService', () => {
  let service: JourneyService;

  const mockJourneyData: JourneyData = {
    patient: {
      id: 'patient-pb-001',
      name: 'José da Silva',
      leprosyType: 'PB',
      treatmentStartDate: '2026-04-05',
    },
    events: [
      {
        id: 'appointment-m1-001',
        type: 'appointment',
        title: 'Consulta realizada',
        description: 'Consulta na unidade de saúde.',
        date: '2026-04-12',
        monthIndex: 1,
        status: 'neutral',
        metadata: {
          consultationLocation: 'UBS Centro',
        },
      },
      {
        id: 'medication-summary-m1-001',
        type: 'medication-summary',
        title: 'Resumo de medicação',
        description: 'Resumo mensal de doses.',
        date: '2026-04-30',
        monthIndex: 1,
        status: 'positive',
        metadata: {
          dosesTaken: 28,
          dosesExpected: 30,
        },
      },
      {
        id: 'clinical-update-m2-001',
        type: 'clinical-update',
        title: 'Piora percebida',
        description: 'Paciente relatou piora.',
        date: '2026-05-10',
        monthIndex: 2,
        status: 'attention',
        metadata: {
          symptomTrend: 'worsened',
        },
      },
      {
        id: 'clinical-update-m2-002',
        type: 'clinical-update',
        title: 'Melhora percebida',
        description: 'Paciente relatou melhora.',
        date: '2026-05-18',
        monthIndex: 2,
        status: 'positive',
        metadata: {
          symptomTrend: 'improved',
        },
      },
      {
        id: 'motivational-message-m1-001',
        type: 'motivational-message',
        title: 'Continue assim',
        description: 'Boa adesão ao tratamento.',
        date: '2026-04-20',
        monthIndex: 1,
        status: 'positive',
      },
      {
        id: 'motivational-message-m2-001',
        type: 'motivational-message',
        title: 'Atenção aos sintomas',
        description: 'Observe sinais e registre mudanças.',
        date: '2026-05-12',
        monthIndex: 2,
        status: 'attention',
      },
      {
        id: 'appointment-m2-001',
        type: 'appointment',
        title: 'Retorno mensal',
        description: 'Reavaliação do mês.',
        date: '2026-05-22',
        monthIndex: 2,
        status: 'neutral',
        metadata: {
          consultationLocation: 'UBS Centro',
        },
      },
    ],
    months: [],
    summary: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(JourneyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty state', () => {
    expect(service.patient()).toEqual({
      id: '',
      name: '',
      leprosyType: '',
      treatmentStartDate: '',
    });
    expect(service.events()).toEqual([]);
    expect(service.months()).toEqual([]);
    expect(service.summary()).toBeNull();
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBeFalsy();
  });

  it('should update journey data', () => {
    service.updateJourneyData(mockJourneyData);

    expect(service.patient().id).toBe('patient-pb-001');
    expect(service.patient().name).toBe('José da Silva');
    expect(service.patient().leprosyType).toBe('PB');
    expect(service.patient().treatmentStartDate).toBe('2026-04-05');
    expect(service.events().length).toBe(7);
  });

  it('should expose app and treatment start dates after update', () => {
    service.updateJourneyData(mockJourneyData);

    const patient = service.patient();

    expect(patient.treatmentStartDate).toBe('2026-04-05');
  });

  it('should expose events for april and may after update', () => {
    service.updateJourneyData(mockJourneyData);

    const events = service.events();

    expect(events.length).toBeGreaterThan(0);
    expect(events.some((event) => event.date.startsWith('2026-04'))).toBeTruthy();
    expect(events.some((event) => event.date.startsWith('2026-05'))).toBeTruthy();
  });

  it('should include appointment events', () => {
    service.updateJourneyData(mockJourneyData);

    const appointments = service.events().filter((event) => event.type === 'appointment');

    expect(appointments.length).toBe(2);
    expect(appointments[0].metadata?.consultationLocation).toBeTruthy();
  });

  it('should include month 1 medication summary', () => {
    service.updateJourneyData(mockJourneyData);

    const medicationSummary = service
      .events()
      .find((event) => event.id === 'medication-summary-m1-001');

    expect(medicationSummary).toBeTruthy();
    expect(medicationSummary?.type).toBe('medication-summary');
    expect(medicationSummary?.metadata?.dosesTaken).toBe(28);
    expect(medicationSummary?.metadata?.dosesExpected).toBe(30);
  });

  it('should include worsening and improvement clinical updates', () => {
    service.updateJourneyData(mockJourneyData);

    const worsenedEvent = service
      .events()
      .find((event) => event.metadata?.symptomTrend === 'worsened');

    const improvedEvent = service
      .events()
      .find((event) => event.metadata?.symptomTrend === 'improved');

    expect(worsenedEvent).toBeTruthy();
    expect(improvedEvent).toBeTruthy();
  });

  it('should include support and alert messages', () => {
    service.updateJourneyData(mockJourneyData);

    const motivationalMessages = service
      .events()
      .filter((event) => event.type === 'motivational-message');

    expect(motivationalMessages.length).toBe(2);
    expect(motivationalMessages.some((event) => event.status === 'attention')).toBeTruthy();
    expect(motivationalMessages.some((event) => event.status === 'positive')).toBeTruthy();
  });

  it('should replace existing journey data when updated again', () => {
    service.updateJourneyData(mockJourneyData);

    service.updateJourneyData({
      patient: {
        id: 'patient-mb-002',
        name: 'Maria Oliveira',
        leprosyType: 'MB',
        treatmentStartDate: '2026-05-02',
      },
      events: [],
      months: [],
      summary: null,
    });

    expect(service.patient().id).toBe('patient-mb-002');
    expect(service.patient().name).toBe('Maria Oliveira');
    expect(service.events()).toEqual([]);
  });

  it('should reset state', () => {
    service.updateJourneyData(mockJourneyData);

    service.resetState();

    expect(service.patient()).toEqual({
      id: '',
      name: '',
      leprosyType: '',
      treatmentStartDate: '',
    });
    expect(service.events()).toEqual([]);
    expect(service.months()).toEqual([]);
    expect(service.summary()).toBeNull();
    expect(service.error()).toBeNull();
  });
});