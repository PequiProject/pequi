import { describe, expect, it } from 'vitest';
import type { HealthAppointment } from '../../appointments/models/health-appointment.models';
import { buildNeurologicalRows, buildSupervisedDoseRows } from './booklet-export-data.utils';

describe('booklet export data', () => {
  it('collects supervised doses from appointments', () => {
    const rows = buildSupervisedDoseRows([
      {
        id: '1',
        appointmentDate: '2026-03-15',
        appointmentTime: '10:00',
        location: 'UBS',
        type: 'dose_supervisionada',
        performed: true,
        status: 'completed',
        wantsFollowUpDetails: true,
        followUp: {
          supervisedDose: { medicationName: 'Rifampicina + Dapsona' },
        },
        createdAt: '2026-03-15T10:00:00Z',
      } as HealthAppointment,
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.medicationName).toBe('Rifampicina');
    expect(rows[1]?.medicationName).toBe('Dapsona');
  });

  it('collects neurological assessments from consultations', () => {
    const rows = buildNeurologicalRows([
      {
        id: '1',
        appointmentDate: '2026-04-01',
        appointmentTime: '09:00',
        location: 'UBS',
        type: 'avaliacao_neurologica',
        performed: true,
        status: 'completed',
        wantsFollowUpDetails: true,
        followUp: {
          neurologicalAssessment: {
            assessmentDate: '2026-04-01',
            gifEye: '1',
            gifHand: '0',
            gifFoot: '1',
            highestGif: '1',
            ompSum: '2',
          },
        },
        createdAt: '2026-04-01T09:00:00Z',
      } as HealthAppointment,
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.gifEye).toBe('1');
    expect(rows[0]?.ompSum).toBe('2');
  });
});
