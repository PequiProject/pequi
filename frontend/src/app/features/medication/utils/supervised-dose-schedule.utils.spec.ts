import { describe, expect, it } from 'vitest';

import {
  formatSupervisedDoseScheduleLabel,
  getNextSupervisedDoseDate,
} from './supervised-dose-schedule.utils';

describe('supervised-dose-schedule.utils', () => {
  it('returns start date when treatment has not begun yet', () => {
    const now = new Date(2026, 5, 1, 12, 0, 0);
    const next = getNextSupervisedDoseDate('2026-06-15', null, now);
    expect(next?.getDate()).toBe(15);
    expect(next?.getMonth()).toBe(5);
  });

  it('returns same month day when still before next monthly cycle', () => {
    const now = new Date(2026, 5, 4, 12, 0, 0);
    const next = getNextSupervisedDoseDate('2026-06-04', null, now);
    expect(next?.getDate()).toBe(4);
    expect(next?.getMonth()).toBe(5);
  });

  it('advances to next month after dose day passed', () => {
    const now = new Date(2026, 5, 10, 12, 0, 0);
    const next = getNextSupervisedDoseDate('2026-06-04', null, now);
    expect(next?.getDate()).toBe(4);
    expect(next?.getMonth()).toBe(6);
  });

  it('uses last supervised dose from consultation for next month', () => {
    const now = new Date(2026, 5, 10, 12, 0, 0);
    const next = getNextSupervisedDoseDate('2026-01-04', '2026-06-04', now);
    expect(next?.getDate()).toBe(4);
    expect(next?.getMonth()).toBe(6);
  });

  it('labels next dose one month after consultation dose', () => {
    const now = new Date(2026, 5, 5, 9, 0, 0);
    expect(formatSupervisedDoseScheduleLabel('2026-01-04', '2026-06-04', now)).toContain(
      '04/07/2026'
    );
  });

  it('labels today when next monthly dose is today', () => {
    const now = new Date(2026, 6, 4, 9, 0, 0);
    expect(formatSupervisedDoseScheduleLabel('2026-01-04', '2026-06-04', now)).toContain('hoje');
  });
});
