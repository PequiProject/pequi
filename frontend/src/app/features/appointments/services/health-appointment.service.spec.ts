import { TestBed } from '@angular/core/testing';
import {
  EMPTY_APPOINTMENT_DRAFT,
  EMPTY_FOLLOW_UP_DRAFT,
  type HealthAppointmentDraft,
} from '../models/health-appointment.models';
import { HealthAppointmentService } from './health-appointment.service';

describe('HealthAppointmentService', () => {
  let service: HealthAppointmentService;

  const baseDraft: HealthAppointmentDraft = {
    ...EMPTY_APPOINTMENT_DRAFT,
    appointmentDate: '2026-05-20',
    appointmentTime: '14:30',
    location: 'UBS Centro',
    type: 'consulta',
    professional: 'Dr. Silva',
    notes: 'Trazer exames',
    performed: false,
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(HealthAppointmentService);
  });

  it('allows saving without professional', () => {
    const record = service.saveFromDraft({ ...baseDraft, professional: '' });
    expect(record.professional).toBeUndefined();
  });

  it('marks appointment as scheduled when not performed', () => {
    const record = service.saveFromDraft(baseDraft);
    expect(record.status).toBe('scheduled');
    expect(record.performed).toBe(false);
    expect(service.appointments()).toHaveLength(1);
  });

  it('marks appointment as completed when performed', () => {
    const record = service.saveFromDraft({
      ...baseDraft,
      performed: true,
    });
    expect(record.status).toBe('completed');
    expect(record.performed).toBe(true);
    expect(record.wantsFollowUpDetails).toBe(false);
    expect(record.followUp).toBeUndefined();
  });

  it('stores supervised dose when medication unchanged', () => {
    const record = service.saveFromDraft({
      ...baseDraft,
      type: 'dose_supervisionada',
      performed: true,
      followUp: {
        ...EMPTY_FOLLOW_UP_DRAFT,
        hadMedicationChange: false,
        registerSupervisedDose: true,
        selectedMedicationId: 'med-1',
        otherMedicationName: 'Rifampicina',
        supervisedDoseNotes: 'Dose mensal',
      },
    });
    expect(record.followUp?.supervisedDose?.medicationName).toBe('Rifampicina');
    expect(record.followUp?.hadMedicationChange).toBe(false);
  });

  it('stores medication change with new dose', () => {
    const record = service.saveFromDraft({
      ...baseDraft,
      performed: true,
      followUp: {
        ...EMPTY_FOLLOW_UP_DRAFT,
        updateInstitutedMedsFromConsultation: true,
        medicationChangeDescription: 'Ajuste do esquema',
        institutedPrednisoneMgKg: '1',
        institutedAineMgDay: '2',
        institutedThalidomideMgDay: '3',
        institutedPentoxifyllineMgDay: '4',
      },
    });
    expect(record.followUp?.hadMedicationChange).toBe(true);
    expect(record.followUp?.medicationChange?.newMedicationName).toBe(
      'Medicamentos instituídos atualizados',
    );
    expect(record.followUp?.medicationChange?.newDoseDescription).toContain('Prednisona 1 mg/kg');
    expect(record.followUp?.medicationChange?.description).toBe('Ajuste do esquema');
  });
});
