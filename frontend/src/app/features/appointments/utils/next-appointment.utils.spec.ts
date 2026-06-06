import { describe, expect, it } from 'vitest';
import type { HealthAppointment } from '../models/health-appointment.models';
import { formatAppointmentDatePt, resolveNextAppointment } from './next-appointment.utils';

function apt(partial: Partial<HealthAppointment> & Pick<HealthAppointment, 'id' | 'appointmentDate'>): HealthAppointment {
  return {
    appointmentTime: '10:00',
    location: 'UBS',
    type: 'consulta',
    performed: false,
    status: 'scheduled',
    wantsFollowUpDetails: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('resolveNextAppointment', () => {
  it('prefers earliest scheduled appointment', () => {
    const next = resolveNextAppointment([
      apt({ id: '2', appointmentDate: '2026-07-01', appointmentTime: '15:30' }),
      apt({ id: '1', appointmentDate: '2026-06-27', appointmentTime: '09:00' }),
    ]);
    expect(next?.appointmentId).toBe('1');
    expect(next?.dateIso).toBe('2026-06-27');
    expect(next?.time).toBe('09:00');
  });

  it('uses follow-up hint when no scheduled appointment exists', () => {
    const next = resolveNextAppointment([
      {
        ...apt({ id: '1', appointmentDate: '2026-01-10', performed: true, status: 'completed' }),
        followUp: { nextAppointmentDate: '2026-08-20' },
      },
    ]);
    expect(next?.source).toBe('follow_up_hint');
    expect(next?.dateIso).toBe('2026-08-20');
  });

  it('returns null when there is no upcoming data', () => {
    expect(resolveNextAppointment([])).toBeNull();
  });
});

describe('formatAppointmentDatePt', () => {
  it('formats ISO date in pt-BR', () => {
    expect(formatAppointmentDatePt('2026-06-27')).toMatch(/27\/06\/2026/);
  });
});
