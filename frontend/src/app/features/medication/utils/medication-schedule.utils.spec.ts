import { describe, expect, it } from 'vitest';

import {
  allTodayDoseSlotsTaken,
  buildMedicationSchedule,
  buildTodayDoseSlots,
  getDoseSlotIntakeState,
  getNextDoseTimeLabel,
  getLastTakenDoseSlotToday,
  getPendingDoseSlot,
  isMedicationDueNow,
} from './medication-schedule.utils';

describe('medication-schedule.utils', () => {
  it('builds 8/8h schedule with three reminder times', () => {
    const schedule = buildMedicationSchedule('8/8h');
    expect(schedule.reminderTimes).toEqual(['00:00', '08:00', '16:00']);
    expect(schedule.label).toContain('A cada 8 horas');
    expect(buildTodayDoseSlots(schedule.reminderTimes)).toHaveLength(3);
  });

  it('exposes per-slot intake state before and after scheduled time', () => {
    const slots = buildTodayDoseSlots(['08:00', '16:00'], new Date(2026, 5, 4, 12, 0, 0));
    const morning = getDoseSlotIntakeState(slots[0], false, new Date(2026, 5, 4, 12, 0, 0));
    const afternoon = getDoseSlotIntakeState(slots[1], false, new Date(2026, 5, 4, 12, 0, 0));

    expect(morning.canToggle).toBe(true);
    expect(afternoon.statusLabel).toBe('Horário: 16:00');
    expect(afternoon.canToggle).toBe(false);
  });

  it('returns pending slot after scheduled time even outside 2h window', () => {
    const now = new Date(2026, 5, 4, 20, 30, 0);
    const slot = getPendingDoseSlot(['08:00', '16:00'], () => false, now);
    expect(slot?.time).toBe('08:00');
    expect(slot?.slotKey).toBe('2026-06-04_08:00');
  });

  it('skips taken slots and returns next pending', () => {
    const now = new Date(2026, 5, 4, 20, 30, 0);
    const taken = new Set(['2026-06-04_08:00']);
    const slot = getPendingDoseSlot(['08:00', '16:00'], (key) => taken.has(key), now);
    expect(slot?.time).toBe('16:00');
  });

  it('marks urgent only within 2h after scheduled time', () => {
    const slot = { slotKey: '2026-06-04_08:00', time: '08:00', dateKey: '2026-06-04' };
    const inside = new Date(2026, 5, 4, 9, 0, 0);
    const outside = new Date(2026, 5, 4, 12, 0, 0);
    expect(isMedicationDueNow(slot, false, inside)).toBe(true);
    expect(isMedicationDueNow(slot, false, outside)).toBe(false);
  });

  it('returns last taken slot for unmarking', () => {
    const now = new Date(2026, 5, 4, 20, 30, 0);
    const taken = new Set(['2026-06-04_08:00', '2026-06-04_16:00']);
    const slot = getLastTakenDoseSlotToday(['08:00', '16:00'], (key) => taken.has(key), now);
    expect(slot?.time).toBe('16:00');
  });

  it('detects when all daily slots are taken', () => {
    const taken = new Set(['2026-06-04_08:00']);
    expect(allTodayDoseSlotsTaken(['08:00'], (key) => taken.has(key))).toBe(true);
  });

  it('returns next dose time when before first slot', () => {
    const now = new Date(2026, 5, 4, 7, 0, 0);
    expect(getNextDoseTimeLabel(['08:00', '16:00'], now)).toBe('08:00');
  });
});
