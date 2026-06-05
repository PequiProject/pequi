import { TestBed } from '@angular/core/testing';
import { JourneyService } from './journey-service';

describe('JourneyService', () => {
  let service: JourneyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JourneyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose a mock patient with PB type', () => {
    const patient = service.patient();

    expect(patient).toBeTruthy();
    expect(patient.id).toBe('patient-pb-001');
    expect(patient.name).toBe('José da Silva');
    expect(patient.leprosyType).toBe('PB');
  });

  it('should expose app and treatment start dates', () => {
    const patient = service.patient();

    expect(patient.appStartDate).toBe('2026-04-03');
    expect(patient.treatmentStartDate).toBe('2026-04-05');
  });

  it('should expose mock events for month 1 and month 2 scenario', () => {
    const events = service.events();

    expect(events.length).toBeGreaterThan(0);
    expect(events.some((event) => event.date.startsWith('2026-04'))).toBeTruthy();
    expect(events.some((event) => event.date.startsWith('2026-05'))).toBeTruthy();
  });

  it('should include appointment events', () => {
    const events = service.events();

    const appointments = events.filter((event) => event.type === 'appointment');

    expect(appointments.length).toBe(2);
    expect(appointments[0].metadata?.consultationLocation).toBeTruthy();
  });

  it('should include month 1 medication summary', () => {
    const events = service.events();

    const medicationSummary = events.find(
      (event) => event.id === 'medication-summary-m1-001'
    );

    expect(medicationSummary).toBeTruthy();
    expect(medicationSummary?.type).toBe('medication-summary');
    expect(medicationSummary?.metadata?.dosesTaken).toBe(28);
    expect(medicationSummary?.metadata?.dosesExpected).toBe(30);
  });

  it('should include worsening and improvement clinical updates', () => {
    const events = service.events();

    const worsenedEvent = events.find(
      (event) => event.metadata?.symptomTrend === 'worsened'
    );
    const improvedEvent = events.find(
      (event) => event.metadata?.symptomTrend === 'improved'
    );

    expect(worsenedEvent).toBeTruthy();
    expect(improvedEvent).toBeTruthy();
  });

  it('should include support and alert messages', () => {
    const events = service.events();

    const motivationalMessages = events.filter(
      (event) => event.type === 'motivational-message'
    );

    expect(motivationalMessages.length).toBe(2);
    expect(
      motivationalMessages.some((event) => event.status === 'attention')
    ).toBeTruthy();
    expect(
      motivationalMessages.some((event) => event.status === 'positive')
    ).toBeTruthy();
  });

  it('should update journey data', () => {
    service.updateJourneyData({
      patient: {
        id: 'patient-pb-002',
        name: 'Maria Oliveira',
        leprosyType: 'PB',
        appStartDate: '2026-05-01',
        treatmentStartDate: '2026-05-02',
      },
      events: [],
    });

    expect(service.patient().id).toBe('patient-pb-002');
    expect(service.patient().name).toBe('Maria Oliveira');
    expect(service.events()).toEqual([]);
  });

  it('should reset mock data after update', () => {
    service.updateJourneyData({
      patient: {
        id: 'temporary',
        name: 'Temp',
        leprosyType: 'MB',
        appStartDate: '2026-01-01',
        treatmentStartDate: '2026-01-02',
      },
      events: [],
    });

    service.resetMock();

    expect(service.patient().id).toBe('patient-pb-001');
    expect(service.patient().leprosyType).toBe('PB');
    expect(service.events().length).toBeGreaterThan(0);
  });
});