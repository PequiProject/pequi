import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/services/auth-service';
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
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => false },
        },
      ],
    });
    service = TestBed.inject(HealthAppointmentService);
  });

  it('allows saving without professional', async () => {
    const record = await firstValueFrom(
      service.saveFromDraft({ ...baseDraft, professional: '' })
    );
    expect(record.professional).toBeUndefined();
  });

  it('marks appointment as scheduled when not performed', async () => {
    const record = await firstValueFrom(service.saveFromDraft(baseDraft));
    expect(record.status).toBe('scheduled');
    expect(record.performed).toBe(false);
    expect(service.appointments()).toHaveLength(1);
  });

  it('marks appointment as completed when performed', async () => {
    const record = await firstValueFrom(
      service.saveFromDraft({
        ...baseDraft,
        performed: true,
      })
    );
    expect(record.status).toBe('completed');
    expect(record.performed).toBe(true);
    expect(record.wantsFollowUpDetails).toBe(false);
    expect(record.followUp).toBeUndefined();
  });

  it('returns latest supervised dose date from completed appointments', async () => {
    await firstValueFrom(
      service.saveFromDraft({
        ...baseDraft,
        performed: true,
        followUp: {
          ...EMPTY_FOLLOW_UP_DRAFT,
          registerSupervisedDose: true,
          otherMedicationName: 'Rifampicina',
        },
      })
    );
    const later = await firstValueFrom(
      service.saveFromDraft({
        ...baseDraft,
        appointmentDate: '2026-06-15',
        performed: true,
        followUp: {
          ...EMPTY_FOLLOW_UP_DRAFT,
          registerSupervisedDose: true,
          otherMedicationName: 'Rifampicina',
        },
      })
    );
    expect(later.appointmentDate).toBe('2026-06-15');
    expect(service.getLastSupervisedDoseDate()).toBe('2026-06-15');
  });

  it('stores supervised dose when medication unchanged', async () => {
    const record = await firstValueFrom(
      service.saveFromDraft({
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
      })
    );
    expect(record.followUp?.supervisedDose?.medicationName).toBe('Rifampicina');
    expect(record.followUp?.hadMedicationChange).toBe(false);
  });

  it('stores medication change with new dose', async () => {
    const record = await firstValueFrom(
      service.saveFromDraft({
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
      })
    );
    expect(record.followUp?.hadMedicationChange).toBe(true);
    expect(record.followUp?.medicationChange?.newMedicationName).toBe(
      'Medicamentos instituídos atualizados'
    );
    expect(record.followUp?.medicationChange?.newDoseDescription).toContain('Prednisona 1 mg/kg');
    expect(record.followUp?.medicationChange?.description).toBe('Ajuste do esquema');
  });
});
