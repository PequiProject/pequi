import type { PatientTreatmentData } from '../../profile/models/patient-profile.models';
import { buildMedicationSchedule, buildTodayDoseSlots } from './medication-schedule.utils';

export interface TodayMedicationProgress {
  expectedCount: number;
  takenCount: number;
  completed: boolean;
}

export function computeTodayMedicationProgress(
  institutedMedications: PatientTreatmentData['institutedMedications'],
  isSlotTaken: (medicationKey: string, slotKey: string) => boolean,
  medicationKey: (name: string) => string,
): TodayMedicationProgress {
  let expectedCount = 0;
  let takenCount = 0;

  for (const item of institutedMedications) {
    const schedule = buildMedicationSchedule(item.frequency);
    const storageKey = medicationKey(item.name);
    const slots = buildTodayDoseSlots(schedule.reminderTimes);

    for (const slot of slots) {
      expectedCount += 1;
      if (isSlotTaken(storageKey, slot.slotKey)) {
        takenCount += 1;
      }
    }
  }

  return {
    expectedCount,
    takenCount,
    completed: expectedCount > 0 && takenCount === expectedCount,
  };
}
